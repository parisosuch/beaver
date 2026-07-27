import { Resend } from "resend";
import type { EventWithChannelName } from "../beaver/event";
import type { EmailSettings } from "../beaver/email-settings";
import {
  buildEmailHtml,
  buildAlertEmailHtml,
  buildCommentEmailHtml,
  type AlertEmailParams,
  type CommentEmailParams,
} from "./template";

const DEFAULT_FROM_EMAIL = "notifications@beaver.app";

// Deprecated: configure Resend in the admin email settings instead. These are
// only read when the corresponding setting is empty, so existing deployments
// keep working after upgrading.
const envApiKey = process.env.RESEND_API_KEY;
const envFromEmail = process.env.RESEND_FROM_EMAIL;

type ResendConfig = { apiKey: string; fromEmail: string };

function resolveConfig(settings: EmailSettings | null): ResendConfig | null {
  const apiKey = settings?.resendApiKey || envApiKey;
  if (!apiKey) return null;

  return {
    apiKey,
    fromEmail: settings?.resendFromEmail || envFromEmail || DEFAULT_FROM_EMAIL,
  };
}

export async function sendEventNotification(
  settings: EmailSettings | null,
  event: EventWithChannelName,
  projectName: string,
  recipientEmails: string[],
): Promise<void> {
  const config = resolveConfig(settings);
  if (!config || recipientEmails.length === 0) return;

  const resend = new Resend(config.apiKey);

  await resend.emails.send({
    from: config.fromEmail,
    to: recipientEmails,
    subject: `${event.icon ? `${event.icon} ` : ""}${event.title} — ${projectName}`,
    html: buildEmailHtml(event, projectName),
  });
}

export async function sendAlertEmail(
  settings: EmailSettings | null,
  params: AlertEmailParams,
  recipientEmails: string[],
): Promise<void> {
  const config = resolveConfig(settings);
  if (!config || recipientEmails.length === 0) return;

  const resend = new Resend(config.apiKey);

  await resend.emails.send({
    from: config.fromEmail,
    to: recipientEmails,
    subject: `🚨 ${params.ruleName} — ${params.projectName}`,
    html: buildAlertEmailHtml(params),
  });
}

export async function sendCommentNotification(
  settings: EmailSettings | null,
  params: CommentEmailParams,
  recipientEmails: string[],
): Promise<void> {
  const config = resolveConfig(settings);
  if (!config || recipientEmails.length === 0) return;

  const resend = new Resend(config.apiKey);

  const subject =
    params.reason === "mention"
      ? `${params.actorName} mentioned you — ${params.projectName}`
      : `${params.actorName} replied on ${params.eventTitle} — ${params.projectName}`;

  await resend.emails.send({
    from: config.fromEmail,
    to: recipientEmails,
    subject,
    html: buildCommentEmailHtml(params),
  });
}

export function isResendConfigured(settings: EmailSettings | null): boolean {
  return !!resolveConfig(settings);
}

/** True when Resend falls back to the deprecated RESEND_API_KEY env var. */
export function usesResendEnvFallback(settings: EmailSettings | null): boolean {
  return !settings?.resendApiKey && !!envApiKey;
}
