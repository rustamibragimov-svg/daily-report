import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { DailyReport, IncidentRow } from '@/types/report';
import { formatDateRu } from '@/lib/utils';

const BLUE = 'FF2563EB';
const ORANGE = 'FFEA580C';
const LIGHT_ORANGE = 'FFFFEDD5';
const TEAL = 'FF0D9488';
const LIGHT_TEAL = 'FFCCFBF1';
const GRAY = 'FFF3F4F6';

function h(ws: ExcelJS.Worksheet, row: number, col: number, value: string, bgHex: string, bold = true) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.font = { bold, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgHex } };
  cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
}

function label(ws: ExcelJS.Worksheet, row: number, col: number, value: string) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } };
  cell.alignment = { vertical: 'middle', wrapText: true };
}

function val(ws: ExcelJS.Worksheet, row: number, col: number, value: string | number, wrap = false) {
  const cell = ws.getCell(row, col);
  cell.value = value;
  cell.font = { size: 10 };
  cell.alignment = { vertical: 'middle', wrapText: wrap };
}

function statusCell(ws: ExcelJS.Worksheet, row: number, col: number, status: string) {
  const cell = ws.getCell(row, col);
  const ok = status === 'Без инцидентов' || status.includes('своевременно');
  cell.value = status;
  cell.font = { bold: true, size: 10, color: { argb: ok ? 'FF166534' : 'FF991B1B' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ok ? 'FFDCFCE7' : 'FFFEE2E2' } };
  cell.alignment = { vertical: 'middle', wrapText: true };
}

function border(ws: ExcelJS.Worksheet, rowStart: number, rowEnd: number, colStart: number, colEnd: number) {
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      const cell = ws.getCell(r, c);
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      };
    }
  }
}

