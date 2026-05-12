import type { Control, UseFormRegister } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
import { ShieldCheck } from 'lucide-react';
import type { ReportFormValues } from '@/types/report';
import { DATA_ACCURACY_OPTIONS, INCIDENT_STATUS_OPTIONS, RESPONSIBLE_OPTIONS } from '@/types/report';

interface Props {
  control: Control<ReportFormValues>;
  register: UseFormRegister<ReportFormValues>;
  watch: (name: keyof ReportFormValues) => string;
}

function IncidentTable({
  name,
  control,
  register,
}: {
  name: 'accuracy_rows' | 'incidents_rows';
  control: Control<ReportFormValues>;
  register: UseFormRegister<ReportFormValues>;
}) {
  const { fields } = useFieldArray({ control, name });
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
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
                <select className="select-base text-sm" {...register(`${name}.${i}.responsible`)}>
                  <option value="">— не выбрано —</option>
                  {RESPONSIBLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
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
