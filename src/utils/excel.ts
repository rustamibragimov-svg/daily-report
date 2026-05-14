import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { DailyReport, IncidentRow } from '@/types/report';
import { formatDateRu } from '@/lib/utils';
import {
  UZUM_LOGO_B64, UZUM_LOGO_W, UZUM_LOGO_H,
  CAINIAO_LOGO_B64, CAINIAO_LOGO_W, CAINIAO_LOGO_H,
} from './excelLogos';

// ─── Palette (ARGB) ──────────────────────────────────────────────────────────
const C = {
  secBg:        'FFBDD7EE', // Light blue — section headers
  secFg:        'FF1F3864', // Dark navy
  labelBg:      'FFD9D9D9', // Medium gray — labels
  labelFg:      'FF000000',
  white:        'FFFFFFFF',
  black:        'FF000000',
  altRow:       'FFF2F2F2', // alternating table row
  greenBg:      'FF92D050', // Status: OK
  greenFg:      'FFFFFFFF',
  greenLight:   'FFE2EFDA', // Bullets under OK
  greenLightFg: 'FF375623',
  redBg:        'FFFF0000', // Status: incident
  redFg:        'FFFFFFFF',
  redLight:     'FFFFC7CE', // Bullets under incident
  redLightFg:   'FF9C0006',
  orange:       'FFED7D31', // Notes (Цель, Причина)
  borderThin:   'FFB8CCE4', // light table border
  borderDark:   'FF000000',
} as const;
type Clr = keyof typeof C;


