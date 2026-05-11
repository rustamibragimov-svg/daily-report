import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getWeekNumber } from '@/lib/utils';
import type { DailyReport, ReportFormValues } from '@/types/report';

const TABLE = 'daily_reports';

export function useReportByDate(date: string) {
  return useQuery<DailyReport | null>({
    queryKey: [TABLE, date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('report_date', date)
        .maybeSingle();
      if (error) throw error;
      return data as DailyReport | null;
    },
    enabled: !!date,
  });
}

export function useReportHistory() {
  return useQuery<DailyReport[]>({
    queryKey: [TABLE, 'history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('report_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DailyReport[];
    },
  });
}

export function useSaveReport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (values: ReportFormValues) => {
      const payload = {
        ...values,
        week_number: getWeekNumber(values.report_date),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from(TABLE)
        .upsert(payload, { onConflict: 'report_date' })
        .select()
        .single();
      if (error) throw error;
      return data as DailyReport;
    },
    onSuccess: (data) => {
      toast.success('Отчёт сохранён');
      void qc.invalidateQueries({ queryKey: [TABLE, data.report_date] });
      void qc.invalidateQueries({ queryKey: [TABLE, 'history'] });
    },
    onError: (err) => {
      toast.error(`Ошибка сохранения: ${(err as Error).message}`);
    },
  });
}
