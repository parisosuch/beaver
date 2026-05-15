import type { EventWithChannelName } from "@/lib/beaver/event";
import type { Channel } from "@/lib/beaver/channel";
import { useEffect, useState } from "react";
import EventCard from "./event-card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { SearchIcon, BookmarkIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import EventFilterDialog from "./event-filter-dialog";

export default function BookmarksFeed({
  projectID,
  channels,
  search,
  startDate,
  endDate,
  tags,
  channelId,
}: {
  projectID: number;
  channels: Channel[];
  search?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tags?: string | null;
  channelId?: string | null;
}) {
  const [events, setEvents] = useState<EventWithChannelName[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(search ?? "");

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

  const handleSearch = () => navigate({ search: searchInput || null });

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
    if (search) params.set("search", search);
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
  }, [projectID, search, startDate, endDate, tags, channelId]);

  return (
    <div className="w-full flex flex-col">
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-4 md:p-8 border-b gap-4">
        <h1 className="text-2xl font-semibold">Bookmarks</h1>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-2 items-center justify-end">
            <Select value={channelId ?? "all"} onValueChange={handleChannelFilter}>
              <SelectTrigger className="w-[160px]">
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
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Search..."
              type="text"
              className="flex-1"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button variant="secondary" onClick={handleSearch}>
              <SearchIcon />
            </Button>
          </div>
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
          <div className="px-4 md:px-8 py-4 md:py-8 w-full lg:w-1/2 mx-auto flex flex-col gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
