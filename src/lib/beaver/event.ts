import { db } from "../db/db";
import { events, channels, eventTags } from "../db/schema";
import { eq, and, asc, desc, like, inArray, gt, lt, gte, lte, exists, max } from "drizzle-orm";
import { getProject } from "./project";

export async function getMaxEventId(): Promise<number> {
  const result = await db.select({ maxId: max(events.id) }).from(events);
  return result[0]?.maxId ?? 0;
}

export type Tag = {
  id: number;
  eventId: number;
  key: string;
  value: string;
  type: "string" | "number" | "boolean";
};

// TODO: this name sucks but IDK what else to use.
export type TagPrimitive = Record<string, number | string | boolean>;

export type Event = {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  projectId: number;
  channelId: number;
  createdAt: Date;
};

// TODO: this name sucks too
export type EventWithChannelName = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  projectId: number;
  channelName: string;
  createdAt: Date;
  tags: TagPrimitive;
};

export type TagFilter = {
  key: string;
  value: string;
};

export type SortField = "date" | "name";
export type SortOrder = "asc" | "desc";

type QueryOptions = {
  search: string | null;
  afterId?: number;
  beforeId?: number;
  offset?: number;
  limit?: number;
  startDate?: Date;
  endDate?: Date;
  tags?: TagFilter[];
  sortBy?: SortField;
  sortOrder?: SortOrder;
};

// helper function to get tag primitive object from event tags
const getEventTags = async (
  ids: number[]
): Promise<Record<number, TagPrimitive>> => {
  // batch fetch all tags for these events
  const allTags = await db
    .select()
    .from(eventTags)
    .where(inArray(eventTags.eventId, ids));

  // group tags by eventId and convert to TagPrimitive
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
};

export async function getChannelEvents(
  channelId: number,
  options: QueryOptions
): Promise<EventWithChannelName[]> {
  // initial where clause
  const conditions: any[] = [eq(events.channelId, channelId)];

  if (options.search) {
    const searchTerms = options.search.split(" ").map((word) => `%${word}%`);

    conditions.push(...searchTerms.map((term) => like(events.name, term)));
  }

  if (options.afterId) {
    conditions.push(gt(events.id, options.afterId));
  }

  // Only use cursor pagination for default sort (date desc)
  if (options.beforeId && !options.offset) {
    conditions.push(lt(events.id, options.beforeId));
  }

  // Date range filtering
  if (options.startDate) {
    conditions.push(gte(events.createdAt, options.startDate));
  }

  if (options.endDate) {
    conditions.push(lte(events.createdAt, options.endDate));
  }

  // Tag filtering using EXISTS subquery
  if (options.tags && options.tags.length > 0) {
    for (const tagFilter of options.tags) {
      const tagSubquery = db
        .select({ eventId: eventTags.eventId })
        .from(eventTags)
        .where(
          and(
            eq(eventTags.eventId, events.id),
            eq(eventTags.key, tagFilter.key),
            eq(eventTags.value, tagFilter.value)
          )
        );

      conditions.push(exists(tagSubquery));
    }
  }

  const orderFn = options.sortOrder === "asc" ? asc : desc;
  const orderColumn = options.sortBy === "name" ? events.name : events.createdAt;

  let query = db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
    })
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(and(...conditions))
    .orderBy(orderFn(orderColumn))
    .limit(options.limit ?? 100);

  if (options.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  const eventData = await query;
  const eventIds = eventData.map((event) => event.id);

  const fetchedTags = await getEventTags(eventIds);

  const eventsRes = eventData.map((event) => ({
    ...event,
    tags: fetchedTags[event.id] || {},
  }));

  return eventsRes;
}