export async function exportReportToExcel(report: DailyReport) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Ежедневная отчётность');

  // Column widths
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 38;
  ws.getColumn(3).width = 42;
  ws.getColumn(4).width = 28;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;

  let r = 1;

  // ── Title ──────────────────────────────────────────────────────────────
  ws.mergeCells(r, 1, r, 7);
  const title = ws.getCell(r, 1);
  title.value = '3PL ЕЖЕДНЕВНЫЙ ОТЧЁТ';
  title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(r).height = 28;
  r++;

  // Date row
  ws.mergeCells(r, 1, r, 2);
  label(ws, r, 1, 'Дата отчёта:');
  ws.mergeCells(r, 3, r, 4);
  val(ws, r, 3, formatDateRu(report.report_date));
  ws.mergeCells(r, 5, r, 5);
  label(ws, r, 5, 'Неделя:');
  ws.mergeCells(r, 6, r, 7);
  val(ws, r, 6, report.week_number);
  ws.getRow(r).height = 20;
  r++;
  r++;

  // ── Section 1: Operational Control ────────────────────────────────────
  ws.mergeCells(r, 1, r, 7);
  h(ws, r, 1, 'ОБЩИЙ ОПЕРАЦИОННЫЙ КОНТРОЛЬ', BLUE);
  ws.getRow(r).height = 22;
  r++;

  ws.mergeCells(r, 2, r, 2);
  label(ws, r, 2, 'Точность данных:');
  ws.mergeCells(r, 3, r, 7);
  statusCell(ws, r, 3, report.data_accuracy);
  ws.getRow(r).height = 30;
  r++;

  const accRows = report.accuracy_rows as IncidentRow[];
  if (accRows.some(row => row.responsible || row.details)) {
    label(ws, r, 2, 'Ответственный'); label(ws, r, 3, 'Детали'); label(ws, r, 4, 'Решение');
    ws.getRow(r).height = 18; r++;
    for (const row of accRows) {
      if (row.responsible || row.details || row.resolution) {
        val(ws, r, 2, row.responsible); val(ws, r, 3, row.details, true); val(ws, r, 4, row.resolution, true);
        ws.getRow(r).height = 18; r++;
      }
    }
  }

  ws.mergeCells(r, 2, r, 2);
  label(ws, r, 2, 'Инциденты:');
  ws.mergeCells(r, 3, r, 7);
  statusCell(ws, r, 3, report.incidents_status);
  ws.getRow(r).height = 22; r++;

  const incRows = report.incidents_rows as IncidentRow[];
  if (incRows.some(row => row.responsible || row.details)) {
    label(ws, r, 2, 'Ответственный'); label(ws, r, 3, 'Детали'); label(ws, r, 4, 'Решение');
    ws.getRow(r).height = 18; r++;
    for (const row of incRows) {
      if (row.responsible || row.details || row.resolution) {
        val(ws, r, 2, row.responsible); val(ws, r, 3, row.details, true); val(ws, r, 4, row.resolution, true);
        ws.getRow(r).height = 18; r++;
      }
    }
  }
  r++;

  // ── Section 2: Customer Service ───────────────────────────────────────
  ws.mergeCells(r, 1, r, 7);
  h(ws, r, 1, 'CUSTOMER SERVICE', '9333EA');
  ws.getRow(r).height = 22; r++;

  const csRows: [string, string | number, string?][] = [
    ['Всего заявок за день', report.cs_total],
    ['Просрочено заявок', report.cs_overdue, report.cs_overdue_reason ? `Причина: ${report.cs_overdue_reason}` : ''],
    ['Средний срок выполнения (текущая неделя)', report.cs_avg_week, 'Цель: 2,5 дней'],
    ['Средний срок выполнения (текущий месяц)', report.cs_avg_month, 'Цель: 2,5 дней'],
  ];
  for (const [lbl, v, note] of csRows) {
    ws.mergeCells(r, 2, r, 2);
    label(ws, r, 2, lbl);
    val(ws, r, 3, v);
    if (note) val(ws, r, 4, note);
    ws.getRow(r).height = 20; r++;
  }
  r++;

  // ── Shared: metrics table ─────────────────────────────────────────────
  function writeMetrics(
    title: string,
    color: string,
    lightColor: string,
    prefix: 'uzum' | 'cainiao',
  ) {
    ws.mergeCells(r, 1, r, 7);
    h(ws, r, 1, title, color);
    ws.getRow(r).height = 22;
    // @ts-ignore outer scope r
    // eslint-disable-next-line no-param-reassign
    r++;

    // Table header
    for (const [c, t] of [[2, 'Метрика'], [4, 'Всего'], [5, 'Шанхай'], [6, 'Гонконг']] as [number, string][]) {
      const cell = ws.getCell(r, c);
      cell.value = t;
      cell.font = { bold: true, size: 10, color: { argb: 'FF374151' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightColor } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    ws.mergeCells(r, 2, r, 3);
    ws.getRow(r).height = 18; r++;

    const sh = `${prefix}_sh` as const;
    const hk = `${prefix}_hk` as const;

    const rows: [string, number | string, number | string, number | string][] = [
      ['Кол-во принятых партий', (report[`${sh}_count`] as number) + (report[`${hk}_count`] as number), report[`${sh}_count`] as number, report[`${hk}_count`] as number],
      ['Общий вес партий, кг', (report[`${sh}_weight`] as number) + (report[`${hk}_weight`] as number), report[`${sh}_weight`] as number, report[`${hk}_weight`] as number],
      ['МКО, кг', (report[`${sh}_mko`] as number) + (report[`${hk}_mko`] as number), report[`${sh}_mko`] as number, report[`${hk}_mko`] as number],
      ['МПО, кг', (report[`${sh}_mpo`] as number) + (report[`${hk}_mpo`] as number), report[`${sh}_mpo`] as number, report[`${hk}_mpo`] as number],
      ['Автомат, кг', (report[`${sh}_auto`] as number) + (report[`${hk}_auto`] as number), report[`${sh}_auto`] as number, report[`${hk}_auto`] as number],
      ['Соотношение vol vs brutto', '—', report[`${sh}_ratio`] as string, report[`${hk}_ratio`] as string],
    ];

    for (const [lbl, total, shVal, hkVal] of rows) {
      ws.mergeCells(r, 2, r, 3);
      label(ws, r, 2, lbl);
      val(ws, r, 4, total); val(ws, r, 5, shVal); val(ws, r, 6, hkVal);
      ws.getRow(r).height = 18; r++;
    }
    r++;

    // Operations
    for (const [opLabel, statusKey, incidentKey] of [
      ['Операции в Китае', `${prefix}_china_status`, `${prefix}_china_incident`],
      ['Транзитные операции', `${prefix}_transit_status`, `${prefix}_transit_incident`],
      ['Операции последней мили', `${prefix}_lastmile_status`, `${prefix}_lastmile_incident`],
    ] as [string, keyof DailyReport, keyof DailyReport][]) {
      ws.mergeCells(r, 2, r, 3);
      label(ws, r, 2, opLabel);
      ws.mergeCells(r, 4, r, 7);
      statusCell(ws, r, 4, report[statusKey] as string);
      ws.getRow(r).height = 20; r++;

      const incident = report[incidentKey] as string;
      if (incident) {
        ws.mergeCells(r, 2, r, 3);
        label(ws, r, 2, 'Описание инцидента:');
        ws.mergeCells(r, 4, r, 7);
        val(ws, r, 4, incident, true);
        ws.getRow(r).height = 36; r++;
      }
    }
    r++;
  }

  writeMetrics('UZUM CROSSBORDER', ORANGE, LIGHT_ORANGE, 'uzum');
  writeMetrics('CAINIAO', TEAL, LIGHT_TEAL, 'cainiao');

  border(ws, 1, r - 1, 1, 7);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `3PL_daily_report_${report.report_date}.xlsx`);
}
