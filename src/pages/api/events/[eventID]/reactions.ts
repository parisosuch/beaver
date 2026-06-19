import { toggleReaction } from "@/lib/beaver/reaction";
import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async ({ locals, request, params }: APIContext) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const eventId = parseInt(params.eventID!);
  if (isNaN(eventId)) {
    return new Response(JSON.stringify({ error: "Invalid event ID" }), { status: 400 });
  }

  const { emoji } = await request.json();
  if (!emoji || typeof emoji !== "string") {
    return new Response(JSON.stringify({ error: "emoji is required" }), { status: 400 });
  }

  const reaction = await toggleReaction(user.id, eventId, emoji);
  return new Response(JSON.stringify(reaction), {
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
