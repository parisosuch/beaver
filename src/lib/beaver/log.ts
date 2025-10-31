import { db } from "../db/db";
import { logs, channels } from "../db/schema";
import { eq } from "drizzle-orm";

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
  channelId,
}: {
  message: string;
  level: string;
  channelId: number;
}) {
  // check if channel exists first
  const channelsRes = await db
    .select()
    .from(channels)
    .where(eq(channels.id, channelId));

  if (channelsRes.length === 0) {
    throw new Error(`Channel with id ${channelId} does not exist.`);
  }
  const res = await db
    .insert(logs)
    .values({ message, level, channelId })
    .returning();

  return res[0];
}
