import { useState } from 'react';
import { toast } from 'sonner';
import { trackingSupabase } from '@/lib/tracking-supabase';

export interface BatchMetrics {
  sh_count: number;
  hk_count: number;
  gz_count: number;
  sh_weight: number;
  hk_weight: number;
  gz_weight: number;
  sh_mko: number;
  hk_mko: number;
  gz_mko: number;
  sh_mpo: number;
  hk_mpo: number;
  gz_mpo: number;
  sh_auto: number;
  hk_auto: number;
  gz_auto: number;
  sh_ratio: string;
  hk_ratio: string;
  gz_ratio: string;
}

interface BatchRow {
  gross_weight: number;
  vol_weight: number;
  type: string;
}

function aggregate(rows: BatchRow[]): { count: number; weight: number; mko: number; mpo: number; auto: number; ratio: string } {
  const count = rows.length;
  const weight = rows.reduce((s, r) => s + (r.gross_weight ?? 0), 0);
  const mko = rows.filter(r => r.type === 'МКО').reduce((s, r) => s + (r.gross_weight ?? 0), 0);
  const mpo = rows.filter(r => r.type === 'МПО').reduce((s, r) => s + (r.gross_weight ?? 0), 0);
  const auto = rows.filter(r => r.type === 'Автомат').reduce((s, r) => s + (r.gross_weight ?? 0), 0);

  // vol vs brutto ratio (average of vol/gross per batch, matching Excel AVERAGEIFS)
  const ratioRows = rows.filter(r => r.gross_weight > 0);
  const ratio = ratioRows.length > 0
    ? (ratioRows.reduce((s, r) => s + r.vol_weight / r.gross_weight, 0) / ratioRows.length).toFixed(3)
    : 'Нет данных';

  return { count, weight, mko, mpo, auto, ratio };
}

async function fetchForProject(
  date: string,
  project: 'UZUM' | 'Cainiao',
): Promise<BatchMetrics> {
  // UZUM: Shanghai filtered by date_accepted, HK by date_swe_arrival
  // Cainiao: both filtered by date_swe_shipment
  // (matches Excel COUNTIFS/SUMIFS formulas exactly)
  const shDateCol = project === 'UZUM' ? 'date_accepted' : 'date_swe_shipment';
  const hkDateCol = project === 'UZUM' ? 'date_swe_arrival' : 'date_swe_shipment';
  const gzDateCol = project === 'UZUM' ? 'date_accepted' : 'date_swe_shipment';

  const [{ data: shData }, { data: hkData }, { data: gzData }] = await Promise.all([
    trackingSupabase
      .from('batches')
      .select('gross_weight, vol_weight, type')
      .eq('project', project)
      .eq('origin', 'Шанхай')
      .eq(shDateCol, date),
    trackingSupabase
      .from('batches')
      .select('gross_weight, vol_weight, type')
      .eq('project', project)
      .eq('origin', 'Гонконг')
      .eq(hkDateCol, date),
    trackingSupabase
      .from('batches')
      .select('gross_weight, vol_weight, type')
      .eq('project', project)
      .eq('origin', 'Гуанчжоу')
      .eq(gzDateCol, date),
  ]);

  const sh = aggregate((shData ?? []) as BatchRow[]);
  const hk = aggregate((hkData ?? []) as BatchRow[]);
  const gz = aggregate((gzData ?? []) as BatchRow[]);

  return {
    sh_count: sh.count,   hk_count: hk.count,   gz_count: gz.count,
    sh_weight: sh.weight, hk_weight: hk.weight, gz_weight: gz.weight,
    sh_mko: sh.mko,       hk_mko: hk.mko,       gz_mko: gz.mko,
    sh_mpo: sh.mpo,       hk_mpo: hk.mpo,       gz_mpo: gz.mpo,
    sh_auto: sh.auto,     hk_auto: hk.auto,     gz_auto: gz.auto,
    sh_ratio: sh.ratio,   hk_ratio: hk.ratio,   gz_ratio: gz.ratio,
  };
}

export function useFetchBatchMetrics() {
  const [loading, setLoading] = useState(false);

  async function fetch(
    date: string,
    project: 'UZUM' | 'Cainiao',
    onSuccess: (m: BatchMetrics) => void,
  ) {
    if (!date) { toast.warning('Выберите дату'); return; }
    setLoading(true);
    try {
      const metrics = await fetchForProject(date, project);
      const total = metrics.sh_count + metrics.hk_count + metrics.gz_count;
      onSuccess(metrics);
      toast.success(
        total > 0
          ? `${project}: загружено ${total} партий за ${date}`
          : `${project}: партий за ${date} не найдено`,
      );
    } catch (err) {
      toast.error(`Ошибка загрузки ${project}: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  return { fetch, loading };
}
