import type { EventWithChannelName } from "@/lib/beaver/event";
import type { Channel } from "@/lib/beaver/channel";
import { useEffect, useState } from "react";
import EventCard from "./event-card";
import EventSearchBar from "./event-search-bar";
import { BookmarkIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import EventFilterDialog from "./event-filter-dialog";

export default function BookmarksFeed({
  projectID,
  channels,
  title,
  object,
  action,
  startDate,
  endDate,
  tags,
  channelId,
  compact = false,
}: {
  projectID: number;
  channels: Channel[];
  title?: string | null;
  object?: string | null;
  action?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tags?: string | null;
  channelId?: string | null;
  compact?: boolean;
}) {
  const [events, setEvents] = useState<EventWithChannelName[]>([]);
  const [loading, setLoading] = useState(true);

  const parsedTags = (() => {
    try {
      return tags ? JSON.parse(tags) : [];
    } catch {
      return [];
    }
  })();

  const navigate = (params: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [k, v] of Object.entries(params)) {
      if (v === null) url.searchParams.delete(k);
      else url.searchParams.set(k, v);
    }
    window.location.href = url.toString();
  };

  const handleSearchApply = (next: {
    title: string | null;
    object: string | null;
    action: string | null;
  }) => {
    navigate({ title: next.title, object: next.object, action: next.action });
  };

  const handleApplyFilters = (start: string | null, end: string | null, newTags: any[]) => {
    navigate({
      startDate: start,
      endDate: end,
      tags: newTags.length ? JSON.stringify(newTags) : null,
    });
  };

  const handleChannelFilter = (value: string) => {
    navigate({ channelId: value === "all" ? null : value });
  };

  useEffect(() => {
    const params = new URLSearchParams({ projectId: String(projectID) });
    if (title) params.set("title", title);
    if (object) params.set("object", object);
    if (action) params.set("action", action);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (tags) params.set("tags", tags);
    if (channelId) params.set("channelId", channelId);

    fetch(`/api/events/bookmarks?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
      })
      .finally(() => setLoading(false));
  }, [projectID, title, object, action, startDate, endDate, tags, channelId]);

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
      <div className="w-full flex flex-col p-4 md:p-8 border-b gap-4">
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
        <EventSearchBar
          type="project"
          projectID={projectID}
          title={title ?? null}
          object={object ?? null}
          action={action ?? null}
          onApply={handleSearchApply}
        />
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={channelId ?? "all"} onValueChange={handleChannelFilter}>
            <SelectTrigger className="flex-1 sm:flex-none sm:w-[160px]">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {channels.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  # {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <EventFilterDialog
            type="project"
            projectID={projectID}
            currentStartDate={startDate ?? null}
            currentEndDate={endDate ?? null}
            currentTags={parsedTags}
            onApplyFilters={handleApplyFilters}
          />
        </div>
      </div>

      {/* Events */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center p-8">
            <p>Loading...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 gap-3 text-muted-foreground">
            <BookmarkIcon size={32} strokeWidth={1.5} />
            <p>No bookmarks yet.</p>
          </div>
        ) : (
          <div
            className={`px-4 md:px-8 py-4 md:py-8 w-full lg:w-1/2 mx-auto flex flex-col ${compact ? "gap-2" : "gap-4"}`}
          >
            {events.map((event) => (
              <EventCard key={event.id} event={event} compact={compact} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
