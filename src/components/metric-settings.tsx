import type { MetricType, ChartType, MetricWithValue } from "@/lib/beaver/metric";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { PencilIcon, Trash2Icon, PlusIcon } from "lucide-react";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

const TYPE_LABELS: Record<MetricType, string> = {
  gauge: "Gauge",
  counter: "Counter",
  timeseries: "Timeseries",
};

const TYPE_COLORS: Record<MetricType, string> = {
  gauge: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  counter: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  timeseries: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
};

function TypeBadge({ type }: { type: MetricType }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${TYPE_COLORS[type]}`}>
      {TYPE_LABELS[type]}
    </span>
  );
}

const METRIC_TYPES: { value: MetricType; label: string; description: string }[] = [
  { value: "gauge", label: "Gauge", description: "A single current value, overwritten on each update." },
  { value: "counter", label: "Counter", description: "A running total that increments or decrements." },
  { value: "timeseries", label: "Timeseries", description: "Append-only series of values over time." },
];

export default function MetricSettings({
  metrics: initialMetrics,
  projectId,
}: {
  metrics: MetricWithValue[];
  projectId: number;
}) {
  const [clientMetrics, setMetrics] = useState<MetricWithValue[]>(initialMetrics);

  // Create state
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createUnit, setCreateUnit] = useState("");
  const [createType, setCreateType] = useState<MetricType>("gauge");
  const [createChartType, setCreateChartType] = useState<ChartType>("line");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const createNameTaken = clientMetrics.some(
    (m) => m.name === createName.trim(),
  );

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const res = await fetch("/api/metrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name: createName.trim(),
          description: createDescription.trim() || undefined,
          unit: createUnit.trim() || undefined,
          type: createType,
          chartType: createType === "timeseries" ? createChartType : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create metric.");
        return;
      }
      setMetrics((prev) => [...prev, { ...data, currentValue: null, lastUpdatedAt: null }]);
      setCreateOpen(false);
      resetCreateForm();
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateName("");
    setCreateDescription("");
    setCreateUnit("");
    setCreateType("gauge");
    setCreateChartType("line");
    setCreateError("");
  };

  // Edit state
  const [editTarget, setEditTarget] = useState<MetricWithValue | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState("");

  const editNameChanged = editTarget !== null && editName.trim() !== editTarget.name;
  const editNameTaken =
    editNameChanged &&
    clientMetrics.some((m) => m.id !== editTarget!.id && m.name === editName.trim());
  const [editNameWarningAcked, setEditNameWarningAcked] = useState(false);

  const handleEdit = async () => {
    if (!editTarget) return;
    setEditing(true);
    setEditError("");
    try {
      const res = await fetch("/api/metrics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricId: editTarget.id,
          name: editName.trim() || undefined,
          description: editDescription.trim() || undefined,
          unit: editUnit.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Failed to update metric.");
        return;
      }
      setMetrics((prev) =>
        prev.map((m) =>
          m.id === editTarget.id
            ? { ...m, name: data.name, description: data.description, unit: data.unit }
            : m,
        ),
      );
      setEditTarget(null);
    } finally {
      setEditing(false);
    }
  };

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<MetricWithValue | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/metrics", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metricId: deleteTarget.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete metric.");
        return;
      }
      setMetrics((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
      setDeleteConfirmName("");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center justify-between">
        <h2 className="font-mono">Metrics</h2>
        <Button size="sm" onClick={() => { resetCreateForm(); setCreateOpen(true); }}>
          <PlusIcon size={14} className="mr-1.5" />
          New metric
        </Button>
      </div>

      {clientMetrics.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          No metrics yet. Create one to start tracking quantitative data.
        </p>
      )}

      {clientMetrics.map((metric) => (
        <div
          key={metric.id}
          className="rounded border p-3 md:p-4 mt-4 flex justify-between items-center gap-2"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <h3 className="font-medium text-lg">{metric.name}</h3>
              <TypeBadge type={metric.type as MetricType} />
              {metric.unit && (
                <span className="text-xs text-muted-foreground">{metric.unit}</span>
              )}
            </div>
            {metric.description && (
              <p className="font-light text-xs truncate text-muted-foreground mt-0.5">
                {metric.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setEditTarget(metric);
                    setEditName(metric.name);
                    setEditDescription(metric.description ?? "");
                    setEditUnit(metric.unit ?? "");
                    setEditError("");
                    setEditNameWarningAcked(false);
                  }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  <PencilIcon size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Edit metric</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setDeleteTarget(metric);
                    setDeleteConfirmName("");
                    setDeleteError("");
                  }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2Icon size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete metric</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) { setCreateOpen(false); setCreateError(""); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New metric</DialogTitle>
            <DialogDescription>
              Create a metric to track quantitative data via the API.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-1 overflow-y-auto max-h-[65dvh] pr-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createName}
                placeholder="e.g. active-users"
                onChange={(e) => setCreateName(e.target.value.toLowerCase().replace(/\s+/g, "-"))}
              />
              {createNameTaken && (
                <p className="text-xs text-destructive">
                  A metric with this name already exists.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="create-description"
                value={createDescription}
                placeholder="What does this metric track?"
                onChange={(e) => setCreateDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="create-unit">Unit <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="create-unit"
                value={createUnit}
                placeholder="e.g. ms, GB, %"
                onChange={(e) => setCreateUnit(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>Type</Label>
              <RadioGroup value={createType} onValueChange={(v) => setCreateType(v as MetricType)}>
                {METRIC_TYPES.map(({ value, label, description }) => (
                  <label key={value} className="flex items-start gap-3 cursor-pointer rounded border p-3 hover:bg-muted transition-colors">
                    <RadioGroupItem value={value} id={`type-${value}`} className="mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">{label}</p>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {createType === "timeseries" && (
              <div className="flex flex-col gap-2">
                <Label>Chart type</Label>
                <RadioGroup value={createChartType} onValueChange={(v) => setCreateChartType(v as ChartType)} className="flex gap-4">
                  {(["line", "bar"] as ChartType[]).map((ct) => (
                    <label key={ct} className="flex items-center gap-2 cursor-pointer text-sm">
                      <RadioGroupItem value={ct} id={`chart-${ct}`} />
                      {ct.charAt(0).toUpperCase() + ct.slice(1)}
                    </label>
                  ))}
                </RadioGroup>
              </div>
            )}

            {createError && (
              <p className="text-sm text-destructive">{createError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={!createName.trim() || createNameTaken || creating}
                onClick={handleCreate}
              >
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) { setEditTarget(null); setEditError(""); }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit metric</DialogTitle>
            <DialogDescription>
              Update <span className="font-bold">{editTarget?.name}</span>.
              Type cannot be changed after creation.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-1">
            {editTarget && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Type</span>
                <TypeBadge type={editTarget.type as MetricType} />
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value.toLowerCase().replace(/\s+/g, "-"));
                  setEditNameWarningAcked(false);
                }}
              />
              {editNameTaken && (
                <p className="text-xs text-destructive">
                  A metric with this name already exists.
                </p>
              )}
              {editNameChanged && !editNameTaken && (
                <label className="flex items-start gap-2 cursor-pointer mt-1">
                  <input
                    type="checkbox"
                    checked={editNameWarningAcked}
                    onChange={(e) => setEditNameWarningAcked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <span className="text-xs text-amber-600">
                    I understand that changing the metric name will break existing integrations that use this name in the API.
                  </span>
                </label>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-description">Description <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="edit-description"
                value={editDescription}
                placeholder="Optional description"
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-unit">Unit <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="edit-unit"
                value={editUnit}
                placeholder="e.g. ms, GB, %"
                onChange={(e) => setEditUnit(e.target.value)}
              />
            </div>

            {editError && (
              <p className="text-sm text-destructive">{editError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
              <Button
                disabled={!editName.trim() || editNameTaken || (editNameChanged && !editNameWarningAcked) || editing}
                onClick={handleEdit}
              >
                {editing ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteConfirmName("");
            setDeleteError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete metric</DialogTitle>
            <DialogDescription>
              This will permanently delete{" "}
              <span className="font-bold">{deleteTarget?.name}</span> and all
              its recorded values. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            <Label>Type the metric name to confirm</Label>
            <Input
              placeholder={deleteTarget?.name}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
            />
            {deleteError && (
              <p className="text-sm text-destructive">{deleteError}</p>
            )}
            <div className="flex gap-2 justify-end mt-1">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={deleteConfirmName !== deleteTarget?.name || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
