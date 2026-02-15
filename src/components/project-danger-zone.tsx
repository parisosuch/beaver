import type { Project } from "@/lib/beaver/project";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export default function ProjectDangerZone({ project }: { project: Project }) {
  const [projectName, setProjectName] = useState("");
  const [error, setError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setError("");
    setIsDeleting(true);

    try {
      const res = await fetch("/api/project", {
        method: "DELETE",
        body: JSON.stringify({ projectID: project.id }),
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to delete project.");
        setIsDeleting(false);
        return;
      }

      const latest = data.projects.sort(
        (a: Project, b: Project) =>
          new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
      )[0];

      window.location.href = `/dashboard/${latest.id}/feed`;
    } catch {
      setError("An unexpected error occurred.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      {error && (
        <p className="text-sm text-rose-500">{error}</p>
      )}
      <div className="flex flex-col md:flex-row md:items-end gap-2">
        <div className="flex flex-col w-full md:w-4/5">
          <Label>Enter project name to delete</Label>
          <Input
            className="mt-2"
            placeholder={project.name}
            onChange={(e) => setProjectName(e.target.value)}
            value={projectName}
          />
        </div>
        <Button
          className="bg-rose-500 hover:bg-rose-400 hover:cursor-pointer w-full md:w-1/5"
          disabled={projectName !== project.name || isDeleting}
          onClick={handleDelete}
        >
          {isDeleting ? "Deleting..." : "Delete project"}
        </Button>
      </div>
    </div>
  );
}
