import type { MetricWithValue, MetricType, ChartType } from "@/lib/beaver/metric";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { BarChart2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { Sparkline } from "./ui/sparkline";
import { useTabLeader } from "@/lib/tab-leader";

const VALUE_TWEEN_MS = 600;

function useTweenedNumber(target: number | null): number | null {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) {
      setDisplay(null);
      fromRef.current = null;
      return;
    }
    const from = fromRef.current ?? target;
    if (from === target) {
      setDisplay(target);
      return;
    }

    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / VALUE_TWEEN_MS);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (target - from) * eased);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      fromRef.current = target;
    };
  }, [target]);

  return display;
}

const POLL_INTERVAL_MS = 10_000;

const TYPE_COLORS: Record<MetricType, string> = {
  gauge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  counter: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  timeseries: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

const TYPE_LABELS: Record<MetricType, string> = {
  gauge: "Gauge",
  counter: "Counter",
  timeseries: "Timeseries",
};

function TypeBadge({ type }: { type: MetricType }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[type]}`}>
      {TYPE_LABELS[type]}
    </span>
  );
}

function formatValue(value: number | null, unit?: string | null): string {
  if (value === null) return "—";
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

function bucketSparkline(
  data: { value: number; timestamp: Date }[],
  chartType: ChartType,
): { value: number }[] {
  if (chartType !== "bar") return data.map((d) => ({ value: d.value }));
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const d of data) {
    const key = new Date(d.timestamp).toISOString().slice(0, 10);
    sums.set(key, (sums.get(key) ?? 0) + d.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(sums.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, sum]) => ({ value: Math.round((sum / (counts.get(key) ?? 1)) * 10) / 10 }));
}

function MetricCard({
  metric,
  sparkline,
  projectId,
}: {
  metric: MetricWithValue;
  sparkline?: { value: number; timestamp: Date }[];
  projectId: number;
}) {
  const isClickable = metric.type === "timeseries";
  const Wrapper = isClickable ? "a" : "div";
  const isTweenable = metric.type === "gauge" || metric.type === "counter";
  const tweened = useTweenedNumber(isTweenable ? metric.currentValue : null);
  const displayValue = isTweenable ? tweened : metric.currentValue;
  return (
    <Wrapper
      href={isClickable ? `/dashboard/${projectId}/metrics/${metric.id}` : undefined}
      className="block"
    >
      <Card
        className={`h-full ${isClickable ? "hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer" : ""}`}
      >
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium truncate">{metric.name}</CardTitle>
            <TypeBadge type={metric.type as MetricType} />
          </div>
          {metric.description && (
            <p className="text-xs text-muted-foreground truncate">{metric.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatValue(displayValue, metric.unit)}
          </p>

          {(metric.type === "gauge" || metric.type === "counter") && metric.lastUpdatedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Updated {formatDistanceToNow(new Date(metric.lastUpdatedAt), { addSuffix: true })}
            </p>
          )}

          {metric.type === "timeseries" && (
            <div className="mt-3">
              <Sparkline
                data={bucketSparkline(sparkline ?? [], (metric.chartType ?? "line") as ChartType)}
                chartType={(metric.chartType ?? "line") as ChartType}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </Wrapper>
  );
}

export default function MetricsOverview({
  metrics: initialMetrics,
  sparklines: initialSparklines,
  projectId,
}: {
  metrics: MetricWithValue[];
  sparklines: Record<number, { value: number; timestamp: Date }[]>;
  projectId: number;
}) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [sparklines, setSparklines] = useState(initialSparklines);
  const isLeader = useTabLeader(`metrics:${projectId}`);

  useEffect(() => {
    const bc = new BroadcastChannel(`beaver:metrics:${projectId}`);
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    if (isLeader) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/metrics?projectId=${projectId}&includeSparklines=true`);
          if (!res.ok || cancelled) return;
          const data = await res.json();
          if (cancelled) return;
          setMetrics(data.metrics);
          setSparklines(data.sparklines);
          bc.postMessage({ metrics: data.metrics, sparklines: data.sparklines });
        } catch {}
      };
      poll();
      intervalId = setInterval(poll, POLL_INTERVAL_MS);
    } else {
      bc.onmessage = (e: MessageEvent) => {
        if (cancelled) return;
        setMetrics(e.data.metrics);
        setSparklines(e.data.sparklines);
      };
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      bc.close();
    };
  }, [projectId, isLeader]);

  return (
    <div className="px-4 md:px-8 py-4 md:py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Metrics</h1>
      </div>

      {metrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
          <BarChart2Icon size={36} className="text-muted-foreground" />
          <p className="text-muted-foreground">No metrics yet.</p>
          <a
            href={`/dashboard/${projectId}/settings`}
            className="text-sm underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            Create one in settings
          </a>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              sparkline={sparklines[metric.id]}
              projectId={projectId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
