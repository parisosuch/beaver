import type { APIContext, APIRoute } from "astro";
import {
  createProject,
  deleteProject,
  getProject,
  renameProject,
  rotateApiKey,
} from "@/lib/beaver/project";
import {
  getUserProjectRole,
  getProjectsForUser,
} from "@/lib/beaver/project-member";

export const GET: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const projects = context.locals.user.isAdmin
      ? await (await import("@/lib/beaver/project")).getProjects()
      : await getProjectsForUser(context.locals.user.id);

    return new Response(JSON.stringify(projects), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "An unknown error has occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const POST: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!context.locals.user.isAdmin && !context.locals.user.canCreateProjects) {
    return new Response(
      JSON.stringify({
        error: "You do not have permission to create projects.",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } },
    );
  }

  try {
    const { name } = await context.request.json();

    if (!name?.trim()) {
      return new Response(JSON.stringify({ error: "name is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const project = await createProject(
      name.trim(),
      crypto.randomUUID(),
      context.locals.user.id,
    );

    return new Response(JSON.stringify(project), {
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
    return new Response(
      JSON.stringify({ error: "An unknown error has occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
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
    const { projectID, name } = await context.request.json();

    if (!projectID || !name?.trim()) {
      return new Response(
        JSON.stringify({ error: "projectID and name are required." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const project = await getProject(parseInt(projectID));
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const role = await getUserProjectRole(
      parseInt(projectID),
      context.locals.user.id,
    );
    if (!context.locals.user.isAdmin && role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only the project owner can rename it." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const updated = await renameProject(parseInt(projectID), name.trim());
    return new Response(JSON.stringify(updated), {
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
    return new Response(
      JSON.stringify({ error: "An unknown error has occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
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
    const { projectID } = await context.request.json();

    if (!projectID) {
      return new Response(JSON.stringify({ error: "projectID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const project = await getProject(parseInt(projectID));
    if (!project) {
      return new Response(JSON.stringify({ error: "Project not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const role = await getUserProjectRole(
      parseInt(projectID),
      context.locals.user.id,
    );
    if (!context.locals.user.isAdmin && role !== "owner") {
      return new Response(
        JSON.stringify({ error: "Only the project owner can delete it." }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const userProjects = await getProjectsForUser(context.locals.user.id);
    if (userProjects.length <= 1) {
      return new Response(
        JSON.stringify({
          error:
            "You must have at least one project. Create a new project before deleting this one.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await deleteProject(parseInt(projectID));

    const remainingProjects = userProjects.filter(
      (p) => p.id !== parseInt(projectID),
    );

    return new Response(JSON.stringify({ projects: remainingProjects }), {
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
    return new Response(
      JSON.stringify({ error: "An unknown error has occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const PUT: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { projectID } = await context.request.json();

    if (!projectID) {
      return new Response(JSON.stringify({ error: "projectID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const role = await getUserProjectRole(
      parseInt(projectID),
      context.locals.user.id,
    );
    if (!context.locals.user.isAdmin && role !== "owner") {
      return new Response(
        JSON.stringify({
          error: "Only the project owner can rotate the API key.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const newKey = await rotateApiKey(parseInt(projectID));
    return new Response(JSON.stringify({ apiKey: newKey }), {
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
    return new Response(
      JSON.stringify({ error: "An unknown error has occurred." }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const prerender = false;
