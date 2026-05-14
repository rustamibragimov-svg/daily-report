import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { getWeekNumber } from '@/lib/utils';
import { generateExcelBase64 } from '@/utils/excel';
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

export function useDeleteReport() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Отчёт удалён');
      void qc.invalidateQueries({ queryKey: [TABLE, 'history'] });
    },
    onError: (err) => {
      toast.error(`Ошибка удаления: ${(err as Error).message}`);
    },
  });
}

export function useDeleteAllReports() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from(TABLE).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('История очищена');
      void qc.invalidateQueries({ queryKey: [TABLE, 'history'] });
    },
    onError: (err) => {
      toast.error(`Ошибка: ${(err as Error).message}`);
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

/** Send (or test-send) a saved report via Edge Function */
export async function sendReportEmail(
  report: DailyReport,
  testEmail?: string,
): Promise<void> {
  const excelBase64 = await generateExcelBase64(report);
  const { error } = await supabase.functions.invoke('send-report-email', {
    body: { report, excelBase64, testEmail },
  });
  if (error) throw new Error(error.message);
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: ({ report, email }: { report: DailyReport; email: string }) =>
      sendReportEmail(report, email),
    onSuccess: (_, { email }) => {
      toast.success(`Письмо отправлено на ${email} ✉️`, { duration: 5000 });
    },
    onError: (err) => {
      toast.error(`Ошибка отправки: ${(err as Error).message}`, { duration: 6000 });
    },
  });
}
