import { getProjectByApiKey } from "@/lib/beaver/project";
import { consumeRateLimit } from "@/lib/beaver/rate-limit";
import {
  handleMcpRequest,
  rpcError,
  INTERNAL_ERROR,
  INVALID_REQUEST,
  PARSE_ERROR,
  type JsonRpcRequest,
  type JsonRpcResponse,
} from "@/lib/beaver/mcp";
import type { APIContext, APIRoute } from "astro";

// MCP endpoint, stateless Streamable HTTP. Authentication mirrors the ingest API:
// a project API key, sent either as an Authorization bearer token (what MCP
// clients send) or the X-API-Key header the rest of Beaver's API uses.
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function apiKeyFrom(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return request.headers.get("X-API-Key");
}

export const POST: APIRoute = async ({ request }: APIContext) => {
  const apiKey = apiKeyFrom(request);
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "An API key is required, as a bearer token or X-API-Key header." }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": 'Bearer realm="beaver"',
        },
      },
    );
  }

  const project = await getProjectByApiKey(apiKey);
  if (!project) {
    return new Response(JSON.stringify({ error: "Invalid API key." }), {
      status: 401,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": 'Bearer realm="beaver"' },
    });
  }

  const rateLimit = consumeRateLimit(project.id, project.rateLimitPerMinute);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Rate limit exceeded. Slow down your request rate." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.retryAfterSeconds),
        },
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(rpcError(null, PARSE_ERROR, "Request body is not valid JSON."), 400);
  }

  // A batch is an array of messages; a single message is answered on its own.
  const messages = Array.isArray(body) ? body : [body];
  if (messages.length === 0) {
    return json(rpcError(null, INVALID_REQUEST, "Batch must contain at least one request."), 400);
  }

  const responses: JsonRpcResponse[] = [];
  for (const message of messages) {
    if (typeof message !== "object" || message === null) {
      responses.push(rpcError(null, INVALID_REQUEST, "Each message must be an object."));
      continue;
    }
    try {
      const response = await handleMcpRequest(message as JsonRpcRequest, project);
      if (response) responses.push(response);
    } catch (err) {
      console.error("MCP request failed", err);
      const id = (message as JsonRpcRequest).id ?? null;
      responses.push(rpcError(id, INTERNAL_ERROR, "Internal error handling the request."));
    }
  }

  // Notifications alone produce nothing to send back; the spec wants 202 there.
  if (responses.length === 0) {
    return new Response(null, { status: 202 });
  }

  return json(Array.isArray(body) ? responses : responses[0]);
};

// Streamable HTTP lets a server open an SSE stream on GET for server-initiated
// messages. This server is stateless and never initiates, so decline per spec.
export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ error: "This MCP endpoint does not support SSE." }), {
    status: 405,
    headers: { "Content-Type": "application/json", Allow: "POST" },
  });
};
