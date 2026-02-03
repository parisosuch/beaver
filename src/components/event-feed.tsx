import type { EventWithChannelName, TagFilter } from "@/lib/beaver/event";
import { useEffect, useRef, useState } from "react";
import EventCard from "./event-card";
import { motion } from "framer-motion";
import { Input } from "./ui/input";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "./ui/button";
import { navigate } from "astro:transitions/client";
import type { Channel } from "@/lib/beaver/channel";
import EventFilterDialog from "./event-filter-dialog";

export default function EventFeed({
  type,
  projectID,
  channel,
  search,
  startDate,
  endDate,
  tags,
}: {
  type: "channel" | "project";
  projectID?: number;
  channel?: Channel;
  search?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  tags?: string | null;
}) {
  const [events, setEvents] = useState<EventWithChannelName[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState(search ?? "");

  const eventIdsRef = useRef<Set<number>>(new Set());
  const eventsRef = useRef<EventWithChannelName[]>([]);
  const loadingMoreRef = useRef(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
  }) => {
    const params = new URLSearchParams();

    const newSearch = overrides.search !== undefined ? overrides.search : search;
    const newStartDate = overrides.startDate !== undefined ? overrides.startDate : startDate;
    const newEndDate = overrides.endDate !== undefined ? overrides.endDate : endDate;
    const newTags = overrides.tags !== undefined ? overrides.tags : parsedTags;

    if (newSearch) params.set("search", newSearch);
    if (newStartDate) params.set("startDate", newStartDate);
    if (newEndDate) params.set("endDate", newEndDate);
    if (newTags && newTags.length > 0) params.set("tags", JSON.stringify(newTags));

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

    return params.length > 0 ? `&${params.join("&")}` : "";
  };

  const getEvents = async (): Promise<EventWithChannelName[]> => {
    const cursor = eventsRef.current.at(-1)?.id ?? null;
    let endpoint = "/api/events";

    if (channel) {
      endpoint += `/channel/${channel.id}?beforeId=${cursor}&limit=20`;
    } else {
      endpoint += `/project/${projectID}?beforeId=${cursor}&limit=20`;
    }
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }

    // Add filter params
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

  // Handle filter changes - navigate to new URL
  const handleApplyFilters = (newStartDate: string | null, newEndDate: string | null, newTags: TagFilter[]) => {
    navigate(buildFilterUrl({
      startDate: newStartDate,
      endDate: newEndDate,
      tags: newTags.length > 0 ? newTags : null,
    }));
  };

  // Remove a specific tag filter
  const handleRemoveTag = (index: number) => {
    const newTags = parsedTags.filter((_, i) => i !== index);
    navigate(buildFilterUrl({ tags: newTags.length > 0 ? newTags : null }));
  };

  // Remove time filter
  const handleRemoveTimeFilter = () => {
    navigate(buildFilterUrl({ startDate: null, endDate: null }));
  };

  // Initial load use effect
  useEffect(() => {
    let eventSource: EventSource | null = null;

    // Reset state when dependencies change
    setEvents([]);
    setLoading(true);
    eventIdsRef.current.clear();

    // Establish SSE connection
    const establishStream = (initialEvents: EventWithChannelName[]) => {
      if (initialEvents.length === 0) {
        return;
      }

      let endpoint = "/api/events";
      const cursor = initialEvents.at(0)!.id;

      if (channel) {
        endpoint += `/channel/${channel.id}/event-stream?afterId=${cursor}`;
      } else {
        endpoint += `/project/${projectID}/event-stream?afterId=${cursor}`;
      }

      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }

      // Add filter params
      endpoint += buildApiFilterParams();

      eventSource = new EventSource(endpoint);

      eventSource.addEventListener("message", (event) => {
        const newEvents: EventWithChannelName[] = JSON.parse(event.data);

        const newUniqueEvents = newEvents.filter(
          (newEvent) => !eventIdsRef.current.has(newEvent.id)
        );

        if (newUniqueEvents.length > 0) {
          setEvents((prevEvents) => [...newUniqueEvents, ...prevEvents]);

          newUniqueEvents.forEach((event) => {
            eventIdsRef.current.add(event.id);
          });
        }
      });

      eventSource.onerror = (error) => {
        console.error("Error in SSE stream:", error);
      };
    };

    getEvents().then((res) => {
      // Add initial events to the ref to prevent duplicates
      res.forEach((event) => eventIdsRef.current.add(event.id));
      setEvents(res);
      setLoading(false);
      establishStream(res);
    });

    // Cleanup: close EventSource when dependencies change or component unmounts
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [projectID, channel, search, startDate, endDate, tags]);

  // Infinite scroll effect
  useEffect(() => {
    if (!bottomRef.current || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Use refs to avoid stale closures and prevent infinite loops
        if (
          entry.isIntersecting &&
          !loadingMoreRef.current &&
          eventsRef.current.length > 0
        ) {
          setLoadingMore(true);
          getEvents().then((res) => {
            if (res.length > 0) {
              setEvents((prev) => [...prev, ...res]);
            }
            setLoadingMore(false);
          });
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [projectID, channel, search, startDate, endDate, tags]);

  // Format time filter for display
  const formatTimeFilter = () => {
    if (!startDate && !endDate) return null;
    const start = startDate ? new Date(startDate).toLocaleDateString() : "?";
    const end = endDate ? new Date(endDate).toLocaleDateString() : "?";
    return `${start} - ${end}`;
  };

  const hasActiveFilters = startDate || endDate || parsedTags.length > 0;

  if (loading) {
    return (
      <div className="p-8 w-full min-h-screen flex justify-center items-center">
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
      <div className="w-full flex items-center justify-between p-8 border-b">
        <div>
          <h1 className="text-2xl font-semibold">
            {type === "project" ? "Feed" : `# ${channel?.name}`}
          </h1>
          {type === "channel" && channel?.description && (
            <p className="text-sm text-black/50 mt-1">{channel.description}</p>
          )}
        </div>
        <div className="flex space-x-2 items-center">
          <EventFilterDialog
            type={type}
            projectID={projectID}
            channelID={channel?.id}
            currentStartDate={startDate ?? null}
            currentEndDate={endDate ?? null}
            currentTags={parsedTags}
            onApplyFilters={handleApplyFilters}
          />
          <Input
            placeholder="Search..."
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="secondary" onClick={handleSearch}>
            <SearchIcon />
          </Button>
        </div>
      </div>

      {/* Active filters display */}
      {hasActiveFilters && (
        <div className="px-8 py-3 border-b bg-gray-50 flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600">Active filters:</span>
          {(startDate || endDate) && (
            <div className="flex items-center gap-1 rounded-md bg-white border px-2.5 py-1 text-sm">
              {formatTimeFilter()}
              <button
                onClick={handleRemoveTimeFilter}
                className="ml-1 rounded hover:bg-gray-100 p-0.5"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          )}
          {parsedTags.map((tag, i) => (
            <div
              key={i}
              className="flex items-center gap-1 rounded-md bg-white border px-2.5 py-1 text-sm"
            >
              <span className="font-medium">{tag.key}</span>
              <span className="text-gray-400">=</span>
              <span>{tag.value}</span>
              <button
                onClick={() => handleRemoveTag(i)}
                className="ml-1 rounded hover:bg-gray-100 p-0.5"
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
        className="w-full flex justify-center max-h-screen overflow-y-auto scroll-smooth"
      >
        <div className="p-8 w-1/2 space-y-4">
          {events.length === 0 ? (
            <div className="w-full text-center">
              <h2 className="text-2xl">
                Looks like this {type === "project" ? "project" : "channel"} has
                no events!
              </h2>
            </div>
          ) : (
            events.map((event) => (
              <motion.div
                key={event.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <EventCard event={event} />
              </motion.div>
            ))
          )}
          <div ref={bottomRef} style={{ height: "1px" }} />
        </div>
      </div>
    </div>
  );
}
