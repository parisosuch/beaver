import type { Project } from "@/lib/beaver/project";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

export default function RateLimitSettings({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.rateLimitPerMinute?.toString() ?? "");
  const [savedLimit, setSavedLimit] = useState(project.rateLimitPerMinute);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : parseInt(trimmed, 10);

    if (parsed !== null && (!Number.isInteger(parsed) || parsed <= 0)) {
      setError("Enter a positive whole number, or leave blank for unlimited.");
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/project", {
        method: "PATCH",
        body: JSON.stringify({ projectID: project.id, rateLimitPerMinute: parsed }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update rate limit.");
        return;
      }

      setSavedLimit(parsed);
      setEditing(false);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setValue(savedLimit?.toString() ?? "");
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  };

  if (editing) {
    return (
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            step={1}
            className="h-8 w-32"
            placeholder="Unlimited"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            disabled={isSaving}
          />
          <p className="text-sm text-muted-foreground shrink-0">requests / min</p>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving}
            className="hover:cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            className="hover:cursor-pointer"
          >
            Cancel
          </Button>
        </div>
        {error && <p className="text-xs text-rose-500">{error}</p>}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2">
        <p>{savedLimit ? `${savedLimit} requests / min` : "Unlimited"}</p>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setEditing(true)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <Pencil size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Edit rate limit</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
