import { db } from "../db/db";
import { channelNotificationSubscriptions, channels, users } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function getChannelSubscriptions(
  userId: number,
  projectId: number,
): Promise<number[]> {
  const rows = await db
    .select({ channelId: channelNotificationSubscriptions.channelId })
    .from(channelNotificationSubscriptions)
    .innerJoin(channels, eq(channelNotificationSubscriptions.channelId, channels.id))
    .where(
      and(eq(channelNotificationSubscriptions.userId, userId), eq(channels.projectId, projectId)),
    );

  return rows.map((r) => r.channelId);
}

export async function setChannelNotification(
  userId: number,
  channelId: number,
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    await db
      .insert(channelNotificationSubscriptions)
      .values({ userId, channelId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(channelNotificationSubscriptions)
      .where(
        and(
          eq(channelNotificationSubscriptions.userId, userId),
          eq(channelNotificationSubscriptions.channelId, channelId),
        ),
      );
  }
}

export async function setChannelNotifications(
  userId: number,
  channelIds: number[],
  enabled: boolean,
): Promise<void> {
  if (channelIds.length === 0) return;

  if (enabled) {
    await db
      .insert(channelNotificationSubscriptions)
      .values(channelIds.map((channelId) => ({ userId, channelId })))
      .onConflictDoNothing();
  } else {
    await db
      .delete(channelNotificationSubscriptions)
      .where(
        and(
          eq(channelNotificationSubscriptions.userId, userId),
          inArray(channelNotificationSubscriptions.channelId, channelIds),
        ),
      );
  }
}

export async function getNotificationEmailsForChannel(channelId: number): Promise<string[]> {
  const rows = await db
    .select({ email: users.email })
    .from(channelNotificationSubscriptions)
    .innerJoin(users, eq(channelNotificationSubscriptions.userId, users.id))
    .where(eq(channelNotificationSubscriptions.channelId, channelId));

  return rows.flatMap((r) => (r.email ? [r.email] : []));
}

export async function getNotificationSubscriberIdsForChannel(channelId: number): Promise<number[]> {
  const rows = await db
    .select({ userId: channelNotificationSubscriptions.userId })
    .from(channelNotificationSubscriptions)
    .where(eq(channelNotificationSubscriptions.channelId, channelId));

  return rows.map((r) => r.userId);
}
