import { db } from "../db/db";
import { channels, channelGroups, metrics } from "../db/schema";
import { eq } from "drizzle-orm";
import { getUserProjectRole, type Role } from "./project-member";

export type AuthUser = { id: number; isAdmin: boolean };

/** Resolve a user's role on a project. Admins implicitly act as owner. */
export async function getProjectRole(user: AuthUser, projectId: number): Promise<Role | null> {
  if (user.isAdmin) return "owner";
  return getUserProjectRole(projectId, user.id);
}

/** True if the user is a member of (or admin over) the project. */
export async function canAccessProject(user: AuthUser, projectId: number): Promise<boolean> {
  return (await getProjectRole(user, projectId)) !== null;
}

/** True if the user can mutate the project (owner or maintainer, or admin). */
export async function canManageProject(user: AuthUser, projectId: number): Promise<boolean> {
  const role = await getProjectRole(user, projectId);
  return role === "owner" || role === "maintainer";
}

export async function projectIdForChannel(channelId: number): Promise<number | null> {
  const [row] = await db
    .select({ projectId: channels.projectId })
    .from(channels)
    .where(eq(channels.id, channelId))
    .limit(1);
  return row?.projectId ?? null;
}

export async function projectIdForChannelGroup(groupId: number): Promise<number | null> {
  const [row] = await db
    .select({ projectId: channelGroups.projectId })
    .from(channelGroups)
    .where(eq(channelGroups.id, groupId))
    .limit(1);
  return row?.projectId ?? null;
}

export async function projectIdForMetric(metricId: number): Promise<number | null> {
  const [row] = await db
    .select({ projectId: metrics.projectId })
    .from(metrics)
    .where(eq(metrics.id, metricId))
    .limit(1);
  return row?.projectId ?? null;
}

export function forbidden(): Response {
  return new Response(JSON.stringify({ error: "Forbidden" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}
