import { createLog, getChannelLogs } from "@/lib/beaver/log";
import type { APIContext, APIRoute } from "astro";

export type Log = {
  id: number;
  message: string;
  level: string;
  channelId: string;
  createdAt: Date;
};

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

    const logs = await getChannelLogs(parseInt(channel_id));

    return new Response(JSON.stringify(logs), {
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
    const { message, level, channelId } = await request.json();
    if (!message) {
      return new Response(
        JSON.stringify({ error: "message is a required field." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!level) {
      return new Response(
        JSON.stringify({ error: "level is a required field." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    if (!channelId) {
      return new Response(
        JSON.stringify({ error: "channelId is a required field." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    const log = await createLog({ message, level, channelId });

    return new Response(JSON.stringify(log), {
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
