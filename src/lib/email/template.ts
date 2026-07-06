import type { EventWithChannelName } from "../beaver/event";

export function buildEmailHtml(event: EventWithChannelName, projectName: string): string {
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

  const eventName = `${event.eventObject}.${event.eventAction}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${event.title}</title>
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
              <p style="margin:0 0 6px;font-size:12px;font-family:monospace;color:#9ca3af;letter-spacing:0.05em;">${eventName}</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${event.title}</h1>
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

export type AlertEmailParams = {
  ruleName: string;
  eventObject: string;
  eventAction: string;
  count: number;
  threshold: number;
  windowMinutes: number;
  projectName: string;
  channelName: string;
};

export function buildAlertEmailHtml(params: AlertEmailParams): string {
  const eventName = `${params.eventObject}.${params.eventAction}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${params.ruleName}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:#7c2d12;padding:24px 32px;border-radius:12px 12px 0 0;">
              <p style="margin:0;font-size:13px;font-weight:600;color:#fed7aa;letter-spacing:0.08em;text-transform:uppercase;">Beaver Alert</p>
              <p style="margin:4px 0 0;font-size:13px;color:#fdba74;">
                ${params.projectName} &middot; #${params.channelName}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <p style="margin:0 0 6px;font-size:12px;font-family:monospace;color:#9ca3af;letter-spacing:0.05em;">${eventName}</p>
              <h1 style="margin:0;font-size:22px;font-weight:700;color:#111827;line-height:1.3;">${params.ruleName}</h1>
              <p style="margin:8px 0 0;font-size:15px;color:#6b7280;line-height:1.6;">
                ${params.count} events matched in the last ${params.windowMinutes} minute${params.windowMinutes === 1 ? "" : "s"}, exceeding the threshold of ${params.threshold}.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:20px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                You're receiving this because you enabled event notifications for
                <strong style="color:#6b7280;">#${params.channelName}</strong> in
                <strong style="color:#6b7280;">${params.projectName}</strong>.
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

export type CommentEmailParams = {
  actorName: string;
  reason: "mention" | "reply";
  eventTitle: string;
  channelName: string;
  projectName: string;
  commentBody: string;
  eventUrl?: string | null;
};

// Comment bodies (and, defensively, other fields) are user input rendered into
// HTML email, so escape before interpolation.
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCommentEmailHtml(params: CommentEmailParams): string {
  const headline =
    params.reason === "mention"
      ? `${esc(params.actorName)} mentioned you`
      : `${esc(params.actorName)} replied on a thread you’re in`;

  const buttonHtml = params.eventUrl
    ? `<a href="${esc(params.eventUrl)}" style="display:inline-block;margin-top:20px;background:#171717;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 18px;border-radius:8px;">View thread</a>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${headline}</title>
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
                ${esc(params.projectName)} &middot; #${esc(params.channelName)}
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              <h1 style="margin:0;font-size:20px;font-weight:700;color:#111827;line-height:1.3;">${headline}</h1>
              <p style="margin:6px 0 0;font-size:14px;color:#6b7280;">on <strong style="color:#374151;">${esc(params.eventTitle)}</strong></p>
              <div style="margin:20px 0 0;padding:16px;background:#f9fafb;border-left:3px solid #d4d4d8;border-radius:4px;font-size:15px;color:#374151;line-height:1.6;white-space:pre-wrap;">${esc(params.commentBody)}</div>
              ${buttonHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f4f4f5;padding:20px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                You're receiving this because you were mentioned in or have participated in this thread.
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
