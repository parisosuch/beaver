import nodemailer from "nodemailer";
import type { EventWithChannelName } from "../beaver/event";
import type { EmailSettings } from "../beaver/email-settings";
import {
  buildEmailHtml,
  buildAlertEmailHtml,
  buildCommentEmailHtml,
  type AlertEmailParams,
  type CommentEmailParams,
} from "./template";

function buildTransport(settings: EmailSettings) {
  return nodemailer.createTransport({
    host: settings.smtpHost ?? undefined,
    port: settings.smtpPort ?? undefined,
    secure: settings.smtpSecure,
    auth: settings.smtpUsername
      ? { user: settings.smtpUsername, pass: settings.smtpPassword ?? "" }
      : undefined,
  });
}

export async function sendEventNotificationSmtp(
  settings: EmailSettings,
  event: EventWithChannelName,
  projectName: string,
  recipientEmails: string[],
): Promise<void> {
  if (!settings.smtpHost || !settings.smtpPort || recipientEmails.length === 0) return;

  const transport = buildTransport(settings);

  await transport.sendMail({
    from: settings.smtpFromEmail ?? "notifications@beaver.app",
    to: recipientEmails,
    subject: `${event.icon ? `${event.icon} ` : ""}${event.title} — ${projectName}`,
    html: buildEmailHtml(event, projectName),
  });
}

export async function sendAlertEmailSmtp(
  settings: EmailSettings,
  params: AlertEmailParams,
  recipientEmails: string[],
): Promise<void> {
  if (!settings.smtpHost || !settings.smtpPort || recipientEmails.length === 0) return;

  const transport = buildTransport(settings);

  await transport.sendMail({
    from: settings.smtpFromEmail ?? "notifications@beaver.app",
    to: recipientEmails,
    subject: `🚨 ${params.ruleName} — ${params.projectName}`,
    html: buildAlertEmailHtml(params),
  });
}

export async function sendCommentNotificationSmtp(
  settings: EmailSettings,
  params: CommentEmailParams,
  recipientEmails: string[],
): Promise<void> {
  if (!settings.smtpHost || !settings.smtpPort || recipientEmails.length === 0) return;

  const transport = buildTransport(settings);

  const subject =
    params.reason === "mention"
      ? `${params.actorName} mentioned you — ${params.projectName}`
      : `${params.actorName} replied on ${params.eventTitle} — ${params.projectName}`;

  await transport.sendMail({
    from: settings.smtpFromEmail ?? "notifications@beaver.app",
    to: recipientEmails,
    subject,
    html: buildCommentEmailHtml(params),
  });
}

export function isSmtpConfigured(settings: EmailSettings): boolean {
  return !!settings.smtpHost && !!settings.smtpPort;
}
