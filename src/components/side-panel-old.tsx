import type { Channel } from "@/lib/beaver/channel";
import type { Project } from "@/lib/beaver/project";
import { InboxIcon, PlusIcon, SearchIcon, Settings } from "lucide-react";
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

export default function SidePanel({
  currentProject,
}: {
  currentProject: Project;
}) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  const [newChannelName, setNewChannelName] = useState("");
  const [channelCreateError, setChannelCreateError] = useState("");
  const [createChannelDialogOpen, setCreateChannelDialogOpen] = useState(false);

  // track current pathname for active link highlighting
  const [pathname, setPathname] = useState(window.location.pathname);

  // fetch channels
  const getChannels = async () => {
    const res = await fetch(`/api/channel?project_id=${currentProject.id}`);
    const data = await res.json();
    return data as Channel[];
  };

  // fetch projects
  const getProjects = async () => {
    const res = await fetch("/api/project");
    const data = await res.json();
    return data as Project[];
  };

  // create channel
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

  // initial load
  useEffect(() => {
    getProjects().then((res) => setProjects(res || []));
    getChannels().then((res) => setChannels(res || []));

    // update pathname on back/forward navigation
    const handlePopState = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigationCss =
    "flex px-2 py-1 space-x-2 items-center hover:bg-gray-100 hover:cursor-pointer hover:font-medium rounded-md ";
  const activeCss = navigationCss + "bg-gray-100 font-medium rounded-md";

  // helpers to check active
  const isFeedActive = () =>
    pathname === `/dashboard/${currentProject.id}/feed`;
  const isChannelActive = (channel: Channel) =>
    pathname === `/dashboard/${currentProject.id}/channels/${channel.id}`;

  if (projects.length === 0) return <div>Loading...</div>;

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

        {/* Navigation */}
        <div className="mt-4 space-y-2">
          <h1 className="text-sm font-mono">Navigation</h1>
          <div className={isFeedActive() ? activeCss : navigationCss}>
            <InboxIcon size={20} />
            <a href={`/dashboard/${currentProject.id}/feed`}>Feed</a>
          </div>
          <div className={navigationCss}>
            <SearchIcon size={20} />
            <p>Search</p>
          </div>
          <div className={navigationCss}>
            <Settings size={20} />
            <a href={`/dashboard/${currentProject.id}/settings`}>Settings</a>
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
                  isChannelActive(channel)
                    ? "bg-gray-100 rounded-md px-2 py-1 font-medium text-black"
                    : "px-2 py-1 hover:bg-gray-100 hover:rounded-md"
                }`}
              >
                # {channel.name}
              </a>
            ))}
          </div>
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
