import type { Project } from "@/lib/beaver/project";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { PlusIcon } from "lucide-react";

export default function DashboardView({ projects }: { projects: Project[] }) {
  return (
    <div className="w-full flex flex-row">
      <div className="w-[250px] border-r h-screen p-8">
        <Select>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder="Project"
              defaultChecked
              defaultValue={projects[0].name}
            />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem value={project.name}>{project.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div>
          <div className="flex space-x-2 w-full justify-between mt-4">
            <h1 className="font-mono">Channels</h1>
            <PlusIcon size={24} />
          </div>
          <div></div>
        </div>
      </div>
      <div className="p-8">Main content</div>
    </div>
  );
}
