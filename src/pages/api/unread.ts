import { markChannelRead, getUnreadCounts } from "@/lib/beaver/channel-read";
import { db } from "@/lib/db/db";
import { channels } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { APIContext } from "astro";

export async function GET({ locals, url }: APIContext) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const projectId = url.searchParams.get("projectId");
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), {
      status: 400,
    });
  }

  const counts = await getUnreadCounts(user.id, parseInt(projectId));
  return new Response(JSON.stringify({ counts }), {
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST({ locals, request }: APIContext) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { channelName, projectId } = await request.json();
  if (!channelName || !projectId) {
    return new Response(
      JSON.stringify({ error: "channelName and projectId are required" }),
      { status: 400 },
    );
  }

  const channelRow = await db
    .select({ id: channels.id })
    .from(channels)
    .where(and(eq(channels.name, channelName), eq(channels.projectId, projectId)))
    .limit(1);

  if (channelRow.length === 0) {
    return new Response(JSON.stringify({ error: "Channel not found" }), {
      status: 404,
    });
  }

  const channelId = channelRow[0].id;
  const lastReadAt = await markChannelRead(user.id, channelId);
  return new Response(
    JSON.stringify({ channelId, lastReadAt: lastReadAt?.toISOString() ?? null }),
    { headers: { "Content-Type": "application/json" } },
  );
}
