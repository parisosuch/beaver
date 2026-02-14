"use client";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { useState } from "react";

interface CreateChannelViewProps {
  projectId: number;
}

function CreateChannelView({ projectId }: CreateChannelViewProps) {
  const [channelName, setChannelName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/channel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: channelName,
          project_id: projectId,
          description: description || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create channel");
        return;
      }

      window.location.href = `/dashboard/${projectId}/channels/${data.id}`;
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 md:px-0">
      <form onSubmit={handleSubmit} className="flex flex-col text-center w-full max-w-sm">
        <h1 className="text-2xl md:text-3xl font-bold">Create Channel</h1>
        <p className="text-sm mt-2 text-black/50 font-medium">
          Create a new channel to organize your events.
        </p>
        <div className="mt-4 space-y-2">
          <Label htmlFor="channel-name">Channel name</Label>
          <Input
            id="channel-name"
            type="text"
            placeholder="sales"
            className="w-full"
            maxLength={16}
            value={channelName}
            onChange={(e) => setChannelName(e.target.value.replace(/ /g, "-"))}
            disabled={isLoading}
          />
          <p className="text-xs text-black/50">Maximum 16 characters.</p>
        </div>
        <div className="mt-4 space-y-2">
          <Label htmlFor="channel-description">Description (optional)</Label>
          <Textarea
            id="channel-description"
            placeholder="What is this channel for?"
            className="w-full"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="flex space-x-4 mt-4">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => window.history.back()}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={channelName === "" || isLoading}
          >
            {isLoading ? "Creating..." : "Create channel"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default CreateChannelView;
