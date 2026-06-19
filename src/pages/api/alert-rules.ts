import {
  createAlertRule,
  deleteAlertRule,
  getAlertRulesForProject,
  updateAlertRule,
} from "@/lib/beaver/alert-rule";
import { EVENT_SEGMENT_REGEX } from "@/lib/beaver/event";
import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ request }: APIContext) => {
  try {
    const url = new URL(request.url);
    const projectId = url.searchParams.get("projectId");

    if (!projectId) return json({ error: "projectId is a required query parameter." }, 400);

    const rules = await getAlertRulesForProject(parseInt(projectId));
    return json(rules);
  } catch (err) {
    return handleError(err);
  }
};

export const POST: APIRoute = async ({ request }: APIContext) => {
  try {
    const { channelId, name, eventObject, eventAction, threshold, windowMinutes } =
      await request.json();

    if (!channelId) return json({ error: "channelId is required." }, 400);
    if (!name || typeof name !== "string" || name.trim() === "")
      return json({ error: "name is required." }, 400);
    if (!EVENT_SEGMENT_REGEX.test(eventObject))
      return json({ error: "eventObject must be a lowercase, underscore-separated word." }, 400);
    if (!EVENT_SEGMENT_REGEX.test(eventAction))
      return json({ error: "eventAction must be a lowercase, underscore-separated word." }, 400);
    if (!Number.isInteger(threshold) || threshold < 1)
      return json({ error: "threshold must be a positive integer." }, 400);
    if (!Number.isInteger(windowMinutes) || windowMinutes < 1)
      return json({ error: "windowMinutes must be a positive integer." }, 400);

    const rule = await createAlertRule({
      channelId: parseInt(channelId),
      name: name.trim(),
      eventObject,
      eventAction,
      threshold,
      windowMinutes,
    });

    return json(rule);
  } catch (err) {
    return handleError(err);
  }
};

export const PATCH: APIRoute = async ({ request }: APIContext) => {
  try {
    const { id, name, eventObject, eventAction, threshold, windowMinutes, enabled } =
      await request.json();

    if (!id) return json({ error: "id is required." }, 400);
    if (eventObject !== undefined && !EVENT_SEGMENT_REGEX.test(eventObject))
      return json({ error: "eventObject must be a lowercase, underscore-separated word." }, 400);
    if (eventAction !== undefined && !EVENT_SEGMENT_REGEX.test(eventAction))
      return json({ error: "eventAction must be a lowercase, underscore-separated word." }, 400);
    if (threshold !== undefined && (!Number.isInteger(threshold) || threshold < 1))
      return json({ error: "threshold must be a positive integer." }, 400);
    if (windowMinutes !== undefined && (!Number.isInteger(windowMinutes) || windowMinutes < 1))
      return json({ error: "windowMinutes must be a positive integer." }, 400);

    await updateAlertRule(parseInt(id), {
      name: name?.trim(),
      eventObject,
      eventAction,
      threshold,
      windowMinutes,
      enabled,
    });

    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
};

export const DELETE: APIRoute = async ({ request }: APIContext) => {
  try {
    const { id } = await request.json();

    if (!id) return json({ error: "id is required." }, 400);

    await deleteAlertRule(parseInt(id));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function handleError(err: unknown) {
  if (err instanceof Error) {
    return json({ error: err.message }, 400);
  }
  return json({ error: "An unknown error has occurred." }, 500);
}

export const prerender = false;
