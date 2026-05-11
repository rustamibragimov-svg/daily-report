import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

const TABLE = 'report_attachments';
const BUCKET = 'report-files';

export interface Attachment {
  id: string;
  report_date: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  uploaded_at: string;
}

export function useAttachments(reportDate: string) {
  return useQuery<Attachment[]>({
    queryKey: [TABLE, reportDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('report_date', reportDate)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attachment[];
    },
    enabled: !!reportDate,
  });
}

export function useAllAttachments() {
  return useQuery<Attachment[]>({
    queryKey: [TABLE, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('*')
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as Attachment[];
    },
  });
}

export function useUploadAttachments(reportDate: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (files: File[]) => {
      const results: Attachment[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._\-А-Яа-яёЁ ]/g, '_');
        const path = `${reportDate}/${Date.now()}_${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { upsert: false });
        if (uploadError) throw new Error(`${file.name}: ${uploadError.message}`);

        const { data, error: dbError } = await supabase
          .from(TABLE)
          .insert({
            report_date: reportDate,
            file_name: file.name,
            file_path: path,
            file_size: file.size,
            file_type: file.type || 'application/octet-stream',
          })
          .select()
          .single();
        if (dbError) throw dbError;
        results.push(data as Attachment);
      }
      return results;
    },
    onSuccess: (data) => {
      toast.success(`Загружено файлов: ${data.length}`);
      void qc.invalidateQueries({ queryKey: [TABLE, reportDate] });
      void qc.invalidateQueries({ queryKey: [TABLE, 'all'] });
    },
    onError: (err) => toast.error(`Ошибка загрузки: ${(err as Error).message}`),
  });
}

export function useDeleteAttachment(reportDate: string) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, filePath }: { id: string; filePath: string }) => {
      await supabase.storage.from(BUCKET).remove([filePath]);
      const { error } = await supabase.from(TABLE).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Файл удалён');
      void qc.invalidateQueries({ queryKey: [TABLE, reportDate] });
      void qc.invalidateQueries({ queryKey: [TABLE, 'all'] });
    },
    onError: (err) => toast.error(`Ошибка удаления: ${(err as Error).message}`),
  });
}

export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