export async function getProjectEvents(
  projectId: number,
  options: QueryOptions
): Promise<EventWithChannelName[]> {
  // initial where clause
  const conditions: any[] = [eq(events.projectId, projectId)];

  if (options.search) {
    const searchTerms = options.search.split(" ").map((word) => `%${word}%`);

    conditions.push(...searchTerms.map((term) => like(events.name, term)));
  }

  if (options.afterId) {
    conditions.push(gt(events.id, options.afterId));
  }

  // Only use cursor pagination for default sort (date desc)
  if (options.beforeId && !options.offset) {
    conditions.push(lt(events.id, options.beforeId));
  }

  // Date range filtering
  if (options.startDate) {
    conditions.push(gte(events.createdAt, options.startDate));
  }

  if (options.endDate) {
    conditions.push(lte(events.createdAt, options.endDate));
  }

  // Tag filtering using EXISTS subquery
  if (options.tags && options.tags.length > 0) {
    for (const tagFilter of options.tags) {
      const tagSubquery = db
        .select({ eventId: eventTags.eventId })
        .from(eventTags)
        .where(
          and(
            eq(eventTags.eventId, events.id),
            eq(eventTags.key, tagFilter.key),
            eq(eventTags.value, tagFilter.value)
          )
        );

      conditions.push(exists(tagSubquery));
    }
  }

  const orderFn = options.sortOrder === "asc" ? asc : desc;
  const orderColumn = options.sortBy === "name" ? events.name : events.createdAt;

  let query = db
    .select({
      id: events.id,
      name: events.name,
      description: events.description,
      icon: events.icon,
      projectId: events.projectId,
      createdAt: events.createdAt,
      channelName: channels.name,
    })
    .from(events)
    .leftJoin(
      channels,
      and(
        eq(events.channelId, channels.id),
        eq(events.projectId, channels.projectId)
      )
    )
    .where(and(...conditions))
    .orderBy(orderFn(orderColumn))
    .limit(options.limit ?? 100);

  if (options.offset) {
    query = query.offset(options.offset) as typeof query;
  }

  const eventData = await query;

  const eventIds = eventData.map((event) => event.id);

  const fetchedTags = await getEventTags(eventIds);

  const eventsRes = eventData.map((event) => ({
    ...event,
    tags: fetchedTags[event.id] || {},
  }));

  return eventsRes as EventWithChannelName[];
}

export async function getEvent(
  eventId: number
): Promise<EventWithChannelName | null> {
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
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .where(eq(events.id, eventId))
    .limit(1);

  if (eventData.length === 0) {
    return null;
  }

  const event = eventData[0];
  const tags = await getEventTags([event.id]);

  return {
    ...event,
    tags: tags[event.id] || {},
  };
}

export async function createEvent({
  name,
  description,
  icon,
  channel,
  apiKey,
  tags,
}: {
  name: string;
  description?: string;
  icon?: string;
  channel: string;
  apiKey: string;
  tags?: Record<string, string | number | boolean>;
}): Promise<EventWithChannelName> {
  // check if channel exists first
  const channelsRes = await db
    .select()
    .from(channels)
    .where(eq(channels.name, channel));

  if (channelsRes.length === 0) {
    throw new Error(`Channel with name ${channel} does not exist.`);
  }

  const channelId = channelsRes[0].id;

  // validate api key
  const project = await getProject(channelsRes[0].projectId);
  const projectId = project.id;

  if (project.apiKey !== apiKey) {
    throw new Error("Invalid API key.");
  }

  const res = await db
    .insert(events)
    .values({ name, description, icon, projectId, channelId })
    .returning();

  const event = res[0];

  if (tags) {
    const tagEntries = Object.entries(tags).map(([key, value]) => ({
      eventId: event.id,
      key,
      value: String(value),
      type: typeof value as "string" | "number" | "boolean",
    }));

    await db.insert(eventTags).values(tagEntries);

    return {
      id: event.id,
      name: event.name,
      icon: event.icon,
      description: event.description,
      tags: tags,
      projectId: project.id,
      channelName: channelsRes[0].name,
      createdAt: event.createdAt,
    };
  }

  return {
    id: event.id,
    name: event.name,
    icon: event.icon,
    description: event.description,
    tags: {},
    projectId: project.id,
    channelName: channelsRes[0].name,
    createdAt: event.createdAt,
  };
}
