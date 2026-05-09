import type { APIRoute } from "astro";
import { verifyToken } from "../../../lib/auth/jwt";
import { getSessionByToken } from "../../../lib/auth/session";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const refreshToken = cookies.get("refresh_token")?.value;

    if (!refreshToken) {
      return new Response(JSON.stringify({ error: "No session" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const payload = await verifyToken(refreshToken);
    if (!payload) {
      cookies.delete("refresh_token", { path: "/" });
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = await getSessionByToken(refreshToken);
    if (!session) {
      cookies.delete("refresh_token", { path: "/" });
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (new Date(session.expiresAt) < new Date()) {
      cookies.delete("refresh_token", { path: "/" });
      return new Response(JSON.stringify({ error: "Session expired" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        user: {
          id: payload.userId,
          userName: payload.userName,
          isAdmin: payload.isAdmin,
          canCreateProjects: payload.canCreateProjects,
        },
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Get current user error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
