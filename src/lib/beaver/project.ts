import { db } from "../db/db";
import { projects } from "../db/schema";

export async function getProjects() {
  const res = await db.select().from(projects);

  return res;
}

export async function createProject(name: string, apiKey: string) {
  const res = await db.insert(projects).values({ name, apiKey }).returning();

  return res[0];
}
