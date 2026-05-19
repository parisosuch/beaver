import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";

type Suggestions = { objects: string[]; actions: string[] };

const SEGMENT_REGEX = /^[a-z][a-z_]*$/;

export default function EventSearchBar({
  type,
  projectID,
  channelID,
  title,
  object,
  action,
  onApply,
}: {
  type: "project" | "channel";
  projectID?: number;
  channelID?: number;
  title: string | null;
  object: string | null;
  action: string | null;
  onApply: (next: { title: string | null; object: string | null; action: string | null }) => void;
}) {
  const [input, setInput] = useState(title ?? "");
  const [suggestions, setSuggestions] = useState<Suggestions>({ objects: [], actions: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(title ?? "");
  }, [title]);

  useEffect(() => {
    const endpoint =
      type === "channel" && channelID
        ? `/api/events/channel/${channelID}/names`
        : type === "project" && projectID
          ? `/api/events/project/${projectID}/names${object ? `?object=${encodeURIComponent(object)}` : ""}`
          : null;
    if (!endpoint) return;
    const url =
      type === "channel" && object ? `${endpoint}?object=${encodeURIComponent(object)}` : endpoint;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.objects) && Array.isArray(data.actions)) {
          setSuggestions(data);
        }
      })
      .catch(() => {});
  }, [type, projectID, channelID, object]);

  const tokenMatch = parsePrefix(input);

  const filteredOptions = (() => {
    if (!tokenMatch) return [];
    const list = tokenMatch.prefix === "object" ? suggestions.objects : suggestions.actions;
    return list.filter((v) => v.startsWith(tokenMatch.value)).slice(0, 8);
  })();

  const applyToken = (prefix: "object" | "action", value: string) => {
    if (!SEGMENT_REGEX.test(value)) return;
    if (prefix === "object") {
      onApply({ title, object: value, action });
    } else {
      onApply({ title, object, action: value });
    }
    setInput("");
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (tokenMatch && tokenMatch.value !== "") {
        applyToken(tokenMatch.prefix, tokenMatch.value);
      } else if (!tokenMatch) {
        onApply({ title: input.trim() === "" ? null : input.trim(), object, action });
        setShowDropdown(false);
      }
    } else if (e.key === "Backspace" && input === "") {
      if (action) onApply({ title, object, action: null });
      else if (object) onApply({ title, object: null, action: null });
      else if (title) onApply({ title: null, object, action });
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setShowDropdown(parsePrefix(value) !== null);
  };

  return (
    <div className="relative flex-1">
      <div className="flex items-center gap-1 rounded-md border bg-transparent px-2 py-1 min-h-9 focus-within:ring-1 focus-within:ring-ring flex-wrap">
        <SearchIcon className="size-4 text-muted-foreground shrink-0" />
        {object && (
          <Chip
            label={`object:${object}`}
            onRemove={() => onApply({ title, object: null, action })}
          />
        )}
        {action && (
          <Chip
            label={`action:${action}`}
            onRemove={() => onApply({ title, object, action: null })}
          />
        )}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowDropdown(parsePrefix(input) !== null)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          placeholder={
            !object && !action && !title ? "Search by title, or use object: action:" : ""
          }
          className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>
      {showDropdown && tokenMatch && filteredOptions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          <ul className="max-h-60 overflow-auto py-1 text-sm">
            {filteredOptions.map((option) => (
              <li
                key={option}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyToken(tokenMatch.prefix, option);
                }}
                className="cursor-pointer px-3 py-1.5 hover:bg-accent"
              >
                <span className="text-muted-foreground">{tokenMatch.prefix}:</span>
                <span>{option}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs">
      <span className="font-mono">{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded hover:bg-secondary-foreground/10"
        aria-label={`Remove ${label}`}
      >
        <XIcon className="size-3" />
      </button>
    </div>
  );
}

function parsePrefix(input: string): { prefix: "object" | "action"; value: string } | null {
  const objMatch = input.match(/^object:([a-z_]*)$/i);
  if (objMatch) return { prefix: "object", value: objMatch[1].toLowerCase() };
  const actMatch = input.match(/^action:([a-z_]*)$/i);
  if (actMatch) return { prefix: "action", value: actMatch[1].toLowerCase() };
  return null;
}
