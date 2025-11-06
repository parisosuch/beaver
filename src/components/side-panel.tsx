import type { Channel } from "@/lib/beaver/channel";
import type { Project } from "@/lib/beaver/project";
import { InboxIcon, PlusIcon, SearchIcon, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import ChannelLogsView from "./channel-logs-view";
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

  const getProjects = async () => {
    const res = await fetch(`/api/project`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    return data as Project[];
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
    console.log("useEffect rendered again...");

    getProjects().then((res) => {
      setProjects(res);
    });

    getChannels().then((res) => {
      setChannels(res);

      // only set the default channel if currentChannel is not set yet (this will cause an infinite redirect otherwise)
      const urlParts = window.location.pathname.split("/");

      const isCurrentChannelPath = urlParts[urlParts.length - 1];

      const defaultChannel =
        res.find((c) => c.id === parseInt(isCurrentChannelPath)) || res[0];
      setCurrentChannel(defaultChannel);

      if (!isCurrentChannelPath && defaultChannel) {
        window.location.replace(
          `/dashboard/${currentProject.id}/channels/${res[0].id}`
        );
      }
    });
  }, []);

  const navigationCss =
    "flex px-2 py-1 space-x-2 items-center hover:bg-gray-100 hover:cursor-pointer hover:font-medium rounded-md";

  if (projects.length === 0) {
    return <div>Loading...</div>;
  }

  return (
    <Dialog
      open={createChannelDialogOpen}
      onOpenChange={setCreateChannelDialogOpen}
    >
      <div className="w-[350px] border-r h-screen p-8">
        <h1 className="text-sm font-mono">Project</h1>
        <Select defaultValue={projects[0].name}>
          <SelectTrigger className="w-full mt-2">
            <SelectValue
              placeholder="Project"
              defaultValue={currentProject!.name}
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
          <div className="space-y-2 flex flex-col mt-4">
            {channels.map((channel) => (
              <a
                key={channel.id}
                href={`/dashboard/${currentProject!.id}/channels/${channel.id}`}
                className={`text-lg hover:text-black hover:font-medium hover:cursor-pointer ${
                  currentChannel!.id === channel.id
                    ? "font-medium bg-gray-100 px-2 py-1 rounded-md text-black"
                    : "font-light text-black/75 px-2 py-1 hover:bg-gray-100 rounded-md"
                }`}
                onClick={() => {
                  //   setCurrentChannel(channel);
                  //   window.location.replace(
                  //     `/dashboard/${currentProject.id}/channels/${channel.id}`
                  //   );
                }}
              >
                # {channel.name}
              </a>
            ))}
          </div>
        </div>
      </div>
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