// ─── Core builder ─────────────────────────────────────────────────────────────
function buildWorkbook(wb: ExcelJS.Workbook, report: DailyReport): void {
  const ws = wb.addWorksheet('Ежедневная отчётность');

  // Columns: A(2) B(26 label) C(20 val) D(13 total) E(15 sh) F(15 hk)
  [2, 26, 20, 13, 15, 15].forEach((w, i) => (ws.getColumn(i + 1).width = w));

  let r = 1;

  /* helpers */
  function mc(r1: number, c1: number, r2: number, c2: number) {
    if (r1 === r2 && c1 === c2) return;
    try { ws.mergeCells(r1, c1, r2, c2); } catch { /* skip */ }
  }
  interface O {
    bold?: boolean; italic?: boolean; size?: number;
    fg?: Clr; bg?: Clr; align?: 'left' | 'center' | 'right';
    wrap?: boolean; indent?: number; bc?: Clr;
  }
  function sc(row: number, col: number, value: string | number, o: O = {}) {
    const cell = ws.getCell(row, col);
    cell.value = value;
    cell.font = { name: 'Calibri', size: o.size ?? 10, bold: o.bold, italic: o.italic,
      color: { argb: C[o.fg ?? 'black'] } };
    if (o.bg) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C[o.bg] } };
    cell.alignment = { horizontal: o.align ?? 'left', vertical: 'middle',
      wrapText: o.wrap, indent: o.indent ?? 0 };
    if (o.bc) {
      const bs = { style: 'thin' as const, color: { argb: C[o.bc] } };
      cell.border = { top: bs, left: bs, bottom: bs, right: bs };
    }
  }
  function H(height: number) { ws.getRow(r).height = height; }
  function gap(px = 4) { H(px); r++; }

  /* Section header: "N. TITLE" on light blue full-width */
  let secNum = 0;
  function secHead(title: string) {
    secNum++;
    mc(r, 1, r, 6);
    sc(r, 1, `${secNum}. ${title}`, { bold: true, size: 12, fg: 'secFg', bg: 'secBg', indent: 1 });
    H(22); r++;
    gap(3);
  }

  /* Label (B) + status value (C-F merged), with data validation option */
  function statusRow(label: string, value: string, statusOptions?: string[]) {
    sc(r, 2, label, { bold: true, bg: 'labelBg', bc: 'borderThin' });
    mc(r, 3, r, 6);
    const ok = !value.toLowerCase().includes('нарушени') && !value.toLowerCase().includes('присутствуют');
    sc(r, 3, value, {
      bold: true, size: 10, align: 'center',
      fg: ok ? 'greenFg' : 'redFg',
      bg: ok ? 'greenBg' : 'redBg',
      bc: 'borderThin',
    });
    if (statusOptions) {
      ws.getCell(r, 3).dataValidation = {
        type: 'list',
        formulae: [`"${statusOptions.join(',')}"`],
      };
    }
    H(22); r++;
  }

  /* Incident table (3 cols: Ответственный | Детали | Решение) */
  function incidentTable(rows: IncidentRow[]) {
    // Header
    for (const [col, lbl] of [[2, 'Ответственный'], [3, 'Детали'], [4, 'Решение']] as [number, string][]) {
      if (col === 4) mc(r, 4, r, 6);
      sc(r, col, lbl, { bold: true, size: 9, fg: 'labelFg', bg: 'labelBg', align: 'center', bc: 'borderThin' });
    }
    H(14); r++;

    // Rows (always 3, fill what we have)
    const filled = rows.filter(x => x.responsible || x.details || x.resolution);
    const display = filled.length ? filled : [{ responsible: '', details: '', resolution: '' }, { responsible: '', details: '', resolution: '' }, { responsible: '', details: '', resolution: '' }];
    const shown = display.slice(0, Math.max(3, display.length));

    for (const row of shown) {
      sc(r, 2, row.responsible ?? '', { size: 10, bg: 'white', bc: 'borderThin' });
      sc(r, 3, row.details ?? '', { size: 10, bg: 'white', bc: 'borderThin', wrap: true });
      mc(r, 4, r, 6);
      sc(r, 4, row.resolution ?? '', { size: 10, bg: 'white', bc: 'borderThin', wrap: true });
      if (row.responsible || !filled.length) {
        ws.getCell(r, 2).dataValidation = {
          type: 'list',
          formulae: ['"Наталья Матвиенко,Идель Ибрагимов,Рустам Ибрагимов"'],
        };
      }
      H(18); r++;
    }
    gap(3);
  }

  /* CS row: label | value (centered) | optional note (orange) */
  function csRow(label: string, value: string | number, note?: string) {
    sc(r, 2, label, { bold: true, bg: 'labelBg', bc: 'borderThin', wrap: true });
    if (note) {
      mc(r, 3, r, 4);
      sc(r, 3, value, { size: 11, align: 'center', bg: 'white', bc: 'borderThin' });
      mc(r, 5, r, 6);
      sc(r, 5, note, { size: 9, italic: true, fg: 'orange', bg: 'white', bc: 'borderThin' });
    } else {
      mc(r, 3, r, 6);
      sc(r, 3, value, { size: 11, align: 'center', bg: 'white', bc: 'borderThin' });
    }
    H(24); r++;
    gap(2);
  }

  /* Metrics table for UZUM/Cainiao */
  function metricsTable(prefix: 'uzum' | 'cainiao') {
    type K = keyof DailyReport;
    const s = (k: string) => (report[`${prefix}_sh_${k}` as K] as number) ?? 0;
    const g = (k: string) => (report[`${prefix}_hk_${k}` as K] as number) ?? 0;

    // Natural-proportion logos (UZUM 119x34, CAINIAO 61x34).
    // Row H(44pt)=58px > image 34px → 12px top/bottom padding, no overflow.
    // tl+ext = oneCellAnchor: correct size, no stretching.
    const b64 = prefix === 'uzum' ? UZUM_LOGO_B64 : CAINIAO_LOGO_B64;
    const imgW = prefix === 'uzum' ? UZUM_LOGO_W : CAINIAO_LOGO_W;
    const imgH = prefix === 'uzum' ? UZUM_LOGO_H : CAINIAO_LOGO_H;
    const logoId = wb.addImage({ base64: b64, extension: 'png' });

    mc(r, 2, r + 1, 3);
    sc(r, 2, '', { bg: 'white', bc: 'borderThin' });
    ws.addImage(logoId, {
      tl: { col: 1, row: r - 1 } as { col: number; row: number },
      ext: { width: imgW, height: imgH },
    });
    sc(r, 4, 'Всего',   { bold: true, size: 10, align: 'center', bg: 'labelBg', bc: 'borderThin' });
    sc(r, 5, 'Шанхай',  { bold: true, size: 10, align: 'center', bg: 'labelBg', bc: 'borderThin' });
    sc(r, 6, 'Гонконг', { bold: true, size: 10, align: 'center', bg: 'labelBg', bc: 'borderThin' });
    H(44); r++;

    for (let c = 4; c <= 6; c++) sc(r, c, '', { bg: 'altRow', bc: 'borderThin' });
    H(6); r++;

    const metricRows = [
      ['Количество принятых партий:', 'count'],
      ['Общий вес партий, кг:', 'weight'],
      ['Из них МКО, кг:', 'mko'],
      ['Из них МПО, кг:', 'mpo'],
      ['Из них Автомат, кг:', 'auto'],
    ] as [string, string][];

    for (const [label, key] of metricRows) {
      mc(r, 2, r, 3);
      sc(r, 2, label, { size: 10, bg: 'altRow', bc: 'borderThin' });
      sc(r, 4, s(key) + g(key), { size: 10, align: 'center', bg: 'white', bc: 'borderThin' });
      sc(r, 5, s(key), { size: 10, align: 'center', bg: 'white', bc: 'borderThin' });
      sc(r, 6, g(key), { size: 10, align: 'center', bg: 'white', bc: 'borderThin' });
      H(16); r++;
    }

    // vol/brutto
    mc(r, 2, r, 3);
    sc(r, 2, 'Соотношение vol vs brutto:', { size: 10, bg: 'altRow', bc: 'borderThin' });
    sc(r, 4, '', { bg: 'white', bc: 'borderThin' });
    sc(r, 5, (report[`${prefix}_sh_ratio` as K] as string) || 'Нет данных', { size: 10, align: 'center', bg: 'white', bc: 'borderThin' });
    sc(r, 6, (report[`${prefix}_hk_ratio` as K] as string) || 'Нет данных', { size: 10, align: 'center', bg: 'white', bc: 'borderThin' });
    H(16); r++;
    gap(5);
  }

  /* Operations block */
  const BULLETS = {
    china:    '- Все партии приняты у клиента в соответствии с планом\n- Все партии обработаны на SWE в соответствии с планом\n- Все партии отправлены из Китая в соответствии с планом',
    transit:  '- Все партии прибыли в Ташкент без задержек\n- Все партии доставлены на NWL без задержек\n- Все партии обработаны на NWL без задержек\n- Все партии отправлены в страну назначения без задержек',
    lastmile: '- Все партии доставлены в страну назначения без задержек\n- Все партии обработаны в стране назначения без задержек',
  };

  function opsBlock(label: string, statusKey: keyof DailyReport, incidentKey: keyof DailyReport, bullets: string) {
    const status = (report[statusKey] as string) ?? 'Без инцидентов';
    const incident = (report[incidentKey] as string) ?? '';
    const ok = !status.toLowerCase().includes('нарушени') && !status.toLowerCase().includes('присутствуют');

    // Status row
    sc(r, 2, label, { bold: true, bg: 'labelBg', bc: 'borderThin' });
    mc(r, 3, r, 6);
    sc(r, 3, status, {
      bold: true, size: 11, align: 'center',
      fg: ok ? 'greenFg' : 'redFg',
      bg: ok ? 'greenBg' : 'redBg',
      bc: 'borderThin',
    });
    ws.getCell(r, 3).dataValidation = {
      type: 'list',
      formulae: ['"Без инцидентов,Инцидены присутствуют"'],
    };
    H(20); r++;

    // Bullet points — height based on line count so nothing gets cut off
    mc(r, 2, r, 6);
    const cell = ws.getCell(r, 2);
    cell.value = bullets;
    cell.font = { name: 'Calibri', size: 9,
      color: { argb: C[ok ? 'greenLightFg' : 'redLightFg'] } };
    cell.fill = { type: 'pattern', pattern: 'solid',
      fgColor: { argb: C[ok ? 'greenLight' : 'redLight'] } };
    cell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true, indent: 1 };
    const bs = { style: 'thin' as const, color: { argb: C.borderThin } };
    cell.border = { top: bs, left: bs, bottom: bs, right: bs };
    const lineCount = bullets.split('\n').length;
    H(lineCount * 14 + 10); r++;

    // Incident description
    sc(r, 2, 'Описание индидента', { bold: true, bg: 'labelBg', bc: 'borderThin' });
    mc(r, 3, r, 6);
    sc(r, 3, incident, { size: 10, wrap: true, bg: 'white', bc: 'borderThin' });
    H(incident ? 38 : 18); r++;
    gap(4);
  }

  /* Full UZUM/Cainiao section */
  function bigSection(title: string, prefix: 'uzum' | 'cainiao') {
    secHead(title);
    metricsTable(prefix);

    type K = keyof DailyReport;
    opsBlock('Операции в Китае',    `${prefix}_china_status` as K,   `${prefix}_china_incident` as K,   BULLETS.china);
    opsBlock('Транзитные операции', `${prefix}_transit_status` as K, `${prefix}_transit_incident` as K, BULLETS.transit);
    opsBlock('Операции последней мили', `${prefix}_lastmile_status` as K, `${prefix}_lastmile_incident` as K, BULLETS.lastmile);
  }

  // ─── TITLE ────────────────────────────────────────────────────────────────
  mc(r, 1, r, 6);
  sc(r, 1, '3PL ЕЖЕДНЕВНЫЙ ОТЧЁТ', { bold: true, size: 14, fg: 'white', bg: 'secFg', align: 'center' });
  H(32); r++;

  mc(r, 1, r, 2);
  sc(r, 1, 'Дата отчёта', { bold: true, bg: 'labelBg', bc: 'borderThin' });
  sc(r, 3, formatDateRu(report.report_date), { bold: true, size: 11, bc: 'borderThin' });
  sc(r, 4, 'Неделя', { bold: true, bg: 'labelBg', bc: 'borderThin', align: 'center' });
  mc(r, 5, r, 6);
  sc(r, 5, report.week_number, { bold: true, size: 11, bc: 'borderThin' });
  H(20); r++;
  gap(6);

  // ─── 1. OPERATIONAL ───────────────────────────────────────────────────────
  secHead('ОБЩИЙ ОПЕРАЦИОННЫЙ КОНТРОЛЬ');
  statusRow('Точность данных:', report.data_accuracy, [
    'Все данные в трекер занесены своевременно и корректно',
    'Есть нарушения по точности и своевременности занесения данных',
  ]);
  incidentTable((report.accuracy_rows ?? []) as IncidentRow[]);

  statusRow('Инциденты:', report.incidents_status, ['Без инцидентов', 'Присутствуют']);
  incidentTable((report.incidents_rows ?? []) as IncidentRow[]);
  gap(4);

  // ─── 2. CS ────────────────────────────────────────────────────────────────
  secHead('CUSTOMER SERVICE');
  csRow('Всего заявок за день', report.cs_total);
  csRow('Просрочено заявок', report.cs_overdue,
    report.cs_overdue_reason ? `Причина: ${report.cs_overdue_reason}` : 'Причина: описание причины');
  csRow('Средний срок выполнения, дней\n(текущая неделя)', report.cs_avg_week || 'Нет данных', 'Цель: 2,5 дней');
  csRow('Средний срок выполнения, дней\n(текущий месяц)', report.cs_avg_month || 0, 'Цель: 2,5 дней');
  gap(4);

  // ─── 3 & 4. UZUM / CAINIAO ────────────────────────────────────────────────
  bigSection('UZUM CROSSBORDER', 'uzum');
  bigSection('CAINIAO', 'cainiao');
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
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
