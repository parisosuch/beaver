import { db } from "../db/db";
import { bookmarks, events, channels, eventTags } from "../db/schema";
import { eq, and, desc, asc, or, like, gte, lte, inArray } from "drizzle-orm";
import type { EventWithChannelName, TagFilter, SortField, SortOrder } from "./event";
import { getEventTags } from "./event-tags";

export async function toggleBookmark(userId: number, eventId: number): Promise<boolean> {
  const existing = await db
    .select({ id: bookmarks.id })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.eventId, eventId)))
    .limit(1);

  if (existing.length > 0) {
    await db.delete(bookmarks).where(eq(bookmarks.id, existing[0].id));
    return false;
  }

  await db.insert(bookmarks).values({ userId, eventId });
  return true;
}

export async function getBookmarkedEvents(
  userId: number,
  projectId: number,
  options: {
    search?: string | null;
    channelId?: number;
    startDate?: Date;
    endDate?: Date;
    tags?: TagFilter[];
    sortBy?: SortField;
    sortOrder?: SortOrder;
  } = {},
): Promise<EventWithChannelName[]> {
  const conditions: any[] = [
    eq(bookmarks.userId, userId),
    eq(events.projectId, projectId),
  ];

  if (options.channelId) conditions.push(eq(events.channelId, options.channelId));
  if (options.startDate) conditions.push(gte(events.createdAt, options.startDate));
  if (options.endDate) conditions.push(lte(events.createdAt, options.endDate));

  if (options.search) {
    const terms = options.search.split(" ").map((w) => `%${w}%`);
    conditions.push(...terms.map((t) => or(like(events.name, t), like(events.description, t))));
  }

  const orderFn = options.sortOrder === "asc" ? asc : desc;
  const orderColumn = options.sortBy === "name" ? events.name : events.createdAt;

  const eventData = await db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
    })
    .from(bookmarks)
    .innerJoin(events, eq(bookmarks.eventId, events.id))
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(orderFn(orderColumn));

  const fetchedTags = await getEventTags(eventData.map((e) => e.id));
  return eventData.map((e) => ({
    ...e,
    tags: fetchedTags[e.id] || {},
    read: true,
    bookmarked: true,
  }));
}
