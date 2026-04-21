import { db } from "../db/db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export type DatabaseUser = {
  id: number;
  userName: string;
  isAdmin: boolean;
  password: string;
  mustChangePassword: boolean;
  tempPassword: string | null;
  createdAt: Date | null;
};

export type User = {
  id: number;
  userName: string;
  isAdmin: boolean;
  mustChangePassword: boolean;
  tempPassword: string | null;
  createdAt: Date | null;
};

export async function getAllUsers(): Promise<User[]> {
  return await db
    .select({
      id: users.id,
      userName: users.userName,
      isAdmin: users.isAdmin,
      mustChangePassword: users.mustChangePassword,
      tempPassword: users.tempPassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.createdAt);
}

export async function getAdminUsers(): Promise<User[]> {
  return await db
    .select({
      id: users.id,
      userName: users.userName,
      isAdmin: users.isAdmin,
      mustChangePassword: users.mustChangePassword,
      tempPassword: users.tempPassword,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.isAdmin, true));
}

export async function getUserByUsername(
  userName: string,
): Promise<DatabaseUser | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.userName, userName))
    .limit(1);

  return result[0] || null;
}

export async function verifyPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return await Bun.password.verify(password, hashedPassword);
}

export function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "Bvr-";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

export async function createUser(
  userName: string,
  password: string,
  isAdmin: boolean,
): Promise<User> {
  const hashedPassword = await Bun.password.hash(password);

  const [user] = await db
    .insert(users)
    .values({ userName, password: hashedPassword, isAdmin })
    .returning({
      id: users.id,
      userName: users.userName,
      isAdmin: users.isAdmin,
      mustChangePassword: users.mustChangePassword,
      tempPassword: users.tempPassword,
      createdAt: users.createdAt,
    });

  return user;
}

export async function createUserAccount(
  userName: string,
): Promise<User & { tempPassword: string }> {
  const tempPassword = generateTempPassword();
  const hashedPassword = await Bun.password.hash(tempPassword);

  const [user] = await db
    .insert(users)
    .values({
      userName,
      password: hashedPassword,
      isAdmin: false,
      mustChangePassword: true,
      tempPassword,
    })
    .returning({
      id: users.id,
      userName: users.userName,
      isAdmin: users.isAdmin,
      mustChangePassword: users.mustChangePassword,
      tempPassword: users.tempPassword,
      createdAt: users.createdAt,
    });

  return { ...user, tempPassword };
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

export async function setUserAdmin(
  id: number,
  isAdmin: boolean,
): Promise<void> {
  await db.update(users).set({ isAdmin }).where(eq(users.id, id));
}

export async function resetUserPassword(id: number): Promise<string> {
  const tempPassword = generateTempPassword();
  const hashedPassword = await Bun.password.hash(tempPassword);

  await db
    .update(users)
    .set({ password: hashedPassword, tempPassword, mustChangePassword: true })
    .where(eq(users.id, id));

  // Invalidate all sessions so user must log in again
  await db.delete(sessions).where(eq(sessions.userId, id));

  return tempPassword;
}

export async function changePassword(
  id: number,
  newPassword: string,
): Promise<void> {
  const hashedPassword = await Bun.password.hash(newPassword);

  await db
    .update(users)
    .set({
      password: hashedPassword,
      tempPassword: null,
      mustChangePassword: false,
    })
    .where(eq(users.id, id));

  // Invalidate all sessions so user must re-login with new password
  await db.delete(sessions).where(eq(sessions.userId, id));
}
