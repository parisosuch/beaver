import { db } from "../db/db";
import { channelReads, channels, events } from "../db/schema";
import { eq, and, sql, count } from "drizzle-orm";

// Mark a channel as read for a user. Returns the previous lastReadAt (or null
// if the user has never read this channel before).
export async function markChannelRead(
  userId: number,
  channelId: number,
): Promise<Date | null> {
  const existing = await db
    .select({ lastReadAt: channelReads.lastReadAt })
    .from(channelReads)
    .where(
      and(
        eq(channelReads.userId, userId),
        eq(channelReads.channelId, channelId),
      ),
    )
    .limit(1);

  const previousLastReadAt = existing[0]?.lastReadAt ?? null;
  const now = new Date();

  await db
    .insert(channelReads)
    .values({ userId, channelId, lastReadAt: now })
    .onConflictDoUpdate({
      target: [channelReads.userId, channelReads.channelId],
      set: { lastReadAt: now },
    });

  return previousLastReadAt;
}

// Returns unread event counts keyed by channel ID for all channels in a project.
export async function getUnreadCounts(
  userId: number,
  projectId: number,
): Promise<Record<number, number>> {
  const rows = await db
    .select({
      channelId: channels.id,
      unreadCount: count(events.id),
    })
    .from(channels)
    .leftJoin(
      channelReads,
      and(
        eq(channelReads.channelId, channels.id),
        eq(channelReads.userId, userId),
      ),
    )
    .leftJoin(
      events,
      and(
        eq(events.channelId, channels.id),
        sql`${events.createdAt} > COALESCE(${channelReads.lastReadAt}, 0)`,
      ),
    )
    .where(eq(channels.projectId, projectId))
    .groupBy(channels.id);

  return Object.fromEntries(rows.map((r) => [r.channelId, r.unreadCount]));
}
