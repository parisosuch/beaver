import { db } from "../db/db";
import { channels, events, eventTags } from "../db/schema";
import { eq, and, asc, inArray } from "drizzle-orm";

export type Channel = {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  createdAt: Date | null;
};

export async function getChannels(project_id: number) {
  const res = await db
    .select()
    .from(channels)
    .where(eq(channels.projectId, project_id))
    .orderBy(asc(channels.createdAt));

  return res;
}

export async function getChannel(channelID: number) {
  const res = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelID));

  return res[0];
}

export async function createChannel(
  channel_name: string,
  project_id: number,
  description?: string
) {
  if (channel_name.length > 16) {
    throw new Error("Channel name cannot be longer than 16 characters.");
  }
  // check if channel with name already exists for project
  const projectChannels = await db
    .select()
    .from(channels)
    .where(
      and(eq(channels.projectId, project_id), eq(channels.name, channel_name))
    );

  if (projectChannels.length > 0) {
    throw new Error("Channel with name already exists for this project.");
  }

  const res = await db
    .insert(channels)
    .values({
      name: channel_name,
      projectId: project_id,
      description: description ?? null,
    })
    .returning();

  return res[0];
}

export async function deleteChannel(channelID: number) {
  // Delete event tags for all events in this channel
  const channelEvents = await db
    .select({ id: events.id })
    .from(events)
    .where(eq(events.channelId, channelID));

  if (channelEvents.length > 0) {
    const eventIds = channelEvents.map((e) => e.id);
    await db.delete(eventTags).where(inArray(eventTags.eventId, eventIds));
    await db.delete(events).where(eq(events.channelId, channelID));
  }

  const channel = await db
    .delete(channels)
    .where(eq(channels.id, channelID))
    .returning();

  return channel;
}
