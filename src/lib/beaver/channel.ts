import { db } from "../db/db";
import { channels } from "../db/schema";
import { eq, and, asc } from "drizzle-orm";

export type Channel = {
  id: number;
  name: string;
  projectId: number;
  createdAt: number;
};

export async function getChannels(project_id: number) {
  const res = await db
    .select()
    .from(channels)
    .where(eq(channels.projectId, project_id))
    .orderBy(asc(channels.createdAt));

  return res;
}

export async function createChannel(channel_name: string, project_id: number) {
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

  console.log(projectChannels);

  if (projectChannels.length > 0) {
    throw new Error("Channel with name already exists for this project.");
  }

  const res = await db
    .insert(channels)
    .values({ name: channel_name, projectId: project_id })
    .returning();

  return res[0];
}
