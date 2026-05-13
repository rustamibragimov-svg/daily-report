import type { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { RefreshCw, Loader2 } from 'lucide-react';
import type { ReportFormValues } from '@/types/report';
import { OPS_STATUS_OPTIONS } from '@/types/report';
import { useFetchBatchMetrics } from '@/hooks/useBatchMetrics';

type Prefix = 'uzum' | 'cainiao';

const BRAND_LOGO: Record<Prefix, string> = {
  uzum: '/uzum-logo.png',
  cainiao: '/cainiao-logo.png',
};

interface Props {
  prefix: Prefix;
  title: string;
  headerColor: string;
  register: UseFormRegister<ReportFormValues>;
  watch: UseFormWatch<ReportFormValues>;
  setValue: UseFormSetValue<ReportFormValues>;
}

const CHINA_DEFAULT = '- Все партии приняты у клиента в соответствии с планом\n- Все партии обработаны на SWE в соответствии с планом\n- Все партии отправлены из Китая в соответствии с планом';
const TRANSIT_DEFAULT = '- Все партии прибыли в Ташкент без задержек\n- Все партии доставлены на NWL без задержек\n- Все партии обработаны на NWL без задержек\n- Все партии отправлены в страну назначения без задержек';
const LASTMILE_DEFAULT = '- Все партии доставлены в страну назначения без задержек\n- Все партии обработаны в стране назначения без задержек';

function NumInput({ name, register }: { name: keyof ReportFormValues; register: UseFormRegister<ReportFormValues> }) {
  return (
    <input
      type="number" step="any" min={0}
      className="input-base text-center py-1.5 text-sm"
      {...register(name, { valueAsNumber: true })}
    />
  );
}

function OpsBlock({
  label, statusKey, incidentKey, defaultText, register, watch,
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
      {/* Header row: label + status dropdown */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50/70 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700 flex-1">{label}</span>
        <select
          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold w-52 appearance-none cursor-pointer focus:outline-none transition-colors ${
            hasIncident
              ? 'text-red-700 bg-red-50 border-red-200'
              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
          }`}
          {...register(statusKey)}
        >
          {OPS_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Static bullet points — always visible */}
      <div className={`px-4 py-2.5 border-b border-gray-100 ${hasIncident ? 'bg-white' : 'bg-emerald-50/30'}`}>
        <p className={`text-xs whitespace-pre-line leading-relaxed ${hasIncident ? 'text-gray-400' : 'text-emerald-700/80'}`}>
          {defaultText}
        </p>
      </div>

      {/* Incident description — always visible as separate block */}
      <div className={`px-4 py-3 ${hasIncident ? 'bg-red-50/20' : 'bg-white'}`}>
        <label className={`field-label ${hasIncident ? 'text-red-600' : 'text-gray-400'}`}>
          Описание инцидента
        </label>
        <textarea
          className={`textarea-base text-sm ${hasIncident ? '' : 'bg-gray-50 text-gray-400'}`}
          rows={2}
          placeholder={hasIncident ? 'Опишите инцидент подробно...' : 'Нет инцидентов'}
          disabled={!hasIncident}
          {...register(incidentKey)}
        />
      </div>
    </div>
  );
}

export default function BatchSection({ prefix, title, headerColor, register, watch, setValue }: Props) {
  const { fetch, loading } = useFetchBatchMetrics();
  const reportDate = watch('report_date') as string;
  const project = prefix === 'uzum' ? 'UZUM' : 'Cainiao';

  const handleFetch = () => {
    void fetch(reportDate, project, (m) => {
      setValue(`${prefix}_sh_count` as keyof ReportFormValues, m.sh_count);
      setValue(`${prefix}_hk_count` as keyof ReportFormValues, m.hk_count);
      setValue(`${prefix}_sh_weight` as keyof ReportFormValues, m.sh_weight);
      setValue(`${prefix}_hk_weight` as keyof ReportFormValues, m.hk_weight);
      setValue(`${prefix}_sh_mko` as keyof ReportFormValues, m.sh_mko);
      setValue(`${prefix}_hk_mko` as keyof ReportFormValues, m.hk_mko);
      setValue(`${prefix}_sh_mpo` as keyof ReportFormValues, m.sh_mpo);
      setValue(`${prefix}_hk_mpo` as keyof ReportFormValues, m.hk_mpo);
      setValue(`${prefix}_sh_auto` as keyof ReportFormValues, m.sh_auto);
      setValue(`${prefix}_hk_auto` as keyof ReportFormValues, m.hk_auto);
      setValue(`${prefix}_sh_ratio` as keyof ReportFormValues, m.sh_ratio);
      setValue(`${prefix}_hk_ratio` as keyof ReportFormValues, m.hk_ratio);
    });
  };
  const n = (k: string) => (Number(watch(`${prefix}_${k}` as keyof ReportFormValues)) || 0);
  const fmt = (v: number) => v % 1 === 0 ? String(v) : v.toFixed(2);

  const rows: { label: string; total: string; sh: keyof ReportFormValues; hk: keyof ReportFormValues }[] = [
    { label: 'Кол-во принятых партий', total: fmt(n('sh_count') + n('hk_count')), sh: `${prefix}_sh_count` as keyof ReportFormValues, hk: `${prefix}_hk_count` as keyof ReportFormValues },
    { label: 'Общий вес партий, кг',   total: fmt(n('sh_weight') + n('hk_weight')), sh: `${prefix}_sh_weight` as keyof ReportFormValues, hk: `${prefix}_hk_weight` as keyof ReportFormValues },
    { label: 'МКО, кг',                total: fmt(n('sh_mko') + n('hk_mko')), sh: `${prefix}_sh_mko` as keyof ReportFormValues, hk: `${prefix}_hk_mko` as keyof ReportFormValues },
    { label: 'МПО, кг',                total: fmt(n('sh_mpo') + n('hk_mpo')), sh: `${prefix}_sh_mpo` as keyof ReportFormValues, hk: `${prefix}_hk_mpo` as keyof ReportFormValues },
    { label: 'Автомат, кг',            total: fmt(n('sh_auto') + n('hk_auto')), sh: `${prefix}_sh_auto` as keyof ReportFormValues, hk: `${prefix}_hk_auto` as keyof ReportFormValues },
  ];

  return (
    <div className="section-card">
      <div className="section-header" style={{ backgroundColor: headerColor }}>
        <img
          src={BRAND_LOGO[prefix]}
          alt={title}
          className="h-5 w-auto brightness-0 invert opacity-90"
        />
        {prefix === 'uzum' && (
          <span className="text-white/80 text-[11px] font-semibold uppercase tracking-widest">
            Crossborder
          </span>
        )}
        <button
          type="button"
          onClick={handleFetch}
          disabled={loading || !reportDate}
          className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/20 hover:bg-white/30 text-white text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? <Loader2 size={12} className="animate-spin" />
            : <RefreshCw size={12} />}
          Загрузить из трекера
        </button>
      </div>
      <div className="section-body">
        {/* Metrics table */}
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="metrics-th text-left">Метрика</th>
                <th className="metrics-th text-center w-28">Всего</th>
                <th className="metrics-th text-center w-36">Шанхай</th>
                <th className="metrics-th text-center w-36">Гонконг</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ label, total, sh, hk }) => (
                <tr key={label} className="hover:bg-gray-50/60">
                  <td className="metrics-td font-medium text-gray-700">{label}</td>
                  <td className="total-cell text-center">{total}</td>
                  <td className="metrics-td"><NumInput name={sh} register={register} /></td>
                  <td className="metrics-td"><NumInput name={hk} register={register} /></td>
                </tr>
              ))}
              <tr className="hover:bg-gray-50/60">
                <td className="metrics-td font-medium text-gray-700">Соотношение vol vs brutto</td>
                <td className="total-cell text-center text-gray-300">—</td>
                <td className="metrics-td">
                  <input type="text" className="input-base text-center py-1.5 text-sm" placeholder="Нет данных"
                    {...register(`${prefix}_sh_ratio` as keyof ReportFormValues)} />
                </td>
                <td className="metrics-td">
                  <input type="text" className="input-base text-center py-1.5 text-sm" placeholder="Нет данных"
                    {...register(`${prefix}_hk_ratio` as keyof ReportFormValues)} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Operations */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Статус операций</p>
          <OpsBlock label="Операции в Китае"       statusKey={`${prefix}_china_status` as keyof ReportFormValues}   incidentKey={`${prefix}_china_incident` as keyof ReportFormValues}   defaultText={CHINA_DEFAULT}    register={register} watch={watch} />
          <OpsBlock label="Транзитные операции"     statusKey={`${prefix}_transit_status` as keyof ReportFormValues} incidentKey={`${prefix}_transit_incident` as keyof ReportFormValues} defaultText={TRANSIT_DEFAULT}  register={register} watch={watch} />
          <OpsBlock label="Операции последней мили" statusKey={`${prefix}_lastmile_status` as keyof ReportFormValues} incidentKey={`${prefix}_lastmile_incident` as keyof ReportFormValues} defaultText={LASTMILE_DEFAULT} register={register} watch={watch} />
        </div>
      </div>
    </div>
  );
}
