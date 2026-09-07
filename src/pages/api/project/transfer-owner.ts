import type { APIRoute } from "astro";
import { requireAdmin, unauthorized } from "@/lib/beaver/authz";
import { getProject, setProjectOwner } from "@/lib/beaver/project";
import { getUserById } from "@/lib/beaver/user";
import { logAuditEntry } from "@/lib/beaver/audit-log";

// Hand a project to a new owner. Admin-only: this is the escape hatch that lets an
// admin retire an account without taking that account's projects down with it.
export const POST: APIRoute = async (context) => {
  const actor = context.locals.user;
  if (!actor) return unauthorized();

  const denied = requireAdmin(actor);
  if (denied) return denied;

  try {
    const { projectId, newOwnerId } = await context.request.json();

    if (!Number.isInteger(projectId) || !Number.isInteger(newOwnerId)) {
      return new Response(JSON.stringify({ error: "projectId and newOwnerId are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const project = await getProject(projectId);
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newOwner = await getUserById(newOwnerId);
    if (!newOwner) {
      return new Response(JSON.stringify({ error: "New owner not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (project.ownerId === newOwnerId) {
      return new Response(
        JSON.stringify({ error: `@${newOwner.userName} already owns ${project.name}.` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const previousOwner = await getUserById(project.ownerId);
    const updated = await setProjectOwner(projectId, newOwnerId);

    logAuditEntry({
      projectId,
      userId: actor.id,
      action: "project.owner_transferred",
      targetType: "member",
      targetId: newOwnerId,
      targetName: newOwner.userName,
      metadata: {
        from: previousOwner?.userName ?? String(project.ownerId),
        to: newOwner.userName,
      },
    });

    return new Response(JSON.stringify({ success: true, project: updated }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to transfer ownership.";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
