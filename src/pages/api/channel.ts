import {
  createChannel,
  deleteChannel,
  getChannel,
  getChannels,
  reorderChannels,
  updateChannel,
} from "@/lib/beaver/channel";
import { logAuditEntry } from "@/lib/beaver/audit-log";
import type { APIContext, APIRoute } from "astro";

export const GET: APIRoute = async ({ request }: APIContext) => {
  try {
    const url = new URL(request.url);

    const project_id = url.searchParams.get("project_id");

    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is a required query parameter." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
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
    return new Response(JSON.stringify({ error: "An unkown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const POST: APIRoute = async (context: APIContext) => {
  try {
    const { name, project_id, description } = await context.request.json();

    if (!name) {
      return new Response(JSON.stringify({ error: "name is required to create channel." }));
    }
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required to create channel." }));
    }

    const splitName = name.replace(" ", "-");

    const channel = await createChannel(splitName, project_id, description);

    if (context.locals.user) {
      logAuditEntry({
        projectId: project_id,
        userId: context.locals.user.id,
        action: "channel.created",
        targetType: "channel",
        targetId: channel.id,
        targetName: channel.name,
      });
    }

    return new Response(JSON.stringify(channel), {
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

export const PATCH: APIRoute = async ({ request }) => {
  try {
    const { channels } = await request.json();

    if (!Array.isArray(channels) || channels.length === 0) {
      return new Response(JSON.stringify({ error: "channels array is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await reorderChannels(channels);

    return new Response(JSON.stringify({ success: true }), {
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

export const PUT: APIRoute = async (context: APIContext) => {
  try {
    const { channelId, name, description } = await context.request.json();

    if (!channelId) {
      return new Response(JSON.stringify({ error: "channelId is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await getChannel(parseInt(channelId));
    const channel = await updateChannel(parseInt(channelId), { name, description });

    if (context.locals.user && existing && name && name !== existing.name) {
      logAuditEntry({
        projectId: existing.projectId,
        userId: context.locals.user.id,
        action: "channel.renamed",
        targetType: "channel",
        targetId: existing.id,
        targetName: name,
        metadata: { from: existing.name, to: name },
      });
    }

    return new Response(JSON.stringify(channel), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof Error) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 400,
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

export const DELETE: APIRoute = async (context: APIContext) => {
  try {
    const { channelID } = await context.request.json();

    if (!channelID) {
      return new Response(JSON.stringify({ error: "channelID is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const existing = await getChannel(parseInt(channelID));
    const channel = await deleteChannel(parseInt(channelID));

    if (context.locals.user && existing) {
      logAuditEntry({
        projectId: existing.projectId,
        userId: context.locals.user.id,
        action: "channel.deleted",
        targetType: "channel",
        targetId: existing.id,
        targetName: existing.name,
      });
    }

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
    return new Response(JSON.stringify({ error: "An unkown error has occurred." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const prerender = false;
