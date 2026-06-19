import type { EventWithChannelName } from "../beaver/event";
import { getEmailSettings } from "../beaver/email-settings";
import { sendEventNotification as sendViaResend } from "./resend";
import { sendEventNotificationSmtp } from "./smtp";

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
