import { db } from "../db/db";
import { events, channels, projects } from "../db/schema";
import { eq } from "drizzle-orm";
import { getProject } from "./project";

export type Event = {
  id: number;
  event: string;
  description?: string;
  icon?: string;
  channelId: number;
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

export async function getProjectEvents(project_id: number) {
  const eventRes = await db
    .select()
    .from(events)
    .where(eq(projects.id, project_id));

  return eventRes;
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

  if (project.apiKey !== apiKey) {
    throw new Error("Invalid API key.");
  }

  const res = await db
    .insert(events)
    .values({ name, description, icon, channelId })
    .returning();

  return res[0];
}
