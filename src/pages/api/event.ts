import { createEvent, getChannelEvents } from "@/lib/beaver/event";
import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ request }: APIContext) => {
  try {
    const url = new URL(request.url);

    const channel_id = url.searchParams.get("channel_id");

    if (!channel_id) {
      return new Response(
        JSON.stringify({ error: "channel_id is a required query parameter." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const events = await getChannelEvents(parseInt(channel_id));

    return new Response(JSON.stringify(events), {
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

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    // extract body and verify contents
    const { name, description, icon, channel, apiKey } = await request.json();
    if (!name) {
      return new Response(
        JSON.stringify({ error: "name is a required field." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!channel) {
      return new Response(
        JSON.stringify({ error: "channel is a required field." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "apiKey is a required field." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const event = await createEvent({
      name,
      description,
      icon,
      channel,
      apiKey,
    });

    return new Response(JSON.stringify(event), {
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

export const prerender = false;
