import type { Employee } from '@/hooks/useEmployees';
import { UNKNOWN_EMPLOYEE_COLOR, defaultShortName } from '@/hooks/useEmployees';
import type { DailyReport, IncidentRow } from '@/types/report';

export type EmployeeFilter = 'all' | 'active' | 'archived';

export const EMPLOYEE_FILTER_LABELS: Record<EmployeeFilter, string> = {
  all: 'Все',
  active: 'Активные',
  archived: 'Архив (уволенные)',
};

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;

/**
 * Цвет уходит не только в `style={{ backgroundColor }}` (там CSSOM отбрасывает
 * мусор сам), но и в SVG-атрибут `fill` recharts, а он принимает `url(...)` —
 * произвольная строка из БД превратилась бы в исходящий запрос к чужому домену
 * при каждом открытии аналитики. Пускаем только hex.
 */
export function safeColor(color: string | null | undefined): string {
  return color && HEX_COLOR.test(color) ? color : UNKNOWN_EMPLOYEE_COLOR;
}

export interface RosterEntry {
  fullName: string;
  shortName: string;
  color: string;
  isActive: boolean;
  /** Имени нет в справочнике — встречается только в сохранённых отчётах. */
  isOrphan: boolean;
}

/**
 * Список сотрудников для аналитики: справочник плюс имена, которые встречаются
 * в отчётах, но в справочнике отсутствуют. Без второй части такие нарушения
 * молча исчезли бы из графиков.
 */
export function buildRoster(employees: Employee[], namesInReports: string[]): RosterEntry[] {
  // ФИО используется как React key и как dataKey серии графика, поэтому дубли
  // (возможные, пока в БД не применён уникальный индекс) нужно схлопнуть —
  // иначе столбцы молча сольются.
  const seen = new Set<string>();
  const known: RosterEntry[] = [];
  for (const e of employees) {
    const fullName = e.full_name.trim();
    if (!fullName || seen.has(fullName)) continue;
    seen.add(fullName);
    known.push({
      fullName,
      shortName: e.short_name.trim() || defaultShortName(fullName),
      color: safeColor(e.color),
      isActive: e.is_active,
      isOrphan: false,
    });
  }

  const orphans = [...new Set(namesInReports.map(n => n.trim()).filter(Boolean))]
    .filter(name => !seen.has(name))
    .sort((a, b) => a.localeCompare(b, 'ru'))
    .map<RosterEntry>(name => ({
      fullName: name,
      shortName: defaultShortName(name),
      color: UNKNOWN_EMPLOYEE_COLOR,
      isActive: false,
      isOrphan: true,
    }));

  return [...known, ...orphans];
}

/**
 * Сколько раз каждое ФИО встречается как ответственный в сохранённых отчётах
 * (и в точности данных, и в инцидентах). Нужно, чтобы не дать удалить
 * сотрудника, на которого уже ссылается история.
 */
export function countResponsibleUsage(reports: DailyReport[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const report of reports) {
    const rows = [
      ...((report.accuracy_rows ?? []) as IncidentRow[]),
      ...((report.incidents_rows ?? []) as IncidentRow[]),
    ];
    for (const row of rows) {
      const name = row.responsible?.trim();
      if (!name) continue;
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  return counts;
}

export function matchesFilter(entry: RosterEntry, filter: EmployeeFilter): boolean {
  if (filter === 'active') return entry.isActive;
  if (filter === 'archived') return !entry.isActive;
  return true;
}

export function filterRoster(roster: RosterEntry[], filter: EmployeeFilter): RosterEntry[] {
  return roster.filter(e => matchesFilter(e, filter));
}
