import { db } from "../db/db";
import { events, channels, projects, projectMembers, eventComments, users } from "../db/schema";
import { and, eq, ne } from "drizzle-orm";
import { sendCommentNotification } from "../email/send";

const uniq = (emails: string[]) => [...new Set(emails)];

// Email the people relevant to a new comment: @mentioned project members and
// prior participants in the same thread. Mirrors the in-app recipient model
// (see notification.ts if present); mentions win over replies. Best-effort —
// callers should not let email failures affect commenting.
export async function notifyCommentByEmail(opts: {
  eventId: number;
  actorId: number;
  actorName: string;
  body: string;
}): Promise<void> {
  const { eventId, actorId, actorName, body } = opts;

  const [ctx] = await db
    .select({
      projectId: events.projectId,
      title: events.title,
      channelName: channels.name,
      projectName: projects.name,
    })
    .from(events)
    .innerJoin(channels, eq(events.channelId, channels.id))
    .innerJoin(projects, eq(events.projectId, projects.id))
    .where(eq(events.id, eventId));
  if (!ctx) return;

  // Mentions — @handle tokens (mirrors the UI's @\w+) resolved to project members.
  const handles = new Set(Array.from(body.matchAll(/@(\w+)/g)).map((m) => m[1].toLowerCase()));
  const mentionedIds = new Set<number>();
  const mentionEmails: string[] = [];
  if (handles.size > 0) {
    const members = await db
      .select({ userId: projectMembers.userId, userName: users.userName, email: users.email })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, ctx.projectId));
    for (const m of members) {
      if (m.userId !== actorId && m.email && handles.has(m.userName.toLowerCase())) {
        mentionedIds.add(m.userId);
        mentionEmails.push(m.email);
      }
    }
  }

  // Thread participants — anyone else who has commented on this event (excluding
  // the actor and anyone already emailed as a mention).
  const commenters = await db
    .selectDistinct({ userId: eventComments.userId, email: users.email })
    .from(eventComments)
    .innerJoin(users, eq(eventComments.userId, users.id))
    .where(and(eq(eventComments.eventId, eventId), ne(eventComments.userId, actorId)));
  const replyEmails = commenters
    .filter((c) => c.email && !mentionedIds.has(c.userId))
    .map((c) => c.email as string);

  // ponytail: optional absolute link for the "View thread" button; omitted if
  // PUBLIC_APP_URL isn't set (matches the app's other emails, which don't link).
  const base = process.env.PUBLIC_APP_URL?.replace(/\/$/, "");
  const eventUrl = base ? `${base}/dashboard/${ctx.projectId}/events/${eventId}` : null;

  const common = {
    actorName,
    eventTitle: ctx.title,
    channelName: ctx.channelName,
    projectName: ctx.projectName,
    commentBody: body,
    eventUrl,
  };

  if (mentionEmails.length > 0) {
    await sendCommentNotification({ ...common, reason: "mention" }, uniq(mentionEmails));
  }
  if (replyEmails.length > 0) {
    await sendCommentNotification({ ...common, reason: "reply" }, uniq(replyEmails));
  }
}
