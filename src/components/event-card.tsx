import type { EventWithChannelName } from "@/lib/beaver/event";
import { Card } from "./ui/card";
import { getEventTime } from "@/lib/utils";
import { useRef } from "react";

export default function EventCard({ event }: { event: EventWithChannelName }) {
  const eventUrl = `/dashboard/${event.projectId}/events/${event.id}`;
  const prefetched = useRef(false);

  const handleMouseEnter = () => {
    if (prefetched.current) return;
    prefetched.current = true;

    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = eventUrl;
    document.head.appendChild(link);
  };

  return (
    <a href={eventUrl} onMouseEnter={handleMouseEnter}>
      <Card className="p-8 hover:bg-gray-50 transition-colors cursor-pointer">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 p-2 rounded-md">
            <p className="text-xl">{event.icon ? `${event.icon} ` : "🪵"}</p>
          </div>
          <div>
            <h2 className="text-xl font-medium">{event.name}</h2>
            <div className="flex space-x-2 items-center text-sm text-black/75">
              <p># {event.channelName}</p>
              <p>{getEventTime(new Date(event.createdAt))}</p>
            </div>
          </div>
        </div>
      </Card>
    </a>
  );
}
