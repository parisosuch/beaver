import { db } from "../db/db";
import { projectMembers, users, projects } from "../db/schema";
import { eq, and } from "drizzle-orm";

export type Role = "owner" | "maintainer" | "guest";

export type ProjectMember = {
  id: number;
  projectId: number;
  userId: number;
  role: Role;
  createdAt: Date | null;
};

export type ProjectMemberWithUser = ProjectMember & {
  userName: string;
};

export async function getProjectMembers(
  projectId: number,
): Promise<ProjectMemberWithUser[]> {
  const rows = await db
    .select({
      id: projectMembers.id,
      projectId: projectMembers.projectId,
      userId: projectMembers.userId,
      role: projectMembers.role,
      createdAt: projectMembers.createdAt,
      userName: users.userName,
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId));

  return rows as ProjectMemberWithUser[];
}

export async function getUserProjectRole(
  projectId: number,
  userId: number,
): Promise<Role | null> {
  const rows = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);

  return rows[0]?.role ?? null;
}

export async function addProjectMember(
  projectId: number,
  userId: number,
  role: Role,
): Promise<ProjectMember> {
  const [row] = await db
    .insert(projectMembers)
    .values({ projectId, userId, role })
    .returning();
  return row as ProjectMember;
}

export async function updateMemberRole(
  projectId: number,
  userId: number,
  role: Role,
): Promise<void> {
  if (role !== "owner") {
    // Ensure at least one owner remains
    const owners = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, "owner"),
        ),
      );
    if (owners.length === 1 && owners[0].userId === userId) {
      throw new Error("Project must have at least one owner.");
    }
  }

  await db
    .update(projectMembers)
    .set({ role })
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    );
}

export async function removeProjectMember(
  projectId: number,
  userId: number,
): Promise<void> {
  // Ensure at least one owner remains
  const member = await db
    .select({ role: projectMembers.role })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);

  if (member[0]?.role === "owner") {
    const owners = await db
      .select({ userId: projectMembers.userId })
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, projectId),
          eq(projectMembers.role, "owner"),
        ),
      );
    if (owners.length <= 1) {
      throw new Error("Project must have at least one owner.");
    }
  }

  await db
    .delete(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    );
}

export async function getProjectsForUser(userId: number) {
  const rows = await db
    .select({
      id: projects.id,
      name: projects.name,
      apiKey: projects.apiKey,
      createdAt: projects.createdAt,
      ownerId: projects.ownerId,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projectMembers.projectId, projects.id))
    .where(eq(projectMembers.userId, userId));

  return rows;
}
