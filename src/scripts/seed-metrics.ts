import { db } from "../lib/db/db";
import { projects, metrics, metricValues } from "../lib/db/schema";
import { and, eq } from "drizzle-orm";
import { subDays } from "date-fns";

const [project] = await db.select({ id: projects.id, name: projects.name }).from(projects);
if (!project) {
  console.error("No projects found. Run the seed script first.");
  process.exit(1);
}

console.log(`Seeding metrics for project "${project.name}" (id=${project.id})...`);

function randn(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

const defs = [
  {
    name: "response-time",
    description: "API p95 response time",
    unit: "ms",
    chartType: "line" as const,
    baseline: 120,
  },
  {
    name: "active-users",
    description: "Concurrent active users",
    unit: "users",
    chartType: "line" as const,
    baseline: 80,
  },
  {
    name: "error-rate",
    description: "Errors per minute",
    unit: "errors/min",
    chartType: "bar" as const,
    baseline: 2,
  },
];

const now = new Date();
const from = subDays(now, 30);
const intervalMs = 15 * 60 * 1000; // one point every 15 minutes

for (const def of defs) {
  const existing = await db
    .select({ id: metrics.id })
    .from(metrics)
    .where(and(eq(metrics.projectId, project.id), eq(metrics.name, def.name)));

  let metricId: number;
  if (existing.length > 0) {
    metricId = existing[0].id;
    console.log(`  "${def.name}" already exists (id=${metricId}), adding values...`);
  } else {
    const [m] = await db
      .insert(metrics)
      .values({
        projectId: project.id,
        name: def.name,
        description: def.description,
        unit: def.unit,
        type: "timeseries",
        chartType: def.chartType,
      })
      .returning();
    metricId = m.id;
    console.log(`  Created "${def.name}" (id=${metricId})`);
  }

  const points: { metricId: number; value: number; timestamp: Date }[] = [];
  let t = from.getTime();
  let baseline = def.baseline;

  while (t <= now.getTime()) {
    const ts = new Date(t);
    const hour = ts.getUTCHours();

    // Diurnal pattern: higher during business hours
    const peak =
      def.name === "active-users"
        ? 1 + 1.5 * Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12))
        : 1 + 0.4 * Math.max(0, Math.sin((Math.PI * (hour - 8)) / 10));

    baseline += randn() * baseline * 0.03;
    baseline = Math.max(baseline, 0.5);

    const raw = Math.max(0, baseline * peak + randn() * baseline * 0.08);
    const value = def.name === "active-users" ? Math.round(raw) : Math.round(raw * 10) / 10;

    points.push({ metricId, value, timestamp: ts });
    t += intervalMs;
  }

  for (let i = 0; i < points.length; i += 500) {
    await db.insert(metricValues).values(points.slice(i, i + 500));
  }
  console.log(`    → ${points.length} data points inserted`);
}

console.log("\nDone.");
