import { subscribeEvents, type EventBusMessage } from "./event-bus";
import {
  eventMatchesFilters,
  type EventWithChannelName,
  type StreamFilter,
  type TagFilter,
} from "./event";

const KEEPALIVE_MS = 15000;

const SSE_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
  "Access-Control-Allow-Origin": "*",
};

/** Build a StreamFilter from an event-stream request's query params. */
export function parseStreamFilter(url: URL): StreamFilter {
  const filter: StreamFilter = {
    title: url.searchParams.get("title"),
    object: url.searchParams.get("object"),
    action: url.searchParams.get("action"),
  };

  if (url.searchParams.get("startDate")) {
    filter.startDate = new Date(url.searchParams.get("startDate")!);
  }
  if (url.searchParams.get("endDate")) {
    filter.endDate = new Date(url.searchParams.get("endDate")!);
  }
  if (url.searchParams.get("tags")) {
    try {
      filter.tags = JSON.parse(url.searchParams.get("tags")!) as TagFilter[];
    } catch {
      // Invalid JSON, ignore
    }
  }

  return filter;
}

/**
 * Push-based SSE stream. Does one catch-up DB read on connect, then subscribes
 * to the event bus and pushes matching events as they're written — no polling.
 *
 * `matchScope` narrows bus messages to this stream (project or channel), and
 * `fetchInitial` performs the one-time catch-up read for events after `afterId`.
 */
export function streamEvents(opts: {
  afterId?: number;
  filter: StreamFilter;
  matchScope: (msg: EventBusMessage) => boolean;
  fetchInitial: (afterId?: number) => Promise<EventWithChannelName[]>;
}): Response {
  const { afterId, filter, matchScope, fetchInitial } = opts;
  const encoder = new TextEncoder();

  let unsubscribe: (() => void) | null = null;
  let keepalive: ReturnType<typeof setInterval> | null = null;
  let closed = false;
  let lastSentId = afterId ?? 0;

  function cleanup() {
    closed = true;
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
    if (keepalive) {
      clearInterval(keepalive);
      keepalive = null;
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (batch: EventWithChannelName[]) => {
        if (closed || batch.length === 0) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(batch)}\n\n`));
        } catch {
          cleanup();
        }
      };

      controller.enqueue(encoder.encode(": ok\n\n"));

      // Subscribe before the catch-up read so events written during it aren't
      // lost; buffer them until catch-up completes, then flush in one tick.
      let caughtUp = false;
      const buffer: EventWithChannelName[] = [];

      unsubscribe = subscribeEvents((msg) => {
        if (!matchScope(msg)) return;
        if (msg.event.id <= lastSentId) return;
        if (!eventMatchesFilters(msg.event, filter)) return;
        if (!caughtUp) {
          buffer.push(msg.event);
          return;
        }
        lastSentId = msg.event.id;
        send([msg.event]);
      });

      try {
        const initial = await fetchInitial(afterId);
        if (initial.length > 0) {
          lastSentId = Math.max(lastSentId, ...initial.map((e) => e.id));
          send(initial);
        }
      } catch (err) {
        console.error("Error fetching initial events for stream:", err);
      }

      // Flush events that arrived during the catch-up read. Synchronous with
      // the caughtUp flip, so a concurrent publish can't slip past unbuffered.
      const pending = buffer.filter((e) => e.id > lastSentId).sort((a, b) => b.id - a.id);
      caughtUp = true;
      if (pending.length > 0) {
        lastSentId = Math.max(lastSentId, ...pending.map((e) => e.id));
        send(pending);
      }

      keepalive = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          cleanup();
        }
      }, KEEPALIVE_MS);
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, { headers: SSE_HEADERS });
}
