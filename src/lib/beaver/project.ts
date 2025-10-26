import { db } from "../db/db";
import { projects } from "../db/schema";

export async function getProjects() {
  const res = await db.select().from(projects);

  return res;
}

export async function createProject(name: string, apiKey: string) {
  console.log("Creating project...");
  const res = await db.insert(projects).values({ name, apiKey }).returning();

  console.log(res);
  return res;
}
