import type { EventWithChannelName, ReactionSummary } from "@/lib/beaver/event";
import { Card } from "./ui/card";
import { getEventTime } from "@/lib/utils";
import { BookmarkIcon } from "lucide-react";
import { memo, useRef, useState } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "./ui/context-menu";
import { EmojiPicker, ReactionBar, postReaction, applyToggle } from "./event-reactions";

const EventCard = memo(function EventCard({
  event,
  compact = false,
}: {
  event: EventWithChannelName;
  compact?: boolean;
}) {
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

  const reactionsBlock = reactions.length > 0 && (
    <div
      className="pointer-events-auto shrink-0"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <ReactionBar reactions={reactions} onToggle={handleReact} max={compact ? 3 : undefined} />
    </div>
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          className={
            compact
              ? "py-0 outline-none hover:bg-gray-50 dark:hover:bg-white/5 transition-colors overflow-hidden cursor-pointer relative"
              : "outline-none hover:bg-gray-50 dark:hover:bg-white/5 transition-colors overflow-hidden cursor-pointer relative"
          }
        >
          {/* Stretched link: the anchor covers the whole card so the card stays
              clickable, while the content sits above it with pointer-events disabled
              so clicks fall through. Interactive bits (reactions) opt back in. */}
          <a
            href={eventUrl}
            onMouseEnter={handleMouseEnter}
            aria-label={event.title}
            className="absolute inset-0 z-0"
          />
          {compact ? (
            // Single-line row, à la Discord/Slack compact mode: icon and metadata sit
            // inline with the title instead of stacked underneath it, and the title is
            // the only element that truncates so the trailing metadata stays visible.
            <div className="relative z-10 pointer-events-none flex items-center gap-2 px-3 py-1.5">
              <span className="shrink-0">{event.icon || "🪵"}</span>
              <h2 className="text-sm font-medium truncate min-w-0">{event.title}</h2>
              {reactionsBlock}
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                # {event.channelName}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {getEventTime(new Date(event.createdAt))}
              </span>
              {event.bookmarked && (
                <BookmarkIcon size={12} className="shrink-0 fill-current text-muted-foreground" />
              )}
              {!event.read && <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />}
            </div>
          ) : (
            <div className="relative z-10 pointer-events-none p-4 md:p-8">
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
                  {reactions.length > 0 && <div className="mt-1.5">{reactionsBlock}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {event.bookmarked && (
                    <BookmarkIcon size={14} className="fill-current text-muted-foreground" />
                  )}
                  {!event.read && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                </div>
              </div>
            </div>
          )}
        </Card>
      </ContextMenuTrigger>
      {/* Disable the open/close animation: the fade/zoom drops frames while the emoji
          glyphs rasterize on first paint, which reads as a stutter. It must be a class,
          not an inline style — Radix's popper owns the inline `animation` property and
          overwrites any inline override once the content is positioned. */}
      <ContextMenuContent className="p-0 overflow-hidden [animation:none]!">
        <EmojiPicker onSelect={handleReact} />
      </ContextMenuContent>
    </ContextMenu>
  );
});

export default EventCard;
