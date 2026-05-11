import type { Control, UseFormRegister } from 'react-hook-form';
import { useFieldArray } from 'react-hook-form';
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
            <tr key={field.id} className="hover:bg-gray-50">
              <td className="metrics-td">
                <select className="select-base" {...register(`${name}.${i}.responsible`)}>
                  <option value="">— выберите —</option>
                  {RESPONSIBLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </td>
              <td className="metrics-td">
                <textarea className="textarea-base h-10" rows={2} {...register(`${name}.${i}.details`)} />
              </td>
              <td className="metrics-td">
                <textarea className="textarea-base h-10" rows={2} {...register(`${name}.${i}.resolution`)} />
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

  return (
    <div className="section-card">
      <div className="section-header bg-blue-600">ОБЩИЙ ОПЕРАЦИОННЫЙ КОНТРОЛЬ</div>
      <div className="section-body">
        <div>
          <label className="field-label">Точность данных</label>
          <select
            className={`select-base ${dataAccuracy === DATA_ACCURACY_OPTIONS[0] ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}
            {...register('data_accuracy')}
          >
            {DATA_ACCURACY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <IncidentTable name="accuracy_rows" control={control} register={register} />

        <div className="pt-2">
          <label className="field-label">Инциденты</label>
          <select
            className={`select-base ${incidentsStatus === INCIDENT_STATUS_OPTIONS[0] ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}
            {...register('incidents_status')}
          >
            {INCIDENT_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <IncidentTable name="incidents_rows" control={control} register={register} />
      </div>
    </div>
  );
}
