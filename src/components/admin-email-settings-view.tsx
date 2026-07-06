import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { ArrowLeftIcon, CheckCircle2Icon, XCircleIcon } from "lucide-react";

type EmailSettingsData = {
  provider: "resend" | "smtp";
  smtpHost: string | null;
  smtpPort: number | null;
  smtpUsername: string | null;
  smtpPasswordSet: boolean;
  smtpSecure: boolean;
  smtpFromEmail: string | null;
};

export default function AdminEmailSettingsView({
  backUrl,
  initialSettings,
  resendConfigured,
}: {
  backUrl: string;
  initialSettings: EmailSettingsData;
  resendConfigured: boolean;
}) {
  const [provider, setProvider] = useState(initialSettings.provider);
  const [smtpHost, setSmtpHost] = useState(initialSettings.smtpHost ?? "");
  const [smtpPort, setSmtpPort] = useState(
    initialSettings.smtpPort ? String(initialSettings.smtpPort) : "",
  );
  const [smtpUsername, setSmtpUsername] = useState(initialSettings.smtpUsername ?? "");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpPasswordSet, setSmtpPasswordSet] = useState(initialSettings.smtpPasswordSet);
  const [smtpSecure, setSmtpSecure] = useState(initialSettings.smtpSecure);
  const [smtpFromEmail, setSmtpFromEmail] = useState(initialSettings.smtpFromEmail ?? "");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatus("idle");
    setError(null);
    try {
      const res = await fetch("/api/email-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          smtpHost,
          smtpPort: smtpPort ? parseInt(smtpPort) : null,
          smtpUsername,
          ...(smtpPassword ? { smtpPassword } : {}),
          smtpSecure,
          smtpFromEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setError(data.error ?? "Failed to save settings.");
        return;
      }
      setSmtpPasswordSet(data.smtpPasswordSet);
      setSmtpPassword("");
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <div className="mb-8">
          <a
            href={backUrl}
            data-astro-reload
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeftIcon size={14} />
            Back
          </a>
          <p className="text-sm font-mono text-muted-foreground">Admin</p>
          <h1 className="text-2xl font-semibold">Email Settings</h1>
        </div>

        <form onSubmit={handleSave} className="space-y-6 max-w-lg">
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={(v) => setProvider(v as "resend" | "smtp")}>
              <SelectTrigger id="provider" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend</SelectItem>
                <SelectItem value="smtp">SMTP</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {provider === "resend" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md p-3">
              {resendConfigured ? (
                <CheckCircle2Icon size={16} className="text-green-600 shrink-0" />
              ) : (
                <XCircleIcon size={16} className="text-destructive shrink-0" />
              )}
              <span>
                {resendConfigured
                  ? "Resend is configured via the RESEND_API_KEY environment variable."
                  : "RESEND_API_KEY is not set in the environment."}
              </span>
            </div>
          )}

          {provider === "smtp" && (
            <div className="space-y-4 border rounded-md p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="smtp-host">Host</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-username">Username</Label>
                <Input
                  id="smtp-username"
                  value={smtpUsername}
                  onChange={(e) => setSmtpUsername(e.target.value)}
                  placeholder="optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-password">Password</Label>
                <Input
                  id="smtp-password"
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={
                    smtpPasswordSet ? "Leave blank to keep current password" : "optional"
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtp-from">From Email</Label>
                <Input
                  id="smtp-from"
                  type="email"
                  value={smtpFromEmail}
                  onChange={(e) => setSmtpFromEmail(e.target.value)}
                  placeholder="notifications@example.com"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="smtp-secure"
                  checked={smtpSecure}
                  onChange={(e) => setSmtpSecure(e.target.checked)}
                  className="size-4"
                />
                <Label htmlFor="smtp-secure" className="cursor-pointer">
                  Use TLS (port 465). Leave unchecked for STARTTLS (port 587).
                </Label>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {status === "saved" ? "Saved!" : "Save"}
            </Button>
            {status === "error" && error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
