import { db } from "../db/db";
import { projects, projectMembers, events } from "../db/schema";
import { eq, or, and, gt, count, asc } from "drizzle-orm";
import { addProjectMember, getUserProjectRole, updateMemberRole } from "./project-member";

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

/** A project owned by a user, with the number of events that would go with it. */
export type OwnedProjectSummary = {
  id: number;
  name: string;
  eventCount: number;
};

/**
 * Projects a user owns, each with its event count — the cost of deleting that
 * user's account. Counted off events.project_id rather than walking channels,
 * since every event carries the project it belongs to.
 */
export async function getOwnedProjectsWithEventCounts(
  ownerId: number,
): Promise<OwnedProjectSummary[]> {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      eventCount: count(events.id),
    })
    .from(projects)
    .leftJoin(events, eq(events.projectId, projects.id))
    .where(eq(projects.ownerId, ownerId))
    .groupBy(projects.id)
    .orderBy(asc(projects.name));

  return rows;
}

/**
 * Hand a project to a new owner. Ownership lives in two places — projects.owner_id
 * and an "owner" row in project_members — and both move together.
 *
 * The previous owner keeps access as a maintainer, so exactly one member holds the
 * owner role. Promotion happens before the demotion so the "at least one owner"
 * check in updateMemberRole always sees the incoming owner.
 */
export async function setProjectOwner(projectId: number, newOwnerId: number): Promise<Project> {
  const project = await getProject(projectId);
  if (!project) throw new Error("Project not found.");

  const previousOwnerId = project.ownerId;

  const [updated] = await db
    .update(projects)
    .set({ ownerId: newOwnerId })
    .where(eq(projects.id, projectId))
    .returning();

  const newOwnerRole = await getUserProjectRole(projectId, newOwnerId);
  if (newOwnerRole === null) {
    await addProjectMember(projectId, newOwnerId, "owner");
  } else if (newOwnerRole !== "owner") {
    await updateMemberRole(projectId, newOwnerId, "owner");
  }

  if (previousOwnerId !== newOwnerId) {
    const previousRole = await getUserProjectRole(projectId, previousOwnerId);
    if (previousRole === "owner") {
      await updateMemberRole(projectId, previousOwnerId, "maintainer");
    }
  }

  return updated;
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
