import { createEvent, EVENT_NAME_REGEX, RESERVED_OBJECT } from "@/lib/beaver/event";
import { getProject } from "@/lib/beaver/project";
import { getNotificationEmails } from "@/lib/beaver/user";
import { sendEventNotification } from "@/lib/email/resend";
import type { APIContext, APIRoute } from "astro";

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "X-API-Key header is required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { name, title, description, icon, channel, tags, notify } = await request.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "name is a required field." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (typeof name !== "string" || !EVENT_NAME_REGEX.test(name)) {
      return new Response(
        JSON.stringify({
          error: "name must follow the object.action convention (e.g. server.status_changed).",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    if (name.split(".")[0] === RESERVED_OBJECT) {
      return new Response(JSON.stringify({ error: "'legacy' is a reserved object name." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!title || typeof title !== "string" || title.trim() === "") {
      return new Response(JSON.stringify({ error: "title is a required field." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (!channel) {
      return new Response(JSON.stringify({ error: "channel is a required field." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let tagObj;

    if (tags) {
      try {
        if (typeof tags === "string") {
          tagObj = JSON.parse(tags);
        } else {
          tagObj = tags;
        }
      } catch {
        return new Response(JSON.stringify({ error: "tags object is not valid JSON." }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const event = await createEvent({
      name,
      title,
      description,
      icon,
      channel,
      apiKey,
      tags: tagObj,
    });

    if (notify === true) {
      const emails = await getNotificationEmails(event.projectId);
      if (emails.length > 0) {
        const project = await getProject(event.projectId);
        if (project) {
          sendEventNotification(event, project.name, emails).catch(() => {});
        }
      }
    }

    return new Response(JSON.stringify(event), {
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
    return new Response(JSON.stringify({ error: "An unkown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
