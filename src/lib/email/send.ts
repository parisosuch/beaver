import type { EventWithChannelName } from "../beaver/event";
import { getEmailSettings } from "../beaver/email-settings";
import type { AlertEmailParams, CommentEmailParams } from "./template";
import {
  sendEventNotification as sendViaResend,
  sendAlertEmail as sendAlertEmailViaResend,
  sendCommentNotification as sendCommentViaResend,
} from "./resend";
import { sendEventNotificationSmtp, sendAlertEmailSmtp, sendCommentNotificationSmtp } from "./smtp";

export async function sendEventNotification(
  event: EventWithChannelName,
  projectName: string,
  recipientEmails: string[],
): Promise<void> {
  const settings = await getEmailSettings();

  if (settings?.provider === "smtp") {
    await sendEventNotificationSmtp(settings, event, projectName, recipientEmails);
    return;
  }

  await sendViaResend(event, projectName, recipientEmails);
}

export async function sendAlertEmail(
  params: AlertEmailParams,
  recipientEmails: string[],
): Promise<void> {
  const settings = await getEmailSettings();

  if (settings?.provider === "smtp") {
    await sendAlertEmailSmtp(settings, params, recipientEmails);
    return;
  }

  await sendAlertEmailViaResend(params, recipientEmails);
}

export async function sendCommentNotification(
  params: CommentEmailParams,
  recipientEmails: string[],
): Promise<void> {
  const settings = await getEmailSettings();

  if (settings?.provider === "smtp") {
    await sendCommentNotificationSmtp(settings, params, recipientEmails);
    return;
  }

  await sendCommentViaResend(params, recipientEmails);
}
