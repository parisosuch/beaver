import { db } from "../db/db";
import { channelReads, channels, events } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

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
//
// Uses a correlated subquery per channel so the planner can do a tight range
// seek on events_channel_id_created_at_idx (channel_id = ?, created_at > ?)
// rather than a full join + group-by over all events in the project.
export async function getUnreadCounts(
  userId: number,
  projectId: number,
): Promise<Record<number, number>> {
  const rows = await db
    .select({
      channelId: channels.id,
      unreadCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${events}
        WHERE ${events.channelId} = ${channels.id}
          AND ${events.createdAt} > COALESCE(
            (SELECT ${channelReads.lastReadAt}
             FROM ${channelReads}
             WHERE ${channelReads.channelId} = ${channels.id}
               AND ${channelReads.userId} = ${userId}),
            0
          )
      )`,
    })
    .from(channels)
    .where(eq(channels.projectId, projectId));

  return Object.fromEntries(rows.map((r) => [r.channelId, r.unreadCount]));
}
