import type { EventWithChannelName } from "@/lib/beaver/event";
import { Card } from "./ui/card";
import { getEventTime } from "@/lib/utils";
import { BookmarkIcon } from "lucide-react";
import { memo, useRef } from "react";

const EventCard = memo(function EventCard({ event }: { event: EventWithChannelName }) {
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
      <Card className="p-4 md:p-8 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 dark:bg-white/10 p-2 rounded-md">
            <p className="text-xl">{event.icon ? `${event.icon} ` : "🪵"}</p>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-medium">{event.name}</h2>
            <div className="flex space-x-2 items-center text-sm text-muted-foreground">
              <p># {event.channelName}</p>
              <p>{getEventTime(new Date(event.createdAt))}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {event.bookmarked && (
              <BookmarkIcon size={14} className="fill-current text-muted-foreground" />
            )}
            {!event.read && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </div>
        </div>
      </Card>
    </a>
  );
});

export default EventCard;
