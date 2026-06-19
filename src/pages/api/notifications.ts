import { setChannelNotification, setChannelNotifications } from "@/lib/beaver/channel-notification";
import type { APIContext } from "astro";

export async function POST({ locals, request }: APIContext) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();

  if (Array.isArray(body.channelIds) && typeof body.enabled === "boolean") {
    if (!body.channelIds.every((id: unknown) => typeof id === "number")) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
    }
    await setChannelNotifications(user.id, body.channelIds, body.enabled);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const { channelId, enabled } = body;
  if (typeof channelId !== "number" || typeof enabled !== "boolean") {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
    });
  }

  await setChannelNotification(user.id, channelId, enabled);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
