import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore npm import
import nodemailer from 'npm:nodemailer';
// @ts-ignore node compat
import { Buffer } from 'node:buffer';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TO_EMAIL = 'anton.grigorevskiy@antria.uz';
const LOGO_URL = 'https://daily-report-dlg.pages.dev/antria-logo-B23HqTGc.png';
const UZUM_LOGO = 'https://daily-report-dlg.pages.dev/uzum-logo.png';
const CAINIAO_LOGO = 'https://daily-report-dlg.pages.dev/cainiao-logo.png';

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  secHead:  'background:#BDD7EE;color:#1F3864;font-weight:bold;font-size:12px;padding:7px 10px;border:1px solid #9DC3E6;',
  label:    'background:#D9D9D9;font-weight:bold;padding:6px 10px;border:1px solid #bbb;font-size:12px;',
  val:      'background:#fff;padding:6px 10px;border:1px solid #bbb;font-size:12px;',
  greenVal: 'background:#92D050;color:#fff;font-weight:bold;text-align:center;padding:6px 10px;border:1px solid #70AD47;font-size:12px;',
  redVal:   'background:#FF0000;color:#fff;font-weight:bold;text-align:center;padding:6px 10px;border:1px solid #CC0000;font-size:12px;',
  thLight:  'background:#D9D9D9;font-weight:bold;text-align:center;padding:5px 8px;border:1px solid #bbb;font-size:11px;',
  td:       'background:#fff;padding:5px 8px;border:1px solid #ddd;font-size:11px;',
  greenBul: 'background:#E2EFDA;color:#375623;font-size:10px;padding:5px 10px;border:1px solid #A9D18E;',
  redBul:   'background:#FFC7CE;color:#9C0006;font-size:10px;padding:5px 10px;border:1px solid #FF9999;',
  orange:   'color:#ED7D31;font-size:11px;font-style:italic;',
  metNum:   'background:#fff;color:#0070C0;text-align:center;padding:5px 8px;border:1px solid #ddd;font-size:11px;',
  metLbl:   'background:#F2F2F2;padding:5px 8px;border:1px solid #ddd;font-size:11px;',
};

function isOk(status: string): boolean {
  return status === 'Без инцидентов' || status.includes('своевременно');
}

// ─── HTML builders ───────────────────────────────────────────────────────────
function secHeader(n: number, title: string): string {
  return `<tr><td colspan="3" style="${S.secHead}">
    <span style="margin-right:6px;">📊</span>${n}. ${title}
  </td></tr><tr><td colspan="3" style="padding:4px 0;"></td></tr>`;
}

function statusRow(label: string, value: string): string {
  const ok = isOk(value);
  return `<tr>
    <td style="${S.label};width:200px;">${label}</td>
    <td colspan="2" style="${ok ? S.greenVal : S.redVal}">${value}</td>
  </tr>`;
}

// deno-lint-ignore no-explicit-any
function incidentTable(rows: any[]): string {
  const filled = rows.filter((r: {responsible:string}) => r.responsible);
  if (!filled.length) return `<tr>
    <td style="${S.thLight}">Ответственный</td>
    <td style="${S.thLight}">Детали</td>
    <td style="${S.thLight}">Решение</td>
  </tr>
  ${Array(3).fill(`<tr><td style="${S.td}">&nbsp;</td><td style="${S.td}">&nbsp;</td><td style="${S.td}">&nbsp;</td></tr>`).join('')}`;

  return `<tr>
    <td style="${S.thLight}">Ответственный</td>
    <td style="${S.thLight}">Детали</td>
    <td style="${S.thLight}">Решение</td>
  </tr>` +
  // deno-lint-ignore no-explicit-any
  filled.map((r: any) => `<tr>
    <td style="${S.td}">${r.responsible ?? ''}</td>
    <td style="${S.td}">${r.details ?? ''}</td>
    <td style="${S.td}">${r.resolution ?? ''}</td>
  </tr>`).join('');
}

