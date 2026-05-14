import type { DailyReport, IncidentRow } from '@/types/report';

const BASE_URL = 'https://daily-report-dlg.pages.dev';

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** Fix #1: check for BAD keywords, not good ones */
function isOk(status: string | undefined): boolean {
  if (!status) return true;
  const s = status.toLowerCase();
  return !s.includes('нарушени') && !s.includes('присутствуют');
}

function esc(s: string | number | undefined | null): string {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── palette ──────────────────────────────────────────────────────────────────
const C = {
  sec1: '#1C1C2E', sec2: '#6D28D9', sec3: '#7C22C5', sec4: '#1D6FCC',
  labelBg: '#f3f4f6', labelFg: '#374151',
  border: '#e5e7eb', borderDk: '#d1d5db',
  okBg: '#16a34a', okBulletBg: '#f0fdf4', okBulletFg: '#166534', okBulletBorder: '#bbf7d0',
  errBg: '#dc2626', errBulletBg: '#fef2f2', errBulletFg: '#991b1b', errBulletBorder: '#fecaca',
  orange: '#d97706', altRow: '#f9fafb',
};

const BULLETS = {
  china:
    '- Все партии приняты у клиента в соответствии с планом\n' +
    '- Все партии обработаны на SWE в соответствии с планом\n' +
    '- Все партии отправлены из Китая в соответствии с планом',
  transit:
    '- Все партии прибыли в Ташкент без задержек\n' +
    '- Все партии доставлены на NWL без задержек\n' +
    '- Все партии обработаны на NWL без задержек\n' +
    '- Все партии отправлены в страну назначения без задержек',
  lastmile:
    '- Все партии доставлены в страну назначения без задержек\n' +
    '- Все партии обработаны в стране назначения без задержек',
};

// ─── building blocks ──────────────────────────────────────────────────────────
function sectionHead(num: number, title: string, color: string, emoji?: string): string {
  return `
  <tr>
    <td style="background:${color};padding:11px 24px;color:#fff;font-size:13px;font-weight:bold;font-family:Arial,sans-serif;letter-spacing:0.3px;">
      ${emoji ? `${emoji}&nbsp;` : ''}${num}. ${title}
    </td>
  </tr>`;
}

function sep(): string {
  return `<tr><td style="height:1px;background:${C.border};"></td></tr>`;
}

function statusBadge(value: string): string {
  const ok = isOk(value);
  return `<td style="padding:9px 12px;background:${ok ? C.okBg : C.errBg};color:#fff;font-weight:bold;font-size:12px;text-align:center;border:1px solid ${ok ? '#15803d' : '#b91c1c'};">${esc(value)}</td>`;
}

function statusRow(label: string, value: string): string {
  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:10px;">
    <tr>
      <td style="padding:9px 12px;background:${C.labelBg};font-weight:bold;font-size:12px;color:${C.labelFg};border:1px solid ${C.border};width:42%;">${esc(label)}</td>
      ${statusBadge(value)}
    </tr>
  </table>`;
}

function incidentTable(rows: IncidentRow[]): string {
  const filled = rows.filter(r => r.responsible || r.details || r.resolution);
  const display = filled.length
    ? filled
    : [
        { responsible: '', details: '', resolution: '' },
        { responsible: '', details: '', resolution: '' },
        { responsible: '', details: '', resolution: '' },
      ];

  const rowsHtml = display
    .map(
      row => `
    <tr>
      <td style="padding:7px 10px;background:#fff;font-size:12px;color:${C.labelFg};border:1px solid ${C.border};">${esc(row.responsible) || '&nbsp;'}</td>
      <td style="padding:7px 10px;background:#fff;font-size:12px;color:${C.labelFg};border:1px solid ${C.border};">${esc(row.details) || '&nbsp;'}</td>
      <td style="padding:7px 10px;background:#fff;font-size:12px;color:${C.labelFg};border:1px solid ${C.border};">${esc(row.resolution) || '&nbsp;'}</td>
    </tr>`,
    )
    .join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:14px;">
    <tr>
      <th style="padding:7px 10px;background:#e5e7eb;font-size:11px;font-weight:bold;color:${C.labelFg};text-align:left;border:1px solid ${C.borderDk};width:30%;">Ответственный</th>
      <th style="padding:7px 10px;background:#e5e7eb;font-size:11px;font-weight:bold;color:${C.labelFg};text-align:left;border:1px solid ${C.borderDk};width:40%;">Детали</th>
      <th style="padding:7px 10px;background:#e5e7eb;font-size:11px;font-weight:bold;color:${C.labelFg};text-align:left;border:1px solid ${C.borderDk};width:30%;">Решение</th>
    </tr>
    ${rowsHtml}
  </table>`;
}

/** Fix #2: single table for all CS rows so columns stay perfectly aligned */
function csTable(rows: Array<{ label: string; value: string | number; note?: string }>): string {
  const tds = rows.map(({ label, value, note }) => {
    const valueCell = note
      ? `<td style="padding:9px 12px;background:#fff;font-size:13px;color:#1f2937;text-align:center;border:1px solid ${C.border};">${esc(value)}</td>
      <td style="padding:9px 12px;background:#fff;font-size:11px;color:${C.orange};font-style:italic;border:1px solid ${C.border};white-space:nowrap;">${esc(note)}</td>`
      : `<td colspan="2" style="padding:9px 12px;background:#fff;font-size:13px;color:#1f2937;text-align:center;border:1px solid ${C.border};">${esc(value)}</td>`;
    return `
    <tr>
      <td style="padding:9px 12px;background:${C.labelBg};font-size:12px;font-weight:bold;color:${C.labelFg};border:1px solid ${C.border};">${esc(label)}</td>
      ${valueCell}
    </tr>
    <tr><td colspan="3" style="height:6px;background:transparent;border:none;"></td></tr>`;
  }).join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;table-layout:fixed;">
    <colgroup><col style="width:52%"><col style="width:20%"><col style="width:28%"></colgroup>
    ${tds}
  </table>`;
}

function opsBlock(label: string, status: string, incident: string, bullets: string): string {
  const ok = isOk(status);
  const bulletLines = bullets
    .split('\n')
    .map(b => `<span style="display:block;margin-bottom:3px;">${esc(b)}</span>`)
    .join('');

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:10px;">
    <tr>
      <td style="padding:9px 12px;background:${C.labelBg};font-size:12px;font-weight:bold;color:${C.labelFg};border:1px solid ${C.border};width:42%;">${esc(label)}</td>
      ${statusBadge(status)}
    </tr>
    <tr>
      <td colspan="2" style="padding:9px 12px;background:${ok ? C.okBulletBg : C.errBulletBg};font-size:11px;color:${ok ? C.okBulletFg : C.errBulletFg};border:1px solid ${ok ? C.okBulletBorder : C.errBulletBorder};line-height:1.75;">
        ${bulletLines}
      </td>
    </tr>
    ${incident ? `
    <tr>
      <td style="padding:7px 12px;background:${C.labelBg};font-size:11px;font-weight:bold;color:${C.labelFg};border:1px solid ${C.border};width:42%;">Описание инцидента</td>
      <td style="padding:7px 12px;background:#fffbeb;font-size:12px;color:#92400e;border:1px solid #fde68a;">${esc(incident)}</td>
    </tr>` : ''}
  </table>`;
}

/** Fix #3: show logo images for UZUM and Cainiao */
function metricsBlock(prefix: 'uzum' | 'cainiao', report: Partial<DailyReport>): string {
  type K = keyof DailyReport;
  const n = (k: string) => ((report[`${prefix}_${k}` as K] as number) ?? 0);
  const s = (k: string) => ((report[`${prefix}_${k}` as K] as string) ?? 'Нет данных');

  const sh_c = n('sh_count'), hk_c = n('hk_count');
  const sh_w = n('sh_weight'), hk_w = n('hk_weight');
  const sh_mko = n('sh_mko'), hk_mko = n('hk_mko');
  const sh_mpo = n('sh_mpo'), hk_mpo = n('hk_mpo');
  const sh_auto = n('sh_auto'), hk_auto = n('hk_auto');

  const logoUrl = `${BASE_URL}/${prefix}-logo.png`;
  const logoHeight = prefix === 'uzum' ? '28' : '26';

  const row = (label: string, sh: number, hk: number) => `
    <tr>
      <td style="padding:7px 12px;background:${C.altRow};font-size:12px;color:${C.labelFg};border:1px solid ${C.border};">${esc(label)}</td>
      <td style="padding:7px 12px;background:#fff;font-size:12px;color:#1f2937;text-align:center;border:1px solid ${C.border};">${sh + hk}</td>
      <td style="padding:7px 12px;background:#fff;font-size:12px;color:#1f2937;text-align:center;border:1px solid ${C.border};">${sh}</td>
      <td style="padding:7px 12px;background:#fff;font-size:12px;color:#1f2937;text-align:center;border:1px solid ${C.border};">${hk}</td>
    </tr>`;

  return `
  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:16px;">
    <tr>
      <td style="padding:10px 12px;background:#f9fafb;border:1px solid ${C.border};">
        <img src="${logoUrl}" alt="${prefix.toUpperCase()}" height="${logoHeight}" style="display:block;max-width:110px;" />
      </td>
      <td style="padding:8px 12px;background:${C.labelBg};font-size:11px;font-weight:bold;color:${C.labelFg};text-align:center;border:1px solid ${C.border};">Всего</td>
      <td style="padding:8px 12px;background:${C.labelBg};font-size:11px;font-weight:bold;color:${C.labelFg};text-align:center;border:1px solid ${C.border};">Шанхай</td>
      <td style="padding:8px 12px;background:${C.labelBg};font-size:11px;font-weight:bold;color:${C.labelFg};text-align:center;border:1px solid ${C.border};">Гонконг</td>
    </tr>
    ${row('Количество принятых партий:', sh_c, hk_c)}
    ${row('Общий вес партий, кг:', sh_w, hk_w)}
    ${row('Из них МКО, кг:', sh_mko, hk_mko)}
    ${row('Из них МПО, кг:', sh_mpo, hk_mpo)}
    ${row('Из них Автомат, кг:', sh_auto, hk_auto)}
    <tr>
      <td style="padding:7px 12px;background:${C.altRow};font-size:12px;color:${C.labelFg};border:1px solid ${C.border};">Соотношение vol vs brutto:</td>
      <td style="padding:7px 12px;background:#fff;font-size:12px;color:#9ca3af;text-align:center;border:1px solid ${C.border};">—</td>
      <td style="padding:7px 12px;background:#fff;font-size:12px;color:#1f2937;text-align:center;border:1px solid ${C.border};">${esc(s('sh_ratio'))}</td>
      <td style="padding:7px 12px;background:#fff;font-size:12px;color:#1f2937;text-align:center;border:1px solid ${C.border};">${esc(s('hk_ratio'))}</td>
    </tr>
  </table>
  ${opsBlock('Операции в Китае',          s('china_status'),    s('china_incident'),    BULLETS.china)}
  ${opsBlock('Транзитные операции',        s('transit_status'),  s('transit_incident'),  BULLETS.transit)}
  ${opsBlock('Операции последней мили',    s('lastmile_status'), s('lastmile_incident'), BULLETS.lastmile)}`;
}

/** Fix #4: full signature */
function signature(): string {
  return `
  <tr>
    <td style="padding:18px 24px;background:#f9fafb;border-top:2px solid ${C.border};">
      <table cellpadding="0" cellspacing="0" style="font-family:Arial,sans-serif;">
        <tr>
          <td style="padding-right:20px;vertical-align:top;">
            <img src="${BASE_URL}/favicon.png" alt="Antria" height="48" style="display:block;" />
          </td>
          <td style="vertical-align:top;border-left:3px solid #e5e7eb;padding-left:18px;">
            <p style="margin:0 0 2px;font-size:14px;font-weight:bold;color:#1C1C2E;">Сардор Толяганов</p>
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Руководитель 3PL направления</p>
            <p style="margin:0 0 4px;font-size:12px;color:#374151;">📱 +998 (90) 138-58-90 / +998 (90) 999-70-04</p>
            <p style="margin:0 0 4px;font-size:12px;color:#374151;">✉️ <a href="mailto:sardor.tolyaganov@antria.uz" style="color:#2563eb;text-decoration:none;">sardor.tolyaganov@antria.uz</a></p>
            <p style="margin:0 0 4px;font-size:12px;color:#374151;line-height:18px;">
              <img src="${BASE_URL}/telegram-logo.png" alt="Telegram" width="16" height="16" style="display:inline;vertical-align:middle;margin-right:5px;" />
              <a href="https://t.me/Sardor_DM_PM" style="color:#2563eb;text-decoration:none;vertical-align:middle;">t.me/Sardor_DM_PM</a>
            </p>
            <p style="margin:0;font-size:12px;color:#374151;line-height:18px;">
              <img src="${BASE_URL}/wechat-logo.png" alt="WeChat" width="16" height="16" style="display:inline;vertical-align:middle;margin-right:5px;" />
              <span style="vertical-align:middle;">sardor_logistics</span>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

// ─── main export ──────────────────────────────────────────────────────────────
export function buildEmailHtml(
  report: Partial<DailyReport> & { report_date: string; week_number?: string },
): string {
  const date = fmtDate(report.report_date);
  const week = report.week_number ?? '';

  const accuracyRows = ((report.accuracy_rows as IncidentRow[]) ?? [
    { responsible: '', details: '', resolution: '' },
    { responsible: '', details: '', resolution: '' },
    { responsible: '', details: '', resolution: '' },
  ]);
  const incidentRows = ((report.incidents_rows as IncidentRow[]) ?? [
    { responsible: '', details: '', resolution: '' },
    { responsible: '', details: '', resolution: '' },
    { responsible: '', details: '', resolution: '' },
  ]);

  const dataAccuracy = report.data_accuracy ?? 'Все данные в трекер занесены своевременно и корректно';
  const incidentsStatus = report.incidents_status ?? 'Без инцидентов';

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Ежедневный отчёт ${date}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f9;padding:24px 0 36px;">
  <tr>
    <td align="center" style="padding:0 12px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:620px;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.10);">

        <!-- HEADER -->
        <tr>
          <td style="background:#1C1C2E;padding:18px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#fff;font-size:19px;font-weight:bold;font-family:Arial,sans-serif;">
                  Ежедневный отчёт
                </td>
                <td align="right" style="color:#9ca3af;font-size:12px;font-family:Arial,sans-serif;white-space:nowrap;padding-left:12px;">
                  ${date}${week ? ` &nbsp;·&nbsp; Нед.&nbsp;${week}` : ''}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- GREETING -->
        <tr>
          <td style="padding:20px 24px 18px;border-bottom:2px solid ${C.border};">
            <p style="margin:0 0 6px;font-size:14px;color:#374151;font-family:Arial,sans-serif;">Антон, добрый день!</p>
            <p style="margin:0;font-size:14px;color:#374151;font-family:Arial,sans-serif;">
              Направляю Вам операционный отчёт за <strong>${date}</strong> по двум проектам:
            </p>
          </td>
        </tr>

        <!-- 1. OPERATIONAL -->
        ${sectionHead(1, 'ОБЩИЙ ОПЕРАЦИОННЫЙ КОНТРОЛЬ', C.sec1)}
        <tr>
          <td style="padding:16px 24px 20px;">
            ${statusRow('Точность данных:', dataAccuracy)}
            ${incidentTable(accuracyRows)}
            ${statusRow('Инциденты:', incidentsStatus)}
            ${incidentTable(incidentRows)}
          </td>
        </tr>
        ${sep()}

        <!-- 2. CUSTOMER SERVICE -->
        ${sectionHead(2, 'CUSTOMER SERVICE', C.sec2, '🎧')}
        <tr>
          <td style="padding:16px 24px 20px;">
            ${csTable([
              { label: 'Всего заявок за день', value: report.cs_total ?? 0 },
              { label: 'Просрочено заявок', value: report.cs_overdue ?? 0,
                note: report.cs_overdue_reason ? `Причина: ${report.cs_overdue_reason}` : 'Причина: описание причины' },
              { label: 'Средний срок выполнения, дней (текущая неделя)', value: report.cs_avg_week ?? 'Нет данных', note: 'Цель: 2,5 дн.' },
              { label: 'Средний срок выполнения, дней (текущий месяц)',  value: report.cs_avg_month ?? 0,           note: 'Цель: 2,5 дн.' },
            ])}
          </td>
        </tr>
        ${sep()}

        <!-- 3. UZUM -->
        ${sectionHead(3, 'UZUM CROSSBORDER', C.sec3)}
        <tr>
          <td style="padding:16px 24px 20px;">
            ${metricsBlock('uzum', report)}
          </td>
        </tr>
        ${sep()}

        <!-- 4. CAINIAO -->
        ${sectionHead(4, 'CAINIAO', C.sec4)}
        <tr>
          <td style="padding:16px 24px 20px;">
            ${metricsBlock('cainiao', report)}
          </td>
        </tr>

        <!-- SIGNATURE -->
        ${signature()}

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
