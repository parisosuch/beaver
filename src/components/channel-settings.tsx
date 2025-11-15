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
import { useState } from "react";
import { Label } from "./ui/label";

export default function ChannelSettings({ channel }: { channel: Channel }) {
  const [channelName, setChannelName] = useState("");
  const [channelDeleteError, setChannelDeleteError] = useState("");

  const deleteChannel = async () => {
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

  return (
    <Dialog>
      <div className="rounded border p-2 mt-4 flex justify-between items-center">
        <div>
          <h3 className="font-medium text-lg">{channel.name}</h3>
          <p className="text-xs">{channel.createdAt?.toLocaleDateString()}</p>
        </div>
        <div>
          <DialogTrigger asChild>
            <Trash2Icon className="hover:cursor-pointer" />
          </DialogTrigger>
        </div>
      </div>
      {/* Create channel dialog */}
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
              deleteChannel();
            }}
          >
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
