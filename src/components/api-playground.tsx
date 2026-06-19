import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { CheckIcon, CopyIcon, PlusIcon, SendIcon, Trash2Icon } from "lucide-react";

type Channel = { id: number; name: string };

type TagRow = { key: string; value: string };

function buildCurl(baseUrl: string, apiKey: string, payload: Record<string, unknown>): string {
  const body = JSON.stringify(payload, null, 2);
  return `curl -X POST ${baseUrl}/api/event \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${apiKey}" \\
  -d '${body}'`;
}

export default function ApiPlayground({
  apiKey,
  baseUrl,
  channels,
}: {
  apiKey: string;
  baseUrl: string;
  channels: Channel[];
}) {
  const [name, setName] = useState("server.started");
  const [title, setTitle] = useState("Server started");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [channelName, setChannelName] = useState(channels[0]?.name ?? "");
  const [tags, setTags] = useState<TagRow[]>([]);
  const [notify, setNotify] = useState(false);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<{ status: number; body: string } | null>(null);
  const [copiedCurl, setCopiedCurl] = useState(false);

  const buildPayload = () => {
    const payload: Record<string, unknown> = { name, title, channel: channelName };
    if (description.trim()) payload.description = description.trim();
    if (icon.trim()) payload.icon = icon.trim();
    if (notify) payload.notify = true;
    const tagEntries = tags.filter((t) => t.key.trim());
    if (tagEntries.length > 0) {
      payload.tags = Object.fromEntries(tagEntries.map((t) => [t.key.trim(), t.value]));
    }
    return payload;
  };

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await fetch("/api/event", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
        body: JSON.stringify(buildPayload()),
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setResponse({ status: res.status, body: pretty });
    } catch (err) {
      setResponse({ status: 0, body: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCurl = async () => {
    await navigator.clipboard.writeText(buildCurl(baseUrl, apiKey, buildPayload()));
    setCopiedCurl(true);
    setTimeout(() => setCopiedCurl(false), 2000);
  };

  const addTag = () => setTags((t) => [...t, { key: "", value: "" }]);
  const removeTag = (i: number) => setTags((t) => t.filter((_, j) => j !== i));
  const updateTag = (i: number, field: "key" | "value", val: string) =>
    setTags((t) => t.map((row, j) => (j === i ? { ...row, [field]: val } : row)));

  const isSuccess = response !== null && response.status >= 200 && response.status < 300;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pg-name">
              Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="object.action"
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">Must follow object.action format</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pg-channel">
              Channel <span className="text-destructive">*</span>
            </Label>
            {channels.length > 0 ? (
              <Select value={channelName} onValueChange={setChannelName}>
                <SelectTrigger id="pg-channel">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.name}>
                      {ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="pg-channel"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                placeholder="channel-name"
              />
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pg-title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="pg-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Human-readable event title"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="pg-icon">Icon</Label>
            <Input
              id="pg-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="✅"
              className="text-lg"
            />
          </div>
          <div className="flex items-end pb-0.5">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
                className="rounded"
              />
              Send notification email
            </label>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="pg-description">Description</Label>
          <Textarea
            id="pg-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional longer description"
            rows={2}
          />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Tags</Label>
            <Button type="button" variant="ghost" size="sm" onClick={addTag} className="h-7 gap-1">
              <PlusIcon className="size-3.5" />
              Add tag
            </Button>
          </div>
          {tags.map((tag, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input
                value={tag.key}
                onChange={(e) => updateTag(i, "key", e.target.value)}
                placeholder="key"
                className="font-mono text-sm"
              />
              <Input
                value={tag.value}
                onChange={(e) => updateTag(i, "value", e.target.value)}
                placeholder="value"
                className="font-mono text-sm"
              />
              <button
                onClick={() => removeTag(i)}
                className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive"
              >
                <Trash2Icon className="size-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            onClick={handleSend}
            disabled={loading || !name || !title || !channelName}
            className="gap-2"
          >
            <SendIcon className="size-4" />
            {loading ? "Sending…" : "Send event"}
          </Button>
          <Button variant="outline" onClick={handleCopyCurl} className="gap-2">
            {copiedCurl ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            Copy curl
          </Button>
        </div>
      </div>

      {/* Response */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label>Response</Label>
          {response !== null && (
            <Badge variant={isSuccess ? "default" : "destructive"} className="font-mono text-xs">
              {response.status === 0
                ? "Network error"
                : `${response.status} ${isSuccess ? "OK" : "Error"}`}
            </Badge>
          )}
        </div>
        <pre className="min-h-64 max-h-96 overflow-auto rounded-lg border bg-muted/40 p-4 text-xs font-mono leading-relaxed text-muted-foreground whitespace-pre-wrap">
          {response === null ? 'Hit "Send event" to see the response here.' : response.body}
        </pre>
        {response !== null && isSuccess && (
          <p className="text-xs text-muted-foreground">
            Event created — check your feed to see it live.
          </p>
        )}
      </div>
    </div>
  );
}
