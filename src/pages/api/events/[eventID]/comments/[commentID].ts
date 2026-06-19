import type { APIContext, APIRoute } from "astro";
import { deleteComment } from "@/lib/beaver/comment";
import { db } from "@/lib/db/db";
import { eventComments, events } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserProjectRole } from "@/lib/beaver/project-member";

export const DELETE: APIRoute = async ({ locals, params }: APIContext) => {
  if (!locals.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const commentId = parseInt(params.commentID!);
  if (isNaN(commentId))
    return new Response(JSON.stringify({ error: "Invalid comment ID" }), { status: 400 });

  const [comment] = await db
    .select({ userId: eventComments.userId, eventId: eventComments.eventId })
    .from(eventComments)
    .where(eq(eventComments.id, commentId));

  if (!comment) return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });

  const [event] = await db
    .select({ projectId: events.projectId })
    .from(events)
    .where(eq(events.id, comment.eventId));
  const role = locals.user.isAdmin
    ? "owner"
    : await getUserProjectRole(event.projectId, locals.user.id);
  const canDelete = comment.userId === locals.user.id || role === "owner" || role === "maintainer";

  if (!canDelete) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });

  await deleteComment(commentId, locals.user.id);
  return new Response(JSON.stringify({ success: true }), {
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
