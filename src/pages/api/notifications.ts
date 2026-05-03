import { setProjectNotifications } from "@/lib/beaver/user";
import type { APIContext } from "astro";

export async function POST({ locals, request }: APIContext) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { projectId, enabled } = await request.json();
  if (typeof projectId !== "number" || typeof enabled !== "boolean") {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
    });
  }

  await setProjectNotifications(user.id, projectId, enabled);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
