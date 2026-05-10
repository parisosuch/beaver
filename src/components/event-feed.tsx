import type {
  EventWithChannelName,
  TagFilter,
  SortField,
  SortOrder,
} from "@/lib/beaver/event";

const fetchMaxEventId = async (): Promise<number> => {
  try {
    const res = await fetch("/api/events/max-id");
    const data = await res.json();
    return data.maxId ?? 0;
  } catch {
    return 0;
  }
};
import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import EventCard from "./event-card";
import { Input } from "./ui/input";
import { SearchIcon, XIcon, ArrowUpDownIcon } from "lucide-react";
import { Button } from "./ui/button";
import { navigate } from "astro:transitions/client";
import type { Channel } from "@/lib/beaver/channel";
import EventFilterDialog from "./event-filter-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type SortOption = `${SortField}_${SortOrder}`;

type Row =
  | { kind: "event"; event: EventWithChannelName; isNew: boolean }
  | { kind: "divider" };

function tagFilterLabel(tag: TagFilter): string {
  if (tag.type === "number") {
    const op = tag.operator ?? "eq";
    if (op === "between") return `${tag.key}: ${tag.value} – ${tag.value2}`;
    const sym = op === "gt" ? ">" : op === "lt" ? "<" : "=";
    return `${tag.key} ${sym} ${tag.value}`;
  }
  return `${tag.key}: ${tag.value}`;
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "date_desc", label: "Newest first" },
  { value: "date_asc", label: "Oldest first" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
];

