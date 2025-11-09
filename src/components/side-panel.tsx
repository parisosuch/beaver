import type { Channel } from "@/lib/beaver/channel";
import type { Project } from "@/lib/beaver/project";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { InboxIcon, PlusIcon, SearchIcon, Settings } from "lucide-react";

function SidePanel({
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
  const [project, setProject] = useState(currentProject);
  const [projects, setProjects] = useState<Project[]>(currentProjects);
  const [channels, setChannels] = useState<Channel[]>(currentChannels);
  const [pathname, setPathname] = useState(currentPath);

  const [newChannelName, setNewChannelName] = useState("");
  const [channelCreateError, setChannelCreateError] = useState("");
  const [createChannelDialogOpen, setCreateChannelDialogOpen] = useState(false);

  const createChannel = async () => {
    const res = await fetch("/api/channel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newChannelName,
        project_id: currentProject.id,
      }),
    });
    const data = await res.json();
    if (res.status !== 200) throw new Error(data.error);
    return data as Channel;
  };

  useEffect(() => {
    const handleNavigation = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handleNavigation);
    document.addEventListener("astro:page-load", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
      document.removeEventListener("astro:page-load", handleNavigation);
    };
  }, []);

  const isFeedActive = () => pathname === `/dashboard/${project.id}/feed`;
  const isSettingsActive = () =>
    pathname === `/dashboard/${project.id}/settings`;
  const isSearchActive = () => pathname === `/dashboard/${project.id}/search`;
  const isChannelActive = (channelId: number) =>
    pathname === `/dashboard/${project.id}/channels/${channelId}`;

  const navigationCss =
    "flex px-3 py-2 space-x-2 items-center hover:bg-gray-100 hover:cursor-pointer hover:font-medium rounded ";
  const activeCss = navigationCss + "bg-gray-100 font-medium rounded-md";

  return (
    <Dialog
      open={createChannelDialogOpen}
      onOpenChange={setCreateChannelDialogOpen}
    >
      <div className="w-[350px] border-r h-screen p-8">
        {/* Project selector */}
        <h1 className="text-sm font-mono">Project</h1>
        <Select defaultValue={currentProject.name}>
          <SelectTrigger className="w-full mt-2">
            <SelectValue
              placeholder="Project"
              defaultValue={currentProject.name}
            />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.name}>
                {project.name}
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
            className={isSearchActive() ? activeCss : navigationCss}
            href={`/dashboard/${project.id}/search`}
          >
            <SearchIcon size={20} />
            <p>Search</p>
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
          <DialogTrigger asChild>
            <PlusIcon
              size={20}
              className="hover:cursor-pointer hover:text-black/50"
            />
          </DialogTrigger>
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

      {/* Create channel dialog */}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create channel</DialogTitle>
          <DialogDescription>
            Add a new channel to {currentProject.name}
          </DialogDescription>
        </DialogHeader>
        <p className="font-medium text-sm text-rose-500">
          {channelCreateError}
        </p>
        <Input
          id="channel-name"
          placeholder="Channel name"
          onChange={(e) => setNewChannelName(e.target.value)}
        />
        <div className="flex space-x-8 w-full justify-end mt-4">
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            onClick={async () => {
              try {
                const channel = await createChannel();
                setChannels([channel, ...channels]);
                setCreateChannelDialogOpen(false);
              } catch (err) {
                if (err instanceof Error) setChannelCreateError(err.message);
              }
            }}
          >
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SidePanel;
