import type { Project } from "@/lib/beaver/project";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function ProjectRename({ project }: { project: Project }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === project.name) {
      setEditing(false);
      setName(project.name);
      return;
    }

    setError("");
    setIsSaving(true);

    try {
      const res = await fetch("/api/project", {
        method: "PATCH",
        body: JSON.stringify({ projectID: project.id, name: trimmed }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to rename project.");
        setIsSaving(false);
        return;
      }

      window.location.reload();
    } catch {
      setError("An unexpected error occurred.");
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setName(project.name);
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
            className="h-8 w-48"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            disabled={isSaving}
          />
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !name.trim()}
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
    <div className="flex items-center gap-2">
      <p>{project.name}</p>
      <button
        onClick={() => setEditing(true)}
        className="hover:cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}
