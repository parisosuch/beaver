import { db } from "../db/db";
import { channelReads, channels } from "../db/schema";
import { eq, and, sql } from "drizzle-orm";

// Mark a channel as read for a user. Returns the previous lastReadAt (or null
// if the user has never read this channel before).
export async function markChannelRead(userId: number, channelId: number): Promise<Date | null> {
  const existing = await db
    .select({ lastReadAt: channelReads.lastReadAt })
    .from(channelReads)
    .where(and(eq(channelReads.userId, userId), eq(channelReads.channelId, channelId)))
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
// Uses db.all() with a raw SQL template so table aliases are emitted as SQL
// text rather than Drizzle interpolations. This is required for the correlated
// subquery to work correctly — interpolating a Drizzle Column object (e.g.
// ${channels.id}) inside a sql`` expression parameterises it as a bound value
// rather than a column reference, breaking the correlation.
//
// Only ${userId} and ${projectId} are Drizzle interpolations (bound params).
// The planner can then do a tight range seek on
// events_channel_id_created_at_idx (channel_id = ?, created_at > ?) per
// channel, and an O(1) lookup on channel_reads_user_channel_idx for lastReadAt.
export async function getUnreadCounts(
  userId: number,
  projectId: number,
): Promise<Record<number, number>> {
  const rows = await db.all<{ channel_id: number; unread_count: number }>(sql`
    SELECT
      c.id AS channel_id,
      (
        SELECT COUNT(*)
        FROM events AS e
        WHERE e.channel_id = c.id
          AND e.created_at > COALESCE(
            (SELECT cr.last_read_at
             FROM channel_reads AS cr
             WHERE cr.channel_id = c.id
               AND cr.user_id = ${userId}),
            0
          )
      ) AS unread_count
    FROM channels AS c
    WHERE c.project_id = ${projectId}
  `);

  return Object.fromEntries(rows.map((r) => [r.channel_id, r.unread_count]));
}
