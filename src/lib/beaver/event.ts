import { db } from "../db/db";
import { events, channels, projects } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { getProject } from "./project";

export type Event = {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  projectId: number;
  channelId: number;
  createdAt: Date;
};

export type EventWithChannelName = {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  projectId: number;
  channelName: string;
  createdAt: Date;
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

  const logsRes = await db
    .select()
    .from(events)
    .where(eq(events.channelId, channel_id));

  return logsRes;
}

export async function getProjectEvents(
  project_id: number
): Promise<EventWithChannelName[]> {
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
    .leftJoin(
      channels,
      and(
        eq(events.channelId, channels.id),
        eq(events.projectId, channels.projectId)
      )
    )
    .where(eq(events.projectId, project_id));

  return eventRes as EventWithChannelName[];
}

export async function createEvent({
  name,
  description,
  icon,
  channel,
  apiKey,
}: {
  name: string;
  description?: string;
  icon?: string;
  channel: string;
  apiKey: string;
}) {
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

  return res[0];
}
