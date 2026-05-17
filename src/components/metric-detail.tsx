import { useState, useEffect, useCallback, useRef } from "react";
import type { MetricWithValue, MetricType, MetricValue } from "@/lib/beaver/metric";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { DatePicker } from "./ui/date-picker";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "./ui/chart";
import { Area, AreaChart, Bar, BarChart, XAxis, YAxis } from "recharts";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import {
  formatDistanceToNow,
  format,
  subDays,
  startOfDay,
  startOfHour,
  startOfWeek,
  differenceInHours,
  differenceInDays,
} from "date-fns";

// ── Types ──────────────────────────────────────────────────────────────────────

type SerializedMetric = Omit<MetricWithValue, "createdAt" | "lastUpdatedAt"> & {
  createdAt: string | Date;
  lastUpdatedAt: string | Date | null;
};

type SerializedValue = Omit<MetricValue, "timestamp" | "createdAt"> & {
  timestamp: string | Date;
  createdAt: string | Date;
};

type Range = "today" | "7d" | "30d" | "custom";
type BucketGranularity = "hour" | "day" | "week";

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function getRangeDates(range: Range, customFrom?: Date, customTo?: Date): { from: Date; to: Date } {
  const now = new Date();
  if (range === "today") return { from: startOfDay(now), to: now };
  if (range === "7d") return { from: subDays(now, 7), to: now };
  if (range === "30d") return { from: subDays(now, 30), to: now };
  return { from: customFrom ?? subDays(now, 30), to: customTo ?? now };
}

function getBucketGranularity(from: Date, to: Date): BucketGranularity {
  const days = differenceInDays(to, from);
  if (days <= 2) return "hour";
  if (days <= 60) return "day";
  return "week";
}

function bucketLabel(d: Date, granularity: BucketGranularity): string {
  if (granularity === "hour") return format(startOfHour(d), "MM/dd HH:mm");
  if (granularity === "day") return format(d, "MM/dd");
  return format(startOfWeek(d), "MM/dd");
}

function bucketValues(
  values: { value: number; timestamp: Date }[],
  granularity: BucketGranularity,
  mode: "sum" | "avg" = "sum",
): { label: string; value: number }[] {
  const sums = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = bucketLabel(v.timestamp, granularity);
    sums.set(key, (sums.get(key) ?? 0) + v.value);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(sums.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, sum]) => ({
      label,
      value: mode === "avg" ? Math.round((sum / (counts.get(label) ?? 1)) * 10) / 10 : sum,
    }));
}

function formatValue(value: number | null, unit?: string | null): string {
  if (value === null) return "—";
  const formatted = Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return unit ? `${formatted} ${unit}` : formatted;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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

const RANGES: { value: Range; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "custom", label: "Custom" },
];

