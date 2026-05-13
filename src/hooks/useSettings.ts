import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const TABLE = 'app_settings';

export interface AppSetting {
  key: string;
  value: string;
  label: string;
  section: string;
  updated_at: string;
}

export interface SettingsMap {
  cs_target_avg_days_week: number;
  cs_target_avg_days_month: number;
  [key: string]: string | number;
}

export function useSettings() {
  return useQuery<AppSetting[]>({
    queryKey: [TABLE],
    queryFn: async () => {
      const { data, error } = await supabase.from(TABLE).select('*').order('section');
      if (error) throw error;
      return (data ?? []) as AppSetting[];
    },
    staleTime: 1000 * 60 * 10, // cache 10 min
  });
}

export function useSettingsMap(): SettingsMap {
  const { data } = useSettings();
  const defaults: SettingsMap = {
    cs_target_avg_days_week: 2.5,
    cs_target_avg_days_month: 2.5,
  };
  if (!data) return defaults;
  return data.reduce<SettingsMap>((acc, s) => {
    acc[s.key] = isNaN(Number(s.value)) ? s.value : Number(s.value);
    return acc;
  }, { ...defaults });
}

export function useUpdateSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from(TABLE)
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', key);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Настройки сохранены');
      void qc.invalidateQueries({ queryKey: [TABLE] });
    },
    onError: (err) => toast.error(`Ошибка: ${(err as Error).message}`),
  });
}
