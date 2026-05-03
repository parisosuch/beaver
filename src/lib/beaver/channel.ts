import { db } from "../db/db";
import { channels, events, eventTags, channelReads } from "../db/schema";
import { eq, and, asc, max, inArray } from "drizzle-orm";

export type Channel = {
  id: number;
  name: string;
  description: string | null;
  projectId: number;
  groupId: number | null;
  order: number;
  createdAt: Date | null;
};

export async function getChannels(project_id: number) {
  const res = await db
    .select()
    .from(channels)
    .where(eq(channels.projectId, project_id))
    .orderBy(asc(channels.order));

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
  description?: string,
) {
  if (channel_name.length > 16) {
    throw new Error("Channel name cannot be longer than 16 characters.");
  }
  // check if channel with name already exists for project
  const projectChannels = await db
    .select()
    .from(channels)
    .where(
      and(eq(channels.projectId, project_id), eq(channels.name, channel_name)),
    );

  if (projectChannels.length > 0) {
    throw new Error("Channel with name already exists for this project.");
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: max(channels.order) })
    .from(channels)
    .where(eq(channels.projectId, project_id));

  const res = await db
    .insert(channels)
    .values({
      name: channel_name,
      projectId: project_id,
      description: description ?? null,
      order: (maxOrder ?? -1) + 1,
    })
    .returning();

  return res[0];
}

export async function reorderChannels(
  items: { id: number; order: number; groupId?: number | null }[],
) {
  await Promise.all(
    items.map(({ id, order, groupId }) =>
      db
        .update(channels)
        .set({ order, ...(groupId !== undefined ? { groupId } : {}) })
        .where(eq(channels.id, id)),
    ),
  );
}

export async function coalesceChannels(
  sourceId: number,
  targetId: number,
  survivingName: string,
) {
  const [source, target] = await Promise.all([
    db.select().from(channels).where(eq(channels.id, sourceId)).limit(1),
    db.select().from(channels).where(eq(channels.id, targetId)).limit(1),
  ]);

  if (!source[0] || !target[0]) throw new Error("Channel not found.");
  if (source[0].projectId !== target[0].projectId)
    throw new Error("Channels must belong to the same project.");

  // Move all events from source to target
  await db
    .update(events)
    .set({ channelId: targetId })
    .where(eq(events.channelId, sourceId));

  // Drop source channel reads — avoid unique constraint conflicts on (userId, channelId)
  await db.delete(channelReads).where(eq(channelReads.channelId, sourceId));

  // Rename target if the surviving name differs
  if (survivingName !== target[0].name) {
    await db
      .update(channels)
      .set({ name: survivingName })
      .where(eq(channels.id, targetId));
  }

  // Delete source (events already moved, no cascade needed)
  await db.delete(channels).where(eq(channels.id, sourceId));

  return { ...target[0], name: survivingName };
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
