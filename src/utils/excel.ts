import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { DailyReport, IncidentRow } from '@/types/report';
import { formatDateRu } from '@/lib/utils';

// ─── Palette (ARGB) ──────────────────────────────────────────────────────────
const C = {
  dark:       'FF1C1C2E',
  cs:         'FF6D28D9',
  uzum:       'FF7C22C5',
  cainiao:    'FF1D6FCC',
  white:      'FFFFFFFF',
  gray50:     'FFF9FAFB',
  gray100:    'FFF3F4F6',
  gray200:    'FFE5E7EB',
  gray400:    'FF9CA3AF',
  gray700:    'FF374151',
  gray900:    'FF111827',
  green50:    'FFF0FDF4',
  green100:   'FFDCFCE7',
  green200:   'FFBBF7D0',
  green700:   'FF15803D',
  red50:      'FFFEF2F2',
  red100:     'FFFEE2E2',
  red200:     'FFFECACA',
  red700:     'FFB91C1C',
} as const;

type Clr = keyof typeof C;

// ─── Builder ─────────────────────────────────────────────────────────────────
function buildWorkbook(wb: ExcelJS.Workbook, report: DailyReport): void {
  const ws = wb.addWorksheet('Ежедневная отчётность');

  // A(2) | B(30 label) | C(22 value) | D(12 total) | E(14 Shanghai) | F(14 HK)
  [2, 30, 22, 12, 14, 14].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  let r = 1;

  /* ── helpers ── */
  function mc(r1: number, c1: number, r2: number, c2: number) {
    if (r1 === r2 && c1 === c2) return;
    try { ws.mergeCells(r1, c1, r2, c2); } catch { /* already merged */ }
  }

  interface CellOpts {
    bold?: boolean; italic?: boolean; size?: number;
    fg?: Clr; bg?: Clr;
    align?: 'left' | 'center' | 'right';
    wrap?: boolean; indent?: number;
    bc?: Clr; // border color
  }

  function sc(row: number, col: number, value: string | number, o: CellOpts = {}) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.font = {
      name: 'Calibri', size: o.size ?? 10,
      bold: o.bold ?? false, italic: o.italic ?? false,
      color: { argb: C[o.fg ?? 'gray900'] },
    };
    if (o.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C[o.bg] } };
    cell.alignment = { horizontal: o.align ?? 'left', vertical: 'middle', wrapText: o.wrap ?? false, indent: o.indent ?? 0 };
    if (o.bc) {
      const bs = { style: 'thin' as const, color: { argb: C[o.bc] } };
      cell.border = { top: bs, left: bs, bottom: bs, right: bs };
    }
  }

  function h(height: number) { ws.getRow(r).height = height; }
  function gap(px = 5) { h(px); r++; }

  // Section header spanning all 6 cols
  function secHead(text: string, bg: Clr) {
    mc(r, 1, r, 6);
    sc(r, 1, text, { bold: true, size: 11, fg: 'white', bg, indent: 1 });
    h(26); r++;
  }

  // Label (col B) + value (cols C–F merged), optional status coloring
  function row2(
    label: string,
    value: string | number,
    isStatus = false,
    note?: string,
  ) {
    sc(r, 2, label, { bold: true, bg: 'gray100', bc: 'gray200' });
    const ok = isStatus
      ? (String(value).includes('своевременно') || value === 'Без инцидентов')
      : null;
    const vfg: Clr = ok === true ? 'green700' : ok === false ? 'red700' : 'gray900';
    const vbg: Clr | undefined = ok === true ? 'green100' : ok === false ? 'red100' : undefined;
    const vbc: Clr = ok === true ? 'green200' : ok === false ? 'red200' : 'gray200';

    if (note) {
      mc(r, 3, r, 4);
      sc(r, 3, value, { bold: isStatus, fg: vfg, bg: vbg, bc: vbc });
      mc(r, 5, r, 6);
      sc(r, 5, note, { size: 9, italic: true, fg: 'gray400', bc: 'gray200' });
    } else {
      mc(r, 3, r, 6);
      sc(r, 3, value, { bold: isStatus, fg: vfg, bg: vbg, bc: vbc });
    }
    h(20); r++;
  }

  // 3-col table header: Ответственный | Детали | Решение
  function incHead() {
    sc(r, 2, 'Ответственный', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200' });
    sc(r, 3, 'Детали', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200' });
    mc(r, 4, r, 6);
    sc(r, 4, 'Решение', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200' });
    h(16); r++;
  }

  function incRows(rows: IncidentRow[]) {
    const filled = rows.filter(x => x.responsible || x.details || x.resolution);
    if (!filled.length) return;
    incHead();
    for (const row of filled) {
      sc(r, 2, row.responsible ?? '', { size: 10, bc: 'gray200' });
      sc(r, 3, row.details ?? '', { size: 10, bc: 'gray200', wrap: true });
      mc(r, 4, r, 6);
      sc(r, 4, row.resolution ?? '', { size: 10, bc: 'gray200', wrap: true });
      h(20); r++;
    }
  }

  // Metrics table (B:C=label, D=total, E=shanghai, F=hk)
  function metricsTable(prefix: 'uzum' | 'cainiao') {
    // Header
    mc(r, 2, r, 3);
    sc(r, 2, 'Метрика', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200' });
    sc(r, 4, 'Всего', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200', align: 'center' });
    sc(r, 5, 'Шанхай', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200', align: 'center' });
    sc(r, 6, 'Гонконг', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200', align: 'center' });
    h(18); r++;

    type K = keyof DailyReport;
    const s = (k: string) => (report[`${prefix}_sh_${k}` as K] as number) ?? 0;
    const g = (k: string) => (report[`${prefix}_hk_${k}` as K] as number) ?? 0;

    for (const [label, key] of [
      ['Кол-во принятых партий', 'count'],
      ['Общий вес партий, кг', 'weight'],
      ['МКО, кг', 'mko'],
      ['МПО, кг', 'mpo'],
      ['Автомат, кг', 'auto'],
    ] as [string, string][]) {
      mc(r, 2, r, 3);
      sc(r, 2, label, { bold: true, size: 10, bg: 'gray100', bc: 'gray200' });
      sc(r, 4, s(key) + g(key), { bold: true, size: 10, bg: 'gray50', bc: 'gray200', align: 'center' });
      sc(r, 5, s(key), { size: 10, bc: 'gray200', align: 'center' });
      sc(r, 6, g(key), { size: 10, bc: 'gray200', align: 'center' });
      h(20); r++;
    }

    // Vol/brutto
    mc(r, 2, r, 3);
    sc(r, 2, 'Соотношение vol vs brutto', { bold: true, size: 10, bg: 'gray100', bc: 'gray200' });
    sc(r, 4, '—', { size: 10, fg: 'gray400', bg: 'gray50', bc: 'gray200', align: 'center' });
    sc(r, 5, (report[`${prefix}_sh_ratio` as K] as string) || 'Нет данных', { size: 10, bc: 'gray200', align: 'center' });
    sc(r, 6, (report[`${prefix}_hk_ratio` as K] as string) || 'Нет данных', { size: 10, bc: 'gray200', align: 'center' });
    h(20); r++;
  }

  // Operations block (label | status + bullets + incident description)
  function opsBlock(
    label: string,
    statusKey: keyof DailyReport,
    incidentKey: keyof DailyReport,
    bullets: string,
  ) {
    const status = (report[statusKey] as string) ?? 'Без инцидентов';
    const incident = (report[incidentKey] as string) ?? '';
    const ok = status === 'Без инцидентов';

    // Row 1: label | status
    sc(r, 2, label, { bold: true, size: 10, bg: 'gray100', bc: 'gray200' });
    mc(r, 3, r, 6);
    sc(r, 3, status, {
      bold: true, size: 10, align: 'center',
      fg: ok ? 'green700' : 'red700',
      bg: ok ? 'green100' : 'red100',
      bc: ok ? 'green200' : 'red200',
    });
    h(20); r++;

    // Row 2: bullet points
    mc(r, 2, r, 6);
    sc(r, 2, bullets.replace(/^-/gm, '•'), {
      size: 9, wrap: true,
      fg: ok ? 'green700' : 'gray400',
      bg: ok ? 'green50' : 'gray50',
      bc: ok ? 'green200' : 'gray200',
    });
    h(50); r++;

    // Row 3: incident description
    sc(r, 2, 'Описание инцидента', { bold: true, size: 9, fg: 'gray400', bg: 'gray50', bc: 'gray200' });
    mc(r, 3, r, 6);
    sc(r, 3, incident, {
      size: 10, wrap: true,
      bg: incident ? 'red50' : 'white',
      bc: incident ? 'red200' : 'gray200',
    });
    h(incident ? 40 : 22); r++;
    gap(3);
  }

  // Full UZUM/Cainiao section
  function bigSection(title: string, color: Clr, prefix: 'uzum' | 'cainiao') {
    type K = keyof DailyReport;
    secHead(title, color);
    metricsTable(prefix);
    gap(4);
    opsBlock('Операции в Китае',
      `${prefix}_china_status` as K, `${prefix}_china_incident` as K,
      '- Все партии приняты у клиента в соответствии с планом\n- Все партии обработаны на SWE в соответствии с планом\n- Все партии отправлены из Китая в соответствии с планом');
    opsBlock('Транзитные операции',
      `${prefix}_transit_status` as K, `${prefix}_transit_incident` as K,
      '- Все партии прибыли в Ташкент без задержек\n- Все партии доставлены на NWL без задержек\n- Все партии обработаны на NWL без задержек\n- Все партии отправлены в страну назначения без задержек');
    opsBlock('Операции последней мили',
      `${prefix}_lastmile_status` as K, `${prefix}_lastmile_incident` as K,
      '- Все партии доставлены в страну назначения без задержек\n- Все партии обработаны в стране назначения без задержек');
    gap();
  }

  // ─── ASSEMBLE ────────────────────────────────────────────────────────────────

  // Title
  mc(r, 1, r, 6);
  sc(r, 1, '3PL ЕЖЕДНЕВНЫЙ ОТЧЁТ', { bold: true, size: 14, fg: 'white', bg: 'dark', align: 'center' });
  h(34); r++;

  // Date / Week
  mc(r, 1, r, 2);
  sc(r, 1, 'Дата отчёта', { bold: true, bg: 'gray100', bc: 'gray200' });
  sc(r, 3, formatDateRu(report.report_date), { bold: true, bc: 'gray200' });
  sc(r, 4, 'Неделя', { bold: true, bg: 'gray100', bc: 'gray200', align: 'center' });
  mc(r, 5, r, 6);
  sc(r, 5, report.week_number, { bold: true, bc: 'gray200' });
  h(22); r++;
  gap();

  // Section 1 — Operational
  secHead('ОБЩИЙ ОПЕРАЦИОННЫЙ КОНТРОЛЬ', 'dark');
  row2('Точность данных', report.data_accuracy, true);
  incRows((report.accuracy_rows ?? []) as IncidentRow[]);
  gap(4);
  row2('Инциденты', report.incidents_status, true);
  incRows((report.incidents_rows ?? []) as IncidentRow[]);
  gap();

  // Section 2 — CS
  secHead('CUSTOMER SERVICE', 'cs');
  row2('Всего заявок за день', report.cs_total);
  row2('Просрочено заявок', report.cs_overdue, false,
    report.cs_overdue_reason ? `Причина: ${report.cs_overdue_reason}` : '');
  row2('Средний срок выполнения (текущая неделя)', report.cs_avg_week || 'Нет данных', false, 'Цель: 2,5 дней');
  row2('Средний срок выполнения (текущий месяц)', report.cs_avg_month, false, 'Цель: 2,5 дней');
  gap();

  // Sections 3 & 4
  bigSection('UZUM CROSSBORDER', 'uzum', 'uzum');
  bigSection('CAINIAO', 'cainiao', 'cainiao');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function exportReportToExcel(report: DailyReport): Promise<void> {
  const wb = new ExcelJS.Workbook();
  buildWorkbook(wb, report);
  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `3PL_daily_report_${report.report_date}.xlsx`,
  );
}

export async function generateExcelBase64(report: DailyReport): Promise<string> {
  const wb = new ExcelJS.Workbook();
  buildWorkbook(wb, report);
  const buf = await wb.xlsx.writeBuffer();
  const bytes = new Uint8Array(buf as ArrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