export default function EventFeed({
  type,
  projectID,
  channel,
  search,
  startDate,
  endDate,
  tags,
  sortBy,
  sortOrder,
}: {
  type: "channel" | "project";
  projectID?: number;
  channel?: Channel;
  search?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tags?: string | null;
  sortBy?: string | null;
  sortOrder?: string | null;
}) {
  const [events, setEvents] = useState<EventWithChannelName[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState(search ?? "");
  const [lastReadDate, setLastReadDate] = useState<Date | null>(null);

  const eventIdsRef = useRef<Set<number>>(new Set());
  const newEventIdsRef = useRef<Set<number>>(new Set());
  const eventsRef = useRef<EventWithChannelName[]>([]);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const didScrollToDivider = useRef(false);
  const trickleQueueRef = useRef<EventWithChannelName[]>([]);
  const trickleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Parse tags from URL param
  const parsedTags: TagFilter[] = tags ? JSON.parse(tags) : [];

  // Keep refs in sync with state
  eventsRef.current = events;
  loadingMoreRef.current = loadingMore;

  // Build the base path for navigation
  const getBasePath = () => {
    if (channel) {
      return `/dashboard/${projectID}/channels/${channel.id}`;
    }
    return `/dashboard/${projectID}/feed`;
  };

  // Build URL with current filters
  const buildFilterUrl = (overrides: {
    search?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    tags?: TagFilter[] | null;
    sortBy?: string | null;
    sortOrder?: string | null;
  }) => {
    const params = new URLSearchParams();

    const newSearch =
      overrides.search !== undefined ? overrides.search : search;
    const newStartDate =
      overrides.startDate !== undefined ? overrides.startDate : startDate;
    const newEndDate =
      overrides.endDate !== undefined ? overrides.endDate : endDate;
    const newTags = overrides.tags !== undefined ? overrides.tags : parsedTags;
    const newSortBy =
      overrides.sortBy !== undefined ? overrides.sortBy : sortBy;
    const newSortOrder =
      overrides.sortOrder !== undefined ? overrides.sortOrder : sortOrder;

    if (newSearch) params.set("search", newSearch);
    if (newStartDate) params.set("startDate", newStartDate);
    if (newEndDate) params.set("endDate", newEndDate);
    if (newTags && newTags.length > 0)
      params.set("tags", JSON.stringify(newTags));
    if (newSortBy) params.set("sortBy", newSortBy);
    if (newSortOrder) params.set("sortOrder", newSortOrder);

    const queryString = params.toString();
    return queryString ? `${getBasePath()}?${queryString}` : getBasePath();
  };

  const handleSearch = () => {
    if (!searchInput && !search) return;
    navigate(buildFilterUrl({ search: searchInput || null }));
  };

  // Build filter query params for API calls
  const buildApiFilterParams = (): string => {
    const params: string[] = [];

    if (startDate) {
      params.push(`startDate=${encodeURIComponent(startDate)}`);
    }
    if (endDate) {
      params.push(`endDate=${encodeURIComponent(endDate)}`);
    }
    if (tags) {
      params.push(`tags=${encodeURIComponent(tags)}`);
    }
    if (sortBy) {
      params.push(`sortBy=${encodeURIComponent(sortBy)}`);
    }
    if (sortOrder) {
      params.push(`sortOrder=${encodeURIComponent(sortOrder)}`);
    }

    return params.length > 0 ? `&${params.join("&")}` : "";
  };

  const handleSortChange = (value: SortOption) => {
    const [field, order] = value.split("_") as [SortField, SortOrder];
    window.location.href = buildFilterUrl({ sortBy: field, sortOrder: order });
  };

  const currentSort: SortOption = `${(sortBy as SortField) || "date"}_${(sortOrder as SortOrder) || "desc"}`;

  const getEvents = async (): Promise<EventWithChannelName[]> => {
    let endpoint = "/api/events";

    if (channel) {
      endpoint += `/channel/${channel.id}?limit=20`;
    } else {
      endpoint += `/project/${projectID}?limit=20`;
    }

    const lastEvent = eventsRef.current[eventsRef.current.length - 1];
    if (lastEvent) {
      const field = sortBy ?? "date";
      const order = sortOrder ?? "desc";
      if (field === "name") {
        endpoint += `&cursorName=${encodeURIComponent(lastEvent.name)}&cursorId=${lastEvent.id}`;
      } else if (order === "asc") {
        endpoint += `&afterId=${lastEvent.id}`;
      } else {
        endpoint += `&beforeId=${lastEvent.id}`;
      }
    }

    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }

    endpoint += buildApiFilterParams();

    try {
      const res = await fetch(endpoint);
      const batch = await res.json();
      return batch as EventWithChannelName[];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleApplyFilters = (
    newStartDate: string | null,
    newEndDate: string | null,
    newTags: TagFilter[],
  ) => {
    navigate(
      buildFilterUrl({
        startDate: newStartDate,
        endDate: newEndDate,
        tags: newTags.length > 0 ? newTags : null,
      }),
    );
  };

  const handleRemoveTag = (index: number) => {
    const newTags = parsedTags.filter((_, i) => i !== index);
    navigate(buildFilterUrl({ tags: newTags.length > 0 ? newTags : null }));
  };

  const handleRemoveTimeFilter = () => {
    navigate(buildFilterUrl({ startDate: null, endDate: null }));
  };

  // Initial load + SSE setup
  useEffect(() => {
    let eventSource: EventSource | null = null;

    setEvents([]);
    setLoading(true);
    eventIdsRef.current.clear();
    newEventIdsRef.current.clear();
    hasMoreRef.current = true;
    trickleQueueRef.current = [];
    if (trickleTimerRef.current) {
      clearTimeout(trickleTimerRef.current);
      trickleTimerRef.current = null;
    }

    const isDefaultSort =
      !sortBy || (sortBy === "date" && (!sortOrder || sortOrder === "desc"));

    const establishStream = (maxId: number) => {
      if (!isDefaultSort || maxId === 0) return;

      let endpoint = "/api/events";
      if (channel) {
        endpoint += `/channel/${channel.id}/event-stream?afterId=${maxId}`;
      } else {
        endpoint += `/project/${projectID}/event-stream?afterId=${maxId}`;
      }
      if (search) endpoint += `&search=${encodeURIComponent(search)}`;
      endpoint += buildApiFilterParams();

      eventSource = new EventSource(endpoint);

      const drainQueue = () => {
        if (trickleQueueRef.current.length === 0) {
          trickleTimerRef.current = null;
          return;
        }
        const next = trickleQueueRef.current.shift()!;
        newEventIdsRef.current.add(next.id);
        setEvents((prev) => [next, ...prev]);
        trickleTimerRef.current = setTimeout(drainQueue, 150);
      };

      eventSource.addEventListener("message", (event) => {
        const newEvents: EventWithChannelName[] = JSON.parse(event.data);
        const unique = newEvents.filter(
          (e) => !eventIdsRef.current.has(e.id),
        );
        if (unique.length > 0) {
          unique.forEach((e) => eventIdsRef.current.add(e.id));
          trickleQueueRef.current.push(...unique);
          if (!trickleTimerRef.current) drainQueue();
        }
      });

      eventSource.onerror = (error) => {
        console.error("Error in SSE stream:", error);
      };
    };

    Promise.all([getEvents(), fetchMaxEventId()]).then(([res, maxId]) => {
      res.forEach((event) => eventIdsRef.current.add(event.id));
      setEvents(res);
      setLoading(false);
      establishStream(maxId);
    });

    didScrollToDivider.current = false;
    setLastReadDate(null);

    return () => {
      if (eventSource) eventSource.close();
      trickleQueueRef.current = [];
      if (trickleTimerRef.current) {
        clearTimeout(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
    };
  }, [projectID, channel, search, startDate, endDate, tags, sortBy, sortOrder]);

  // Mark channel as read, capture lastReadAt for divider
  useEffect(() => {
    if (type !== "channel" || !channel) return;

    fetch("/api/unread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelName: channel.name, projectId: channel.projectId }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.lastReadAt) setLastReadDate(new Date(data.lastReadAt));
        window.dispatchEvent(
          new CustomEvent("channel:read", {
            detail: { channelId: data.channelId, channelName: channel.name },
          }),
        );
      })
      .catch(() => {});
  }, [channel?.id]);

  // Clear unread dots when a channel is marked as read
  useEffect(() => {
    const handler = (e: CustomEvent<{ channelName: string }>) => {
      setEvents((prev) =>
        prev.map((ev) =>
          ev.channelName === e.detail.channelName ? { ...ev, read: true } : ev,
        ),
      );
    };
    window.addEventListener("channel:read", handler as EventListener);
    return () => window.removeEventListener("channel:read", handler as EventListener);
  }, []);

  const hasActiveFilters = startDate || endDate || parsedTags.length > 0;
  const hasNewEvents =
    lastReadDate != null &&
    events.some((e) => new Date(e.createdAt) > lastReadDate);

  // Build flat rows array (events interleaved with optional divider)
  const rows: Row[] = [];
  let dividerRowIndex = -1;
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const isFirstOld =
      hasNewEvents &&
      new Date(event.createdAt) <= lastReadDate! &&
      (i === 0 || new Date(events[i - 1].createdAt) > lastReadDate!);

    if (isFirstOld) {
      dividerRowIndex = rows.length;
      rows.push({ kind: "divider" });
    }
    rows.push({
      kind: "event",
      event,
      isNew: newEventIdsRef.current.has(event.id),
    });
  }

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: (i) => (rows[i]?.kind === "divider" ? 32 : 112),
    overscan: 5,
    getItemKey: (i) =>
      rows[i]?.kind === "divider" ? "divider" : rows[i]?.kind === "event" ? rows[i].event.id : i,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // Scroll to unread divider once after initial load
  useEffect(() => {
    if (loading || didScrollToDivider.current || dividerRowIndex === -1) return;
    didScrollToDivider.current = true;
    virtualizer.scrollToIndex(dividerRowIndex, { align: "center" });
  }, [loading, dividerRowIndex]);

  // Infinite scroll: load more when virtualizer approaches the end
  useEffect(() => {
    if (loading || virtualItems.length === 0) return;
    const lastItem = virtualItems[virtualItems.length - 1];
    if (
      lastItem.index >= rows.length - 5 &&
      !loadingMoreRef.current &&
      hasMoreRef.current &&
      eventsRef.current.length > 0
    ) {
      setLoadingMore(true);
      getEvents().then((res) => {
        if (res.length > 0) {
          res.forEach((e) => eventIdsRef.current.add(e.id));
          setEvents((prev) => [...prev, ...res]);
        } else {
          hasMoreRef.current = false;
        }
        setLoadingMore(false);
      });
    }
  }, [virtualItems, loading]);

  const formatTimeFilter = () => {
    if (!startDate && !endDate) return null;
    const start = startDate ? new Date(startDate).toLocaleDateString() : "?";
    const end = endDate ? new Date(endDate).toLocaleDateString() : "?";
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 w-full min-h-screen flex justify-center items-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (!projectID && !channel) {
    return (
      <div className="w-full">
        <div className="w-full flex items-center justify-between p-8 border-b">
          <h1 className="text-2xl font-semibold"># undefined</h1>
        </div>
        <div className="w-full flex justify-center pt-8">
          <h2 className="text-2xl">Channel does not exist.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-h-screen flex flex-col">
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-4 md:p-8 border-b gap-4">
        <div>
          <h1 className="text-2xl font-semibold">
            {type === "project" ? "Feed" : `# ${channel?.name}`}
          </h1>
          {type === "channel" && channel?.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {channel.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <EventFilterDialog
            type={type}
            projectID={projectID}
            channelID={channel?.id}
            currentStartDate={startDate ?? null}
            currentEndDate={endDate ?? null}
            currentTags={parsedTags}
            onApplyFilters={handleApplyFilters}
          />
          <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-full sm:w-[160px] gap-2">
              <ArrowUpDownIcon className="size-4 shrink-0" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Input
              placeholder="Search..."
              type="text"
              className="flex-1 sm:w-auto"
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

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="px-4 md:px-8 py-3 border-b bg-gray-50 dark:bg-white/5 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Active filters:
          </span>
          {(startDate || endDate) && (
            <div className="flex items-center gap-1 rounded-md bg-white dark:bg-white/10 border dark:border-white/10 px-2.5 py-1 text-sm">
              {formatTimeFilter()}
              <button
                onClick={handleRemoveTimeFilter}
                className="ml-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 p-0.5"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          )}
          {parsedTags.map((tag, i) => (
            <div
              key={i}
              className="flex items-center gap-1 rounded-md bg-white dark:bg-white/10 border dark:border-white/10 px-2.5 py-1 text-sm"
            >
              <span>{tagFilterLabel(tag)}</span>
              <button
                onClick={() => handleRemoveTag(i)}
                className="ml-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 p-0.5"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scrollable events */}
      <div
        ref={scrollContainerRef}
        className="w-full flex-1 overflow-y-auto scroll-smooth"
      >
        {events.length === 0 ? (
          <div className="w-full text-center pt-8">
            <h2 className="text-2xl">
              Looks like this {type === "project" ? "project" : "channel"} has
              no events!
            </h2>
          </div>
        ) : (
          <div className="px-4 md:px-8 py-4 md:py-8 w-full lg:w-1/2 mx-auto">
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              {virtualItems.map((virtualRow) => {
                const row = rows[virtualRow.index];
                return (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start}px)`,
                      paddingBottom: "16px",
                    }}
                  >
                    {row.kind === "divider" ? (
                      <div className="flex items-center gap-3 py-1">
                        <div className="flex-1 border-t border-primary/40" />
                        <span className="text-xs font-medium text-primary/70 shrink-0">
                          New
                        </span>
                        <div className="flex-1 border-t border-primary/40" />
                      </div>
                    ) : (
                      <div
                        className={
                          row.isNew
                            ? "animate-in fade-in slide-in-from-bottom-10 duration-300 ease-out"
                            : undefined
                        }
                      >
                        <EventCard event={row.event} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {loadingMore && (
              <p className="text-center text-sm text-muted-foreground py-4">
                Loading...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
