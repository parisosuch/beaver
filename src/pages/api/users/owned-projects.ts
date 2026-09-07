import type { APIRoute } from "astro";
import { requireAdmin } from "@/lib/beaver/authz";
import { getOwnedProjectsWithEventCounts } from "@/lib/beaver/project";
import { getUserById } from "@/lib/beaver/user";

// What deleting a user would take with it: the projects they own and the events in them.
export const GET: APIRoute = async (context) => {
  const denied = requireAdmin(context.locals.user);
  if (denied) return denied;

  const url = new URL(context.request.url);
  const userId = Number(url.searchParams.get("userId"));

  if (!Number.isInteger(userId) || userId <= 0) {
    return new Response(JSON.stringify({ error: "userId is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const user = await getUserById(userId);
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ownedProjects = await getOwnedProjectsWithEventCounts(userId);

    return new Response(JSON.stringify({ userName: user.userName, ownedProjects }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch owned projects." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
