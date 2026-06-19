import { db } from "../db/db";
import { eventReactions } from "../db/schema";
import { eq, and, inArray, count as countFn } from "drizzle-orm";
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

  const [{ total }] = await db
    .select({ total: countFn() })
    .from(eventReactions)
    .where(and(eq(eventReactions.eventId, eventId), eq(eventReactions.emoji, emoji)));

  return { emoji, count: total, userReacted: existing.length === 0 };
}

export async function getEventReactions(
  eventIds: number[],
  userId?: number,
): Promise<Record<number, ReactionSummary[]>> {
  if (eventIds.length === 0) return {};

  const rows = await db
    .select()
    .from(eventReactions)
    .where(inArray(eventReactions.eventId, eventIds));

  const grouped: Record<number, Record<string, { count: number; userReacted: boolean }>> = {};
  for (const row of rows) {
    if (!grouped[row.eventId]) grouped[row.eventId] = {};
    if (!grouped[row.eventId][row.emoji]) {
      grouped[row.eventId][row.emoji] = { count: 0, userReacted: false };
    }
    grouped[row.eventId][row.emoji].count++;
    if (userId !== undefined && row.userId === userId) {
      grouped[row.eventId][row.emoji].userReacted = true;
    }
  }

  const result: Record<number, ReactionSummary[]> = {};
  for (const [eventIdStr, emojis] of Object.entries(grouped)) {
    result[Number(eventIdStr)] = Object.entries(emojis).map(([emoji, data]) => ({
      emoji,
      ...data,
    }));
  }
  return result;
}
