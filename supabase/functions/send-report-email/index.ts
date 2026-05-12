import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
// @ts-ignore npm import
import nodemailer from 'npm:nodemailer';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TO_EMAIL = 'anton.grigorevskiy@antria.uz';
const LOGO_URL = 'https://daily-report-dlg.pages.dev/antria-logo-B23HqTGc.png';

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

function buildHtml(dateStr: string): string {
  return `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.6; margin: 0; padding: 20px;">
  <p>Антон, добрый день,</p>
  <p>Направляю ежедневный отчёт на <strong>${dateStr}</strong></p>
  <br/>
  <table cellpadding="0" cellspacing="0" style="border-top: 2px solid #1C1C2E; padding-top: 14px; margin-top: 10px;">
    <tr>
      <td style="padding-right: 20px; vertical-align: top;">
        <img src="${LOGO_URL}" alt="Antria Group" style="height: 52px; width: auto; display: block;" />
      </td>
      <td style="vertical-align: top; font-size: 13px; color: #333; border-left: 2px solid #e5e7eb; padding-left: 18px;">
        <strong style="font-size: 14px; color: #1C1C2E; display: block; margin-bottom: 2px;">Сардор Толяганов</strong>
        <span style="color: #6b7280; display: block; margin-bottom: 8px;">Руководитель 3PL направления</span>
        <span style="display: block;">📱 +998(90) 138-58-90 / +998(90) 999-70-04</span>
        <span style="display: block;">✉️ <a href="mailto:sardor.tolyaganov@antria.uz" style="color: #2563eb; text-decoration: none;">sardor.tolyaganov@antria.uz</a></span>
        <span style="display: block;">✈️ <a href="https://t.me/Sardor_DM_PM" style="color: #2563eb; text-decoration: none;">t.me/Sardor_DM_PM</a></span>
        <span style="display: block;">💬 WeChat: sardor_logistics</span>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  try {
    const { reportDate, excelBase64 } = (await req.json()) as {
      reportDate: string;
      excelBase64: string;
    };

    const gmailUser = Deno.env.get('GMAIL_USER');
    const gmailPass = Deno.env.get('GMAIL_APP_PASSWORD');

    if (!gmailUser || !gmailPass) {
      throw new Error('GMAIL_USER or GMAIL_APP_PASSWORD not set in secrets');
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: gmailUser, pass: gmailPass },
    });

    const dateFormatted = formatDate(reportDate);

    await transporter.sendMail({
      from: `Сардор Толяганов <${gmailUser}>`,
      to: TO_EMAIL,
      subject: `Ежедневный отчет (${dateFormatted})`,
      html: buildHtml(dateFormatted),
      attachments: [{
        filename: `3PL_daily_report_${reportDate}.xlsx`,
        // deno-lint-ignore no-undef
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
