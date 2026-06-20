import type { Channel } from "@/lib/beaver/channel";
import type { AlertRuleWithChannel } from "@/lib/beaver/alert-rule";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Label } from "./ui/label";
import { Trash2Icon, PlusIcon, BellRingIcon } from "lucide-react";
import { useState } from "react";

const EVENT_NAME_REGEX = /^[a-z][a-z_]*\.[a-z][a-z_]*$/;

function sanitizeEventName(value: string): string {
  return value.toLowerCase().replace(/[^a-z._]/g, "");
}

export default function AlertSettings({
  channels,
  initialRules,
}: {
  channels: Channel[];
  initialRules: AlertRuleWithChannel[];
}) {
  const [rules, setRules] = useState<AlertRuleWithChannel[]>(initialRules);

  // Create state
  const [createOpen, setCreateOpen] = useState(false);
  const [createChannelId, setCreateChannelId] = useState<string>(
    channels[0] ? String(channels[0].id) : "",
  );
  const [createName, setCreateName] = useState("");
  const [createEventName, setCreateEventName] = useState("");
  const [createThreshold, setCreateThreshold] = useState("5");
  const [createWindowMinutes, setCreateWindowMinutes] = useState("10");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const eventNameValid = EVENT_NAME_REGEX.test(createEventName);

  const resetCreateForm = () => {
    setCreateChannelId(channels[0] ? String(channels[0].id) : "");
    setCreateName("");
    setCreateEventName("");
    setCreateThreshold("5");
    setCreateWindowMinutes("10");
    setCreateError("");
  };

  const handleCreate = async () => {
    setCreating(true);
    setCreateError("");
    try {
      const [eventObject, eventAction] = createEventName.split(".");
      const res = await fetch("/api/alert-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: parseInt(createChannelId),
          name: createName.trim(),
          eventObject,
          eventAction,
          threshold: parseInt(createThreshold),
          windowMinutes: parseInt(createWindowMinutes),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create alert rule.");
        return;
      }
      const channelName = channels.find((c) => c.id === data.channelId)?.name ?? "";
      setRules((prev) => [...prev, { ...data, channelName }]);
      setCreateOpen(false);
      resetCreateForm();
    } finally {
      setCreating(false);
    }
  };

  const toggleEnabled = async (rule: AlertRuleWithChannel) => {
    const next = !rule.enabled;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: next } : r)));
    await fetch("/api/alert-rules", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rule.id, enabled: next }),
    });
  };

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<AlertRuleWithChannel | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await fetch("/api/alert-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      setRules((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="font-mono">Alerts</h2>
        <Button
          size="sm"
          disabled={channels.length === 0}
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
        >
          <PlusIcon size={14} className="mr-1.5" />
          New alert
        </Button>
      </div>

      {channels.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          Create a channel first to start setting up alerts.
        </p>
      )}

      {channels.length > 0 && rules.length === 0 && (
        <p className="text-sm text-muted-foreground mt-4">
          No alerts yet. Get notified when an event type crosses a threshold within a time window.
        </p>
      )}

      {rules.map((rule) => (
        <div
          key={rule.id}
          className="rounded border p-3 md:p-4 mt-4 flex justify-between items-center gap-2"
        >
          <div className="min-w-0 flex items-start gap-3">
            <BellRingIcon size={16} className="mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h3 className="font-medium">{rule.name}</h3>
                <span className="text-xs text-muted-foreground"># {rule.channelName}</span>
              </div>
              <p className="font-light text-xs text-muted-foreground mt-0.5 font-mono">
                {rule.eventObject}.{rule.eventAction} &ge; {rule.threshold} in {rule.windowMinutes}m
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant={rule.enabled ? "default" : "outline"}
              size="sm"
              onClick={() => toggleEnabled(rule)}
            >
              {rule.enabled ? "Enabled" : "Disabled"}
            </Button>
            <button
              onClick={() => setDeleteTarget(rule)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2Icon size={15} />
            </button>
          </div>
        </div>
      ))}

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setCreateError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New alert</DialogTitle>
            <DialogDescription>
              Fire an email alert when an event type crosses a threshold within a time window.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alert-channel">Channel</Label>
              <Select value={createChannelId} onValueChange={setCreateChannelId}>
                <SelectTrigger id="alert-channel" className="w-full">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={String(channel.id)}>
                      # {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alert-name">Name</Label>
              <Input
                id="alert-name"
                value={createName}
                placeholder="e.g. High payment failures"
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="alert-event-name">Event name</Label>
              <Input
                id="alert-event-name"
                value={createEventName}
                placeholder="e.g. payment.failed"
                className="font-mono"
                onChange={(e) => setCreateEventName(sanitizeEventName(e.target.value))}
              />
              {createEventName !== "" && !eventNameValid && (
                <p className="text-xs text-destructive">
                  Must follow the object.action convention (e.g. payment.failed).
                </p>
              )}
            </div>

            <div className="flex gap-4">
              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="alert-threshold">Threshold</Label>
                <Input
                  id="alert-threshold"
                  type="number"
                  min={1}
                  value={createThreshold}
                  onChange={(e) => setCreateThreshold(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <Label htmlFor="alert-window">Window (minutes)</Label>
                <Input
                  id="alert-window"
                  type="number"
                  min={1}
                  value={createWindowMinutes}
                  onChange={(e) => setCreateWindowMinutes(e.target.value)}
                />
              </div>
            </div>

            {createError && <p className="text-sm text-destructive">{createError}</p>}

            <div className="flex gap-2 justify-end">
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                disabled={
                  !createChannelId ||
                  !createName.trim() ||
                  !eventNameValid ||
                  !createThreshold ||
                  !createWindowMinutes ||
                  creating
                }
                onClick={handleCreate}
              >
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete alert</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-bold">{deleteTarget?.name}</span>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end mt-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
