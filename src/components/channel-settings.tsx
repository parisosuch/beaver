import type { Channel } from "@/lib/beaver/channel";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "./ui/label";

export default function ChannelSettings({ channels }: { channels: Channel[] }) {
  const [clientChannels, setChannels] = useState<Channel[]>(channels);
  const [channelName, setChannelName] = useState("");
  const [channelDeleteError, setChannelDeleteError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const deleteChannel = async (channel: Channel) => {
    const res = await fetch("/api/channel", {
      method: "DELETE",
      body: JSON.stringify({ channelID: channel.id }),
    });

    const data = await res.json();

    if (res.status !== 200) {
      setChannelDeleteError(data.error);
      return;
    }
  };

  useEffect(() => {
    const handleChannelDeleted = (e: CustomEvent<{ id: number }>) => {
      const { id } = e.detail;

      setChannels((prev) => prev.filter((c) => c.id !== id));
    };

    // add custom even for channel deletion
    window.addEventListener(
      "channel:deleted",
      handleChannelDeleted as EventListener
    );

    return () => {
      window.removeEventListener(
        "channel:deleted",
        handleChannelDeleted as EventListener
      );
    };
  }, []);

  return (
    <>
      {clientChannels.map((channel) => (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen} key={channel.id}>
          <div className="rounded border p-2 mt-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium text-lg">{channel.name}</h3>
              <p className="text-xs">
                {channel.createdAt?.toLocaleDateString()}
              </p>
            </div>
            <div>
              <DialogTrigger asChild>
                <Trash2Icon className="hover:cursor-pointer" />
              </DialogTrigger>
            </div>
          </div>
          {/* Delete channel dialog */}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete channel</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete{" "}
                <span className="font-bold"># {channel.name}</span> ?
              </DialogDescription>
            </DialogHeader>
            <p className="font-medium text-sm text-rose-500">
              {channelDeleteError}
            </p>
            <Label>Confirm channel name</Label>
            <Input
              id="channel-name"
              placeholder="Channel name"
              onChange={(e) => setChannelName(e.target.value)}
            />
            <div className="flex space-x-8 w-full justify-end mt-4">
              <DialogClose asChild>
                <Button variant="secondary">Cancel</Button>
              </DialogClose>
              <Button
                disabled={channelName !== channel.name}
                onClick={async () => {
                  deleteChannel(channel);
                  const id = channel.id;
                  window.dispatchEvent(
                    new CustomEvent("channel:deleted", { detail: { id } })
                  );
                  setDialogOpen(false);
                }}
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </>
  );
}
