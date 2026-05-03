import { getUserByUsername, updatePassword, verifyPassword } from "@/lib/beaver/user";
import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async (context: APIContext) => {
  const user = context.locals.user;
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const { currentPassword, newPassword } = await context.request.json();

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: "Missing required fields." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (newPassword.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const dbUser = await getUserByUsername(user.userName);
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "User not found." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const valid = await verifyPassword(currentPassword, dbUser.password);
    if (!valid) {
      return new Response(
        JSON.stringify({ error: "Current password is incorrect." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    await updatePassword(user.id, newPassword);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to update password." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
