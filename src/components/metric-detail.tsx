import { useState, useEffect, useCallback, useRef, useId } from "react";
import type { MetricWithValue, MetricType, MetricValue } from "@/lib/beaver/metric";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { DatePicker } from "./ui/date-picker";
import { ArrowLeftIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { formatDistanceToNow, format, subDays, startOfDay, differenceInHours } from "date-fns";

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

// ── Hand-rolled SVG chart (replaces recharts) ─────────────────────────────────

function niceYTicks(min: number, max: number, count = 5): number[] {
  if (min === max) return [min];
  const range = max - min;
  const step = range / (count - 1);
  const mag = Math.pow(10, Math.floor(Math.log10(step)));
  const niceStep = ([1, 2, 5, 10].find((s) => s * mag >= step) ?? 10) * mag;
  const lo = Math.floor(min / niceStep) * niceStep;
  const hi = Math.ceil(max / niceStep) * niceStep;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + niceStep * 0.01; t = Math.round((t + niceStep) * 1e9) / 1e9) {
    ticks.push(t);
  }
  return ticks;
}

function fmtTick(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(1)}k`;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function SimpleChart({
  data,
  isBar,
  unit,
}: {
  data: { label: string; value: number }[];
  isBar: boolean;
  unit?: string | null;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gradId = useId();

  const VW = 600,
    VH = 256,
    PL = 48,
    PR = 8,
    PT = 8,
    PB = 32;
  const CW = VW - PL - PR,
    CH = VH - PT - PB;

  const values = data.map((d) => d.value);
  const yTicks = values.length ? niceYTicks(Math.min(...values), Math.max(...values)) : [0];
  const yMin = yTicks[0],
    yMax = yTicks[yTicks.length - 1];
  const yRange = yMax - yMin || 1;

  const toY = (v: number) => PT + CH - ((v - yMin) / yRange) * CH;
  // Line/area: edge-to-edge so the path fills the full chart width.
  const toLineX = (i: number) => PL + (data.length <= 1 ? CW / 2 : (i / (data.length - 1)) * CW);
  // Bars: slot-based so every bar fits fully within [PL, PL+CW].
  const slotW = CW / Math.max(data.length, 1);
  const toBarX = (i: number) => PL + (i + 0.5) * slotW;
  const toX = isBar ? toBarX : toLineX;

  const xStep = Math.max(1, Math.ceil(data.length / 6));

  const pts = data.map((d, i) => ({ x: toLineX(i), y: toY(d.value) }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
  const areaPath = pts.length
    ? `${linePath} L${(PL + CW).toFixed(1)},${(PT + CH).toFixed(1)} L${PL},${(PT + CH).toFixed(1)} Z`
    : "";

  const barGap = Math.max(2, slotW * 0.2);
  const barW = Math.max(2, slotW - barGap);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !data.length) return;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * VW;
    const idx = data.reduce(
      (best, _, i) => (Math.abs(toX(i) - svgX) < Math.abs(toX(best) - svgX) ? i : best),
      0,
    );
    setHovered(idx);
  };

  const tip = hovered !== null ? data[hovered] : null;
  const tipX = hovered !== null ? toX(hovered) : 0;
  const tipY = hovered !== null ? toY(data[hovered].value) : 0;
  const tipLeft = tipX > VW / 2;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VW} ${VH}`}
      width="100%"
      height="100%"
      className="text-foreground"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHovered(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
          <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Grid lines — behind data */}
      {yTicks.map((t) => (
        <line
          key={t}
          x1={PL}
          y1={toY(t)}
          x2={PL + CW}
          y2={toY(t)}
          stroke="currentColor"
          strokeOpacity={0.1}
        />
      ))}

      {/* Data — behind labels */}
      {isBar ? (
        data.map((d, i) => {
          const y = toY(d.value);
          return (
            <rect
              key={i}
              x={toBarX(i) - barW / 2}
              y={y}
              width={barW}
              height={Math.max(0, PT + CH - y)}
              rx={2}
              fill="currentColor"
            />
          );
        })
      ) : (
        <>
          <path d={areaPath} fill={`url(#${gradId})`} />
          <path d={linePath} fill="none" stroke="currentColor" strokeWidth={1.5} />
        </>
      )}

      {/* Axis labels — on top of data */}
      {yTicks.map((t) => (
        <text
          key={t}
          x={PL - 6}
          y={toY(t)}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={11}
          fill="currentColor"
          fillOpacity={0.5}
        >
          {fmtTick(t)}
        </text>
      ))}

      {data.map((d, i) => {
        if (i !== 0 && i !== data.length - 1 && i % xStep !== 0) return null;
        return (
          <text
            key={i}
            x={toX(i)}
            y={VH - 8}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
            fillOpacity={0.5}
          >
            {d.label}
          </text>
        );
      })}

      {tip && (
        <g>
          <line
            x1={tipX}
            y1={PT}
            x2={tipX}
            y2={PT + CH}
            stroke="currentColor"
            strokeOpacity={0.2}
            strokeDasharray="3 3"
          />
          <circle cx={tipX} cy={tipY} r={3.5} fill="currentColor" />
          <rect
            x={tipLeft ? tipX - 136 : tipX + 8}
            y={Math.max(PT + 2, tipY - 26)}
            width={128}
            height={48}
            rx={4}
            fill="var(--background)"
            stroke="currentColor"
            strokeOpacity={0.15}
          />
          <text
            x={tipLeft ? tipX - 72 : tipX + 72}
            y={Math.max(PT + 16, tipY - 12)}
            textAnchor="middle"
            fontSize={11}
            fill="currentColor"
            fillOpacity={0.55}
          >
            {tip.label}
          </text>
          <text
            x={tipLeft ? tipX - 72 : tipX + 72}
            y={Math.max(PT + 34, tipY + 6)}
            textAnchor="middle"
            fontSize={13}
            fontWeight="600"
            fill="currentColor"
          >
            {formatValue(tip.value, unit)}
          </text>
        </g>
      )}
    </svg>
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

  const isBarChart = metric.chartType === "bar";
  // Every posted value is its own point/bar (#248): no day-bucketing, so dozens
  // of same-day instances stay visible instead of collapsing into one.
  const timeseriesData = values.map((v) => ({
    label: format(v.timestamp, "MM/dd HH:mm"),
    value: v.value,
  }));

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
              ) : (
                <div className="h-64 w-full">
                  <SimpleChart data={timeseriesData} isBar={isBarChart} unit={unit} />
                </div>
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
