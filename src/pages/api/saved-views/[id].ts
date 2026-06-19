import type { APIContext, APIRoute } from "astro";
import { deleteSavedView } from "@/lib/beaver/saved-view";

export const DELETE: APIRoute = async (context: APIContext) => {
  if (!context.locals.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const id = parseInt(context.params.id ?? "");
  if (!id) {
    return new Response(JSON.stringify({ error: "id is required." }), { status: 400 });
  }

  await deleteSavedView(id, context.locals.user.id);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const prerender = false;
