import { db } from "../db/db";
import { eventReactions, users } from "../db/schema";
import { eq, and, inArray } from "drizzle-orm";
import type { ReactionSummary } from "./event";

export async function toggleReaction(
  userId: number,
  eventId: number,
  emoji: string,
): Promise<ReactionSummary> {
  const existing = await db
    .select({ id: eventReactions.id })
    .from(eventReactions)
    .where(
      and(
        eq(eventReactions.userId, userId),
        eq(eventReactions.eventId, eventId),
        eq(eventReactions.emoji, emoji),
      ),
    )
    .limit(1);

  if (existing.length > 0) {
    await db.delete(eventReactions).where(eq(eventReactions.id, existing[0].id));
  } else {
    await db.insert(eventReactions).values({ userId, eventId, emoji });
  }

  const reactors = await db
    .select({ userId: eventReactions.userId, userName: users.userName })
    .from(eventReactions)
    .innerJoin(users, eq(eventReactions.userId, users.id))
    .where(and(eq(eventReactions.eventId, eventId), eq(eventReactions.emoji, emoji)));

  return {
    emoji,
    count: reactors.length,
    userReacted: reactors.some((r) => r.userId === userId),
    users: reactors.map((r) => r.userName),
  };
}

export async function getEventReactions(
  eventIds: number[],
  userId?: number,
): Promise<Record<number, ReactionSummary[]>> {
  if (eventIds.length === 0) return {};

  const rows = await db
    .select({
      eventId: eventReactions.eventId,
      emoji: eventReactions.emoji,
      userId: eventReactions.userId,
      userName: users.userName,
    })
    .from(eventReactions)
    .innerJoin(users, eq(eventReactions.userId, users.id))
    .where(inArray(eventReactions.eventId, eventIds));

  const grouped: Record<number, Record<string, ReactionSummary>> = {};
  for (const row of rows) {
    if (!grouped[row.eventId]) grouped[row.eventId] = {};
    if (!grouped[row.eventId][row.emoji]) {
      grouped[row.eventId][row.emoji] = {
        emoji: row.emoji,
        count: 0,
        userReacted: false,
        users: [],
      };
    }
    const summary = grouped[row.eventId][row.emoji];
    summary.count++;
    summary.users.push(row.userName);
    if (userId !== undefined && row.userId === userId) {
      summary.userReacted = true;
    }
  }

  const result: Record<number, ReactionSummary[]> = {};
  for (const [eventIdStr, emojis] of Object.entries(grouped)) {
    result[Number(eventIdStr)] = Object.values(emojis);
  }
  return result;
}
