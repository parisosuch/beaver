import type { EventWithChannelName } from "@/lib/beaver/event";
import { useEffect, useRef, useState } from "react";
import EventCard from "./event-card";
import { motion } from "framer-motion";

export default function ProjectFeed({ projectID }: { projectID: number }) {
  const [events, setEvents] = useState<EventWithChannelName[]>([]); // Store events in state
  const eventIdsRef = useRef<Set<number>>(new Set()); // Track event IDs with useRef
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Connect to the SSE endpoint
    const eventSource = new EventSource(`/api/events/project/${projectID}`);

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

        setLoading(false);

        // Update the eventIdsRef to track the IDs of new events
        newUniqueEvents.forEach((event) => {
          eventIdsRef.current.add(event.id);
        });
      }
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

  return (
    <div className="p-8 w-1/2 space-y-4">
      {events.length === 0 ? (
        <div className="w-full text-center">
          <h2 className="text-2xl">Looks like this project has no events!</h2>
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
  );
}
