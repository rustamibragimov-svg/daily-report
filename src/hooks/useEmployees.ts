import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const TABLE = 'employees';
const UNIQUE_VIOLATION = '23505';
const MAX_FULL_NAME_LEN = 120;
const MAX_SHORT_NAME_LEN = 32;
/** Между засеянными (1-3) и подхваченными из истории (99). */
const NEW_EMPLOYEE_SORT_ORDER = 50;

/** Цвет для сотрудников, которых нет в справочнике (удалены/переименованы). */
export const UNKNOWN_EMPLOYEE_COLOR = '#6B7280';

/** Палитра для новых сотрудников — цвета серий на графиках аналитики. */
export const EMPLOYEE_COLORS = [
  '#3B82F6', '#F97316', '#A855F7', '#10B981', '#EF4444',
  '#0EA5E9', '#EAB308', '#EC4899', '#14B8A6', '#8B5CF6',
] as const;

export interface Employee {
  id: string;
  full_name: string;
  short_name: string;
  color: string;
  is_active: boolean;
  terminated_on: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewEmployee {
  full_name: string;
  short_name?: string;
  color?: string;
}

/**
 * Что разрешено менять. `full_name` намеренно не входит: в отчётах ответственный
 * хранится текстом, поэтому переименование оторвало бы всю историю сотрудника.
 */
export type EmployeePatch = Partial<
  Pick<Employee, 'short_name' | 'color' | 'is_active' | 'terminated_on' | 'sort_order'>
>;

/**
 * ФИО — фактический ключ связи с отчётами (там ответственный лежит текстом),
 * поэтому лишние пробелы нормализуем: иначе «Иван  Петров» завёлся бы вторым,
 * никак не связанным сотрудником.
 */
export function normalizeFullName(fullName: string): string {
  return fullName.trim().replace(/\s+/g, ' ');
}

/** Первое слово ФИО — короткая подпись для графиков по умолчанию. */
export function defaultShortName(fullName: string): string {
  return normalizeFullName(fullName).split(' ')[0] ?? '';
}

export function isPaletteColor(color: string | undefined): color is string {
  return !!color && EMPLOYEE_COLORS.some(c => c.toLowerCase() === color.toLowerCase());
}

/** Цвет, ещё не занятый ни одним сотрудником (или первый из палитры). */
export function nextFreeColor(existing: Employee[]): string {
  const used = new Set(existing.map(e => e.color.toLowerCase()));
  return EMPLOYEE_COLORS.find(c => !used.has(c.toLowerCase())) ?? EMPLOYEE_COLORS[0];
}

function describeError(err: unknown): string {
  if (typeof err !== 'object' || err === null) return 'Неизвестная ошибка';
  const e = err as Record<string, unknown>;
  if (e.code === UNIQUE_VIOLATION) return 'Сотрудник с таким ФИО уже есть в списке';
  return typeof e.message === 'string' ? e.message : 'Неизвестная ошибка';
}

export function useEmployees() {
  return useQuery<Employee[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('sort_order')
        .order('full_name');
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

/** ФИО работающих сотрудников — для выпадающих списков (форма, Excel). */
export function useActiveEmployeeNames(): string[] {
  const { data } = useEmployees();
  return (data ?? []).filter(e => e.is_active).map(e => e.full_name);
}

export function useCreateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (employee: NewEmployee) => {
      const fullName = normalizeFullName(employee.full_name);
      if (!fullName) throw new Error('Укажите ФИО сотрудника');
      if (fullName.length > MAX_FULL_NAME_LEN) {
        throw new Error(`ФИО длиннее ${MAX_FULL_NAME_LEN} символов`);
      }

      const shortName = (employee.short_name?.trim() || defaultShortName(fullName))
        .slice(0, MAX_SHORT_NAME_LEN);

      const { error } = await supabase.from(TABLE).insert({
        full_name: fullName,
        short_name: shortName,
        // Цвет уходит в SVG-атрибут fill — только значения из палитры.
        color: isPaletteColor(employee.color) ? employee.color : EMPLOYEE_COLORS[0],
        is_active: true,
        // Новые сотрудники идут после засеянных (sort_order 1-3), а не перед ними.
        sort_order: NEW_EMPLOYEE_SORT_ORDER,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Сотрудник добавлен');
      void qc.invalidateQueries({ queryKey: [TABLE] });
    },
    onError: (err) => toast.error(`Ошибка: ${describeError(err)}`),
  });
}

export function useUpdateEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: EmployeePatch }) => {
      const clean: EmployeePatch = { ...patch };
      if (clean.color !== undefined && !isPaletteColor(clean.color)) {
        throw new Error('Недопустимый цвет');
      }
      if (clean.short_name !== undefined) {
        clean.short_name = clean.short_name.trim().slice(0, MAX_SHORT_NAME_LEN);
      }

      const { error } = await supabase.from(TABLE).update(clean).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [TABLE] });
    },
    onError: (err) => toast.error(`Ошибка: ${describeError(err)}`),
  });
}

/**
 * Полное удаление из справочника. Ответственный в отчётах хранится текстом,
 * поэтому историю это не затрагивает — вызывающий код обязан сам запретить
 * удаление сотрудников, которые уже встречаются в отчётах (см. SettingsPage).
 */
export function useDeleteEmployee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Сотрудник удалён из списка');
      void qc.invalidateQueries({ queryKey: [TABLE] });
    },
    onError: (err) => toast.error(`Ошибка удаления: ${describeError(err)}`),
  });
}
