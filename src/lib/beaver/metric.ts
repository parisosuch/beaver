import { db } from "../db/db";
import { metrics, metricValues, projects } from "../db/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export type MetricType = "gauge" | "counter" | "timeseries";
export type ChartType = "line" | "bar";

export type Metric = {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  unit: string | null;
  type: MetricType;
  chartType: ChartType | null;
  createdAt: Date;
};

export type MetricWithValue = Metric & {
  currentValue: number | null;
  lastUpdatedAt: Date | null;
};

export type MetricValue = {
  id: number;
  metricId: number;
  value: number;
  timestamp: Date;
  createdAt: Date;
};

export async function createMetric(
  projectId: number,
  {
    name,
    description,
    unit,
    type,
    chartType,
  }: {
    name: string;
    description?: string;
    unit?: string;
    type: MetricType;
    chartType?: ChartType;
  },
): Promise<Metric> {
  const existing = await db
    .select({ id: metrics.id })
    .from(metrics)
    .where(and(eq(metrics.projectId, projectId), eq(metrics.name, name)));

  if (existing.length > 0) {
    throw new Error(`A metric named "${name}" already exists in this project.`);
  }

  const [metric] = await db
    .insert(metrics)
    .values({ projectId, name, description, unit, type, chartType })
    .returning();

  return metric as Metric;
}

export async function getMetrics(projectId: number): Promise<MetricWithValue[]> {
  const ranked = db
    .select({
      metricId: metricValues.metricId,
      value: metricValues.value,
      timestamp: metricValues.timestamp,
      rn: sql<number>`ROW_NUMBER() OVER (PARTITION BY ${metricValues.metricId} ORDER BY ${metricValues.timestamp} DESC)`.as("rn"),
    })
    .from(metricValues)
    .as("ranked");

  const rows = await db
    .select({
      id: metrics.id,
      projectId: metrics.projectId,
      name: metrics.name,
      description: metrics.description,
      unit: metrics.unit,
      type: metrics.type,
      chartType: metrics.chartType,
      createdAt: metrics.createdAt,
      currentValue: ranked.value,
      lastUpdatedAt: ranked.timestamp,
    })
    .from(metrics)
    .leftJoin(ranked, and(eq(ranked.metricId, metrics.id), eq(ranked.rn, 1)))
    .where(eq(metrics.projectId, projectId))
    .orderBy(metrics.createdAt);

  return rows as MetricWithValue[];
}

export async function getMetric(metricId: number): Promise<MetricWithValue | undefined> {
  const [row] = await db
    .select()
    .from(metrics)
    .where(eq(metrics.id, metricId));

  if (!row) return undefined;

  const [latest] = await db
    .select()
    .from(metricValues)
    .where(eq(metricValues.metricId, metricId))
    .orderBy(desc(metricValues.timestamp))
    .limit(1);

  return {
    ...(row as Metric),
    currentValue: latest?.value ?? null,
    lastUpdatedAt: latest?.timestamp ?? null,
  };
}

export async function getMetricByName(
  projectId: number,
  name: string,
): Promise<Metric | undefined> {
  const [row] = await db
    .select()
    .from(metrics)
    .where(and(eq(metrics.projectId, projectId), eq(metrics.name, name)));

  return row as Metric | undefined;
}

export async function updateMetric(
  metricId: number,
  {
    name,
    description,
    unit,
  }: {
    name?: string;
    description?: string;
    unit?: string;
  },
): Promise<Metric> {
  const [updated] = await db
    .update(metrics)
    .set({ name, description, unit })
    .where(eq(metrics.id, metricId))
    .returning();

  return updated as Metric;
}

export async function deleteMetric(metricId: number): Promise<void> {
  await db.delete(metrics).where(eq(metrics.id, metricId));
}

export async function setGauge(metricId: number, value: number): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    const updated = await tx
      .update(metricValues)
      .set({ value, timestamp: now })
      .where(eq(metricValues.metricId, metricId))
      .returning();

    if (updated.length === 0) {
      await tx.insert(metricValues).values({ metricId, value, timestamp: now });
    }
  });
}

export async function incrementCounter(
  metricId: number,
  amount: number,
): Promise<number> {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(metricValues)
      .where(eq(metricValues.metricId, metricId));

    const next = (existing?.value ?? 0) + amount;
    const now = new Date();

    if (existing) {
      await tx
        .update(metricValues)
        .set({ value: next, timestamp: now })
        .where(eq(metricValues.metricId, metricId));
    } else {
      await tx.insert(metricValues).values({ metricId, value: next, timestamp: now });
    }

    return next;
  });
}

export async function appendTimeseries(
  metricId: number,
  value: number,
  timestamp?: Date,
): Promise<void> {
  await db.insert(metricValues).values({
    metricId,
    value,
    timestamp: timestamp ?? new Date(),
  });
}

export async function getMetricValues(
  metricId: number,
  {
    from,
    to,
    limit,
  }: {
    from?: Date;
    to?: Date;
    limit?: number;
  } = {},
): Promise<MetricValue[]> {
  const conditions = [eq(metricValues.metricId, metricId)];
  if (from) conditions.push(gte(metricValues.timestamp, from));
  if (to) conditions.push(lte(metricValues.timestamp, to));

  let query = db
    .select()
    .from(metricValues)
    .where(and(...conditions))
    .orderBy(metricValues.timestamp)
    .$dynamic();

  if (limit) query = query.limit(limit);

  return (await query) as MetricValue[];
}

export async function getProjectByApiKey(apiKey: string) {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.apiKey, apiKey));

  return project;
}
