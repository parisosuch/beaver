import { db } from "../db/db";
import { eventComments, users } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import { publishComment, type Comment } from "./comment-bus";
import { createNotificationsForComment } from "./notification";
import { notifyCommentByEmail } from "./comment-email";

export type { Comment };

export async function getComments(eventId: number): Promise<Comment[]> {
  const rows = await db
    .select({
      id: eventComments.id,
      eventId: eventComments.eventId,
      userId: eventComments.userId,
      userName: users.userName,
      body: eventComments.body,
      createdAt: eventComments.createdAt,
    })
    .from(eventComments)
    .innerJoin(users, eq(eventComments.userId, users.id))
    .where(eq(eventComments.eventId, eventId))
    .orderBy(asc(eventComments.createdAt));

  return rows as Comment[];
}

export async function createComment(
  eventId: number,
  userId: number,
  body: string,
): Promise<Comment> {
  const [row] = await db.insert(eventComments).values({ eventId, userId, body }).returning();

  const [withUser] = await db
    .select({
      id: eventComments.id,
      eventId: eventComments.eventId,
      userId: eventComments.userId,
      userName: users.userName,
      body: eventComments.body,
      createdAt: eventComments.createdAt,
    })
    .from(eventComments)
    .innerJoin(users, eq(eventComments.userId, users.id))
    .where(eq(eventComments.id, row.id));

  const comment = withUser as Comment;
  publishComment({ eventId, comment });

  // Best-effort: create in-app notifications and email mentioned members and
  // prior thread participants. Never let a notification failure break commenting.
  try {
    await createNotificationsForComment({
      eventId,
      actorId: userId,
      actorName: comment.userName,
      body,
    });
  } catch (err) {
    console.error("Failed to create comment notifications:", err);
  }

  try {
    await notifyCommentByEmail({ eventId, actorId: userId, actorName: comment.userName, body });
  } catch (err) {
    console.error("Failed to send comment notification emails:", err);
  }

  return comment;
}

export async function deleteComment(id: number, _userId: number): Promise<void> {
  await db.delete(eventComments).where(eq(eventComments.id, id));
}
