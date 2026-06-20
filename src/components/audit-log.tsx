import type { AuditEntry } from "@/lib/beaver/audit-log";
import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ACTION_LABELS: Record<string, string> = {
  "api_key.rotated": "API key rotated",
  "project.renamed": "Project renamed",
  "rate_limit.changed": "Rate limit changed",
  "channel.created": "Channel created",
  "channel.renamed": "Channel renamed",
  "channel.deleted": "Channel deleted",
  "member.added": "Member added",
  "member.removed": "Member removed",
  "member.role_changed": "Member role changed",
};

function formatRelative(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

function describe(entry: AuditEntry): string {
  const meta = entry.metadata ? (JSON.parse(entry.metadata) as Record<string, unknown>) : {};
  const name = entry.targetName ? `#${entry.targetName}` : null;

  switch (entry.action) {
    case "api_key.rotated":
      return "rotated the API key";
    case "project.renamed":
      return `renamed project from "${meta.from}" to "${meta.to}"`;
    case "rate_limit.changed":
      return meta.to === null
        ? "removed the rate limit"
        : meta.from === null
          ? `set rate limit to ${meta.to} req/min`
          : `changed rate limit from ${meta.from} to ${meta.to} req/min`;
    case "channel.created":
      return `created channel ${name}`;
    case "channel.renamed":
      return `renamed channel #${meta.from} to #${meta.to}`;
    case "channel.deleted":
      return `deleted channel ${name}`;
    case "member.added":
      return `added @${entry.targetName} as ${meta.role}`;
    case "member.removed":
      return `removed @${entry.targetName}`;
    case "member.role_changed":
      return `changed @${entry.targetName}'s role from ${meta.from} to ${meta.to}`;
    default:
      return entry.action;
  }
}

export default function AuditLog({ entries }: { entries: AuditEntry[] }) {
  const [actorFilter, setActorFilter] = useState("__all__");
  const [actionFilter, setActionFilter] = useState("__all__");

  const actors = useMemo(() => [...new Set(entries.map((e) => e.actorName))].sort(), [entries]);

  const actions = useMemo(() => [...new Set(entries.map((e) => e.action))].sort(), [entries]);

  const filtered = useMemo(
    () =>
      entries.filter(
        (e) =>
          (actorFilter === "__all__" || e.actorName === actorFilter) &&
          (actionFilter === "__all__" || e.action === actionFilter),
      ),
    [entries, actorFilter, actionFilter],
  );

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No activity recorded yet. Changes to project settings, channels, and members will appear
        here.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Select value={actorFilter} onValueChange={setActorFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All users</SelectItem>
            {actors.map((actor) => (
              <SelectItem key={actor} value={actor}>
                @{actor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All actions</SelectItem>
            {actions.map((action) => (
              <SelectItem key={action} value={action}>
                {ACTION_LABELS[action] ?? action}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries match the selected filters.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {filtered.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 text-sm">
              <span className="text-muted-foreground shrink-0 w-16 text-right tabular-nums">
                {formatRelative(entry.createdAt)}
              </span>
              <span>
                <span className="font-medium">@{entry.actorName}</span>{" "}
                <span className="text-muted-foreground">{describe(entry)}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
