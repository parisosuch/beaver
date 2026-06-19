import type { EventWithChannelName, ReactionSummary } from "@/lib/beaver/event";
import { Card } from "./ui/card";
import { getEventTime } from "@/lib/utils";
import { BookmarkIcon } from "lucide-react";
import { memo, useRef, useState } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuTrigger,
} from "./ui/context-menu";
import { EmojiPicker, ReactionBar, postReaction, applyToggle } from "./event-reactions";

const EventCard = memo(function EventCard({ event }: { event: EventWithChannelName }) {
  const [reactions, setReactions] = useState<ReactionSummary[]>(event.reactions);
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

  const handleReact = async (emoji: string) => {
    const updated = await postReaction(event.id, emoji);
    if (updated) setReactions((prev) => applyToggle(prev, updated));
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div>
          <a href={eventUrl} onMouseEnter={handleMouseEnter}>
            <Card className="p-4 md:p-8 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer">
              <div className="flex items-center space-x-4">
                <div className="bg-gray-100 dark:bg-white/10 p-2 rounded-md">
                  <p className="text-xl">{event.icon ? `${event.icon} ` : "🪵"}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-0.5">
                    <span>{event.eventObject}</span>
                    <span>·</span>
                    <span>{event.eventAction}</span>
                  </div>
                  <h2 className="text-xl font-medium truncate">{event.title}</h2>
                  <div className="flex space-x-2 items-center text-sm text-muted-foreground">
                    <p># {event.channelName}</p>
                    <p>{getEventTime(new Date(event.createdAt))}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {event.bookmarked && (
                    <BookmarkIcon size={14} className="fill-current text-muted-foreground" />
                  )}
                  {!event.read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
              </div>
            </Card>
          </a>
          {reactions.length > 0 && (
            <div className="px-1 pt-1.5 pb-0.5">
              <ReactionBar eventId={event.id} initialReactions={reactions} />
            </div>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-auto p-0">
        <ContextMenuLabel className="px-2 pt-2 pb-1 text-xs text-muted-foreground font-normal">
          React
        </ContextMenuLabel>
        <EmojiPicker onSelect={handleReact} />
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default EventCard;
