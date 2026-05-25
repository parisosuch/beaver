import type { EventWithChannelName } from "./event";

/**
 * In-process pub/sub for newly-written events.
 *
 * Replaces per-connection DB polling in the SSE handlers: `POST /api/event`
 * publishes here after a write commits, and event-stream handlers subscribe
 * and push to clients. Only valid for single-process deployments — we run
 * `@astrojs/node` in standalone mode with no clustering. A multi-process
 * deployment would need real pub/sub (Redis/NATS) behind this same interface.
 */

export type EventBusMessage = {
  projectId: number;
  channelId: number;
  event: EventWithChannelName;
};

type Subscriber = (msg: EventBusMessage) => void;

const subscribers = new Set<Subscriber>();

export function publishEvent(msg: EventBusMessage): void {
  for (const subscriber of subscribers) {
    try {
      subscriber(msg);
    } catch (err) {
      console.error("event-bus subscriber threw:", err);
    }
  }
}

export function subscribeEvents(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => {
    subscribers.delete(fn);
  };
}
