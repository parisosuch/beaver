import type { APIRoute } from "astro";
import { getUserByUsername, verifyPassword } from "../../../lib/beaver/user";
import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiryDate,
} from "../../../lib/auth/jwt";
import { createSession } from "../../../lib/auth/session";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: "Username and password are required" }),
        { status: 400 }
      );
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401 }
      );
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return new Response(
        JSON.stringify({ error: "Invalid username or password" }),
        { status: 401 }
      );
    }

    const payload = {
      userId: user.id,
      userName: user.userName,
      isAdmin: user.isAdmin,
    };

    const accessToken = await createAccessToken(payload);
    const refreshToken = await createRefreshToken(payload);
    const expiresAt = getRefreshTokenExpiryDate();

    await createSession(user.id, refreshToken, expiresAt);

    // Set refresh token as HTTP-only cookie
    cookies.set("refresh_token", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: expiresAt,
    });

    return new Response(
      JSON.stringify({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          userName: user.userName,
          isAdmin: user.isAdmin,
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
    console.error("Sign in error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
};
