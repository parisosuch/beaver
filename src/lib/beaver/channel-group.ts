import { db } from "../db/db";
import { channelGroups, channels } from "../db/schema";
import { eq, asc, max } from "drizzle-orm";
import type { Channel } from "./channel";

export type ChannelGroup = {
  id: number;
  name: string;
  projectId: number;
  order: number;
  createdAt: Date | null;
};

export type ChannelGroupWithChannels = ChannelGroup & {
  channels: Channel[];
};

export async function getChannelGroups(projectId: number): Promise<ChannelGroupWithChannels[]> {
  const groups = await db
    .select()
    .from(channelGroups)
    .where(eq(channelGroups.projectId, projectId))
    .orderBy(asc(channelGroups.order));

  const groupChannels = await db
    .select()
    .from(channels)
    .where(eq(channels.projectId, projectId))
    .orderBy(asc(channels.order));

  return groups.map((group) => ({
    ...group,
    channels: groupChannels.filter((c) => c.groupId === group.id),
  }));
}

export async function createChannelGroup(name: string, projectId: number): Promise<ChannelGroup> {
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(channelGroups.order) })
    .from(channelGroups)
    .where(eq(channelGroups.projectId, projectId));

  const [group] = await db
    .insert(channelGroups)
    .values({
      name,
      projectId,
      order: (maxOrder ?? -1) + 1,
    })
    .returning();

  return group;
}

export async function renameChannelGroup(id: number, name: string): Promise<void> {
  await db.update(channelGroups).set({ name }).where(eq(channelGroups.id, id));
}

export async function deleteChannelGroup(id: number): Promise<void> {
  // Ungroup all channels in this group
  await db.update(channels).set({ groupId: null }).where(eq(channels.groupId, id));

  await db.delete(channelGroups).where(eq(channelGroups.id, id));
}

export async function reorderGroups(items: { id: number; order: number }[]): Promise<void> {
  await Promise.all(
    items.map(({ id, order }) =>
      db.update(channelGroups).set({ order }).where(eq(channelGroups.id, id)),
    ),
  );
}