// deno-lint-ignore no-explicit-any
function opsBlock(label: string, status: string, bullets: string, incident: string): string {
  const ok = isOk(status);
  const bulletLines = bullets.split('\n').map(l => `${l}<br/>`).join('');
  return `
  <tr>
    <td style="${S.label};width:180px;">${label}</td>
    <td colspan="2" style="${ok ? S.greenVal : S.redVal}">${status}</td>
  </tr>
  <tr>
    <td colspan="3" style="${ok ? S.greenBul : S.redBul}">${bulletLines}</td>
  </tr>
  <tr>
    <td style="${S.label}">Описание инцидента</td>
    <td colspan="2" style="${S.val}">${incident || '&nbsp;'}</td>
  </tr>
  <tr><td colspan="3" style="padding:3px 0;"></td></tr>`;
}

// deno-lint-ignore no-explicit-any
function metricsSection(report: any, prefix: string, logoUrl: string): string {
  const s = (k: string) => report[`${prefix}_sh_${k}`] ?? 0;
  const g = (k: string) => report[`${prefix}_hk_${k}`] ?? 0;
  const rows = [
    ['Количество принятых партий:', 'count'],
    ['Общий вес партий, кг:', 'weight'],
    ['Из них МКО, кг:', 'mko'],
    ['Из них МПО, кг:', 'mpo'],
    ['Из них Автомат, кг:', 'auto'],
  ];
  return `
  <tr>
    <td rowspan="2" style="background:#fff;border:1px solid #ddd;padding:8px;width:180px;">
      <img src="${logoUrl}" alt="${prefix}" style="height:36px;width:auto;" />
    </td>
    <td style="${S.thLight}">Всего</td>
    <td style="${S.thLight}">Шанхай</td>
    <td style="${S.thLight}">Гонконг</td>
  </tr>
  <tr><td colspan="3" style="padding:2px 0;"></td></tr>
  ${rows.map(([lbl, k]) => `<tr>
    <td style="${S.metLbl}">${lbl}</td>
    <td style="${S.metNum}">${s(k) + g(k)}</td>
    <td style="${S.metNum}">${s(k)}</td>
    <td style="${S.metNum}">${g(k)}</td>
  </tr>`).join('')}
  <tr>
    <td style="${S.metLbl}">Соотношение vol vs brutto:</td>
    <td style="${S.metNum}">&nbsp;</td>
    <td style="${S.metNum}">${report[`${prefix}_sh_ratio`] || 'Нет данных'}</td>
    <td style="${S.metNum}">${report[`${prefix}_hk_ratio`] || 'Нет данных'}</td>
  </tr>
  <tr><td colspan="4" style="padding:4px 0;"></td></tr>`;
}

const CHINA_BUL = '- Все партии приняты у клиента в соответствии с планом\n- Все партии обработаны на SWE в соответствии с планом\n- Все партии отправлены из Китая в соответствии с планом';
const TRANSIT_BUL = '- Все партии прибыли в Ташкент без задержек\n- Все партии доставлены на NWL без задержек\n- Все партии обработаны на NWL без задержек\n- Все партии отправлены в страну назначения без задержек';
const LASTMILE_BUL = '- Все партии доставлены в страну назначения без задержек\n- Все партии обработаны в стране назначения без задержек';

