import { createEvent } from "@/lib/beaver/event";
import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    // extract body and verify contents
    const { name, description, icon, channel, apiKey, tags } =
      await request.json();

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

    // TODO: there is a better way to do this but this will work for now
    let tagObj;

    if (tags) {
      try {
        if (typeof tags === "string") {
          tagObj = JSON.parse(tags);
        } else {
          tagObj = tags;
        }
      } catch (error) {
        return new Response(
          JSON.stringify({ error: "tags object is not valid JSON." }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    const event = await createEvent({
      name,
      description,
      icon,
      channel,
      apiKey,
      tags: tagObj,
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
