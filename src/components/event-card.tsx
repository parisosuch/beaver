import type { EventWithChannelName, ReactionSummary } from "@/lib/beaver/event";
import { getEventClock, getEventTime } from "@/lib/utils";
import { BookmarkIcon } from "lucide-react";
import { memo, useRef, useState } from "react";
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from "./ui/context-menu";
import { EmojiPicker, ReactionBar, postReaction, applyToggle } from "./event-reactions";

const EventCard = memo(function EventCard({
  event,
  compact = false,
  selected = false,
  onSelect,
}: {
  event: EventWithChannelName;
  compact?: boolean;
  selected?: boolean;
  // When provided, a plain left click selects the event in the side-by-side
  // detail panel instead of navigating. The anchor is still a real link, so
  // middle-click, cmd-click and keyboard Enter keep working.
  onSelect?: (id: number) => void;
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

  const handleClick = (e: React.MouseEvent) => {
    if (!onSelect) return;
    // Let the browser handle any click that means "open somewhere else".
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onSelect(event.id);
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
        {/* Stream row: the timestamp sits in a fixed left gutter against a
            continuous rule, and the event content hangs off a node on that rule.
            Chronology is the structure, so the eye tracks one vertical line
            instead of re-finding the start of each card. */}
        {/* The gutter, rule and content are real flex columns rather than
            absolutely-positioned offsets, so the timestamp and the title share
            a line box and stay aligned at any font size. Vertical padding lives
            on the columns, not the row, which lets the rule column stretch the
            full row height and read as one continuous line down the list. */}
        <div
          className={`group relative flex gap-3 pl-3 pr-4 transition-colors ${
            selected ? "bg-accent" : "hover:bg-muted/60"
          }`}
          data-selected={selected || undefined}
        >
          <a
            href={eventUrl}
            onMouseEnter={handleMouseEnter}
            onClick={handleClick}
            aria-label={`${event.title}, ${event.channelName}, ${getEventTime(new Date(event.createdAt))}`}
            aria-current={selected ? "true" : undefined}
            className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          />

          <time
            dateTime={new Date(event.createdAt).toISOString()}
            title={getEventTime(new Date(event.createdAt))}
            className={`relative z-10 pointer-events-none w-14 md:w-16 shrink-0 text-right text-xs leading-5 text-muted-foreground tabular-nums ${
              compact ? "py-1.5" : "py-2"
            }`}
          >
            {getEventClock(new Date(event.createdAt))}
          </time>

          <div aria-hidden="true" className="relative w-3 shrink-0">
            <span className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-border" />
            {/* Filled node = unread, hollow = read. */}
            <span
              className={`absolute left-1/2 size-2.5 -translate-x-1/2 rounded-full ring-[1.5px] transition-shadow ${
                compact ? "top-[11px]" : "top-[13px]"
              } ${
                event.read
                  ? "bg-background ring-border group-hover:ring-muted-foreground"
                  : "bg-primary ring-primary"
              }`}
            />
          </div>

          <div
            className={`relative z-10 pointer-events-none min-w-0 flex-1 ${
              compact ? "py-1.5 flex items-center gap-2.5" : "py-2"
            }`}
          >
            <h2
              className={`truncate leading-5 ${event.read ? "font-normal" : "font-medium"} ${
                compact ? "text-sm" : "text-[15px]"
              }`}
            >
              {event.icon ? `${event.icon} ` : "🪵 "}
              {event.title}
            </h2>

            <div
              className={`flex items-center gap-2.5 text-xs text-muted-foreground min-w-0 ${
                compact ? "shrink-0" : "mt-0.5"
              }`}
            >
              <span className="shrink-0"># {event.channelName}</span>
              {!compact && (
                <span className="font-mono truncate">
                  {event.eventObject}.{event.eventAction}
                </span>
              )}
              {reactionsBlock}
              {event.bookmarked && (
                <BookmarkIcon size={12} className="shrink-0 fill-current" aria-label="Bookmarked" />
              )}
              {!event.read && <span className="sr-only">Unread</span>}
            </div>
          </div>
        </div>
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
