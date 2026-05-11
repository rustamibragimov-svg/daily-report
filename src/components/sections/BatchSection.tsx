import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import type { ReportFormValues } from '@/types/report';
import { OPS_STATUS_OPTIONS } from '@/types/report';

type Prefix = 'uzum' | 'cainiao';

interface Props {
  prefix: Prefix;
  title: string;
  headerColor: string;
  register: UseFormRegister<ReportFormValues>;
  watch: UseFormWatch<ReportFormValues>;
}

const CHINA_DEFAULT = '- Все партии приняты у клиента в соответствии с планом\n- Все партии обработаны на SWE в соответствии с планом\n- Все партии отправлены из Китая в соответствии с планом';
const TRANSIT_DEFAULT = '- Все партии прибыли в Ташкент без задержек\n- Все партии доставлены на NWL без задержек\n- Все партии обработаны на NWL без задержек\n- Все партии отправлены в страну назначения без задержек';
const LASTMILE_DEFAULT = '- Все партии доставлены в страну назначения без задержек\n- Все партии обработаны в стране назначения без задержек';

function NumInput({ name, register }: { name: keyof ReportFormValues; register: UseFormRegister<ReportFormValues> }) {
  return (
    <input
      type="number"
      step="any"
      min={0}
      className="input-base text-center px-1 py-1 text-sm"
      {...register(name, { valueAsNumber: true })}
    />
  );
}

function OpsBlock({
  label,
  statusKey,
  incidentKey,
  defaultText,
  register,
  watch,
}: {
  label: string;
  statusKey: keyof ReportFormValues;
  incidentKey: keyof ReportFormValues;
  defaultText: string;
  register: UseFormRegister<ReportFormValues>;
  watch: UseFormWatch<ReportFormValues>;
}) {
  const status = watch(statusKey) as string;
  const hasIncident = status === OPS_STATUS_OPTIONS[1];

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
        <select
          className={`select-base w-56 text-xs ${hasIncident ? 'text-red-700 bg-red-50 border-red-200' : 'text-green-700 bg-green-50 border-green-200'}`}
          {...register(statusKey)}
        >
          {OPS_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      {!hasIncident && (
        <div className="px-4 py-2 bg-green-50">
          <p className="text-xs text-green-700 whitespace-pre-line">{defaultText}</p>
        </div>
      )}
      {hasIncident && (
        <div className="px-4 py-3">
          <label className="field-label text-xs">Описание инцидента</label>
          <textarea
            className="textarea-base text-sm"
            rows={3}
            placeholder="Опишите инцидент подробно..."
            {...register(incidentKey)}
          />
        </div>
      )}
    </div>
  );
}

export default function BatchSection({ prefix, title, headerColor, register, watch }: Props) {
  const shCount = Number(watch(`${prefix}_sh_count` as keyof ReportFormValues)) || 0;
  const hkCount = Number(watch(`${prefix}_hk_count` as keyof ReportFormValues)) || 0;
  const shWeight = Number(watch(`${prefix}_sh_weight` as keyof ReportFormValues)) || 0;
  const hkWeight = Number(watch(`${prefix}_hk_weight` as keyof ReportFormValues)) || 0;
  const shMko = Number(watch(`${prefix}_sh_mko` as keyof ReportFormValues)) || 0;
  const hkMko = Number(watch(`${prefix}_hk_mko` as keyof ReportFormValues)) || 0;
  const shMpo = Number(watch(`${prefix}_sh_mpo` as keyof ReportFormValues)) || 0;
  const hkMpo = Number(watch(`${prefix}_hk_mpo` as keyof ReportFormValues)) || 0;
  const shAuto = Number(watch(`${prefix}_sh_auto` as keyof ReportFormValues)) || 0;
  const hkAuto = Number(watch(`${prefix}_hk_auto` as keyof ReportFormValues)) || 0;

  const fmt = (n: number) => n % 1 === 0 ? n.toString() : n.toFixed(2);

  const rows: { label: string; total: string; shKey: keyof ReportFormValues; hkKey: keyof ReportFormValues; isText?: boolean }[] = [
    { label: 'Кол-во принятых партий', total: fmt(shCount + hkCount), shKey: `${prefix}_sh_count` as keyof ReportFormValues, hkKey: `${prefix}_hk_count` as keyof ReportFormValues },
    { label: 'Общий вес партий, кг', total: fmt(shWeight + hkWeight), shKey: `${prefix}_sh_weight` as keyof ReportFormValues, hkKey: `${prefix}_hk_weight` as keyof ReportFormValues },
    { label: 'МКО, кг', total: fmt(shMko + hkMko), shKey: `${prefix}_sh_mko` as keyof ReportFormValues, hkKey: `${prefix}_hk_mko` as keyof ReportFormValues },
    { label: 'МПО, кг', total: fmt(shMpo + hkMpo), shKey: `${prefix}_sh_mpo` as keyof ReportFormValues, hkKey: `${prefix}_hk_mpo` as keyof ReportFormValues },
    { label: 'Автомат, кг', total: fmt(shAuto + hkAuto), shKey: `${prefix}_sh_auto` as keyof ReportFormValues, hkKey: `${prefix}_hk_auto` as keyof ReportFormValues },
  ];

  return (
    <div className="section-card">
      <div className="section-header" style={{ backgroundColor: headerColor }}>{title}</div>
      <div className="section-body">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="metrics-th text-left">Метрика</th>
                <th className="metrics-th text-center w-24">Всего</th>
                <th className="metrics-th text-center w-32">Шанхай</th>
                <th className="metrics-th text-center w-32">Гонконг</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, total, shKey, hkKey }) => (
                <tr key={label} className="hover:bg-gray-50">
                  <td className="metrics-td font-medium text-gray-700">{label}</td>
                  <td className="total-cell text-center font-semibold">{total}</td>
                  <td className="metrics-td"><NumInput name={shKey} register={register} /></td>
                  <td className="metrics-td"><NumInput name={hkKey} register={register} /></td>
                </tr>
              ))}
              <tr className="hover:bg-gray-50">
                <td className="metrics-td font-medium text-gray-700">Соотношение vol vs brutto</td>
                <td className="total-cell text-center text-gray-400">—</td>
                <td className="metrics-td">
                  <input type="text" className="input-base text-center px-1 py-1 text-sm" placeholder="Нет данных" {...register(`${prefix}_sh_ratio` as keyof ReportFormValues)} />
                </td>
                <td className="metrics-td">
                  <input type="text" className="input-base text-center px-1 py-1 text-sm" placeholder="Нет данных" {...register(`${prefix}_hk_ratio` as keyof ReportFormValues)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-2 pt-2">
          <OpsBlock
            label="Операции в Китае"
            statusKey={`${prefix}_china_status` as keyof ReportFormValues}
            incidentKey={`${prefix}_china_incident` as keyof ReportFormValues}
            defaultText={CHINA_DEFAULT}
            register={register}
            watch={watch}
          />
          <OpsBlock
            label="Транзитные операции"
            statusKey={`${prefix}_transit_status` as keyof ReportFormValues}
            incidentKey={`${prefix}_transit_incident` as keyof ReportFormValues}
            defaultText={TRANSIT_DEFAULT}
            register={register}
            watch={watch}
          />
          <OpsBlock
            label="Операции последней мили"
            statusKey={`${prefix}_lastmile_status` as keyof ReportFormValues}
            incidentKey={`${prefix}_lastmile_incident` as keyof ReportFormValues}
            defaultText={LASTMILE_DEFAULT}
            register={register}
            watch={watch}
          />
        </div>
      </div>
    </div>
  );
}
