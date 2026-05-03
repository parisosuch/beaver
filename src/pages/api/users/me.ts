import { updateUserEmail } from "@/lib/beaver/user";
import type { APIContext } from "astro";

export async function PATCH({ locals, request }: APIContext) {
  const user = locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const { email } = await request.json();

  await updateUserEmail(user.id, email ?? null);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

export const prerender = false;
