import type { APIRoute } from "astro";
import {
  getAllUsers,
  createUserAccount,
  deleteUser,
  setUserAdmin,
  setCanCreateProjects,
} from "@/lib/beaver/user";
import { addProjectMember, type Role } from "@/lib/beaver/project-member";
import { getOwnedProjectsWithEventCounts } from "@/lib/beaver/project";
import { requireAdmin } from "@/lib/beaver/authz";

const VALID_ROLES: Role[] = ["owner", "maintainer", "guest"];

type ProjectAssignment = { projectId: number; role: Role };

function parseProjectAssignments(input: unknown): ProjectAssignment[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;

  const assignments: ProjectAssignment[] = [];
  for (const entry of input) {
    const projectId = Number(entry?.projectId);
    const role = entry?.role;
    if (!Number.isInteger(projectId) || !VALID_ROLES.includes(role)) return null;
    assignments.push({ projectId, role });
  }
  return assignments;
}

export const GET: APIRoute = async (context) => {
  const denied = requireAdmin(context.locals.user);
  if (denied) return denied;

  try {
    const allUsers = await getAllUsers();
    return new Response(JSON.stringify(allUsers), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch users." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async (context) => {
  const denied = requireAdmin(context.locals.user);
  if (denied) return denied;

  try {
    const { userName, canCreateProjects, projectAssignments } = await context.request.json();

    if (!userName?.trim()) {
      return new Response(JSON.stringify({ error: "userName is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const assignments = parseProjectAssignments(projectAssignments);
    if (assignments === null) {
      return new Response(JSON.stringify({ error: "Invalid project assignments." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const user = await createUserAccount(userName.trim(), canCreateProjects ?? false);

    for (const { projectId, role } of assignments) {
      await addProjectMember(projectId, user.id, role);
    }

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
  const denied = requireAdmin(context.locals.user);
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
  } catch {
    return new Response(JSON.stringify({ error: "Failed to update user." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async (context) => {
  const denied = requireAdmin(context.locals.user);
  if (denied) return denied;

  try {
    const { id } = await context.request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "id is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const targetId = Number(id);
    if (!Number.isInteger(targetId)) {
      return new Response(JSON.stringify({ error: "id must be a number." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (targetId === context.locals.user?.id) {
      return new Response(JSON.stringify({ error: "You cannot delete your own account." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // projects.owner_id is declared ON DELETE CASCADE, but bun:sqlite leaves
    // PRAGMA foreign_keys at 0 and db.ts never turns it on, so the cascade does not
    // run. Deleting an owner today leaves their projects behind pointing at a user
    // row that is gone. Enabling the pragma would instead destroy those projects and
    // every event in them. Neither outcome is one an admin should get by surprise,
    // so ownership has to move first and this refuses either way.
    const ownedProjects = await getOwnedProjectsWithEventCounts(targetId);
    if (ownedProjects.length > 0) {
      const summary = ownedProjects
        .map((p) => `${p.name} (${p.eventCount.toLocaleString("en-US")} events)`)
        .join(", ");
      return new Response(
        JSON.stringify({
          error:
            `This user still owns ${ownedProjects.length} ` +
            `${ownedProjects.length === 1 ? "project" : "projects"}: ${summary}. ` +
            "Transfer ownership before deleting the account.",
          ownedProjects,
        }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await deleteUser(targetId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to delete user." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
