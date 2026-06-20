import { Resend } from "resend";
import type { EventWithChannelName } from "../beaver/event";
import { buildEmailHtml, buildAlertEmailHtml, type AlertEmailParams } from "./template";

const apiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.RESEND_FROM_EMAIL ?? "notifications@beaver.app";

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
    subject: `${event.icon ? `${event.icon} ` : ""}${event.title} — ${projectName}`,
    html: buildEmailHtml(event, projectName),
  });
}

export async function sendAlertEmail(
  params: AlertEmailParams,
  recipientEmails: string[],
): Promise<void> {
  if (!apiKey || recipientEmails.length === 0) return;

  const resend = new Resend(apiKey);

  await resend.emails.send({
    from: fromEmail,
    to: recipientEmails,
    subject: `🚨 ${params.ruleName} — ${params.projectName}`,
    html: buildAlertEmailHtml(params),
  });
}

export function isResendConfigured(): boolean {
  return !!apiKey;
}
