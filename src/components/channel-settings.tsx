import type { Channel } from "@/lib/beaver/channel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { GitMergeIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "./ui/label";
import type { Project } from "@/lib/beaver/project";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export default function ChannelSettings({
  channels,
  project,
}: {
  channels: Channel[];
  project: Project;
}) {
  const [clientChannels, setChannels] = useState<Channel[]>(channels);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Channel | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Merge state
  const [mergeSource, setMergeSource] = useState<Channel | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string>("");
  const [nameChoice, setNameChoice] = useState<"source" | "target" | "custom">("target");
  const [customName, setCustomName] = useState("");
  const [merging, setMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");

  const mergeTarget = clientChannels.find((c) => c.id === parseInt(mergeTargetId));

  const survivingName =
    nameChoice === "source"
      ? mergeSource?.name ?? ""
      : nameChoice === "target"
        ? mergeTarget?.name ?? ""
        : customName.trim();

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/channel", {
        method: "DELETE",
        body: JSON.stringify({ channelID: deleteTarget.id }),
      });
      const data = await res.json();
      if (res.status !== 200) {
        setDeleteError(data.error);
        return;
      }
      setChannels((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      window.dispatchEvent(
        new CustomEvent("channel:deleted", { detail: { id: deleteTarget.id } }),
      );
      setDeleteTarget(null);
      setDeleteConfirmName("");
    } finally {
      setDeleting(false);
    }
  };

  const handleMergeConfirm = async () => {
    if (!mergeSource || !mergeTarget || !survivingName) return;
    setMerging(true);
    setMergeError("");
    try {
      const res = await fetch("/api/channel/coalesce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceId: mergeSource.id,
          targetId: mergeTarget.id,
          survivingName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMergeError(data.error || "Failed to merge channels.");
        return;
      }
      // Remove source, update target name
      setChannels((prev) =>
        prev
          .filter((c) => c.id !== mergeSource.id)
          .map((c) => (c.id === mergeTarget.id ? { ...c, name: data.name } : c)),
      );
      window.dispatchEvent(
        new CustomEvent("channel:deleted", { detail: { id: mergeSource.id } }),
      );
      setMergeSource(null);
      setMergeTargetId("");
      setNameChoice("target");
      setCustomName("");
    } finally {
      setMerging(false);
    }
  };

  useEffect(() => {
    const handleChannelCreated = (e: CustomEvent<{ channel: Channel }>) => {
      setChannels((prev) => [...prev, e.detail.channel]);
    };
    window.addEventListener("channel:created", handleChannelCreated as EventListener);
    return () => {
      window.removeEventListener("channel:created", handleChannelCreated as EventListener);
    };
  }, []);

  // Reset merge target name choice when target changes
  useEffect(() => {
    setNameChoice("target");
    setCustomName("");
  }, [mergeTargetId]);

  return (
    <TooltipProvider delayDuration={300}>
      {clientChannels.map((channel) => (
        <div
          key={channel.id}
          className="rounded border p-3 md:p-4 mt-4 flex justify-between items-center gap-2"
        >
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
              <a
                href={`/dashboard/${project.id}/channels/${channel.id}`}
                className="hover:text-black/50 truncate"
              >
                <h3 className="font-medium text-lg"># {channel.name}</h3>
              </a>
              <p className="text-xs text-muted-foreground shrink-0">
                {channel.createdAt?.toLocaleDateString()}
              </p>
            </div>
            <p className="font-light text-xs truncate">{channel.description}</p>
          </div>
          <div className="flex items-center gap-1">
            {clientChannels.length > 1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => {
                      setMergeSource(channel);
                      setMergeTargetId("");
                      setNameChoice("target");
                      setCustomName("");
                      setMergeError("");
                    }}
                    className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <GitMergeIcon size={15} />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Merge channel</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => {
                    setDeleteTarget(channel);
                    setDeleteConfirmName("");
                    setDeleteError("");
                  }}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2Icon size={15} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Delete channel</TooltipContent>
            </Tooltip>
          </div>
        </div>
      ))}

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
            <DialogTitle>Delete channel</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-bold"># {deleteTarget?.name}</span>? This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}
          <Label>Confirm channel name</Label>
          <Input
            placeholder="Channel name"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
          />
          <div className="flex gap-2 justify-end mt-2">
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={deleteConfirmName !== deleteTarget?.name || deleting}
              onClick={handleDeleteConfirm}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Merge dialog */}
      <Dialog
        open={!!mergeSource}
        onOpenChange={(open) => {
          if (!open) {
            setMergeSource(null);
            setMergeTargetId("");
            setNameChoice("target");
            setCustomName("");
            setMergeError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge channel</DialogTitle>
            <DialogDescription>
              Merge{" "}
              <span className="font-bold"># {mergeSource?.name}</span> into
              another channel. All events will move to the surviving channel and{" "}
              <span className="font-bold"># {mergeSource?.name}</span> will be
              deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <Label>Merge into</Label>
              <Select value={mergeTargetId} onValueChange={setMergeTargetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a channel…" />
                </SelectTrigger>
                <SelectContent>
                  {clientChannels
                    .filter((c) => c.id !== mergeSource?.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        # {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {mergeTarget && (
              <div className="flex flex-col gap-2">
                <Label>Surviving name</Label>
                <div className="flex flex-col gap-2">
                  {(
                    [
                      { value: "target", label: `# ${mergeTarget.name}` },
                      { value: "source", label: `# ${mergeSource?.name}` },
                      { value: "custom", label: "Custom…" },
                    ] as const
                  ).map(({ value, label }) => (
                    <label
                      key={value}
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <input
                        type="radio"
                        name="nameChoice"
                        value={value}
                        checked={nameChoice === value}
                        onChange={() => setNameChoice(value)}
                        className="h-4 w-4"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {nameChoice === "custom" && (
                  <Input
                    placeholder="Channel name"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="mt-1"
                    autoFocus
                  />
                )}
              </div>
            )}

            {mergeError && (
              <p className="text-sm text-destructive">{mergeError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button
                variant="secondary"
                onClick={() => setMergeSource(null)}
              >
                Cancel
              </Button>
              <Button
                disabled={
                  !mergeTarget ||
                  !survivingName ||
                  (nameChoice === "custom" && !customName.trim()) ||
                  merging
                }
                onClick={handleMergeConfirm}
              >
                {merging ? "Merging…" : "Merge"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
