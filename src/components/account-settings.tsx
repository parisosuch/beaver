import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import ChangePasswordForm from "./change-password-form";

export default function AccountSettings({
  initialFullName,
  username,
}: {
  initialFullName: string | null;
  username: string;
}) {
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <h2 className="font-mono">Password</h2>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
