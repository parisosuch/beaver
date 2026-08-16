// Model Context Protocol server, stateless Streamable HTTP flavour.
//
// Every request carries its own project API key, so there is no session to keep
// and each POST is answered with a single JSON-RPC response. That rules out
// server-initiated messages (sampling, progress, subscriptions), which none of
// these tools need — they are all request/response against the project's data.
//
// The HTTP plumbing lives in pages/api/mcp.ts; this module is transport-agnostic.

import type { Project } from "./project";
import { getChannels } from "./channel";
import {
  createEvent,
  getChannelEvents,
  getEvent,
  getProjectEvents,
  type EventWithChannelName,
} from "./event";
import { getMetrics, getMetricValues, getMetricByName } from "./metric";

export const PROTOCOL_VERSION = "2025-06-18";
export const SERVER_INFO = { name: "beaver", version: "1.0.0" };

const DEFAULT_EVENT_LIMIT = 25;
const MAX_EVENT_LIMIT = 200;

export type JsonRpcId = string | number | null;

export type JsonRpcRequest = {
  jsonrpc: "2.0";
  id?: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
};

export type JsonRpcResponse = {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

// JSON-RPC 2.0 reserved codes. MCP adds no codes of its own — tool failures are
// reported as a successful result with isError set, so the model can read them.
export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;
export const INTERNAL_ERROR = -32603;

type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>, project: Project) => Promise<unknown>;
};

function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "string") throw new Error(`${key} must be a string.`);
  return v;
}

function num(args: Record<string, unknown>, key: string): number | undefined {
  const v = args[key];
  if (v === undefined || v === null) return undefined;
  if (typeof v !== "number" || !Number.isFinite(v)) throw new Error(`${key} must be a number.`);
  return v;
}

function required<T>(value: T | undefined, key: string): T {
  if (value === undefined) throw new Error(`${key} is a required argument.`);
  return value;
}

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_EVENT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MAX_EVENT_LIMIT);
}

// Events carry per-user read state and reactions that mean nothing to an API-key
// caller, so hand back the fields that describe the event itself.
function serializeEvent(event: EventWithChannelName) {
  return {
    id: event.id,
    name: `${event.eventObject}.${event.eventAction}`,
    title: event.title,
    description: event.description,
    icon: event.icon,
    channel: event.channelName,
    tags: event.tags,
    createdAt: new Date(event.createdAt).toISOString(),
  };
}

async function resolveChannelId(projectId: number, name: string): Promise<number> {
  const channels = await getChannels(projectId);
  const match = channels.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (!match) throw new Error(`Channel "${name}" does not exist in this project.`);
  return match.id;
}

