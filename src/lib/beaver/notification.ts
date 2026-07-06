import { db } from "../db/db";
import { notifications, events, eventComments } from "../db/schema";
import { and, count, desc, eq, isNull, ne } from "drizzle-orm";
import { getProjectMembers } from "./project-member";

export type NotificationType = "comment_reply" | "mention" | "alert";

export type Notification = {
  id: number;
  type: NotificationType;
  message: string;
  linkPath: string;
  readAt: Date | null;
  createdAt: Date;
};

function truncate(s: string, max = 80): string {
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// Generate notifications for a freshly created comment: @mentions of project
// members, plus replies to everyone else who has commented on the same event.
// Mentions win over replies, and the comment author is never notified.
export async function createNotificationsForComment(opts: {
  eventId: number;
  actorId: number;
  actorName: string;
  body: string;
}): Promise<void> {
  const { eventId, actorId, actorName, body } = opts;

  const [ev] = await db
    .select({ projectId: events.projectId, title: events.title })
    .from(events)
    .where(eq(events.id, eventId));
  if (!ev) return;

  const linkPath = `/dashboard/${ev.projectId}/events/${eventId}`;
  const recipients = new Map<number, NotificationType>();

  // Mentions — resolve @handle tokens (mirrors the UI's @\w+) against members.
  const handles = new Set(Array.from(body.matchAll(/@(\w+)/g)).map((m) => m[1].toLowerCase()));
  if (handles.size > 0) {
    const members = await getProjectMembers(ev.projectId);
    for (const m of members) {
      if (m.userId !== actorId && handles.has(m.userName.toLowerCase())) {
        recipients.set(m.userId, "mention");
      }
    }
  }

  // Replies — other users who have commented on this event.
  const priorCommenters = await db
    .selectDistinct({ userId: eventComments.userId })
    .from(eventComments)
    .where(and(eq(eventComments.eventId, eventId), ne(eventComments.userId, actorId)));
  for (const c of priorCommenters) {
    if (!recipients.has(c.userId)) recipients.set(c.userId, "comment_reply");
  }

  if (recipients.size === 0) return;

  const rows = Array.from(recipients.entries()).map(([userId, type]) => ({
    userId,
    projectId: ev.projectId,
    type,
    message:
      type === "mention"
        ? `@${actorName} mentioned you: “${truncate(body)}”`
        : `@${actorName} replied on “${ev.title}”`,
    linkPath,
  }));

  await db.insert(notifications).values(rows);
}

// One alert notification per subscriber when an alert rule fires.
export async function createAlertNotifications(opts: {
  projectId: number;
  channelId: number;
  channelName: string;
  ruleName: string;
  count: number;
  windowMinutes: number;
  recipientIds: number[];
}): Promise<void> {
  const { projectId, channelId, channelName, ruleName, count, windowMinutes, recipientIds } = opts;
  if (recipientIds.length === 0) return;

  const linkPath = `/dashboard/${projectId}/channels/${channelId}`;
  const message = `Alert “${ruleName}” triggered in #${channelName} — ${count} events in ${windowMinutes}m`;

  await db.insert(notifications).values(
    recipientIds.map((userId) => ({
      userId,
      projectId,
      type: "alert" as const,
      message,
      linkPath,
    })),
  );
}

export async function getNotifications(
  userId: number,
  projectId: number,
  { limit = 50 }: { limit?: number } = {},
): Promise<Notification[]> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      message: notifications.message,
      linkPath: notifications.linkPath,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.projectId, projectId)))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
  return rows as Notification[];
}

export async function getUnreadCount(userId: number, projectId: number): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.projectId, projectId),
        isNull(notifications.readAt),
      ),
    );
  return row?.n ?? 0;
}

export async function markAllRead(userId: number, projectId: number): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.projectId, projectId),
        isNull(notifications.readAt),
      ),
    );
}
