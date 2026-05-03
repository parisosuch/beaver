import { markChannelRead, getUnreadCounts } from "@/lib/beaver/channel-read";
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

  const { channelId } = await request.json();
  if (!channelId) {
    return new Response(JSON.stringify({ error: "channelId is required" }), {
      status: 400,
    });
  }

  const lastReadAt = await markChannelRead(user.id, channelId);
  return new Response(
    JSON.stringify({ lastReadAt: lastReadAt?.toISOString() ?? null }),
    { headers: { "Content-Type": "application/json" } },
  );
}
