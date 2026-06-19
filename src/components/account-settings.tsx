import { useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import ChangePasswordForm from "./change-password-form";

const PALETTES: { id: string; label: string; swatch: string }[] = [
  { id: "default", label: "Default", swatch: "oklch(0.45 0 0)" },
  { id: "blue", label: "Ocean", swatch: "oklch(0.55 0.17 255)" },
  { id: "violet", label: "Violet", swatch: "oklch(0.53 0.21 290)" },
  { id: "green", label: "Forest", swatch: "oklch(0.55 0.13 155)" },
  { id: "rose", label: "Rose", swatch: "oklch(0.58 0.2 18)" },
];

export default function AccountSettings({
  initialFullName,
  initialCompactMode,
  initialThemePalette,
  username,
}: {
  initialFullName: string | null;
  initialCompactMode: boolean;
  initialThemePalette: string;
  username: string;
}) {
  const [fullName, setFullName] = useState(initialFullName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compactMode, setCompactMode] = useState(initialCompactMode);
  const [compactError, setCompactError] = useState<string | null>(null);
  const [themePalette, setThemePalette] = useState(initialThemePalette);
  const [paletteError, setPaletteError] = useState<string | null>(null);

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

  const handlePaletteChange = async (next: string) => {
    const previous = themePalette;
    setThemePalette(next);
    setPaletteError(null);
    // Apply immediately for instant feedback; persisted server-side below.
    document.documentElement.dataset.theme = next;
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ themePalette: next }),
      });
      if (!res.ok) {
        const data = await res.json();
        setThemePalette(previous);
        document.documentElement.dataset.theme = previous;
        setPaletteError(data.error || "Failed to save.");
      }
    } catch {
      setThemePalette(previous);
      document.documentElement.dataset.theme = previous;
      setPaletteError("Failed to save.");
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

        <div className="flex flex-col gap-3">
          <div>
            <p className={label}>Theme palette</p>
            <p className="text-sm text-muted-foreground">
              Accent color used across buttons, links, and charts.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {PALETTES.map((p) => {
              const selected = themePalette === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePaletteChange(p.id)}
                  aria-pressed={selected}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    selected ? "border-foreground" : "border-border hover:bg-accent"
                  }`}
                >
                  <span
                    className="flex size-5 items-center justify-center rounded-full"
                    style={{ backgroundColor: p.swatch }}
                  >
                    {selected && <CheckIcon className="size-3 text-white" />}
                  </span>
                  {p.label}
                </button>
              );
            })}
          </div>
          {paletteError && <p className="text-sm text-destructive">{paletteError}</p>}
        </div>

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
