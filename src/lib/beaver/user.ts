import { db } from "../db/db";
import { users } from "../db/schema";

export type DatabaseUser = {
  id: number;
  userName: string;
  isAdmin: boolean;
  password: string;
  createdAt: Date | null;
};

export type User = {
  id: number;
  userName: string;
  isAdmin: boolean;
  createdAt: Date | null;
};

export async function createUser(
  userName: string,
  password: string,
  isAdmin: boolean
): Promise<User> {
  const hashedPassword = await Bun.password.hash(password);

  const res = await db
    .insert(users)
    .values({ userName, password: hashedPassword, isAdmin })
    .returning();

  const user: User = res[0];

  delete (user as any).password;

  return user;
}
