import { db } from "../db/db";
import { projects } from "../db/schema";
import { eq } from "drizzle-orm";

export type Project = {
  id: number;
  name: string;
  apiKey: string;
  createdAt: Date | null;
};

export async function getProjects() {
  const res = await db.select().from(projects);

  return res;
}

export async function createProject(
  name: string,
  apiKey: string,
  ownerId: number
) {
  const res = await db
    .insert(projects)
    .values({ name, apiKey, ownerId })
    .returning();

  return res[0];
}

export async function getProject(project_id: number) {
  const res = await db
    .select()
    .from(projects)
    .where(eq(projects.id, project_id));

  return res[0];
}