// deno-lint-ignore no-explicit-any
function buildHtml(report: any): string {
  const date = fmt(report.report_date);

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="font-family:Arial,sans-serif;font-size:13px;color:#222;margin:0;padding:16px;max-width:750px;">

<p style="margin:0 0 6px;">Антон, добрый день!</p>
<p style="margin:0 0 16px;">Направляю Вам операционный отчет за <strong>${date}</strong> г по двум проектам:</p>

<table width="700" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

${secHeader(1, 'ОБЩИЙ ОПЕРАЦИОННЫЙ КОНТРОЛЬ')}
${statusRow('Точность данных:', report.data_accuracy)}
${incidentTable(report.accuracy_rows ?? [])}
<tr><td colspan="3" style="padding:4px 0;"></td></tr>
${statusRow('Инциденты:', report.incidents_status)}
${incidentTable(report.incidents_rows ?? [])}
<tr><td colspan="3" style="padding:8px 0;"></td></tr>

${secHeader(2, 'CUSTOMER SERVICE')}
<tr>
  <td style="${S.label};width:200px;">Всего заявок за день</td>
  <td colspan="2" style="${S.val};text-align:center;">${report.cs_total ?? 0}</td>
</tr>
<tr><td colspan="3" style="padding:2px 0;"></td></tr>
<tr>
  <td style="${S.label}">Просрочено заявок</td>
  <td style="${S.val};text-align:center;width:160px;">${report.cs_overdue ?? 0}</td>
  <td style="${S.val};${S.orange}">Причина: ${report.cs_overdue_reason || 'описание причины'}</td>
</tr>
<tr><td colspan="3" style="padding:2px 0;"></td></tr>
<tr>
  <td style="${S.label}">Средний срок выполнения, дней<br/>(текущая неделя)</td>
  <td style="${S.val};text-align:center;">${report.cs_avg_week || 'Нет данных'}</td>
  <td style="${S.val};${S.orange}">Цель: 2,5 дней</td>
</tr>
<tr><td colspan="3" style="padding:2px 0;"></td></tr>
<tr>
  <td style="${S.label}">Средний срок выполнения, дней<br/>(текущий месяц)</td>
  <td style="${S.val};text-align:center;">${report.cs_avg_month ?? 0}</td>
  <td style="${S.val};${S.orange}">Цель: 2,5 дней</td>
</tr>
<tr><td colspan="3" style="padding:8px 0;"></td></tr>

${secHeader(3, 'UZUM CROSSBORDER')}
${metricsSection(report, 'uzum', UZUM_LOGO)}
${opsBlock('Операции в Китае',        report.uzum_china_status,   CHINA_BUL,    report.uzum_china_incident)}
${opsBlock('Транзитные операции',     report.uzum_transit_status, TRANSIT_BUL,  report.uzum_transit_incident)}
${opsBlock('Операции последней мили', report.uzum_lastmile_status, LASTMILE_BUL, report.uzum_lastmile_incident)}
<tr><td colspan="3" style="padding:8px 0;"></td></tr>

${secHeader(4, 'CAINIAO')}
${metricsSection(report, 'cainiao', CAINIAO_LOGO)}
${opsBlock('Операции в Китае',        report.cainiao_china_status,   CHINA_BUL,    report.cainiao_china_incident)}
${opsBlock('Транзитные операции',     report.cainiao_transit_status, TRANSIT_BUL,  report.cainiao_transit_incident)}
${opsBlock('Операции последней мили', report.cainiao_lastmile_status, LASTMILE_BUL, report.cainiao_lastmile_incident)}

</table>

<br/>
<table cellpadding="0" cellspacing="0" style="border-top:2px solid #1C1C2E;padding-top:14px;margin-top:10px;font-family:Arial,sans-serif;">
  <tr>
    <td style="padding-right:20px;vertical-align:top;">
      <img src="${LOGO_URL}" alt="Antria Group" style="height:52px;width:auto;display:block;" />
    </td>
    <td style="vertical-align:top;font-size:12px;color:#333;border-left:2px solid #e5e7eb;padding-left:18px;">
      <strong style="font-size:13px;color:#1C1C2E;display:block;margin-bottom:2px;">Сардор Толяганов</strong>
      <span style="color:#6b7280;display:block;margin-bottom:6px;">Руководитель 3PL направления</span>
      <span style="display:block;">📱 +998(90) 138-58-90 / +998(90) 999-70-04</span>
      <span style="display:block;">✉️ <a href="mailto:sardor.tolyaganov@antria.uz" style="color:#2563eb;text-decoration:none;">sardor.tolyaganov@antria.uz</a></span>
      <span style="display:block;">✈️ <a href="https://t.me/Sardor_DM_PM" style="color:#2563eb;text-decoration:none;">t.me/Sardor_DM_PM</a></span>
      <span style="display:block;">💬 WeChat: sardor_logistics</span>
    </td>
  </tr>
</table>
</body></html>`;
}

// ─── Server ───────────────────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    // deno-lint-ignore no-explicit-any
    const { report, excelBase64 } = (await req.json()) as { report: any; excelBase64: string };

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD');
    if (!gmailUser || !gmailPass) throw new Error('Gmail credentials not set');

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com', port: 465, secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    const dateFormatted = fmt(report.report_date);

    await transporter.sendMail({
      from: `Сардор Толяганов <${gmailUser}>`,
      to: TO_EMAIL,
      subject: `Ежедневный отчет (${dateFormatted})`,
      html: buildHtml(report),
      attachments: [{
        filename: `3PL_daily_report_${report.report_date}.xlsx`,
        content: Buffer.from(excelBase64, 'base64'),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }],
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: (err as Error).message }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
