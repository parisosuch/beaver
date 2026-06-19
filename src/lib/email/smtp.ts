import nodemailer from "nodemailer";
import type { EventWithChannelName } from "../beaver/event";
import type { EmailSettings } from "../beaver/email-settings";
import { buildEmailHtml } from "./template";

export async function sendEventNotificationSmtp(
  settings: EmailSettings,
  event: EventWithChannelName,
  projectName: string,
  recipientEmails: string[],
): Promise<void> {
  if (!settings.smtpHost || !settings.smtpPort || recipientEmails.length === 0) return;

  const transport = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure,
    auth: settings.smtpUsername
      ? { user: settings.smtpUsername, pass: settings.smtpPassword ?? "" }
      : undefined,
  });

  await transport.sendMail({
    from: settings.smtpFromEmail ?? "notifications@beaver.app",
    to: recipientEmails,
    subject: `${event.icon ? `${event.icon} ` : ""}${event.title} — ${projectName}`,
    html: buildEmailHtml(event, projectName),
  });
}

export function isSmtpConfigured(settings: EmailSettings): boolean {
  return !!settings.smtpHost && !!settings.smtpPort;
}
