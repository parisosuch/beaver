import type { ReactionSummary } from "@/lib/beaver/event";
import type { EmojiMartData } from "@emoji-mart/data";
import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import emojiData from "@emoji-mart/data";
import { Input } from "./ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

const data = emojiData as EmojiMartData;

type EmojiEntry = {
  id: string;
  native: string;
  name: string;
  keywords: string[];
};

const ALL_EMOJIS: EmojiEntry[] = data.categories.flatMap((category) =>
  category.emojis.map((id) => {
    const emoji = data.emojis[id];
    return {
      id: emoji.id,
      native: emoji.skins[0].native,
      name: emoji.name,
      keywords: emoji.keywords,
    };
  }),
);

const EMOJI_COLUMNS = 8;
const EMOJI_ROW_HEIGHT = 34;
// Seeds the virtualizer's first render so rows paint immediately instead of
// flashing in after the scroll container is measured. Matches the scroll
// container's inner box (w-72 / max-h-56 minus p-2 padding).
const EMOJI_VIEWPORT = { width: 272, height: 208 };

export async function postReaction(
  eventId: number,
  emoji: string,
): Promise<ReactionSummary | null> {
  const res = await fetch(`/api/events/${eventId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) return null;
  return res.json();
}

export function applyToggle(prev: ReactionSummary[], updated: ReactionSummary): ReactionSummary[] {
  const filtered = prev.filter((r) => r.emoji !== updated.emoji);
  if (updated.count === 0) return filtered;
  return [...filtered, updated];
}

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [query, setQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_EMOJIS;
    return ALL_EMOJIS.filter(
      (e) => e.name.toLowerCase().includes(q) || e.keywords.some((k) => k.includes(q)),
    );
  }, [query]);

  const rowCount = Math.ceil(filtered.length / EMOJI_COLUMNS);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => EMOJI_ROW_HEIGHT,
    overscan: 6,
    initialRect: EMOJI_VIEWPORT,
  });

  return (
    <div className="w-72">
      <div className="border-b p-2">
        <Input
          autoFocus
          placeholder="Search emoji…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8"
        />
      </div>
      <div ref={scrollRef} className="max-h-56 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No emoji found</p>
        ) : (
          <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const start = virtualRow.index * EMOJI_COLUMNS;
              const rowEmojis = filtered.slice(start, start + EMOJI_COLUMNS);
              return (
                <div
                  key={virtualRow.key}
                  className="absolute left-0 top-0 grid w-full grid-cols-8 gap-0.5"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  {rowEmojis.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      title={e.name}
                      onClick={() => onSelect(e.native)}
                      className="flex h-8 w-8 items-center justify-center rounded-md text-lg hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      {e.native}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Builds a Discord/Slack-style reactor list, e.g. "alice", "alice and bob",
// "alice, bob and carol".
function formatReactors(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

// Controlled: the parent owns the reaction state (a single source of truth shared
// with the emoji picker), so adding several reactions in a row stays in sync.
export function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: ReactionSummary[];
  onToggle: (emoji: string) => void;
}) {
  if (reactions.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-1">
        {[...reactions]
          .sort((a, b) => b.count - a.count)
          .map((r) => (
            <Tooltip key={r.emoji}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggle(r.emoji);
                  }}
                  className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm transition-colors ${
                    r.userReacted
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
                      : "bg-gray-100 text-foreground hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-xs text-muted-foreground">{r.count}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-56">
                <span className="font-medium">{formatReactors(r.users)}</span>
                <span className="text-primary-foreground/70"> reacted with </span>
                <span>{r.emoji}</span>
              </TooltipContent>
            </Tooltip>
          ))}
      </div>
    </TooltipProvider>
  );
}
