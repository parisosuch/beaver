import type { APIContext, APIRoute } from "astro";
import {
  getProjectMembers,
  addProjectMember,
  updateMemberRole,
  removeProjectMember,
  getUserProjectRole,
  type Role,
} from "@/lib/beaver/project-member";
import { getAllUsers } from "@/lib/beaver/user";

function canManage(userRole: Role | null, isAdmin: boolean): boolean {
  return isAdmin || userRole === "owner";
}

export const GET: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(context.request.url);
  const projectId = parseInt(url.searchParams.get("projectId") ?? "");

  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const [members, allUsers] = await Promise.all([getProjectMembers(projectId), getAllUsers()]);

    const memberUserIds = new Set(members.map((m) => m.userId));
    const nonMembers = allUsers.filter((u) => !memberUserIds.has(u.id));

    return new Response(JSON.stringify({ members, nonMembers }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch members." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { projectId, userId, role } = await context.request.json();

    if (!projectId || !userId || !role) {
      return new Response(JSON.stringify({ error: "projectId, userId, and role are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userRole = await getUserProjectRole(projectId, context.locals.user.id);
    if (!canManage(userRole, context.locals.user.isAdmin)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const member = await addProjectMember(projectId, userId, role as Role);
    return new Response(JSON.stringify(member), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add member.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const PATCH: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { projectId, userId, role } = await context.request.json();

    if (!projectId || !userId || !role) {
      return new Response(JSON.stringify({ error: "projectId, userId, and role are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userRole = await getUserProjectRole(projectId, context.locals.user.id);
    if (!canManage(userRole, context.locals.user.isAdmin)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    await updateMemberRole(projectId, userId, role as Role);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { projectId, userId } = await context.request.json();

    if (!projectId || !userId) {
      return new Response(JSON.stringify({ error: "projectId and userId are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userRole = await getUserProjectRole(projectId, context.locals.user.id);
    if (!canManage(userRole, context.locals.user.isAdmin)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    await removeProjectMember(projectId, userId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove member.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
