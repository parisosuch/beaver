import type { APIRoute } from "astro";
import { createUser, getAdminUsers } from "@/lib/beaver/user";

export const POST: APIRoute = async ({ request }) => {
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

    return new Response(JSON.stringify(user), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
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
