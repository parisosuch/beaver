// In-process pub/sub for reaction updates, mirroring comment-bus. Carries the
// full reactor set for an emoji so each SSE connection can personalize
// `userReacted` for its own viewer before sending.
export type ReactionBusMessage = {
  eventId: number;
  emoji: string;
  count: number;
  users: string[]; // reactor userNames
  reactorIds: number[]; // reactor userIds — used to personalize userReacted per viewer
};

type Subscriber = (msg: ReactionBusMessage) => void;

const subscribers = new Set<Subscriber>();

export function publishReaction(msg: ReactionBusMessage): void {
  for (const sub of subscribers) {
    try {
      sub(msg);
    } catch (err) {
      console.error("reaction-bus subscriber threw:", err);
    }
  }
}

export function subscribeReactions(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
