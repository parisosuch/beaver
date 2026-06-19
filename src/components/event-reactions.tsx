import type { ReactionSummary } from "@/lib/beaver/event";
import { useState } from "react";

export const EMOJI_LIST = [
  "👍",
  "👎",
  "❤️",
  "😄",
  "😮",
  "😢",
  "😡",
  "🎉",
  "🔥",
  "✅",
  "❌",
  "🚀",
  "💯",
  "👏",
  "🤔",
  "💡",
];

async function postReaction(eventId: number, emoji: string): Promise<ReactionSummary | null> {
  const res = await fetch(`/api/events/${eventId}/reactions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ emoji }),
  });
  if (!res.ok) return null;
  return res.json();
}

function applyToggle(prev: ReactionSummary[], updated: ReactionSummary): ReactionSummary[] {
  const filtered = prev.filter((r) => r.emoji !== updated.emoji);
  if (updated.count === 0) return filtered;
  return [...filtered, updated];
}

export function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-0.5 p-1">
      {EMOJI_LIST.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onSelect(emoji);
          }}
          className="text-base p-1.5 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors leading-none"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function ReactionBar({
  eventId,
  initialReactions,
}: {
  eventId: number;
  initialReactions: ReactionSummary[];
}) {
  const [reactions, setReactions] = useState(initialReactions);

  const toggle = async (emoji: string) => {
    const updated = await postReaction(eventId, emoji);
    if (updated) setReactions((prev) => applyToggle(prev, updated));
  };

  if (reactions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {[...reactions]
        .sort((a, b) => b.count - a.count)
        .map((r) => (
          <button
            key={r.emoji}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(r.emoji);
            }}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm border transition-colors ${
              r.userReacted
                ? "bg-blue-50 border-blue-300 dark:bg-blue-950 dark:border-blue-700"
                : "bg-gray-50 border-gray-200 dark:bg-white/5 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10"
            }`}
          >
            <span>{r.emoji}</span>
            <span className="text-xs text-muted-foreground">{r.count}</span>
          </button>
        ))}
    </div>
  );
}

export { postReaction, applyToggle };
