import type { UseFormRegister, UseFormWatch } from 'react-hook-form';
import { Headphones } from 'lucide-react';
import type { ReportFormValues } from '@/types/report';

interface Props {
  register: UseFormRegister<ReportFormValues>;
  watch: UseFormWatch<ReportFormValues>;
}

export default function CustomerServiceSection({ register, watch }: Props) {
  const overdue = watch('cs_overdue');

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
            <input
              type="number" min={0}
              className="input-base"
              {...register('cs_total', { valueAsNumber: true })}
            />
          </div>
          <div>
            <label className="field-label">Просрочено заявок</label>
            <input
              type="number" min={0}
              className="input-base"
              {...register('cs_overdue', { valueAsNumber: true })}
            />
          </div>
        </div>

        {Number(overdue) > 0 && (
          <div>
            <label className="field-label">Причина просрочки</label>
            <input
              type="text"
              className="input-base"
              placeholder="Опишите причину..."
              {...register('cs_overdue_reason')}
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label">Средний срок — текущая неделя</label>
            <div className="relative">
              <input
                type="text"
                className="input-base pr-24"
                placeholder="Нет данных"
                {...register('cs_avg_week')}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                Цель: 2,5 дн.
              </span>
            </div>
          </div>
          <div>
            <label className="field-label">Средний срок — текущий месяц</label>
            <div className="relative">
              <input
                type="number" step="0.01" min={0}
                className="input-base pr-24"
                {...register('cs_avg_month', { valueAsNumber: true })}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
                Цель: 2,5 дн.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
