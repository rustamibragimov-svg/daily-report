import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

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
<body style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.6;">
  <p>Антон, добрый день,</p>
  <p>Направляю ежедневный отчёт на ${dateStr}</p>
  <br/>
  <p>С уважением,</p>
  <table style="border-top: 2px solid #1C1C2E; padding-top: 12px; margin-top: 8px;">
    <tr>
      <td style="padding-right: 20px; vertical-align: top;">
        <img src="${LOGO_URL}" alt="Antria Group" style="height: 55px; width: auto;" />
      </td>
      <td style="vertical-align: top; font-size: 13px; color: #333; border-left: 2px solid #e5e7eb; padding-left: 16px;">
        <strong style="font-size: 14px; color: #1C1C2E;">Сардор Толяганов</strong><br/>
        <span style="color: #6b7280;">Руководитель 3PL направления</span><br/><br/>
        📱 +998(90) 138-58-90 / +998(90) 999-70-04<br/>
        ✉️ <a href="mailto:sardor.tolyaganov@antria.uz" style="color: #2563eb; text-decoration:none;">sardor.tolyaganov@antria.uz</a><br/>
        ✈️ <a href="https://t.me/Sardor_DM_PM" style="color: #2563eb; text-decoration:none;">https://t.me/Sardor_DM_PM</a><br/>
        💬 WeChat ID: sardor_logistics
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS });
  }

  try {
    const { reportDate, excelBase64 } = (await req.json()) as {
      reportDate: string;
      excelBase64: string;
    };

    const dateFormatted = formatDate(reportDate);
    const resendKey = Deno.env.get('RESEND_API_KEY');

    if (!resendKey) {
      throw new Error('RESEND_API_KEY not set');
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Сардор Толяганов <sardor.tolyaganov@antria.uz>',
        to: [TO_EMAIL],
        subject: `Ежедневный отчет (${dateFormatted})`,
        html: buildHtml(dateFormatted),
        attachments: [
          {
            filename: `3PL_daily_report_${reportDate}.xlsx`,
            content: excelBase64,
          },
        ],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return new Response(JSON.stringify({ ok: true, id: data.id }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }
});
