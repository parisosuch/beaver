import { db } from "../db/db";
import { events, channels, eventTags } from "../db/schema";
import { eq, and, desc, like, inArray } from "drizzle-orm";
import { getProject } from "./project";

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

type QueryOptions = {
  search?: string;
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
  options: { search: string | null }
): Promise<EventWithChannelName[]> {
  // check if channel exists first
  const channelsRes = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId));

  if (channelsRes.length === 0) {
    throw new Error(`Channel with id ${channelId} does not exist.`);
  }

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
    .where(eq(events.channelId, channelId))
    .orderBy(desc(events.createdAt));

  const eventIds = eventData.map((event) => event.id);

  const eventTags = await getEventTags(eventIds);

  const eventsRes = eventData.map((event) => ({
    ...event,
    tags: eventTags[event.id] || {},
  }));

  return eventsRes;
}

export async function getProjectEvents(
  projectId: number,
  options: { search: string | null }
): Promise<EventWithChannelName[]> {
  // initial where clause
  const conditions: any[] = [eq(events.projectId, projectId)];

  if (options.search) {
    const searchTerms = options.search.split(" ").map((word) => `%${word}%`);

    conditions.push(...searchTerms.map((term) => like(events.name, term)));
  }

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
    .leftJoin(
      channels,
      and(
        eq(events.channelId, channels.id),
        eq(events.projectId, channels.projectId)
      )
    )
    .where(and(...conditions))
    .orderBy(desc(events.createdAt));

  const eventIds = eventData.map((event) => event.id);

  const eventTags = await getEventTags(eventIds);

  const eventsRes = eventData.map((event) => ({
    ...event,
    tags: eventTags[event.id] || {},
  }));

  return eventsRes as EventWithChannelName[];
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
