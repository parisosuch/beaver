import type { APIContext } from "astro";
import { markAllRead } from "@/lib/beaver/notification";
import { canAccessProject, forbidden, unauthorized } from "@/lib/beaver/authz";

export async function POST({ locals, request }: APIContext) {
  const user = locals.user;
  if (!user) return unauthorized();

  const { projectId } = await request.json();
  if (typeof projectId !== "number") {
    return new Response(JSON.stringify({ error: "projectId is required" }), { status: 400 });
  }
  if (!(await canAccessProject(user, projectId))) return forbidden();

  await markAllRead(user.id, projectId);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
