import { createEvent, EVENT_NAME_REGEX, RESERVED_OBJECT } from "@/lib/beaver/event";
import { getProject } from "@/lib/beaver/project";
import { getNotificationEmails } from "@/lib/beaver/user";
import { sendEventNotification } from "@/lib/email/resend";
import type { APIContext, APIRoute } from "astro";

const MAX_BATCH_SIZE = 100;

type EventPayload = Record<string, unknown>;

async function processOne(payload: EventPayload, apiKey: string) {
  const { name, title, description, icon, channel, tags, notify } = payload;

  if (!name) {
    return { ok: false as const, error: "name is a required field." };
  }
  if (typeof name !== "string" || !EVENT_NAME_REGEX.test(name)) {
    return {
      ok: false as const,
      error: "name must follow the object.action convention (e.g. server.status_changed).",
    };
  }
  if (name.split(".")[0] === RESERVED_OBJECT) {
    return { ok: false as const, error: "'legacy' is a reserved object name." };
  }
  if (!title || typeof title !== "string" || title.trim() === "") {
    return { ok: false as const, error: "title is a required field." };
  }
  if (!channel) {
    return { ok: false as const, error: "channel is a required field." };
  }

  let tagObj;
  if (tags) {
    try {
      tagObj = typeof tags === "string" ? JSON.parse(tags) : tags;
    } catch {
      return { ok: false as const, error: "tags object is not valid JSON." };
    }
  }

  try {
    const event = await createEvent({
      name,
      title,
      description: typeof description === "string" ? description : undefined,
      icon: typeof icon === "string" ? icon : undefined,
      channel: channel as string,
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

    return { ok: true as const, event };
  } catch (err) {
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : "An unknown error has occurred.",
    };
  }
}

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    const apiKey = request.headers.get("X-API-Key");

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "X-API-Key header is required." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await request.json();
    const payloads: EventPayload[] = Array.isArray(body) ? body : [body];

    if (payloads.length > MAX_BATCH_SIZE) {
      return new Response(
        JSON.stringify({ error: `Batch size cannot exceed ${MAX_BATCH_SIZE} events.` }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const results = await Promise.all(payloads.map((p) => processOne(p, apiKey)));

    return new Response(JSON.stringify(results), {
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
    return new Response(JSON.stringify({ error: "An unknown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
