import type { APIContext, APIRoute } from "astro";
import {
  getAllUsers,
  createUserAccount,
  deleteUser,
  setUserAdmin,
  setCanCreateProjects,
} from "@/lib/beaver/user";

function requireAdmin(context: APIContext): Response | null {
  if (!context.locals.user?.isAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

export const GET: APIRoute = async (context) => {
  const denied = requireAdmin(context);
  if (denied) return denied;

  try {
    const allUsers = await getAllUsers();
    return new Response(JSON.stringify(allUsers), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch users." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async (context) => {
  const denied = requireAdmin(context);
  if (denied) return denied;

  try {
    const { userName, canCreateProjects } = await context.request.json();

    if (!userName?.trim()) {
      return new Response(JSON.stringify({ error: "userName is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await createUserAccount(userName.trim(), canCreateProjects ?? false);
    return new Response(JSON.stringify(user), {
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
    return new Response(JSON.stringify({ error: "Failed to create user." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Toggle admin status or canCreateProjects
export const PATCH: APIRoute = async (context) => {
  const denied = requireAdmin(context);
  if (denied) return denied;

  try {
    const { id, isAdmin, canCreateProjects } = await context.request.json();

    if (id === undefined) {
      return new Response(JSON.stringify({ error: "id is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (isAdmin !== undefined) {
      // Prevent admin from removing their own admin status
      if (id === context.locals.user?.id && !isAdmin) {
        return new Response(JSON.stringify({ error: "You cannot remove your own admin status." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      await setUserAdmin(id, isAdmin);
    }

    if (canCreateProjects !== undefined) {
      await setCanCreateProjects(id, canCreateProjects);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to update user." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  const denied = requireAdmin(context);
  if (denied) return denied;

  try {
    const { id } = await context.request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "id is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (id === context.locals.user?.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await deleteUser(id);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to delete user." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
