import { db } from "../db/db";
import { channels } from "../db/schema";
import { eq } from "drizzle-orm";

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
    .where(eq(channels.projectId, project_id));

  return res;
}

export async function createChannel(channel_name: string, project_id: number) {
  const res = await db
    .insert(channels)
    .values({ name: channel_name, projectId: project_id })
    .returning();

  return res[0];
}
