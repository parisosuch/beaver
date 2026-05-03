import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { BellIcon, BellOffIcon } from "lucide-react";

export default function NotificationSettings({
  projectId,
  initialEmail,
  initialEnabled,
}: {
  projectId: number;
  initialEmail: string | null;
  initialEnabled: boolean;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [enabled, setEnabled] = useState(initialEnabled);
  const [saving, setSaving] = useState(false);
  const [savedEmail, setSavedEmail] = useState(initialEmail ?? "");
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

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

  const toggleNotifications = async (next: boolean) => {
    if (next && !savedEmail) {
      alert("Please save an email address before enabling notifications.");
      return;
    }
    setEnabled(next);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, enabled: next }),
    }).catch(() => setEnabled(!next));
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
            {status === "saved"
              ? "Saved!"
              : status === "error"
                ? "Error"
                : "Save"}
          </Button>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center w-full sm:justify-between gap-2">
        <div>
          <h3 className="font-medium shrink-0">Event Notifications</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive an email when an event is posted with{" "}
            <code className="bg-muted px-1 rounded text-xs">
              "notify": true
            </code>
          </p>
        </div>
        <Button
          variant={enabled ? "default" : "outline"}
          onClick={() => toggleNotifications(!enabled)}
          className="gap-2 shrink-0"
        >
          {enabled ? (
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
    </div>
  );
}
