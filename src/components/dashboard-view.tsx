import type { Project } from "@/lib/beaver/project";
import { PlusIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useEffect, useState } from "react";
import type { Channel } from "@/lib/beaver/channel";
import { Button } from "./ui/button";

export default function DashboardView({ projects }: { projects: Project[] }) {
  const [channels, setChannels] = useState<Channel[]>([]);

  const getChannels = async () => {
    const res = await fetch("/api/project/channels", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ project_id: projects[0].id }),
    });

    const data = await res.json();

    return data as Channel[];
  };

  useEffect(() => {
    getChannels().then((res) => {
      setChannels(res);
    });
  }, []);

  return (
    <div className="w-full flex flex-row">
      <div className="w-[250px] border-r h-screen p-8">
        <Select defaultValue={projects[0].name}>
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder="Project"
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
          <div>
            {channels.map((channel) => (
              <p>{channel.name}</p>
            ))}
          </div>
        </div>
      </div>
      <div className="p-8 w-full flex flex-col items-center justify-center">
        {channels.length === 0 ? (
          <div className="flex flex-col items-center space-y-8">
            <h1 className="text-2xl font-mono text-black/50">
              Looks like this project has no channels.
            </h1>
            <Button variant="secondary">
              Create a channel <PlusIcon />
            </Button>
          </div>
        ) : (
          <div>Channel view</div>
        )}
      </div>
    </div>
  );
}
