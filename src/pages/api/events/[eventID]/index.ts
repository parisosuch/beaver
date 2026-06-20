import { deleteEvent, getEvent } from "@/lib/beaver/event";
import { getUserProjectRole } from "@/lib/beaver/project-member";
import type { APIContext } from "astro";

export async function DELETE({ params, locals }: APIContext) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const eventId = parseInt(params.eventID!);
  if (isNaN(eventId)) {
    return new Response(JSON.stringify({ error: "Invalid event ID" }), { status: 400 });
  }

  const event = await getEvent(eventId, user.id);
  if (!event) {
    return new Response(JSON.stringify({ error: "Event not found" }), { status: 404 });
  }

  const role = user.isAdmin ? "owner" : await getUserProjectRole(event.projectId, user.id);
  if (role !== "owner" && role !== "maintainer") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
  }

  await deleteEvent(eventId);
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

export const prerender = false;