const TOOLS: ToolDefinition[] = [
  {
    name: "list_channels",
    description: "List the channels in this project, with their ids and descriptions.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (_args, project) => {
      const channels = await getChannels(project.id);
      return channels.map((c) => ({ id: c.id, name: c.name, description: c.description }));
    },
  },
  {
    name: "list_events",
    description:
      "List events in this project, newest first. Narrow by channel name, title substring, " +
      "or the object/action halves of an event name such as server.status_changed.",
    inputSchema: {
      type: "object",
      properties: {
        channel: { type: "string", description: "Channel name to restrict results to." },
        title: { type: "string", description: "Case-insensitive substring of the event title." },
        object: { type: "string", description: "Object half of the event name, e.g. 'server'." },
        action: {
          type: "string",
          description: "Action half of the event name, e.g. 'status_changed'.",
        },
        limit: {
          type: "number",
          description: `Maximum events to return (default ${DEFAULT_EVENT_LIMIT}, max ${MAX_EVENT_LIMIT}).`,
        },
      },
      additionalProperties: false,
    },
    handler: async (args, project) => {
      const options = {
        title: str(args, "title"),
        object: str(args, "object"),
        action: str(args, "action"),
        limit: clampLimit(num(args, "limit")),
      };
      const channel = str(args, "channel");
      const events = channel
        ? await getChannelEvents(await resolveChannelId(project.id, channel), options)
        : await getProjectEvents(project.id, options);
      return events.map(serializeEvent);
    },
  },
  {
    name: "get_event",
    description: "Fetch a single event by id, including its tags.",
    inputSchema: {
      type: "object",
      properties: { eventId: { type: "number", description: "Id of the event to fetch." } },
      required: ["eventId"],
      additionalProperties: false,
    },
    handler: async (args, project) => {
      const eventId = required(num(args, "eventId"), "eventId");
      const event = await getEvent(eventId);
      // Scope the lookup to the key's project so an id from another project
      // reads as missing rather than leaking across the boundary.
      if (!event || event.projectId !== project.id) {
        throw new Error(`Event ${eventId} does not exist in this project.`);
      }
      return serializeEvent(event);
    },
  },
  {
    name: "create_event",
    description:
      "Log a new event to a channel. The channel must already exist. Name follows the " +
      "object.action convention, e.g. deploy.finished.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Event name as object.action." },
        title: { type: "string", description: "Short human-readable title." },
        channel: { type: "string", description: "Name of an existing channel." },
        description: { type: "string", description: "Longer description of what happened." },
        icon: { type: "string", description: "Single emoji shown beside the event." },
        tags: {
          type: "object",
          description: "Flat key/value pairs of strings, numbers, or booleans.",
          additionalProperties: { type: ["string", "number", "boolean"] },
        },
      },
      required: ["name", "title", "channel"],
      additionalProperties: false,
    },
    handler: async (args, project) => {
      const tags = args.tags;
      if (tags !== undefined && tags !== null) {
        if (typeof tags !== "object" || Array.isArray(tags)) {
          throw new Error("tags must be an object.");
        }
        for (const [key, value] of Object.entries(tags)) {
          const t = typeof value;
          if (t !== "string" && t !== "number" && t !== "boolean") {
            throw new Error(`tag "${key}" must be a string, number, or boolean.`);
          }
        }
      }
      const event = await createEvent({
        name: required(str(args, "name"), "name"),
        title: required(str(args, "title"), "title"),
        channel: required(str(args, "channel"), "channel"),
        description: str(args, "description"),
        icon: str(args, "icon"),
        apiKey: project.apiKey,
        tags: tags as Record<string, string | number | boolean> | undefined,
      });
      return serializeEvent(event);
    },
  },
  {
    name: "list_metrics",
    description: "List this project's metrics with their current values.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    handler: async (_args, project) => {
      const metrics = await getMetrics(project.id);
      return metrics.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        type: m.type,
        unit: m.unit,
        currentValue: m.currentValue,
        lastUpdatedAt: m.lastUpdatedAt ? new Date(m.lastUpdatedAt).toISOString() : null,
      }));
    },
  },
  {
    name: "get_metric_values",
    description:
      "Read recorded values for one metric by name, newest first. Useful for timeseries " +
      "and counters, where the current value alone does not show the trend.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Metric name." },
        limit: {
          type: "number",
          description: `Maximum values to return (default ${DEFAULT_EVENT_LIMIT}, max ${MAX_EVENT_LIMIT}).`,
        },
      },
      required: ["name"],
      additionalProperties: false,
    },
    handler: async (args, project) => {
      const name = required(str(args, "name"), "name");
      const metric = await getMetricByName(project.id, name);
      if (!metric) throw new Error(`Metric "${name}" does not exist in this project.`);
      const values = await getMetricValues(metric.id, {
        limit: clampLimit(num(args, "limit")),
        order: "desc",
      });
      return {
        metric: { id: metric.id, name: metric.name, type: metric.type, unit: metric.unit },
        values: values.map((v) => ({
          value: v.value,
          timestamp: new Date(v.timestamp).toISOString(),
        })),
      };
    },
  },
];

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function rpcError(id: JsonRpcId, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

// A tool that throws answers with isError rather than a JSON-RPC error: the model
// is meant to see what went wrong and correct itself, and a protocol-level error
// would instead surface to the client as a broken call.
function toolFailure(id: JsonRpcId, message: string): JsonRpcResponse {
  return ok(id, { content: [{ type: "text", text: message }], isError: true });
}

/**
 * Handle one JSON-RPC message. Returns null for notifications, which by spec get
 * no response body.
 */
export async function handleMcpRequest(
  message: JsonRpcRequest,
  project: Project,
): Promise<JsonRpcResponse | null> {
  const id = message.id ?? null;

  if (message.jsonrpc !== "2.0" || typeof message.method !== "string") {
    return rpcError(id, INVALID_REQUEST, "Not a valid JSON-RPC 2.0 request.");
  }

  // Notifications carry no id and expect no reply.
  if (message.id === undefined) {
    return null;
  }

  switch (message.method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions:
          "Beaver logs product and infrastructure events into channels, and tracks metrics " +
          "alongside them. Tools are scoped to the project the API key belongs to.",
      });

    case "ping":
      return ok(id, {});

    case "tools/list":
      return ok(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({
          name,
          description,
          inputSchema,
        })),
      });

    case "tools/call": {
      const params = message.params ?? {};
      const name = params.name;
      if (typeof name !== "string") {
        return rpcError(id, INVALID_PARAMS, "tools/call requires a tool name.");
      }
      const tool = TOOLS.find((t) => t.name === name);
      if (!tool) {
        return rpcError(id, INVALID_PARAMS, `Unknown tool "${name}".`);
      }
      const args = (params.arguments ?? {}) as Record<string, unknown>;
      if (typeof args !== "object" || Array.isArray(args)) {
        return rpcError(id, INVALID_PARAMS, "Tool arguments must be an object.");
      }
      try {
        const result = await tool.handler(args, project);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          structuredContent: result,
        });
      } catch (err) {
        return toolFailure(id, err instanceof Error ? err.message : "Tool call failed.");
      }
    }

    default:
      return rpcError(id, METHOD_NOT_FOUND, `Unknown method "${message.method}".`);
  }
}
