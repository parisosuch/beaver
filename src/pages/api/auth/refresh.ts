import type { APIRoute } from "astro";
import {
  verifyToken,
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiryDate,
} from "../../../lib/auth/jwt";
import {
  getSessionByToken,
  deleteSession,
  createSession,
} from "../../../lib/auth/session";

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

    // Verify the refresh token
    const payload = await verifyToken(refreshToken);
    if (!payload) {
      cookies.delete("refresh_token", { path: "/" });
      return new Response(JSON.stringify({ error: "Invalid refresh token" }), {
        status: 401,
      });
    }

    // Check if session exists in database
    const session = await getSessionByToken(refreshToken);
    if (!session) {
      cookies.delete("refresh_token", { path: "/" });
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 401,
      });
    }

    // Check if session has expired
    if (new Date(session.expiresAt) < new Date()) {
      await deleteSession(refreshToken);
      cookies.delete("refresh_token", { path: "/" });
      return new Response(JSON.stringify({ error: "Session expired" }), {
        status: 401,
      });
    }

    // Delete old session
    await deleteSession(refreshToken);

    // Create new tokens
    const newPayload = {
      userId: payload.userId,
      userName: payload.userName,
      isAdmin: payload.isAdmin,
    };

    const newAccessToken = await createAccessToken(newPayload);
    const newRefreshToken = await createRefreshToken(newPayload);
    const expiresAt = getRefreshTokenExpiryDate();

    // Create new session
    await createSession(payload.userId, newRefreshToken, expiresAt);

    // Set new refresh token cookie
    cookies.set("refresh_token", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return new Response(
      JSON.stringify({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        user: {
          id: payload.userId,
          userName: payload.userName,
          isAdmin: payload.isAdmin,
        },
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Token refresh error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
};
