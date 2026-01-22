import { db } from "../db/db";
import { sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export async function createSession(
  userId: number,
  token: string,
  expiresAt: Date
): Promise<void> {
  await db.insert(sessions).values({
    userId,
    token,
    expiresAt,
  });
}

export async function deleteSession(token: string): Promise<boolean> {
  const result = await db
    .delete(sessions)
    .where(eq(sessions.token, token))
    .returning();

  return result.length > 0;
}

export async function deleteAllUserSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

export async function getSessionByToken(token: string) {
  const result = await db
    .select()
    .from(sessions)
    .where(eq(sessions.token, token))
    .limit(1);

  return result[0] || null;
}
