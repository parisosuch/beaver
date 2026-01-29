import type { Channel } from "@/lib/beaver/channel";
import type { Project } from "@/lib/beaver/project";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { InboxIcon, LogOutIcon, PlusIcon, Settings } from "lucide-react";
import { useAuth, UserProvider } from "../context/user-context";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

function SidePanelContent({
  currentProject,
  currentProjects,
  currentChannels,
  currentPath,
}: {
  currentProject: Project;
  currentProjects: Project[];
  currentChannels: Channel[];
  currentPath: string;
}) {
  const [project] = useState(currentProject);
  const [projects] = useState<Project[]>(currentProjects);
  const [channels, setChannels] = useState<Channel[]>(currentChannels);
  const [pathname, setPathname] = useState(currentPath);

  const { user, signOut } = useAuth();

  useEffect(() => {
    const handleNavigation = () => {
      setPathname(window.location.pathname);
    };

    const handleChannelDeleted = (e: CustomEvent<{ id: number }>) => {
      const { id } = e.detail;

      setChannels((prev) => prev.filter((c) => c.id !== id));
    };

    window.addEventListener("popstate", handleNavigation);
    document.addEventListener("astro:page-load", handleNavigation);

    // add custom even for channel deletion
    window.addEventListener(
      "channel:deleted",
      handleChannelDeleted as EventListener,
    );

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      document.removeEventListener("astro:page-load", handleNavigation);
      window.removeEventListener(
        "channel:deleted",
        handleChannelDeleted as EventListener,
      );
    };
  }, []);

  const handleSignout = async () => {
    await signOut();
    window.location.replace("/login");
  };

  const isFeedActive = () => pathname === `/dashboard/${project.id}/feed`;
  const isSettingsActive = () =>
    pathname === `/dashboard/${project.id}/settings`;
  const isChannelActive = (channelId: number) =>
    pathname === `/dashboard/${project.id}/channels/${channelId}`;

  const navigationCss =
    "flex px-3 py-2 space-x-2 items-center hover:bg-gray-100 hover:cursor-pointer hover:font-medium rounded ";
  const activeCss = navigationCss + "bg-gray-100 font-medium rounded-md";

  return (
    <Popover>
      <div className="w-[350px] border-r min-h-screen p-8">
        <div className="mt-4 space-y-2">
          <h1 className="text-sm font-mono">User</h1>
          <PopoverTrigger asChild>
            <p className="font-semibold hover:underline hover:cursor-pointer">
              @{user?.userName}
            </p>
          </PopoverTrigger>
          <PopoverContent>
            <Button
              className="w-full hover:cursor-pointer"
              variant="secondary"
              onClick={handleSignout}
            >
              <LogOutIcon />
              Sign out
            </Button>
          </PopoverContent>
        </div>
        {/* Project header */}
        <div className="flex space-x-2 w-full items-center justify-between mt-4">
          <h1 className="text-sm font-mono">Project</h1>
          <a href="/dashboard/create-project">
            <PlusIcon
              size={20}
              className="hover:cursor-pointer hover:text-black/50"
            />
          </a>
        </div>
        {/* Project selector */}
        <Select
          defaultValue={String(currentProject.id)}
          onValueChange={(value) => {
            const selectedProject = projects.find(
              (p) => String(p.id) === value,
            );
            if (selectedProject) {
              window.location.href = `/dashboard/${selectedProject.id}/feed`;
            }
          }}
        >
          <SelectTrigger className="w-full mt-2">
            <SelectValue placeholder="Project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="mt-4 space-y-2">
          <h1 className="text-sm font-mono">Navigation</h1>
          <a
            className={isFeedActive() ? activeCss : navigationCss}
            href={`/dashboard/${project.id}/feed`}
          >
            <InboxIcon size={20} />
            <p>Feed</p>
          </a>
          <a
            className={isSettingsActive() ? activeCss : navigationCss}
            href={`/dashboard/${project.id}/settings`}
          >
            <Settings size={20} />
            <p>Settings</p>
          </a>
        </div>

        {/* Channels header */}
        <div className="flex space-x-2 w-full items-center justify-between mt-4">
          <h1 className="text-sm font-mono">Channels</h1>
          <a href={`/dashboard/${project.id}/create-channel`}>
            <PlusIcon
              size={20}
              className="hover:cursor-pointer hover:text-black/50"
            />
          </a>
        </div>

        {/* Channels list */}
        <div className="space-y-2 flex flex-col mt-4">
          {channels.map((channel) => (
            <a
              key={channel.id}
              href={`/dashboard/${currentProject.id}/channels/${channel.id}`}
              className={`text-lg hover:text-black hover:font-medium hover:cursor-pointer ${
                isChannelActive(channel.id)
                  ? "bg-gray-100 rounded px-3 py-2 font-medium text-black"
                  : "px-3 py-2 hover:bg-gray-100 hover:rounded"
              }`}
            >
              # {channel.name}
            </a>
          ))}
        </div>
      </div>
    </Popover>
  );
}

function SidePanel(props: Parameters<typeof SidePanelContent>[0]) {
  return (
    <UserProvider>
      <SidePanelContent {...props} />
    </UserProvider>
  );
}

export default SidePanel;
