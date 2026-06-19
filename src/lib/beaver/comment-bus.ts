export type CommentBusMessage = {
  eventId: number;
  comment: Comment;
};

export type Comment = {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  body: string;
  createdAt: Date;
};

type Subscriber = (msg: CommentBusMessage) => void;

const subscribers = new Set<Subscriber>();

export function publishComment(msg: CommentBusMessage): void {
  for (const sub of subscribers) {
    try {
      sub(msg);
    } catch (err) {
      console.error("comment-bus subscriber threw:", err);
    }
  }
}

export function subscribeComments(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
}
