import { db } from "../db/db";
import { eventTags } from "../db/schema";
import { inArray } from "drizzle-orm";
import type { TagPrimitive } from "./event";

export async function getEventTags(ids: number[]): Promise<Record<number, TagPrimitive>> {
  if (ids.length === 0) return {};

  const allTags = await db.select().from(eventTags).where(inArray(eventTags.eventId, ids));

  const tagsByEventId: Record<number, TagPrimitive> = {};
  for (const tag of allTags) {
    if (!tagsByEventId[tag.eventId]) tagsByEventId[tag.eventId] = {};
    if (tag.type === "number") {
      tagsByEventId[tag.eventId][tag.key] = Number(tag.value);
    } else if (tag.type === "boolean") {
      tagsByEventId[tag.eventId][tag.key] = tag.value === "true";
    } else {
      tagsByEventId[tag.eventId][tag.key] = tag.value;
    }
  }
  return tagsByEventId;
}
