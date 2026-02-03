import { db } from "../db/db";
import { eventTags, events } from "../db/schema";
import { eq } from "drizzle-orm";

export interface AvailableTag {
  key: string;
  values: string[];
}

export async function getChannelAvailableTags(
  channelId: number
): Promise<AvailableTag[]> {
  // Get distinct key-value pairs for events in this channel
  const result = await db
    .selectDistinct({
      key: eventTags.key,
      value: eventTags.value,
    })
    .from(eventTags)
    .innerJoin(events, eq(eventTags.eventId, events.id))
    .where(eq(events.channelId, channelId));

  // Group by key
  const tagMap = new Map<string, Set<string>>();

  for (const row of result) {
    if (!tagMap.has(row.key)) {
      tagMap.set(row.key, new Set());
    }
    tagMap.get(row.key)!.add(row.value);
  }

  // Convert to array format
  const tags: AvailableTag[] = [];
  for (const [key, values] of tagMap) {
    tags.push({
      key,
      values: Array.from(values).sort(),
    });
  }

  return tags.sort((a, b) => a.key.localeCompare(b.key));
}

export async function getProjectAvailableTags(
  projectId: number
): Promise<AvailableTag[]> {
  // Get distinct key-value pairs for events in this project
  const result = await db
    .selectDistinct({
      key: eventTags.key,
      value: eventTags.value,
    })
    .from(eventTags)
    .innerJoin(events, eq(eventTags.eventId, events.id))
    .where(eq(events.projectId, projectId));

  // Group by key
  const tagMap = new Map<string, Set<string>>();

  for (const row of result) {
    if (!tagMap.has(row.key)) {
      tagMap.set(row.key, new Set());
    }
    tagMap.get(row.key)!.add(row.value);
  }

  // Convert to array format
  const tags: AvailableTag[] = [];
  for (const [key, values] of tagMap) {
    tags.push({
      key,
      values: Array.from(values).sort(),
    });
  }

  return tags.sort((a, b) => a.key.localeCompare(b.key));
}
