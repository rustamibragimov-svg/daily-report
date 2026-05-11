import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, Download, Loader2, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportFormValues } from '@/types/report';
import { DEFAULT_FORM } from '@/types/report';
import { todayISO, getWeekNumber, formatDateRu } from '@/lib/utils';
import { useReportByDate, useSaveReport } from '@/hooks/useReport';
import { exportReportToExcel } from '@/utils/excel';
import OperationalSection from '@/components/sections/OperationalSection';
import CustomerServiceSection from '@/components/sections/CustomerServiceSection';
import BatchSection from '@/components/sections/BatchSection';

export default function ReportPage() {
  const { date } = useParams<{ date?: string }>();
  const navigate = useNavigate();
  const activeDate = date ?? todayISO();

  const { data: existing, isLoading } = useReportByDate(activeDate);
  const save = useSaveReport();

  const { register, control, handleSubmit, reset, watch, setValue } = useForm<ReportFormValues>({
    defaultValues: { ...DEFAULT_FORM, report_date: activeDate },
  });

  useEffect(() => {
    if (existing) {
      reset({ ...existing });
    } else {
      reset({ ...DEFAULT_FORM, report_date: activeDate });
    }
  }, [existing, activeDate, reset]);

  const watchedDate = watch('report_date');
  const weekNumber = watchedDate ? getWeekNumber(watchedDate) : '';

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('report_date', e.target.value);
    navigate(`/report/${e.target.value}`, { replace: true });
  };

  const onSubmit = (values: ReportFormValues) => save.mutate(values);

  const handleExport = () => {
    if (!existing) { toast.warning('Сначала сохраните отчёт'); return; }
    void exportReportToExcel(existing);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="page-title">Ежедневный отчёт</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Операционный контроль · Customer Service · UZUM · Cainiao
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExport}
            disabled={!existing}
            className="flex items-center gap-2 px-3.5 py-2 text-sm rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            <Download size={14} className="text-gray-500" />
            Скачать Excel
          </button>
          <button
            type="submit"
            disabled={save.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-[#1C1C2E] text-white hover:bg-[#2a2a40] disabled:opacity-60 transition-colors shadow-sm"
          >
            {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Сохранить
          </button>
        </div>
      </div>

      {/* Date bar */}
      <div className="section-card">
        <div className="px-5 py-4 flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2.5">
            <CalendarDays size={15} className="text-gray-400" />
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Дата</label>
            <input
              type="date"
              className="input-base w-40"
              value={watchedDate}
              onChange={handleDateChange}
            />
          </div>

          {weekNumber && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 uppercase tracking-wide font-medium">Неделя</span>
              <span className="px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-sm font-semibold">
                {weekNumber}
              </span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2">
            {isLoading && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 size={13} className="animate-spin" /> Загрузка...
              </span>
            )}
            {!isLoading && existing && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 size={14} />
                Отчёт сохранён · {formatDateRu(existing.updated_at.slice(0, 10))}
              </span>
            )}
            {!isLoading && !existing && (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Clock size={13} />
                Новый отчёт
              </span>
            )}
          </div>
        </div>
      </div>

      <OperationalSection control={control} register={register} watch={(name) => watch(name) as string} />
      <CustomerServiceSection register={register} watch={watch} />
      <BatchSection prefix="uzum" title="UZUM CROSSBORDER" headerColor="#7C22C5" register={register} watch={watch} />
      <BatchSection prefix="cainiao" title="CAINIAO" headerColor="#1D6FCC" register={register} watch={watch} />

      <div className="flex justify-end pb-8">
        <button
          type="submit"
          disabled={save.isPending}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-[#1C1C2E] text-white hover:bg-[#2a2a40] disabled:opacity-60 transition-colors shadow-sm"
        >
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Сохранить отчёт
        </button>
      </div>
    </form>
  );
}
