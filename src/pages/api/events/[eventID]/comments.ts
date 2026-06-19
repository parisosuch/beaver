import type { APIContext, APIRoute } from "astro";
import { getComments, createComment } from "@/lib/beaver/comment";

export const GET: APIRoute = async ({ locals, params }: APIContext) => {
  if (!locals.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const eventId = parseInt(params.eventID!);
  if (isNaN(eventId))
    return new Response(JSON.stringify({ error: "Invalid event ID" }), { status: 400 });

  const comments = await getComments(eventId);
  return new Response(JSON.stringify(comments), {
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ locals, params, request }: APIContext) => {
  if (!locals.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const eventId = parseInt(params.eventID!);
  if (isNaN(eventId))
    return new Response(JSON.stringify({ error: "Invalid event ID" }), { status: 400 });

  const { body } = await request.json();
  if (!body?.trim()) {
    return new Response(JSON.stringify({ error: "body is required" }), { status: 400 });
  }

  const comment = await createComment(eventId, locals.user.id, body.trim());
  return new Response(JSON.stringify(comment), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
