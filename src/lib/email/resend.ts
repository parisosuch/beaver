import { Resend } from "resend";
import type { EventWithChannelName } from "../beaver/event";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "notifications@beaver.app";

function buildEmailHtml(
  event: EventWithChannelName,
  projectName: string,
): string {
  const tags = Object.entries(event.tags ?? {});
  const tagsHtml =
    tags.length > 0
      ? `<table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 12px;background:#f4f4f5;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-radius:4px 0 0 0;">Key</th>
              <th style="text-align:left;padding:8px 12px;background:#f4f4f5;font-size:12px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.05em;border-radius:0 4px 0 0;">Value</th>
            </tr>
          </thead>
          <tbody>
            ${tags
              .map(
                ([k, v], i) => `
              <tr style="background:${i % 2 === 0 ? "#ffffff" : "#fafafa"};">
                <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;font-family:monospace;">${k}</td>
                <td style="padding:8px 12px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb;font-family:monospace;">${v}</td>
              </tr>`,
              )
              .join("")}
          </tbody>
        </table>`
      : "";

  const iconHtml = event.icon
    ? `<span style="font-size:32px;line-height:1;display:block;margin-bottom:12px;">${event.icon}</span>`
    : "";

  const descHtml = event.description
    ? `<p style="margin:8px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">${event.description}</p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${event.name}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#171717;padding:24px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#a1a1aa;letter-spacing:0.08em;text-transform:uppercase;">Beaver</p>
              <p style="margin:4px 0 0;font-size:13px;color:#71717a;">
                ${projectName} &middot; #${event.channelName}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${iconHtml}
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${event.name}</h1>
              ${descHtml}

              ${tagsHtml}

              <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
                ${new Date(event.createdAt).toUTCString()}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:20px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                You're receiving this because you enabled event notifications for
                <strong style="color:#6b7280;">${projectName}</strong>.
                You can turn these off in your account settings.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEventNotification(
  event: EventWithChannelName,
  projectName: string,
  recipientEmails: string[],
): Promise<void> {
  if (!apiKey || recipientEmails.length === 0) return;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: fromEmail,
    to: recipientEmails,
    subject: `${event.icon ? `${event.icon} ` : ""}${event.name} — ${projectName}`,
    html: buildEmailHtml(event, projectName),
  });
}

export function isResendConfigured(): boolean {
  return !!apiKey;
}
