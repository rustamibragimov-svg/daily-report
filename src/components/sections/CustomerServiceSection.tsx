import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Headphones } from 'lucide-react';
import type { ReportFormValues } from '@/types/report';
import { useSettingsMap } from '@/hooks/useSettings';

interface Props {
  register: UseFormRegister<ReportFormValues>;
  watch: UseFormWatch<ReportFormValues>;
}

function TargetBadge({ value, actual }: { value: number; actual: number | string }) {
  const num = Number(actual);
  const ok = !isNaN(num) && num <= value;
  const na = isNaN(num) || actual === 'Нет данных';
  return (
    <span className={`text-xs pointer-events-none font-medium ${na ? 'text-gray-400' : ok ? 'text-green-600' : 'text-red-500'}`}>
      Цель: {value} дн.
    </span>
  );
}

export default function CustomerServiceSection({ register, watch }: Props) {
  const overdue = watch('cs_overdue');
  const avgWeek = watch('cs_avg_week');
  const avgMonth = watch('cs_avg_month');
  const settings = useSettingsMap();

  const targetWeek = Number(settings.cs_target_avg_days_week) || 2.5;
  const targetMonth = Number(settings.cs_target_avg_days_month) || 2.5;

  return (
    <div className="section-card">
      <div className="section-header" style={{ backgroundColor: '#6D28D9' }}>
        <Headphones size={14} className="opacity-70" />
        Customer Service
      </div>
      <div className="section-body">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Всего заявок за день</label>
            <input type="number" min={0} className="input-base"
              {...register('cs_total', { valueAsNumber: true })} />
          </div>
          <div>
            <label className="field-label">Просрочено заявок</label>
            <input type="number" min={0} className="input-base"
              {...register('cs_overdue', { valueAsNumber: true })} />
          </div>
        </div>

        {Number(overdue) > 0 && (
          <div>
            <label className="field-label">Причина просрочки</label>
            <input type="text" className="input-base" placeholder="Опишите причину..."
              {...register('cs_overdue_reason')} />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Средний срок — текущая неделя</label>
            <div className="relative">
              <input type="text" className="input-base pr-28" placeholder="Нет данных"
                {...register('cs_avg_week')} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <TargetBadge value={targetWeek} actual={String(avgWeek)} />
              </span>
            </div>
          </div>
          <div>
            <label className="field-label">Средний срок — текущий месяц</label>
            <div className="relative">
              <input type="number" step="0.01" min={0} className="input-base pr-28"
                {...register('cs_avg_month', { valueAsNumber: true })} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2">
                <TargetBadge value={targetMonth} actual={Number(avgMonth)} />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
