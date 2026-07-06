import { db } from "../db/db";
import { alertRules, channels, events } from "../db/schema";
import { eq, and, gt, gte, count } from "drizzle-orm";
import type { Channel } from "./channel";
import type { Project } from "./project";
import {
  getNotificationEmailsForChannel,
  getNotificationSubscriberIdsForChannel,
} from "./channel-notification";
import { createAlertNotifications } from "./notification";
import { sendAlertEmail } from "../email/send";

export type AlertRule = {
  id: number;
  channelId: number;
  name: string;
  eventObject: string;
  eventAction: string;
  threshold: number;
  windowMinutes: number;
  enabled: boolean;
  lastTriggeredAt: Date | null;
  createdAt: Date | null;
};

export type AlertRuleWithChannel = AlertRule & {
  channelName: string;
};

export async function getAlertRulesForProject(projectId: number): Promise<AlertRuleWithChannel[]> {
  const rows = await db
    .select({
      id: alertRules.id,
      channelId: alertRules.channelId,
      name: alertRules.name,
      eventObject: alertRules.eventObject,
      eventAction: alertRules.eventAction,
      threshold: alertRules.threshold,
      windowMinutes: alertRules.windowMinutes,
      enabled: alertRules.enabled,
      lastTriggeredAt: alertRules.lastTriggeredAt,
      createdAt: alertRules.createdAt,
      channelName: channels.name,
    })
    .from(alertRules)
    .innerJoin(channels, eq(alertRules.channelId, channels.id))
    .where(eq(channels.projectId, projectId));

  return rows;
}

export async function getAlertRulesForChannelEvent(
  channelId: number,
  eventObject: string,
  eventAction: string,
): Promise<AlertRule[]> {
  return await db
    .select()
    .from(alertRules)
    .where(
      and(
        eq(alertRules.channelId, channelId),
        eq(alertRules.eventObject, eventObject),
        eq(alertRules.eventAction, eventAction),
        eq(alertRules.enabled, true),
      ),
    );
}

export async function createAlertRule(input: {
  channelId: number;
  name: string;
  eventObject: string;
  eventAction: string;
  threshold: number;
  windowMinutes: number;
}): Promise<AlertRule> {
  const [row] = await db.insert(alertRules).values(input).returning();
  return row as AlertRule;
}

export async function updateAlertRule(
  id: number,
  patch: Partial<{
    name: string;
    eventObject: string;
    eventAction: string;
    threshold: number;
    windowMinutes: number;
    enabled: boolean;
  }>,
): Promise<void> {
  await db.update(alertRules).set(patch).where(eq(alertRules.id, id));
}

export async function deleteAlertRule(id: number): Promise<void> {
  await db.delete(alertRules).where(eq(alertRules.id, id));
}

// Returns the rule's event count within its window if the rule should fire
// (threshold met and not still within its own debounce window), else null.
export async function checkAlertRule(rule: AlertRule): Promise<number | null> {
  if (rule.lastTriggeredAt) {
    const debounceUntil = new Date(rule.lastTriggeredAt.getTime() + rule.windowMinutes * 60_000);
    if (debounceUntil > new Date()) return null;
  }

  // After a previous trigger, count only events strictly after lastTriggeredAt.
  // Using gt (not gte) prevents the triggering events themselves from being
  // recounted at debounce-expiry when their createdAt equals lastTriggeredAt.
  const [{ value }] = await db
    .select({ value: count() })
    .from(events)
    .where(
      and(
        eq(events.channelId, rule.channelId),
        eq(events.eventObject, rule.eventObject),
        eq(events.eventAction, rule.eventAction),
        rule.lastTriggeredAt
          ? gt(events.createdAt, rule.lastTriggeredAt)
          : gte(events.createdAt, new Date(Date.now() - rule.windowMinutes * 60_000)),
      ),
    );

  if (value < rule.threshold) return null;

  await db
    .update(alertRules)
    .set({ lastTriggeredAt: new Date() })
    .where(eq(alertRules.id, rule.id));

  return value;
}

export async function checkAndDispatchAlerts(
  channel: Channel,
  project: Project,
  event: { eventObject: string; eventAction: string },
): Promise<void> {
  const rules = await getAlertRulesForChannelEvent(
    channel.id,
    event.eventObject,
    event.eventAction,
  );

  for (const rule of rules) {
    const matchedCount = await checkAlertRule(rule);
    if (matchedCount === null) continue;

    // In-app notifications for every channel subscriber (independent of whether
    // they have an email set).
    await createAlertNotifications({
      projectId: project.id,
      channelId: channel.id,
      channelName: channel.name,
      ruleName: rule.name,
      count: matchedCount,
      windowMinutes: rule.windowMinutes,
      recipientIds: await getNotificationSubscriberIdsForChannel(channel.id),
    });

    const emails = await getNotificationEmailsForChannel(channel.id);
    if (emails.length === 0) continue;

    await sendAlertEmail(
      {
        ruleName: rule.name,
        eventObject: rule.eventObject,
        eventAction: rule.eventAction,
        count: matchedCount,
        threshold: rule.threshold,
        windowMinutes: rule.windowMinutes,
        projectName: project.name,
        channelName: channel.name,
      },
      emails,
    );
  }
}
