import type { Control, UseFormRegister } from 'react-hook-form';
import { useFieldArray, useWatch } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import type { ReportFormValues } from '@/types/report';
import { DATA_ACCURACY_OPTIONS, INCIDENT_STATUS_OPTIONS } from '@/types/report';
import type { Employee } from '@/hooks/useEmployees';
import { useEmployees } from '@/hooks/useEmployees';

type RowsName = 'accuracy_rows' | 'incidents_rows';

interface Props {
  control: Control<ReportFormValues>;
  register: UseFormRegister<ReportFormValues>;
  watch: (name: keyof ReportFormValues) => string;
}

/**
 * Отдельный компонент, чтобы подписка шла только на своё поле: watch по всему
 * массиву перерисовывал бы таблицу на каждое нажатие в «Деталях».
 */
function ResponsibleSelect({
  name,
  index,
  control,
  register,
  employees,
}: {
  name: RowsName;
  index: number;
  control: Control<ReportFormValues>;
  register: UseFormRegister<ReportFormValues>;
  employees: Employee[] | undefined;
}) {
  const current = (useWatch({ control, name: `${name}.${index}.responsible` }) as string) ?? '';

  const activeEmployees = (employees ?? []).filter(e => e.is_active);
  const isActiveName = activeEmployees.some(e => e.full_name === current);

  /**
   * Ответственный хранится в отчёте текстом. Если сотрудник уже уволен (или
   * удалён из справочника), его имя всё равно должно оставаться в списке —
   * иначе при открытии старого отчёта значение молча сбросилось бы на пустое.
   */
  let extraLabel: string | null = null;
  if (current && !isActiveName) {
    if (!employees) extraLabel = current;
    else extraLabel = employees.some(e => e.full_name === current)
      ? `${current} (уволен)`
      : `${current} (вне списка)`;
  }

  return (
    <select
      className="select-base text-sm"
      aria-label="Ответственный"
      {...register(`${name}.${index}.responsible`)}
    >
      <option value="">— не выбрано —</option>
      {activeEmployees.map(e => (
        <option key={e.id} value={e.full_name}>{e.full_name}</option>
      ))}
      {extraLabel !== null && <option value={current}>{extraLabel}</option>}
    </select>
  );
}

function IncidentTable({
  name,
  control,
  register,
}: {
  name: RowsName;
  control: Control<ReportFormValues>;
  register: UseFormRegister<ReportFormValues>;
}) {
  const { fields } = useFieldArray({ control, name });
  const { data: employees, isError: employeesFailed } = useEmployees();

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      {employeesFailed && (
        <p className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">
          Не удалось загрузить список сотрудников — выбор ответственного недоступен.
          Проверьте таблицу <code>employees</code> в Supabase.
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="metrics-th text-left w-1/3">Ответственный</th>
            <th className="metrics-th text-left w-1/3">Детали</th>
            <th className="metrics-th text-left w-1/3">Решение</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field, i) => (
            <tr key={field.id} className="hover:bg-gray-50/60">
              <td className="metrics-td">
                <ResponsibleSelect
                  name={name}
                  index={i}
                  control={control}
                  register={register}
                  employees={employees}
                />
              </td>
              <td className="metrics-td">
                <textarea className="textarea-base h-10 text-sm" rows={2} {...register(`${name}.${i}.details`)} />
              </td>
              <td className="metrics-td">
                <textarea className="textarea-base h-10 text-sm" rows={2} {...register(`${name}.${i}.resolution`)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function OperationalSection({ control, register, watch }: Props) {
  const dataAccuracy = watch('data_accuracy');
  const incidentsStatus = watch('incidents_status');
  const dataOk = dataAccuracy === DATA_ACCURACY_OPTIONS[0];
  const incOk = incidentsStatus === INCIDENT_STATUS_OPTIONS[0];

  return (
    <div className="section-card">
      <div className="section-header bg-[#1C1C2E]">
        <ShieldCheck size={14} className="opacity-70" />
        Общий операционный контроль
      </div>
      <div className="section-body">
        {/* Block 1: Точность данных */}
        <div>
          <label className="field-label">Точность данных</label>
          <select
            className={`select-base text-sm font-medium ${dataOk ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}
            {...register('data_accuracy')}
          >
            {DATA_ACCURACY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
            Детали по точности данных
          </p>
          <IncidentTable name="accuracy_rows" control={control} register={register} />
        </div>

        {/* Block 2: Инциденты */}
        <div className="pt-2">
          <label className="field-label">Инциденты</label>
          <select
            className={`select-base text-sm font-medium ${incOk ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-700 bg-red-50 border-red-200'}`}
            {...register('incidents_status')}
          >
            {INCIDENT_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">
            Детали по инцидентам
          </p>
          <IncidentTable name="incidents_rows" control={control} register={register} />
        </div>
      </div>
    </div>
  );
}
