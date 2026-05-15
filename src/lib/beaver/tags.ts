import { db } from "../db/db";
import { eventTags, events } from "../db/schema";
import { eq } from "drizzle-orm";

const DISTINCT_VALUE_THRESHOLD = 20;

export interface AvailableTag {
  key: string;
  type: "string" | "number" | "boolean";
  values: string[];
}

function groupTags(rows: { key: string; type: string; value: string }[]): AvailableTag[] {
  const tagMap = new Map<string, { type: string; values: Set<string> }>();

  for (const row of rows) {
    if (!tagMap.has(row.key)) {
      tagMap.set(row.key, { type: row.type, values: new Set() });
    }
    tagMap.get(row.key)!.values.add(row.value);
  }

  const tags: AvailableTag[] = [];
  for (const [key, { type, values }] of tagMap) {
    const valuesArray = Array.from(values).sort();
    const showValues = type !== "number" && valuesArray.length <= DISTINCT_VALUE_THRESHOLD;
    tags.push({
      key,
      type: type as "string" | "number" | "boolean",
      values: showValues ? valuesArray : [],
    });
  }

  return tags.sort((a, b) => a.key.localeCompare(b.key));
}

export async function getChannelAvailableTags(channelId: number): Promise<AvailableTag[]> {
  const result = await db
    .selectDistinct({
      key: eventTags.key,
      type: eventTags.type,
      value: eventTags.value,
    })
    .from(eventTags)
    .innerJoin(events, eq(eventTags.eventId, events.id))
    .where(eq(events.channelId, channelId));

  return groupTags(result);
}

export async function getProjectAvailableTags(projectId: number): Promise<AvailableTag[]> {
  const result = await db
    .selectDistinct({
      key: eventTags.key,
      type: eventTags.type,
      value: eventTags.value,
    })
    .from(eventTags)
    .innerJoin(events, eq(eventTags.eventId, events.id))
    .where(eq(events.projectId, projectId));

  return groupTags(result);
}
