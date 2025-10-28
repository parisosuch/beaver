import { getChannels } from "@/lib/beaver/channel";
import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ request }) => {
  try {
    const { project_id } = await request.json();

    const projects = await getChannels(project_id);

    return new Response(JSON.stringify(projects), {
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
