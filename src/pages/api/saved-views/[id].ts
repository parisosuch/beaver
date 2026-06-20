import type { APIContext, APIRoute } from "astro";
import { deleteSavedView, getSavedViewById } from "@/lib/beaver/saved-view";
import { getUserProjectRole } from "@/lib/beaver/project-member";

export const DELETE: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const id = parseInt(context.params.id ?? "");
  if (!id) {
    return new Response(JSON.stringify({ error: "id is required." }), { status: 400 });
  }

  if (!context.locals.user.isAdmin) {
    const view = await getSavedViewById(id);
    if (!view) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }
    const role = await getUserProjectRole(view.projectId, context.locals.user.id);
    if (role === "guest" || role === null) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }
  }

  await deleteSavedView(id, context.locals.user.id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
