import type { APIRoute } from "astro";
import { createUser, getAdminUsers } from "@/lib/beaver/user";
import {
  createAccessToken,
  createRefreshToken,
  getRefreshTokenExpiryDate,
} from "@/lib/auth/jwt";
import { createSession } from "@/lib/auth/session";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { username, password } = await request.json();

    // check if an admin user already exists
    const adminUsers = await getAdminUsers();

    if (adminUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: "An admin user already exists." }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const user = await createUser(username, password, true);

    // Auto sign-in: create tokens for the new admin user
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
        user,
        accessToken,
        refreshToken,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    if (err instanceof Error) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    console.error(err);
    return new Response(
      JSON.stringify({ error: "An unkown error has occurred." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const prerender = false;
