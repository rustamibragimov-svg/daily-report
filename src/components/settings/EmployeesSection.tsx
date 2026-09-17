import { useEffect, useState } from 'react';
import { Users, Loader2, Plus, Trash2, UserCheck, UserX, Check } from 'lucide-react';
import type { Employee } from '@/hooks/useEmployees';
import {
  EMPLOYEE_COLORS,
  nextFreeColor,
  defaultShortName,
  useEmployees,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
} from '@/hooks/useEmployees';
import { useReportHistory } from '@/hooks/useReport';
import { countResponsibleUsage, safeColor } from '@/lib/employees';
import { todayISO } from '@/lib/utils';

function ColorPicker({ value, onPick }: { value: string; onPick: (color: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        title="Цвет на графиках"
        aria-label={`Цвет на графиках: ${value}`}
        aria-haspopup="true"
        aria-expanded={open}
        className="w-5 h-5 rounded-full border border-black/10 shadow-sm"
        style={{ backgroundColor: value }}
      />
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1.5 p-2 grid grid-cols-5 gap-1.5 bg-white rounded-lg border border-gray-200 shadow-lg">
            {EMPLOYEE_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => { onPick(c); setOpen(false); }}
                aria-label={`Выбрать цвет ${c}`}
                aria-pressed={c.toLowerCase() === value.toLowerCase()}
                className="w-5 h-5 rounded-full border border-black/10 flex items-center justify-center"
                style={{ backgroundColor: c }}
              >
                {c.toLowerCase() === value.toLowerCase() && <Check size={11} className="text-white" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EmployeeRow({
  employee,
  usageCount,
  usageKnown,
}: {
  employee: Employee;
  usageCount: number;
  /** История отчётов ещё не загружена — считать, что упоминания могут быть. */
  usageKnown: boolean;
}) {
  const update = useUpdateEmployee();
  const remove = useDeleteEmployee();
  const [shortName, setShortName] = useState(employee.short_name);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Пока поле не редактируют, оно следует за сервером: иначе фоновый refetch
  // (или правка из другой вкладки) разошёлся бы с тем, что показано, и
  // следующее сохранение молча затёрло бы более свежее значение.
  useEffect(() => {
    if (!editing) setShortName(employee.short_name);
  }, [employee.short_name, editing]);

  const shortDirty = shortName.trim() !== employee.short_name;
  const canDelete = usageKnown && usageCount === 0;

  const toggleActive = () => {
    const nowActive = !employee.is_active;
    update.mutate({
      id: employee.id,
      patch: {
        is_active: nowActive,
        terminated_on: nowActive ? null : todayISO(),
      },
    });
  };

  const saveShortName = () => {
    const next = shortName.trim() || defaultShortName(employee.full_name);
    setShortName(next);
    update.mutate(
      { id: employee.id, patch: { short_name: next } },
      // На ошибке возвращаем то, что реально лежит на сервере, чтобы поле
      // не показывало несохранённое значение как сохранённое.
      { onError: () => setShortName(employee.short_name) },
    );
  };

  return (
    <div className={`flex items-center gap-3 py-3 border-b border-gray-100 last:border-0 ${employee.is_active ? '' : 'opacity-60'}`}>
      <ColorPicker
        value={safeColor(employee.color)}
        onPick={color => update.mutate({ id: employee.id, patch: { color } })}
      />

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{employee.full_name}</p>
        <p className="text-xs text-gray-400">
          {employee.is_active
            ? 'Работает'
            : `Уволен${employee.terminated_on ? ` · ${employee.terminated_on}` : ''}`}
          {usageCount > 0 && ` · ${usageCount} упоминаний в отчётах`}
        </p>
      </div>

      <input
        value={shortName}
        onChange={e => setShortName(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => { setEditing(false); if (shortDirty) saveShortName(); }}
        placeholder="Подпись"
        title="Короткая подпись на графиках"
        aria-label={`Короткая подпись на графиках для ${employee.full_name}`}
        className="input-base w-28 text-sm shrink-0"
      />

      <button
        type="button"
        onClick={toggleActive}
        disabled={update.isPending}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border transition-colors shrink-0 disabled:opacity-40 ${
          employee.is_active
            ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
            : 'border-gray-200 text-gray-500 hover:bg-gray-50'
        }`}
      >
        {employee.is_active ? <UserCheck size={13} /> : <UserX size={13} />}
        {employee.is_active ? 'Активен' : 'Уволен'}
      </button>

      {confirmDelete ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => remove.mutate(employee.id)}
            disabled={remove.isPending}
            className="px-2.5 py-1.5 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-40"
          >
            Удалить
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-gray-50"
          >
            Отмена
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={!canDelete}
          title={canDelete
            ? 'Удалить из списка'
            : usageKnown
              ? 'Сотрудник уже есть в отчётах — удаление недоступно. Переведите его в «Уволен».'
              : 'История отчётов ещё загружается'}
          className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 disabled:hover:text-gray-300 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors shrink-0"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

function AddEmployeeForm({ existing }: { existing: Employee[] }) {
  const create = useCreateEmployee();
  const [fullName, setFullName] = useState('');
  const [shortName, setShortName] = useState('');
  const [color, setColor] = useState(() => nextFreeColor(existing));

  const handleAdd = () => {
    if (!fullName.trim()) return;
    create.mutate(
      { full_name: fullName, short_name: shortName, color },
      {
        onSuccess: () => {
          setFullName('');
          setShortName('');
          // `existing` ещё без только что созданного сотрудника — refetch
          // асинхронный, поэтому добавляем его цвет вручную, иначе двум
          // подряд добавленным людям достался бы один цвет.
          setColor(nextFreeColor([...existing, { color } as Employee]));
        },
      },
    );
  };

  return (
    <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
      <ColorPicker value={color} onPick={setColor} />
      <input
        value={fullName}
        onChange={e => setFullName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="Фамилия Имя"
        aria-label="ФИО нового сотрудника"
        className="input-base flex-1 text-sm"
      />
      <input
        value={shortName}
        onChange={e => setShortName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder={fullName ? defaultShortName(fullName) : 'Подпись'}
        title="Короткая подпись на графиках"
        aria-label="Короткая подпись на графиках"
        className="input-base w-28 text-sm shrink-0"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!fullName.trim() || create.isPending}
        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-[#1C1C2E] text-white hover:bg-[#2a2a40] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        {create.isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
        Добавить
      </button>
    </div>
  );
}

export default function EmployeesSection() {
  const { data: employees, isLoading, isError } = useEmployees();
  const { data: reports, isSuccess: reportsLoaded } = useReportHistory();

  // Пока история не загрузилась, считать всех «используемыми» — иначе можно
  // успеть удалить сотрудника, на которого уже ссылаются отчёты.
  const usage = countResponsibleUsage(reports ?? []);

  // Активные сверху, внутри группы — порядок из справочника.
  const sorted = [...(employees ?? [])].sort(
    (a, b) => Number(b.is_active) - Number(a.is_active),
  );

  return (
    <div className="section-card">
      <div className="section-header" style={{ backgroundColor: '#1C1C2E' }}>
        <Users size={14} className="opacity-70" />
        Сотрудники
      </div>
      <div className="px-5 py-3">
        <p className="text-xs text-gray-400 mb-3">
          Список ответственных в отчётах и на графиках аналитики.
          Уволенные не предлагаются в новых отчётах, но остаются в истории и в архивной аналитике.
        </p>

        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-6 justify-center">
            <Loader2 size={15} className="animate-spin" /> Загрузка...
          </div>
        )}

        {isError && (
          <p className="text-sm text-red-500 py-6 text-center">
            Ошибка загрузки. Убедитесь, что таблица <code>employees</code> создана в Supabase
            (<code>supabase/employees_migration.sql</code>).
          </p>
        )}

        {!isLoading && !isError && (
          <>
            {sorted.map(e => (
              <EmployeeRow
                key={e.id}
                employee={e}
                usageCount={usage[e.full_name] ?? 0}
                usageKnown={reportsLoaded}
              />
            ))}
            <AddEmployeeForm existing={employees ?? []} />
          </>
        )}
      </div>
    </div>
  );
}
