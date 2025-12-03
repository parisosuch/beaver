import { db } from "../db/db";
import { events, channels, projects, eventTags } from "../db/schema";
import { eq, and, desc, like } from "drizzle-orm";
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
  description?: string;
  icon?: string;
  projectId: number;
  channelName: string;
  createdAt: Date;
  tags?: TagPrimitive;
};

// helper function to get tag primitive object from event tags
const getEventTags = async (id: number): Promise<TagPrimitive> => {
  const tags = await db
    .select()
    .from(eventTags)
    .where(eq(eventTags.eventId, id));

  const tagPrim: TagPrimitive = {};

  for (const row of tags) {
    if (row.type === "number") {
      tagPrim[row.key] = Number(row.value);
    } else if (row.type === "boolean") {
      tagPrim[row.key] = row.value === "true";
    } else {
      tagPrim[row.key] = row.value;
    }
  }

  return tagPrim;
};

export async function getChannelEvents(channel_id: number) {
  // check if channel exists first
  const channelsRes = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channel_id));

  if (channelsRes.length === 0) {
    throw new Error(`Channel with id ${channel_id} does not exist.`);
  }

  const eventRes = await db
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
    .leftJoin(channels, eq(events.channelId, channels.id))
    .where(eq(events.channelId, channel_id))
    .orderBy(desc(events.createdAt));

  return eventRes as EventWithChannelName[];
}

export async function getProjectEvents(
  project_id: number,
  options: { search: string | null }
): Promise<EventWithChannelName[]> {
  if (options.search) {
    const searchWords = options.search.split(" ");
    const searchTerms = searchWords.map((word) => `%${word}%`);

    var eventData = await db
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
      .where(
        and(
          eq(events.projectId, project_id),
          ...searchTerms.map((term) => like(events.name, term))
        )
      )
      .orderBy(desc(events.createdAt));
  } else {
    var eventData = await db
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
      .where(eq(events.projectId, project_id))
      .orderBy(desc(events.createdAt));
  }

  var eventsRes = [];

  for (let event of eventData) {
    const tags = await getEventTags(event.id);

    eventsRes.push({
      tags,
      ...event,
    });
  }

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
      key, // <-- the object key, e.g. "quantity"
      value: String(value), // stored as TEXT
      type: typeof value as "string" | "number" | "boolean",
    }));

    await db.insert(eventTags).values(tagEntries);

    const tagPrim = await getEventTags(event.id);

    return {
      id: event.id,
      name: event.name,
      icon: event.icon ?? undefined,
      description: event.description ?? undefined,
      tags: tagPrim,
      projectId: project.id,
      channelName: channelsRes[0].name,
      createdAt: event.createdAt,
    };
  }

  return {
    id: event.id,
    name: event.name,
    icon: event.icon ?? undefined,
    description: event.description ?? undefined,
    tags: {},
    projectId: project.id,
    channelName: channelsRes[0].name,
    createdAt: event.createdAt,
  };
}
