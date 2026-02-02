import {
  createChannel,
  deleteChannel,
  getChannels,
} from "@/lib/beaver/channel";
import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ request }: APIContext) => {
  try {
    const url = new URL(request.url);

    const project_id = url.searchParams.get("project_id");

    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is a required query parameter." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const projects = await getChannels(parseInt(project_id));

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

export const POST: APIRoute = async ({ request }) => {
  try {
    const { name, project_id, description } = await request.json();

    if (!name) {
      return new Response(
        JSON.stringify({ error: "name is required to create channel." })
      );
    }
    if (!project_id) {
      return new Response(
        JSON.stringify({ error: "project_id is required to create channel." })
      );
    }

    const splitName = name.replace(" ", "-");

    const channel = await createChannel(splitName, project_id, description);

    return new Response(JSON.stringify(channel), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
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

export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { channelID } = await request.json();

    if (!channelID) {
      return new Response(JSON.stringify({ error: "channelID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const channel = await deleteChannel(parseInt(channelID));

    return new Response(JSON.stringify({ channel }), {
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
