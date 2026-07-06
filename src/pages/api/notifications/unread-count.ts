import type { APIContext } from "astro";
import { getUnreadCount } from "@/lib/beaver/notification";
import { canAccessProject, forbidden, unauthorized } from "@/lib/beaver/authz";

export async function GET({ locals, url }: APIContext) {
  const user = locals.user;
  if (!user) return unauthorized();

  const projectId = Number(url.searchParams.get("projectId"));
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), { status: 400 });
  }
  if (!(await canAccessProject(user, projectId))) return forbidden();

  const count = await getUnreadCount(user.id, projectId);
  return new Response(JSON.stringify({ count }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
