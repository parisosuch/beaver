import { db } from "../db/db";
import { projects, projectMembers } from "../db/schema";
import { eq, or, and, gt } from "drizzle-orm";

export type Project = {
  id: number;
  name: string;
  apiKey: string;
  previousApiKey: string | null;
  previousApiKeyExpiresAt: Date | null;
  rateLimitPerMinute: number | null;
  createdAt: Date | null;
  ownerId: number;
};

export async function getProjects() {
  const res = await db.select().from(projects);

  return res;
}

export async function createProject(name: string, apiKey: string, ownerId: number) {
  const [project] = await db.insert(projects).values({ name, apiKey, ownerId }).returning();

  // Creator is automatically an owner
  await db.insert(projectMembers).values({
    projectId: project.id,
    userId: ownerId,
    role: "owner",
  });

  return project;
}

export async function getProject(project_id: number) {
  const res = await db.select().from(projects).where(eq(projects.id, project_id));

  return res[0];
}

export async function getProjectsByOwner(ownerId: number) {
  const res = await db.select().from(projects).where(eq(projects.ownerId, ownerId));

  return res;
}

export async function renameProject(projectId: number, name: string) {
  const res = await db.update(projects).set({ name }).where(eq(projects.id, projectId)).returning();

  return res[0];
}

export async function deleteProject(projectId: number) {
  const res = await db.delete(projects).where(eq(projects.id, projectId)).returning();

  return res[0];
}

export async function setRateLimit(projectId: number, rateLimitPerMinute: number | null) {
  const res = await db
    .update(projects)
    .set({ rateLimitPerMinute })
    .where(eq(projects.id, projectId))
    .returning();

  return res[0];
}

const GRACE_PERIOD_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function rotateApiKey(
  projectId: number,
): Promise<{ newKey: string; previousKeyExpiresAt: Date }> {
  const [current] = await db
    .select({ apiKey: projects.apiKey })
    .from(projects)
    .where(eq(projects.id, projectId));
  const newKey = crypto.randomUUID();
  const previousKeyExpiresAt = new Date(Date.now() + GRACE_PERIOD_MS);
  await db
    .update(projects)
    .set({
      apiKey: newKey,
      previousApiKey: current.apiKey,
      previousApiKeyExpiresAt: previousKeyExpiresAt,
    })
    .where(eq(projects.id, projectId));
  return { newKey, previousKeyExpiresAt };
}

export async function getProjectByApiKey(apiKey: string) {
  const now = new Date();
  const [project] = await db
    .select()
    .from(projects)
    .where(
      or(
        eq(projects.apiKey, apiKey),
        and(eq(projects.previousApiKey, apiKey), gt(projects.previousApiKeyExpiresAt, now)),
      ),
    );
  return project;
}
