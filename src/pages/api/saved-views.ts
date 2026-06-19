import type { APIContext, APIRoute } from "astro";
import { getSavedViews, createSavedView } from "@/lib/beaver/saved-view";

export const GET: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const url = new URL(context.request.url);
  const projectId = parseInt(url.searchParams.get("projectId") ?? "");
  if (!projectId) {
    return new Response(JSON.stringify({ error: "projectId is required." }), { status: 400 });
  }

  const views = await getSavedViews(projectId, context.locals.user.id);
  return new Response(JSON.stringify(views), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const { projectId, name, params } = await context.request.json();

  if (!projectId || !name?.trim() || !params) {
    return new Response(JSON.stringify({ error: "projectId, name, and params are required." }), {
      status: 400,
    });
  }

  const view = await createSavedView(projectId, context.locals.user.id, name.trim(), params);
  return new Response(JSON.stringify(view), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
