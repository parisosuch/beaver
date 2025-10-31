import { db } from "../db/db";
import { logs, channels } from "../db/schema";
import { eq } from "drizzle-orm";
import { getProject } from "./project";

export async function getChannelLogs(channel_id: number) {
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
    .from(logs)
    .where(eq(logs.channelId, channel_id));

  return logsRes;
}

export async function createLog({
  message,
  level,
  channel,
  apiKey,
}: {
  message: string;
  level: string;
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
    .insert(logs)
    .values({ message, level, channelId })
    .returning();

  return res[0];
}
