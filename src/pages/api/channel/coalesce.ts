import { coalesceChannels } from "@/lib/beaver/channel";
import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }: APIContext) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { sourceId, targetId, survivingName } = await request.json();

    if (!sourceId || !targetId || !survivingName) {
      return new Response(
        JSON.stringify({ error: "sourceId, targetId, and survivingName are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    if (sourceId === targetId) {
      return new Response(
        JSON.stringify({ error: "Cannot merge a channel into itself." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const channel = await coalesceChannels(sourceId, targetId, survivingName.trim());

    return new Response(JSON.stringify(channel), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Error) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: "An unknown error occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
