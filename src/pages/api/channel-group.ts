import {
  createChannelGroup,
  deleteChannelGroup,
  getChannelGroups,
  renameChannelGroup,
  reorderGroups,
} from "@/lib/beaver/channel-group";
import {
  canAccessProject,
  canManageProject,
  forbidden,
  projectIdForChannelGroup,
  unauthorized,
} from "@/lib/beaver/authz";
import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ request, locals }: APIContext) => {
  if (!locals.user) return unauthorized();
  try {
    const url = new URL(request.url);
    const project_id = url.searchParams.get("project_id");

    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is a required query parameter." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!(await canAccessProject(locals.user, parseInt(project_id)))) return forbidden();

    const groups = await getChannelGroups(parseInt(project_id));

    return new Response(JSON.stringify(groups), {
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
    return new Response(JSON.stringify({ error: "An unknown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async ({ request, locals }: APIContext) => {
  if (!locals.user) return unauthorized();
  try {
    const { name, project_id } = await request.json();

    if (!name || !project_id) {
      return new Response(JSON.stringify({ error: "name and project_id are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!(await canManageProject(locals.user, parseInt(project_id)))) return forbidden();

    const group = await createChannelGroup(name, parseInt(project_id));

    return new Response(JSON.stringify(group), {
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
    return new Response(JSON.stringify({ error: "An unknown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Reorder groups
export const PATCH: APIRoute = async ({ request, locals }: APIContext) => {
  if (!locals.user) return unauthorized();
  try {
    const { groups } = await request.json();

    if (!Array.isArray(groups) || groups.length === 0) {
      return new Response(JSON.stringify({ error: "groups array is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Every group referenced must belong to a project the user can manage.
    const projectIds = new Set<number>();
    for (const item of groups) {
      const pid = await projectIdForChannelGroup(parseInt(item.id));
      if (pid === null) return forbidden();
      projectIds.add(pid);
    }
    for (const pid of projectIds) {
      if (!(await canManageProject(locals.user, pid))) return forbidden();
    }

    await reorderGroups(groups);

    return new Response(JSON.stringify({ success: true }), {
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
    return new Response(JSON.stringify({ error: "An unknown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

// Rename group
export const PUT: APIRoute = async ({ request, locals }: APIContext) => {
  if (!locals.user) return unauthorized();
  try {
    const { id, name } = await request.json();

    if (!id || !name) {
      return new Response(JSON.stringify({ error: "id and name are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const projectId = await projectIdForChannelGroup(parseInt(id));
    if (projectId === null) return forbidden();
    if (!(await canManageProject(locals.user, projectId))) return forbidden();

    await renameChannelGroup(parseInt(id), name);

    return new Response(JSON.stringify({ success: true }), {
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
    return new Response(JSON.stringify({ error: "An unknown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, locals }: APIContext) => {
  if (!locals.user) return unauthorized();
  try {
    const { id } = await request.json();

    if (!id) {
      return new Response(JSON.stringify({ error: "id is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const projectId = await projectIdForChannelGroup(parseInt(id));
    if (projectId === null) return forbidden();
    if (!(await canManageProject(locals.user, projectId))) return forbidden();

    await deleteChannelGroup(parseInt(id));

    return new Response(JSON.stringify({ success: true }), {
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
    return new Response(JSON.stringify({ error: "An unknown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
