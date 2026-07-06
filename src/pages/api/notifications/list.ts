import type { APIContext } from "astro";
import { getNotifications } from "@/lib/beaver/notification";
import { canAccessProject, forbidden, unauthorized } from "@/lib/beaver/authz";

export async function GET({ locals, url }: APIContext) {
  const user = locals.user;
  if (!user) return unauthorized();

  const projectId = Number(url.searchParams.get("projectId"));
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required" }), { status: 400 });
  }
  if (!(await canAccessProject(user, projectId))) return forbidden();

  const limitParam = Number(url.searchParams.get("limit"));
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 50;

  const notifications = await getNotifications(user.id, projectId, { limit });
  return new Response(JSON.stringify({ notifications }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
