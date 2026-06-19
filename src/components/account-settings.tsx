import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import ChangePasswordForm from "./change-password-form";

export default function AccountSettings({
  initialFullName,
  initialCompactMode,
  username,
}: {
  initialFullName: string | null;
  initialCompactMode: boolean;
  username: string;
}) {
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compactMode, setCompactMode] = useState(initialCompactMode);
  const [compactError, setCompactError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: fullName.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to save.");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  const handleCompactModeChange = async (next: boolean) => {
    setCompactMode(next);
    setCompactError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ compactMode: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCompactMode(!next);
        setCompactError(data.error || "Failed to save.");
      }
    } catch {
      setCompactMode(!next);
      setCompactError("Failed to save.");
    }
  };

  const row = "flex flex-col sm:flex-row sm:items-center w-full sm:justify-between gap-2";
  const label = "font-medium shrink-0";

  return (
    <div className="flex flex-col space-y-10">
      <div className="flex flex-col space-y-4">
        <h2 className="font-mono">Profile</h2>
        <div className={row}>
          <p className={label}>Username</p>
          <p className="text-muted-foreground font-mono">@{username}</p>
        </div>
        <form onSubmit={handleSave} className={row}>
          <Label htmlFor="full-name" className={label}>
            Display name
          </Label>
          <div className="flex items-center gap-2">
            <Input
              id="full-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-48"
            />
            <Button type="submit" variant="outline" size="sm" disabled={saving}>
              {saved ? "Saved!" : saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col space-y-4">
        <h2 className="font-mono">Preferences</h2>
        <div className={row}>
          <div>
            <p className={label}>Compact UI mode</p>
            <p className="text-sm text-muted-foreground">
              Show events in a denser, more compact layout.
            </p>
          </div>
          <Switch checked={compactMode} onCheckedChange={handleCompactModeChange} />
        </div>
        {compactError && <p className="text-sm text-destructive">{compactError}</p>}
      </div>

      <div className="flex flex-col space-y-4">
        <h2 className="font-mono">Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
