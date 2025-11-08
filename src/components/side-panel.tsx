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
  const [pathname, setPathname] = useState(
    typeof window !== "undefined" ? window.location.pathname : ""
  );

  useEffect(() => {
    // Update pathname on navigation (for View Transitions)
    const handleNavigation = () => {
      setPathname(window.location.pathname);
    };

    // Listen for both popstate (back/forward) and astro page loads
    window.addEventListener("popstate", handleNavigation);
    document.addEventListener("astro:page-load", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      document.removeEventListener("astro:page-load", handleNavigation);
    };
  }, []);

  // Helper to check if feed is active
  const isFeedActive = () => pathname === `/dashboard/${project.id}/feed`;

  // Helper to check if a channel is active
  const isChannelActive = (channelId: number) =>
    pathname === `/dashboard/${project.id}/channels/${channelId}`;

  return (
    <div className="w-[350px] bg-blue-100 p-4">
      <div className="mb-6">
        <h1 className="font-bold mb-2">Projects</h1>
        {projects.map((p) => (
          <p key={p.id}>{p.name}</p>
        ))}
      </div>

      <div className="mb-6">
        <h1 className="font-bold mb-2">Navigation</h1>
        <a
          href={`/dashboard/${project.id}/feed`}
          className={`block px-3 py-2 rounded ${
            isFeedActive() ? "bg-blue-200 font-semibold" : "hover:bg-blue-50"
          }`}
        >
          Feed
        </a>
      </div>

      <div className="space-y-2 flex flex-col">
        <h1 className="font-bold mb-2">Channels</h1>
        {channels.map((channel) => (
          <a
            key={channel.id}
            href={`/dashboard/${project.id}/channels/${channel.id}`}
            className={`block px-3 py-2 rounded ${
              isChannelActive(channel.id)
                ? "bg-blue-200 font-semibold"
                : "hover:bg-blue-50"
            }`}
          >
            # {channel.name}
          </a>
        ))}
      </div>
    </div>
  );
}

export default SidePanel;
