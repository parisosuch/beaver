import { db } from "../db/db";
import { savedViews } from "../db/schema";
import { eq, and } from "drizzle-orm";

export type SavedView = {
  id: number;
  projectId: number;
  userId: number;
  name: string;
  params: string;
  createdAt: Date;
};

export async function getSavedViewById(id: number): Promise<SavedView | null> {
  const [row] = await db.select().from(savedViews).where(eq(savedViews.id, id));
  return (row as SavedView) ?? null;
}

export async function getSavedViews(projectId: number, userId: number): Promise<SavedView[]> {
  return db
    .select()
    .from(savedViews)
    .where(and(eq(savedViews.projectId, projectId), eq(savedViews.userId, userId)))
    .orderBy(savedViews.createdAt) as Promise<SavedView[]>;
}

export async function createSavedView(
  projectId: number,
  userId: number,
  name: string,
  params: string,
): Promise<SavedView> {
  const [row] = await db.insert(savedViews).values({ projectId, userId, name, params }).returning();
  return row as SavedView;
}

export async function deleteSavedView(id: number, userId: number): Promise<void> {
  await db.delete(savedViews).where(and(eq(savedViews.id, id), eq(savedViews.userId, userId)));
}
