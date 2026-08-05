import "server-only";

/**
 * Minimal email sender. Uses the Resend HTTP API if RESEND_API_KEY is set
 * (no SDK dependency). If not configured, returns { sent: false } so callers
 * can fall back to surfacing a copyable link — keeping the POC dependency-free.
 */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ sent: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "AutoGRC <onboarding@resend.dev>";
  if (!key) return { sent: false };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `Resend ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, error: e instanceof Error ? e.message : "send failed" };
  }
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

/**
 * Branded, email-client-safe HTML (table layout + inline styles) for the
 * transactional auth emails (invite / magic-link / password reset).
 */
export function authEmail(opts: {
  heading: string;
  intro: string;
  ctaLabel: string;
  ctaUrl: string;
  note?: string;
}): string {
  return `
  <div style="margin:0;padding:0;background:#F6F6FA">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6FA;padding:24px 0">
      <tr><td align="center">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:100%;background:#ffffff;border:1px solid #C4C4CD">
          <tr><td style="background:#1A1A24;padding:20px 28px">
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:bold;color:#FFE600;letter-spacing:-0.02em">AutoGRC</span>
            <span style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A9AA6;padding-left:8px">Automated assurance</span>
          </td></tr>
          <tr><td style="height:4px;background:#FFE600;font-size:0;line-height:0">&nbsp;</td></tr>
          <tr><td style="padding:32px 28px">
            <h1 style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:bold;color:#1A1A24;letter-spacing:-0.02em">${opts.heading}</h1>
            <p style="margin:0 0 24px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#2E2E38">${opts.intro}</p>
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#FFE600">
              <a href="${opts.ctaUrl}" style="display:inline-block;padding:13px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#1A1A24;text-decoration:none;letter-spacing:-0.01em">${opts.ctaLabel}</a>
            </td></tr></table>
            <p style="margin:24px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#747480">Or paste this link into your browser:<br><a href="${opts.ctaUrl}" style="color:#1777CF;word-break:break-all">${opts.ctaUrl}</a></p>
            ${opts.note ? `<p style="margin:16px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#9A9AA6">${opts.note}</p>` : ""}
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #E6E6EB">
            <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#9A9AA6">AutoGRC · Automated assurance platform. If you didn't expect this email, you can safely ignore it.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </div>`;
}
