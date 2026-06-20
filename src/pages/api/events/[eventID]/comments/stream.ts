import { subscribeComments } from "@/lib/beaver/comment-bus";
import { canAccessProject, forbidden, projectIdForEvent } from "@/lib/beaver/authz";
import type { APIContext } from "astro";

const KEEPALIVE_MS = 15000;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

export async function GET({ params, locals }: APIContext) {
  if (!locals.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const eventId = parseInt(params.eventID!);

  const projectId = await projectIdForEvent(eventId);
  if (projectId === null || !(await canAccessProject(locals.user, projectId))) return forbidden();

  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;
  let closed = false;

  function cleanup() {
    closed = true;
    unsubscribe?.();
    unsubscribe = null;
    if (keepalive) {
      clearInterval(keepalive);
      keepalive = null;
    }
  }

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(": ok\n\n"));

      unsubscribe = subscribeComments((msg) => {
        if (msg.eventId !== eventId || closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(msg.comment)}\n\n`));
        } catch {
          cleanup();
        }
      });

      keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          cleanup();
        }
      }, KEEPALIVE_MS);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}

export const prerender = false;
