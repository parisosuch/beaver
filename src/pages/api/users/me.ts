import { updateUserEmail, updateUserFullName } from "@/lib/beaver/user";
import type { APIContext } from "astro";

export async function PATCH({ locals, request }: APIContext) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await request.json();

  if ("email" in body) {
    await updateUserEmail(user.id, body.email ?? null);
  }
  if ("fullName" in body) {
    await updateUserFullName(user.id, body.fullName?.trim() || null);
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
