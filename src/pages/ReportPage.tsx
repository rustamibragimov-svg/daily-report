import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, Download, Loader2, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportFormValues } from '@/types/report';
import { DEFAULT_FORM } from '@/types/report';
import { todayISO, getWeekNumber } from '@/lib/utils';
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

  // Populate form when existing report loads
  useEffect(() => {
    if (existing) {
      reset({ ...existing });
    } else {
      reset({ ...DEFAULT_FORM, report_date: activeDate });
    }
  }, [existing, activeDate, reset]);

  const watchedDate = watch('report_date');
  const weekNumber = watchedDate ? getWeekNumber(watchedDate) : '';

  // Navigate when date picker changes
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('report_date', e.target.value);
    navigate(`/report/${e.target.value}`, { replace: true });
  };

  const onSubmit = (values: ReportFormValues) => {
    save.mutate(values);
  };

  const handleExport = () => {
    if (!existing) {
      toast.warning('Сначала сохраните отчёт');
      return;
    }
    void exportReportToExcel(existing);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Sticky toolbar */}
      <div className="sticky top-14 z-20 bg-gray-50 py-3 -mx-4 px-4 border-b border-gray-200 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <CalendarDays size={16} className="text-gray-500" />
          <input
            type="date"
            className="input-base w-44"
            value={watchedDate}
            onChange={handleDateChange}
          />
          {weekNumber && (
            <span className="text-sm text-gray-500 font-medium">{weekNumber}</span>
          )}
          {isLoading && <Loader2 size={14} className="animate-spin text-gray-400" />}
          {existing && !isLoading && (
            <span className="badge-ok">Сохранён</span>
          )}
          {!existing && !isLoading && (
            <span className="text-xs text-gray-400">Новый отчёт</span>
          )}
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={!existing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Download size={14} />
          Excel
        </button>

        <button
          type="submit"
          disabled={save.isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Сохранить
        </button>
      </div>

      <OperationalSection control={control} register={register} watch={(name) => watch(name) as string} />
      <CustomerServiceSection register={register} watch={watch} />
      <BatchSection
        prefix="uzum"
        title="UZUM CROSSBORDER"
        headerColor="#EA580C"
        register={register}
        watch={watch}
      />
      <BatchSection
        prefix="cainiao"
        title="CAINIAO"
        headerColor="#0D9488"
        register={register}
        watch={watch}
      />

      <div className="flex justify-end pb-8">
        <button
          type="submit"
          disabled={save.isPending}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {save.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Сохранить отчёт
        </button>
      </div>
    </form>
  );
}
