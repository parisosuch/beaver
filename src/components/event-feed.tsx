import type { EventWithChannelName } from "@/lib/beaver/event";
import { useEffect, useRef, useState } from "react";
import EventCard from "./event-card";
import { motion } from "framer-motion";
import { Input } from "./ui/input";
import { SearchIcon } from "lucide-react";
import { Button } from "./ui/button";
import { navigate } from "astro:transitions/client";
import type { Channel } from "@/lib/beaver/channel";

export default function EventFeed({
  type,
  projectID,
  channel,
  search,
}: {
  type: "channel" | "project";
  projectID?: number;
  channel?: Channel;
  search?: string | null;
}) {
  const [events, setEvents] = useState<EventWithChannelName[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState(search);

  const eventIdsRef = useRef<Set<number>>(new Set());
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleSearch = () => {
    if (search && !searchInput) {
      navigate(`/dashboard/${projectID}/feed`);
    } else if (!searchInput) {
      return;
    } else {
      navigate(
        projectID
          ? `/dashboard/${projectID}/feed?search=${encodeURIComponent(
              searchInput
            )}`
          : `/dashboard/${projectID}/channels/${
              channel!.id
            }search=${encodeURIComponent(searchInput)}`
      );
    }
  };

  const getEvents = async (): Promise<EventWithChannelName[]> => {
    const cursor = events.at(-1)?.id ?? null;
    let endpoint = "/api/events";

    if (channel) {
      endpoint += `/channel/${channel.id}`;
    } else {
      endpoint += `/project/${projectID}?beforeId=${cursor}&limit=20`;
    }
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }

    try {
      const res = await fetch(endpoint);
      const batch = await res.json();

      return batch as EventWithChannelName[];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  // Initial load use effect
  useEffect(() => {
    // Establish SSE connection
    const establishStream = async (initialEvents: EventWithChannelName[]) => {
      let endpoint = "/api/events";

      if (initialEvents.length === 0) {
        return;
      }

      const cursor = initialEvents.at(0)!.id;

      if (channel) {
        endpoint += `/channel/${channel.id}`;
      } else {
        endpoint += `/project/${projectID}/event-stream?afterId=${cursor}`;
      }

      if (search) {
        endpoint += `&search=${encodeURIComponent(search)}`;
      }

      const eventSource = new EventSource(endpoint);

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

      return () => {
        eventSource.close();
      };
    };

    getEvents().then((res) => {
      setEvents(res);
      setLoading(false);
      establishStream(res);
    });
  }, [projectID, channel]);

  // Infinite scroll effect
  useEffect(() => {
    if (!bottomRef.current || !scrollContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !loadingMore && !(events.length === 0)) {
          setLoadingMore(true);
          getEvents().then((res) => {
            setEvents([...events, ...res]);
            setLoadingMore(false);
          });
        }
      },
      {
        root: scrollContainerRef.current,
        rootMargin: "1000px",
        threshold: 0.1,
      }
    );

    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [events]);

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
        <h1 className="text-2xl font-semibold">
          {type === "project" ? "Feed" : `# ${channel?.name}`}
        </h1>
        <div className="flex space-x-2 items-center">
          <Input
            placeholder="Search..."
            type="text"
            value={searchInput || ""}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button variant="secondary" onClick={handleSearch}>
            <SearchIcon />
          </Button>
        </div>
      </div>

      {/* Scrollable events */}
      <div
        ref={scrollContainerRef}
        className="w-full flex justify-center max-h-screen overflow-y-auto"
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
            events.map((event, index) => {
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: events.length === 20 ? 20 : 0 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: events.length === 20 ? index * 0.05 : 0,
                  }}
                >
                  <EventCard event={event} />
                </motion.div>
              );
            })
          )}
          <div ref={bottomRef} style={{ height: "1px" }} />
        </div>
      </div>
    </div>
  );
}
