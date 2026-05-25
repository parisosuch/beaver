import { db } from "@/lib/db/db";
import { events, channels, eventTags } from "@/lib/db/schema";
import { EVENT_NAME_REGEX, RESERVED_OBJECT } from "@/lib/beaver/event";
import { getProject } from "@/lib/beaver/project";
import { getNotificationEmails } from "@/lib/beaver/user";
import { sendEventNotification } from "@/lib/email/resend";
import { eq } from "drizzle-orm";
import type { APIContext, APIRoute } from "astro";

const MAX_BATCH_SIZE = 100;

type EventPayload = Record<string, unknown>;

function validate(payload: EventPayload): string | null {
  const { name, title, channel, tags } = payload;

  if (!name) return "name is a required field.";
  if (typeof name !== "string" || !EVENT_NAME_REGEX.test(name))
    return "name must follow the object.action convention (e.g. server.status_changed).";
  if (name.split(".")[0] === RESERVED_OBJECT) return "'legacy' is a reserved object name.";
  if (!title || typeof title !== "string" || title.trim() === "")
    return "title is a required field.";
  if (!channel) return "channel is a required field.";
  if (tags !== undefined && tags !== null) {
    try {
      if (typeof tags === "string") JSON.parse(tags);
      else if (typeof tags !== "object") return "tags must be an object.";
    } catch {
      return "tags object is not valid JSON.";
    }
  }
  return null;
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

    // Validate all payloads before touching the DB
    for (let i = 0; i < payloads.length; i++) {
      const err = validate(payloads[i]);
      if (err) {
        const msg = payloads.length > 1 ? `Event at index ${i}: ${err}` : err;
        return new Response(JSON.stringify({ error: msg }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Resolve channels and verify API key (reads, before transaction)
    const resolved = await Promise.all(
      payloads.map(async (p) => {
        const channelName = p.channel as string;
        const channelsRes = await db.select().from(channels).where(eq(channels.name, channelName));
        if (channelsRes.length === 0) throw new Error(`Channel '${channelName}' does not exist.`);
        const channel = channelsRes[0];
        const project = await getProject(channel.projectId);
        if (project.apiKey !== apiKey) throw new Error("Invalid API key.");
        return { channel, project, payload: p };
      }),
    );

    // Insert all events and their tags atomically
    const created = await db.transaction(async (tx) => {
      return Promise.all(
        resolved.map(async ({ channel, project, payload }) => {
          const [eventObject, eventAction] = (payload.name as string).split(".");
          const title = payload.title as string;
          const description =
            typeof payload.description === "string" ? payload.description : undefined;
          const icon = typeof payload.icon === "string" ? payload.icon : undefined;

          const [event] = await tx
            .insert(events)
            .values({
              eventObject,
              eventAction,
              title,
              description,
              icon,
              projectId: project.id,
              channelId: channel.id,
            })
            .returning();

          let tags: Record<string, string | number | boolean> = {};
          const rawTags = payload.tags;
          if (rawTags) {
            tags =
              typeof rawTags === "string"
                ? JSON.parse(rawTags)
                : (rawTags as Record<string, string | number | boolean>);
            const tagEntries = Object.entries(tags).map(([key, value]) => ({
              eventId: event.id,
              key,
              value: String(value),
              type: typeof value as "string" | "number" | "boolean",
            }));
            await tx.insert(eventTags).values(tagEntries);
          }

          return {
            id: event.id,
            eventObject: event.eventObject,
            eventAction: event.eventAction,
            title: event.title,
            icon: event.icon,
            description: event.description,
            tags,
            projectId: project.id,
            channelName: channel.name,
            createdAt: event.createdAt,
            read: false,
            bookmarked: false,
          };
        }),
      );
    });

    // Fire notifications outside the transaction
    created.forEach((event, i) => {
      if (resolved[i].payload.notify === true) {
        getNotificationEmails(event.projectId).then((emails) => {
          if (emails.length > 0) {
            sendEventNotification(event, resolved[i].project.name, emails).catch(() => {});
          }
        });
      }
    });

    return new Response(JSON.stringify(created), {
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
