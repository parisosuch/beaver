import type { Channel } from "@/lib/beaver/channel";
import type { Project } from "@/lib/beaver/project";
import {
  InboxIcon,
  PlusIcon,
  SearchIcon,
  Settings,
} from "lucide-react";
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
import ChannelLogsView from "./channel-logs-view";

export default function DashboardView({ projects }: { projects: Project[] }) {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [currentProject, setCurrentProject] = useState(projects[0]);
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);

  const [newChannelName, setNewChannelName] = useState("");
  const [channelCreateError, setChannelCreateError] = useState("");
  const [createChannelDialogOpen, setCreateChannelDialogOpen] = useState(false);

  const getChannels = async () => {
    const res = await fetch(`/api/channel?project_id=${currentProject.id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    return data as Channel[];
  };

  const createChannel = async () => {
    const res = await fetch("/api/channel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: newChannelName,
        project_id: currentProject.id,
      }),
    });

    const data = await res.json();

    if (res.status !== 200) {
      throw new Error(data.error);
    }
    return data as Channel;
  };

  useEffect(() => {
    getChannels().then((res) => {
      setChannels(res);
      setCurrentChannel(res[0]);
    });
  }, []);

  const navigationCss =
    "flex px-2 py-1 space-x-2 items-center hover:bg-gray-100 hover:cursor-pointer hover:font-medium rounded-md";

  return (
    <Dialog
      open={createChannelDialogOpen}
      onOpenChange={setCreateChannelDialogOpen}
    >
      <div className="w-full flex flex-row">
        <div className="w-[350px] border-r h-screen p-8">
          <h1 className="text-sm font-mono">Project</h1>
          <Select defaultValue={projects[0].name}>
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
            <div className={navigationCss}>
              <InboxIcon size={20} />
              <p>Feed</p>
            </div>
            <div className={navigationCss}>
              <SearchIcon size={20} />
              <p>Search</p>
            </div>
            <div className={navigationCss}>
              <Settings size={20} />
              <p>Settings</p>
            </div>
            <div className="flex space-x-2 w-full items-center justify-between mt-4">
              <h1 className="text-sm font-mono">Channels</h1>
              <DialogTrigger asChild>
                <PlusIcon
                  size={20}
                  className="hover:cursor-pointer hover:text-black/50"
                />
              </DialogTrigger>
            </div>
            <div className="space-y-2 mt-4">
              {channels.map((channel) => (
                <p
                  key={channel.id}
                  className={`text-lg hover:text-black hover:font-medium hover:cursor-pointer ${
                    currentChannel!.id === channel.id
                      ? "font-medium bg-gray-100 px-2 py-1 rounded-md text-black"
                      : "font-light text-black/75 px-2 py-1 hover:bg-gray-100 rounded-md"
                  }`}
                  onClick={() => {
                    setCurrentChannel(channel);
                  }}
                >
                  # {channel.name}
                </p>
              ))}
            </div>
          </div>
        </div>
        <div className="w-full">
          {channels.length === 0 ? (
            <div className="flex flex-col items-center mt-8 space-y-8">
              <h1 className="text-2xl font-mono text-black/50">
                Looks like this project has no channels.
              </h1>
              <DialogTrigger asChild>
                <Button variant="outline">
                  Create a channel <PlusIcon />
                </Button>
              </DialogTrigger>
            </div>
          ) : (
            <div>
              <div className="p-8 border-b">
                <h1 className="text-xl">
                  {currentChannel ? currentChannel.name : null}
                </h1>
              </div>
              <div className="p-8">
                <ChannelLogsView channel={currentChannel!} />
              </div>
            </div>
          )}
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
              placeholder="dams"
              onChange={(e) => {
                e.preventDefault();
                setNewChannelName(e.target.value);
              }}
            />
            <div className="flex space-x-8 w-full justify-end">
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
                    if (err instanceof Error)
                      setChannelCreateError(err.message);
                  }
                }}
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </div>
      </div>
    </Dialog>
  );
}
