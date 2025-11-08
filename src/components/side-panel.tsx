import type { Channel } from "@/lib/beaver/channel";
import type { Project } from "@/lib/beaver/project";
import { useEffect, useState } from "react";

function SidePanel({
  currentProject,
  currentProjects,
  currentChannels,
}: {
  currentProject: Project;
  currentProjects: Project[];
  currentChannels: Channel[];
}) {
  const [project, setProject] = useState(currentProject);

  const [projects, setProjects] = useState<Project[]>(currentProjects);
  const [channels, setChannels] = useState<Channel[]>(currentChannels);

  const getChannels = async () => {
    const res = await fetch(`/api/channel?project_id=${project.id}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();

    return data as Channel[];
  };

  useEffect(() => {}, []);

  return (
    <div className="w-[350px] bg-blue-100">
      <div>
        <h1 className="font-bold">Projects</h1>
        {projects.map((p) => (
          <p key={p.id}>{p.name}</p>
        ))}
      </div>
      <div></div>
      <div className="space-y-2 flex flex-col">
        <h1 className="font-bold mb-2">Channels</h1>
        {channels.map((channel) => (
          <a
            key={channel.id}
            href={`/dashboard/${currentProject.id}/channels/${channel.id}`}
          >
            {channel.name}
          </a>
        ))}
      </div>
    </div>
  );
}

export default SidePanel;
