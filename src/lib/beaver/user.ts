import { db } from "../db/db";
import { users, sessions } from "../db/schema";
import { eq } from "drizzle-orm";

export type DatabaseUser = {
  id: number;
  userName: string;
  fullName: string | null;
  email: string | null;
  isAdmin: boolean;
  canCreateProjects: boolean;
  password: string;
  mustChangePassword: boolean;
  tempPassword: string | null;
  compactMode: boolean;
  themePalette: string;
  createdAt: Date | null;
};

export type User = {
  id: number;
  userName: string;
  fullName: string | null;
  email: string | null;
  isAdmin: boolean;
  canCreateProjects: boolean;
  mustChangePassword: boolean;
  tempPassword: string | null;
  compactMode: boolean;
  themePalette: string;
  createdAt: Date | null;
};

const userSelect = {
  id: users.id,
  userName: users.userName,
  fullName: users.fullName,
  email: users.email,
  isAdmin: users.isAdmin,
  canCreateProjects: users.canCreateProjects,
  mustChangePassword: users.mustChangePassword,
  tempPassword: users.tempPassword,
  compactMode: users.compactMode,
  themePalette: users.themePalette,
  createdAt: users.createdAt,
};

export async function getAllUsers(): Promise<User[]> {
  return await db.select(userSelect).from(users).orderBy(users.createdAt);
}

export async function getUserById(id: number): Promise<DatabaseUser | null> {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function getAdminUsers(): Promise<User[]> {
  return await db.select(userSelect).from(users).where(eq(users.isAdmin, true));
}

export async function getUserByUsername(userName: string): Promise<DatabaseUser | null> {
  const result = await db.select().from(users).where(eq(users.userName, userName)).limit(1);

  return result[0] || null;
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
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

const USERNAME_RE = /^[a-zA-Z0-9-]+$/;

function validateUsername(userName: string) {
  if (!USERNAME_RE.test(userName)) {
    throw new Error("Username may only contain letters, numbers, and hyphens.");
  }
}

export async function createUser(
  userName: string,
  password: string,
  isAdmin: boolean,
): Promise<User> {
  validateUsername(userName);
  const hashedPassword = await Bun.password.hash(password);

  const [user] = await db
    .insert(users)
    .values({ userName, password: hashedPassword, isAdmin })
    .returning(userSelect);

  return user;
}

export async function createUserAccount(
  userName: string,
  canCreateProjects = false,
): Promise<User & { tempPassword: string }> {
  validateUsername(userName);
  const tempPassword = generateTempPassword();
  const hashedPassword = await Bun.password.hash(tempPassword);

  const [user] = await db
    .insert(users)
    .values({
      userName,
      password: hashedPassword,
      isAdmin: false,
      canCreateProjects,
      mustChangePassword: true,
      tempPassword,
    })
    .returning(userSelect);

  return { ...user, tempPassword };
}

export async function setCanCreateProjects(id: number, canCreateProjects: boolean): Promise<void> {
  await db.update(users).set({ canCreateProjects }).where(eq(users.id, id));
}

export async function deleteUser(id: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

export async function setUserAdmin(id: number, isAdmin: boolean): Promise<void> {
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

export async function changePassword(id: number, newPassword: string): Promise<void> {
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

export async function updatePassword(id: number, newPassword: string): Promise<void> {
  const hashedPassword = await Bun.password.hash(newPassword);

  await db
    .update(users)
    .set({ password: hashedPassword, tempPassword: null, mustChangePassword: false })
    .where(eq(users.id, id));
}

export async function updateUserEmail(id: number, email: string | null): Promise<void> {
  await db.update(users).set({ email }).where(eq(users.id, id));
}

export async function updateUserFullName(id: number, fullName: string | null): Promise<void> {
  await db.update(users).set({ fullName }).where(eq(users.id, id));
}

export async function updateUserCompactMode(id: number, compactMode: boolean): Promise<void> {
  await db.update(users).set({ compactMode }).where(eq(users.id, id));
}

export const THEME_PALETTES = ["default", "blue", "violet", "green", "rose"] as const;
export type ThemePalette = (typeof THEME_PALETTES)[number];

export async function updateUserThemePalette(id: number, themePalette: string): Promise<void> {
  const palette = (THEME_PALETTES as readonly string[]).includes(themePalette)
    ? themePalette
    : "default";
  await db.update(users).set({ themePalette: palette }).where(eq(users.id, id));
}