function RangeSelector({
  range,
  customFrom,
  customTo,
  onChange,
  onCustomChange,
}: {
  range: Range;
  customFrom?: Date;
  customTo?: Date;
  onChange: (r: Range) => void;
  onCustomChange: (from?: Date, to?: Date) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex border rounded-md overflow-hidden">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => onChange(r.value)}
            className={`px-3 py-1 text-sm transition-colors ${
              range === r.value
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="flex items-center gap-2">
          <DatePicker
            date={customFrom}
            onSelect={(d) => onCustomChange(d, customTo)}
            placeholder="From"
            className="w-36"
          />
          <span className="text-muted-foreground text-sm">–</span>
          <DatePicker
            date={customTo}
            onSelect={(d) => onCustomChange(customFrom, d)}
            placeholder="To"
            className="w-36"
          />
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MetricDetail({
  metric: rawMetric,
  projectId,
  initialValues: rawInitialValues,
}: {
  metric: SerializedMetric;
  projectId: number;
  initialValues: SerializedValue[];
}) {
  const metric = {
    ...rawMetric,
    createdAt: toDate(rawMetric.createdAt),
    lastUpdatedAt: rawMetric.lastUpdatedAt ? toDate(rawMetric.lastUpdatedAt) : null,
  };

  const initialValues = rawInitialValues.map((v) => ({
    ...v,
    timestamp: toDate(v.timestamp),
    createdAt: toDate(v.createdAt),
  }));

  // ── Editable metadata state ───────────────────────────────────────────────────

  const [name, setDisplayName] = useState(metric.name);
  const [description, setDisplayDescription] = useState(metric.description);
  const [unit, setDisplayUnit] = useState(metric.unit);

  // ── Range state ───────────────────────────────────────────────────────────────

  const [range, setRange] = useState<Range>("7d");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  // ── Values state (for timeseries + counter charts) ────────────────────────────

  const [values, setValues] = useState<{ value: number; timestamp: Date }[]>(
    initialValues.map((v) => ({ value: v.value, timestamp: v.timestamp as Date })),
  );
  const [loadingValues, setLoadingValues] = useState(false);

  const fetchValues = useCallback(
    async (from: Date, to: Date) => {
      setLoadingValues(true);
      try {
        const params = new URLSearchParams({ from: from.toISOString(), to: to.toISOString() });
        const res = await fetch(`/api/metrics/${metric.id}/values?${params}`);
        if (!res.ok) return;
        const data: Array<{ value: number; timestamp: string }> = await res.json();
        setValues(data.map((d) => ({ value: d.value, timestamp: new Date(d.timestamp) })));
      } finally {
        setLoadingValues(false);
      }
    },
    [metric.id],
  );

  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }
    if (range === "custom" && (!customFrom || !customTo)) return;
    if (metric.type === "timeseries") {
      const { from, to } = getRangeDates(range, customFrom, customTo);
      fetchValues(from, to);
    }
  }, [range, customFrom, customTo, fetchValues, metric.type]);

  // ── Edit dialog ───────────────────────────────────────────────────────────────

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const openEdit = () => {
    setEditName(name);
    setEditDescription(description ?? "");
    setEditUnit(unit ?? "");
    setEditError("");
    setEditOpen(true);
  };

  const handleEdit = async () => {
    setEditing(true);
    setEditError("");
    try {
      const res = await fetch("/api/metrics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: metric.id,
          name: editName.trim() || undefined,
          description: editDescription.trim() || undefined,
          unit: editUnit.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error ?? "Failed to update.");
        return;
      }
      setDisplayName(data.name);
      setDisplayDescription(data.description ?? null);
      setDisplayUnit(data.unit ?? null);
      setEditOpen(false);
    } finally {
      setEditing(false);
    }
  };

  // ── Delete dialog ─────────────────────────────────────────────────────────────

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/metrics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metricId: metric.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error ?? "Failed to delete.");
        return;
      }
      window.location.href = `/dashboard/${projectId}/metrics`;
    } finally {
      setDeleting(false);
    }
  };

  // ── Derived chart data ────────────────────────────────────────────────────────

  const { from: rangeFrom, to: rangeTo } = getRangeDates(range, customFrom, customTo);
  const granularity = getBucketGranularity(rangeFrom, rangeTo);

  const isBarChart = metric.chartType === "bar";
  const timeseriesData = isBarChart
    ? bucketValues(values, granularity, "avg")
    : values.map((v) => ({ label: format(v.timestamp, "MM/dd HH:mm"), value: v.value }));

  const stats =
    values.length > 0
      ? (() => {
          const nums = values.map((v) => v.value);
          return {
            min: Math.min(...nums),
            max: Math.max(...nums),
            avg: nums.reduce((a, b) => a + b, 0) / nums.length,
            count: nums.length,
          };
        })()
      : null;

  const counterRates = (() => {
    if (metric.type !== "counter" || metric.currentValue === null) return null;
    const hoursElapsed = Math.max(1, differenceInHours(new Date(), metric.createdAt));
    const perHour = metric.currentValue / hoursElapsed;
    return {
      perHour,
      perDay: perHour * 24,
      perWeek: perHour * 24 * 7,
    };
  })();

  const chartConfig = {
    value: {
      label: unit ?? "Value",
      theme: { light: "black", dark: "oklch(0.78 0 0)" },
    },
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 md:px-8 py-4 md:py-8 w-full max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <a
          href={`/dashboard/${projectId}/metrics`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeftIcon size={14} />
          Metrics
        </a>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold truncate">{name}</h1>
              <TypeBadge type={metric.type as MetricType} />
            </div>
            {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={openEdit}>
              <PencilIcon size={14} className="mr-1.5" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteConfirm("");
                setDeleteError("");
                setDeleteOpen(true);
              }}
              className="text-destructive hover:text-destructive"
            >
              <Trash2Icon size={14} className="mr-1.5" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* GAUGE */}
      {metric.type === "gauge" && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-5xl font-bold tabular-nums">
              {formatValue(metric.currentValue, unit)}
            </p>
            {metric.lastUpdatedAt ? (
              <p className="text-sm text-muted-foreground mt-2">
                Last updated {formatDistanceToNow(metric.lastUpdatedAt, { addSuffix: true })}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No data yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* COUNTER */}
      {metric.type === "counter" && (
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-5xl font-bold tabular-nums">
                {formatValue(metric.currentValue, unit)}
              </p>
              {counterRates && (
                <div className="flex flex-wrap gap-x-6 gap-y-1 mt-4 text-sm text-muted-foreground">
                  <span>{formatValue(counterRates.perHour, null)} / hr</span>
                  <span>{formatValue(counterRates.perDay, null)} / day</span>
                  <span>{formatValue(counterRates.perWeek, null)} / week</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TIMESERIES */}

      {metric.type === "timeseries" && (
        <div className="flex flex-col gap-4">
          <RangeSelector
            range={range}
            customFrom={customFrom}
            customTo={customTo}
            onChange={setRange}
            onCustomChange={(f, t) => {
              setCustomFrom(f);
              setCustomTo(t);
            }}
          />
          <Card>
            <CardContent className="pt-4">
              {loadingValues ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : values.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  No data in this range
                </div>
              ) : isBarChart ? (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <BarChart data={timeseriesData} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="var(--color-value)" radius={2} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <ChartContainer config={chartConfig} className="h-64 w-full">
                  <AreaChart
                    data={timeseriesData}
                    margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                  >
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <defs>
                      <linearGradient id="tsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area
                      dataKey="value"
                      stroke="var(--color-value)"
                      fill="url(#tsGrad)"
                      strokeWidth={1.5}
                      dot={false}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(
                [
                  { label: "Min", value: formatValue(stats.min, unit) },
                  { label: "Max", value: formatValue(stats.max, unit) },
                  { label: "Avg", value: formatValue(stats.avg, unit) },
                  { label: "Count", value: stats.count.toLocaleString() },
                ] as const
              ).map(({ label, value }) => (
                <Card key={label}>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-semibold tabular-nums mt-0.5">{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          if (!open) setEditOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit metric</DialogTitle>
            <DialogDescription>Type cannot be changed after creation.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-desc">
                Description <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-unit">
                Unit <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="edit-unit"
                value={editUnit}
                placeholder="e.g. ms, GB, %"
                onChange={(e) => setEditUnit(e.target.value)}
              />
            </div>
            {editError && <p className="text-sm text-destructive">{editError}</p>}
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!editName.trim() || editing} onClick={handleEdit}>
                {editing ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open) setDeleteOpen(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete metric</DialogTitle>
            <DialogDescription>
              This permanently deletes <span className="font-bold">{name}</span> and all its
              recorded values. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Label>Type the metric name to confirm</Label>
            <Input
              placeholder={name}
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
            />
            {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
            <div className="flex gap-2 justify-end mt-1">
              <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirm !== name || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
