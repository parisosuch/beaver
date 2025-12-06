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
  const [events, setEvents] = useState<EventWithChannelName[]>([]); // Store events in state
  const eventIdsRef = useRef<Set<number>>(new Set()); // Track event IDs with useRef
  const [loading, setLoading] = useState(true);

  const [searchInput, setSearchInput] = useState(search);

  const handleSearch = () => {
    if (search && !searchInput) {
      navigate(`/dashboard/${projectID}/feed`);
    } else if (!searchInput) {
      return;
    } else {
      navigate(
        `/dashboard/${projectID}/feed?search=${encodeURIComponent(searchInput)}`
      );
    }
  };

  useEffect(() => {
    // Connect to the SSE endpoint
    var endpoint = "/api/events";

    if (channel) {
      endpoint += `/channel/${channel.id}`;
    } else {
      endpoint += `/project/${projectID}`;
    }

    if (search) {
      endpoint += `?search=${encodeURI(search)}`;
    }

    const eventSource = new EventSource(endpoint);

    // Event listener for incoming events
    eventSource.addEventListener("message", (event) => {
      const newEvents: EventWithChannelName[] = JSON.parse(event.data);

      // Filter out events that are already in the eventIds set (useRef)
      const newUniqueEvents = newEvents.filter(
        (newEvent) => !eventIdsRef.current.has(newEvent.id)
      );

      if (newUniqueEvents.length > 0) {
        // Update state with new unique events (add them to the beginning)
        setEvents((prevEvents) => [...newUniqueEvents, ...prevEvents]);

        // Update the eventIdsRef to track the IDs of new events
        newUniqueEvents.forEach((event) => {
          eventIdsRef.current.add(event.id);
        });
      }
      setLoading(false);
    });

    // Handle SSE errors
    eventSource.onerror = (error) => {
      console.error("Error in SSE stream:", error);
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
    };
  }, [projectID]);

  if (loading) {
    return (
      <div className="p-8 w-1/2">
        <p className="text-center">Loading...</p>
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
    <div className="w-full max-h-screen">
      <div className="w-full flex items-center justify-between p-8 border-b">
        <h1 className="text-2xl font-semibold">
          {type === "project" ? "Feed" : `# ${channel?.name}`}
        </h1>
        {/* Search Section*/}
        <div className="flex space-x-2 items-center">
          <Input
            placeholder="Search..."
            type="text"
            value={searchInput ? searchInput : ""}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
            onChange={(e) => {
              e.preventDefault();

              setSearchInput(e.target.value);
            }}
          />
          <Button
            variant="secondary"
            className="hover:cursor-pointer"
            onClick={handleSearch}
          >
            <SearchIcon />
          </Button>
        </div>
      </div>
      <div className="w-full flex justify-center max-h-screen overflow-y-auto no-scrollbar">
        <div className="p-8 w-1/2 space-y-4">
          {events.length === 0 ? (
            <div className="w-full text-center">
              <h2 className="text-2xl">
                Looks like this {type === "project" ? "project" : "channel"} has
                no events!
              </h2>
            </div>
          ) : (
            events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <EventCard key={event.id} event={event} />
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
