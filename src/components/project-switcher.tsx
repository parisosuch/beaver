import type { Project } from "@/lib/beaver/project";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

export default function ProjectSwitcher({
  projects,
  currentProjectId,
  canCreate,
  onNavigate,
}: {
  projects: Project[];
  currentProjectId: number;
  canCreate: boolean;
  onNavigate?: () => void;
}) {
  const [list] = useState(projects);

  return (
    <div>
      <div className="flex space-x-2 w-full items-center justify-between mt-4">
        <h1 className="text-sm font-mono">Project</h1>
        {canCreate && (
          <a href="/dashboard/create-project">
            <PlusIcon size={20} className="hover:cursor-pointer hover:text-black/50" />
          </a>
        )}
      </div>
      <Select
        defaultValue={String(currentProjectId)}
        onValueChange={(value) => {
          const p = list.find((p) => String(p.id) === value);
          if (p) {
            window.location.href = `/dashboard/${p.id}/feed`;
            onNavigate?.();
          }
        }}
      >
        <SelectTrigger className="w-full mt-2">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          {list.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
