import type { APIRoute } from "astro";
import { deleteSession } from "../../../lib/auth/session";
import { verifyToken } from "../../../lib/auth/jwt";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let refreshToken: string | undefined;

    // Try to get refresh token from request body first, then from cookie
    try {
      const body = await request.json();
      refreshToken = body.refreshToken;
    } catch {
      // No body, try cookie
    }

    if (!refreshToken) {
      refreshToken = cookies.get("refresh_token")?.value;
    }

    if (!refreshToken) {
      return new Response(
        JSON.stringify({ error: "Refresh token is required" }),
        { status: 400 }
      );
    }

    const payload = await verifyToken(refreshToken);
    if (!payload) {
      // Clear cookie even if token is invalid
      cookies.delete("refresh_token", { path: "/" });
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
      });
    }

    await deleteSession(refreshToken);

    // Clear the cookie
    cookies.delete("refresh_token", { path: "/" });

    return new Response(
      JSON.stringify({ message: "Signed out successfully" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Sign out error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
};
