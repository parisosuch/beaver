import { db } from "../db/db";
import { auditLog } from "../db/schema";
import { users } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export type AuditEntry = {
  id: number;
  action: string;
  targetType: string | null;
  targetId: number | null;
  targetName: string | null;
  metadata: string | null;
  createdAt: Date;
  actorName: string;
};

export async function logAuditEntry(entry: {
  projectId: number;
  userId: number;
  action: string;
  targetType?: string;
  targetId?: number;
  targetName?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(auditLog).values({
    projectId: entry.projectId,
    userId: entry.userId,
    action: entry.action,
    targetType: entry.targetType ?? null,
    targetId: entry.targetId ?? null,
    targetName: entry.targetName ?? null,
    metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
  });
}

export async function getAuditLog(projectId: number, limit = 100): Promise<AuditEntry[]> {
  const rows = await db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetType: auditLog.targetType,
      targetId: auditLog.targetId,
      targetName: auditLog.targetName,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
      actorName: users.userName,
    })
    .from(auditLog)
    .innerJoin(users, eq(auditLog.userId, users.id))
    .where(eq(auditLog.projectId, projectId))
    .orderBy(desc(auditLog.createdAt))
    .limit(limit);

  return rows as AuditEntry[];
}
