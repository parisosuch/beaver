import { toggleBookmark } from "@/lib/beaver/bookmark";
import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async ({ locals, request }: APIContext) => {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { eventId } = await request.json();
  if (!eventId) {
    return new Response(JSON.stringify({ error: "eventId is required" }), { status: 400 });
  }

  const bookmarked = await toggleBookmark(user.id, parseInt(eventId));
  return new Response(JSON.stringify({ bookmarked }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
