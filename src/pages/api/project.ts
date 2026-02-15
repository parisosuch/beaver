import type { APIRoute } from "astro";
import {
  createProject,
  deleteProject,
  getProject,
  getProjects,
  getProjectsByOwner,
} from "@/lib/beaver/project";

export const GET: APIRoute = async () => {
  try {
    const projects = await getProjects();

    return new Response(JSON.stringify(projects), {
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
    console.error(err);
    return new Response(
      JSON.stringify({ error: "An unkown error has occurred." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, ownerId } = await request.json();

    const project = await createProject(name, crypto.randomUUID(), ownerId);

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
    console.error(err);
    return new Response(
      JSON.stringify({ error: "An unkown error has occurred." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    const { projectID } = await request.json();

    if (!projectID) {
      return new Response(
        JSON.stringify({ error: "projectID is required." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const project = await getProject(parseInt(projectID));

    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (project.ownerId !== locals.user!.id) {
      return new Response(
        JSON.stringify({ error: "You do not own this project." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const userProjects = await getProjectsByOwner(locals.user!.id);

    if (userProjects.length <= 1) {
      return new Response(
        JSON.stringify({
          error: "You must have at least one project. Create a new project before deleting this one.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await deleteProject(parseInt(projectID));

    const remainingProjects = userProjects.filter((p) => p.id !== parseInt(projectID));

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
    console.error(err);
    return new Response(
      JSON.stringify({ error: "An unkown error has occurred." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
