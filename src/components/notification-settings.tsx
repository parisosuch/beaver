import { useState } from "react";
import type { Channel } from "@/lib/beaver/channel";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { BellIcon, BellOffIcon } from "lucide-react";

export default function NotificationSettings({
  channels,
  initialEmail,
  subscribedChannelIds,
}: {
  channels: Channel[];
  initialEmail: string | null;
  subscribedChannelIds: number[];
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [savedEmail, setSavedEmail] = useState(initialEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [subscribed, setSubscribed] = useState(new Set(subscribedChannelIds));

  const saveEmail = async () => {
    setSaving(true);
    setStatus("idle");
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || null }),
      });
      if (res.ok) {
        setSavedEmail(email.trim());
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  const toggleChannel = async (channelId: number, next: boolean) => {
    if (!savedEmail) return;
    setSubscribed((prev) => {
      const updated = new Set(prev);
      if (next) updated.add(channelId);
      else updated.delete(channelId);
      return updated;
    });
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, enabled: next }),
    }).catch(() => {
      setSubscribed((prev) => {
        const reverted = new Set(prev);
        if (next) reverted.delete(channelId);
        else reverted.add(channelId);
        return reverted;
      });
    });
  };

  const setAll = async (next: boolean) => {
    if (!savedEmail) return;
    const channelIds = channels.map((c) => c.id);
    setSubscribed(next ? new Set(channelIds) : new Set());
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelIds, enabled: next }),
    }).catch(() => setSubscribed(new Set(subscribedChannelIds)));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Email */}
      <div className="flex flex-col sm:flex-row sm:items-center w-full sm:justify-between gap-2">
        <div>
          <h3 className="font-medium shrink-0">Notification Email</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Where event notifications will be sent
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveEmail()}
            className="w-64"
          />
          <Button
            variant="outline"
            onClick={saveEmail}
            disabled={saving || email.trim() === savedEmail}
          >
            {status === "saved" ? "Saved!" : status === "error" ? "Error" : "Save"}
          </Button>
        </div>
      </div>

      {/* Channels */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium shrink-0">Channel Notifications</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Receive an email when an event is posted to a channel with{" "}
              <code className="bg-muted px-1 rounded text-xs">"notify": true</code>
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setAll(true)}
              disabled={!savedEmail}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => setAll(false)}
              disabled={!savedEmail}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:no-underline"
            >
              Clear all
            </button>
          </div>
        </div>
        {!savedEmail && (
          <p className="text-sm text-muted-foreground">Add an email address first.</p>
        )}
        <div className="flex flex-col">
          {channels.map((channel) => {
            const isSubscribed = subscribed.has(channel.id);
            return (
              <div
                key={channel.id}
                className="flex items-center justify-between py-1.5 border-b last:border-0"
              >
                <span className="text-sm">{channel.name}</span>
                <Button
                  variant={isSubscribed ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleChannel(channel.id, !isSubscribed)}
                  disabled={!savedEmail}
                  className="gap-2"
                >
                  {isSubscribed ? (
                    <>
                      <BellIcon className="size-4" />
                      Enabled
                    </>
                  ) : (
                    <>
                      <BellOffIcon className="size-4" />
                      Disabled
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
