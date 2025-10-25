import { db } from "../db/db";
import { projects } from "../db/schema";

export async function getProjects() {
  const res = await db.select().from(projects);

  return res;
}
