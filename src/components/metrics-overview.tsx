import type { MetricWithValue, MetricType, ChartType } from "@/lib/beaver/metric";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "./ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

function Sparkline({
  data,
  chartType,
}: {
  data: { value: number; timestamp: Date }[];
  chartType: ChartType;
}) {
  if (data.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-muted-foreground">
        No data yet
      </div>
    );
  }

  const chartData = data.map((d) => ({ value: d.value }));
  const config = { value: { label: "Value", color: "hsl(var(--chart-1))" } };

  return (
    <ChartContainer config={config} className="h-16 w-full">
      {chartType === "bar" ? (
        <BarChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <XAxis hide />
          <YAxis hide />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="value" fill="var(--color-value)" radius={2} />
        </BarChart>
      ) : (
        <AreaChart data={chartData} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <XAxis hide />
          <YAxis hide />
          <ChartTooltip content={<ChartTooltipContent hideLabel />} />
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            dataKey="value"
            stroke="var(--color-value)"
            fill="url(#sparkGrad)"
            strokeWidth={1.5}
            dot={false}
          />
        </AreaChart>
      )}
    </ChartContainer>
  );
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
  return (
    <a href={`/dashboard/${projectId}/metrics/${metric.id}`} className="block">
      <Card className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base font-medium truncate">
              {metric.name}
            </CardTitle>
            <TypeBadge type={metric.type as MetricType} />
          </div>
          {metric.description && (
            <p className="text-xs text-muted-foreground truncate">{metric.description}</p>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold tabular-nums">
            {formatValue(metric.currentValue, metric.unit)}
          </p>

          {metric.type === "gauge" && metric.lastUpdatedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              Updated {formatDistanceToNow(new Date(metric.lastUpdatedAt), { addSuffix: true })}
            </p>
          )}

          {metric.type === "timeseries" && (
            <div className="mt-3">
              <Sparkline
                data={sparkline ?? []}
                chartType={(metric.chartType ?? "line") as ChartType}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </a>
  );
}

export default function MetricsOverview({
  metrics,
  sparklines,
  projectId,
}: {
  metrics: MetricWithValue[];
  sparklines: Record<number, { value: number; timestamp: Date }[]>;
  projectId: number;
}) {
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
