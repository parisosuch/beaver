import { useEffect, useRef, useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "./ui/button";

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
  const [pendingObject, setPendingObject] = useState<string | null>(object);
  const [pendingAction, setPendingAction] = useState<string | null>(action);
  const [suggestions, setSuggestions] = useState<Suggestions>({ objects: [], actions: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    setInput(title ?? "");
  }, [title]);

  useEffect(() => {
    setPendingObject(object);
  }, [object]);

  useEffect(() => {
    setPendingAction(action);
  }, [action]);

  useEffect(() => {
    const endpoint =
      type === "channel" && channelID
        ? `/api/events/channel/${channelID}/names`
        : type === "project" && projectID
          ? `/api/events/project/${projectID}/names`
          : null;
    if (!endpoint) return;
    const url = pendingObject
      ? `${endpoint}?object=${encodeURIComponent(pendingObject)}`
      : endpoint;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.objects) && Array.isArray(data.actions)) {
          setSuggestions(data);
        }
      })
      .catch(() => {});
  }, [type, projectID, channelID, pendingObject]);

  const tokenMatch = parsePrefix(input);

  const filteredOptions = (() => {
    if (!tokenMatch) return [];
    const list = tokenMatch.prefix === "object" ? suggestions.objects : suggestions.actions;
    return list.filter((v) => v.startsWith(tokenMatch.value)).slice(0, 8);
  })();

  useEffect(() => {
    setActiveIndex(0);
  }, [input]);

  useEffect(() => {
    if (showDropdown && optionRefs.current[activeIndex]) {
      optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, showDropdown]);

  const titleFromInput = (): string | null => {
    // Mid-token: input is a "object:..." or "action:..." prefix, not a title.
    if (parsePrefix(input)) return title;
    const trimmed = input.trim();
    return trimmed === "" ? null : trimmed;
  };

  const applyToken = (prefix: "object" | "action", value: string) => {
    if (!SEGMENT_REGEX.test(value)) return;
    const newObject = prefix === "object" ? value : pendingObject;
    const newAction = prefix === "action" ? value : pendingAction;
    if (prefix === "object") setPendingObject(value);
    else setPendingAction(value);
    setInput("");
    setShowDropdown(false);
    onApply({ title: titleFromInput(), object: newObject, action: newAction });
  };

  const commit = () => {
    onApply({ title: titleFromInput(), object: pendingObject, action: pendingAction });
  };

  const clearChip = (kind: "object" | "action") => {
    const newObject = kind === "object" ? null : pendingObject;
    const newAction = kind === "action" ? null : pendingAction;
    if (kind === "object") setPendingObject(null);
    else setPendingAction(null);
    onApply({ title: titleFromInput(), object: newObject, action: newAction });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const dropdownOpen = showDropdown && tokenMatch && filteredOptions.length > 0;

    if (e.key === "ArrowDown" && dropdownOpen) {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % filteredOptions.length);
    } else if (e.key === "ArrowUp" && dropdownOpen) {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + filteredOptions.length) % filteredOptions.length);
    } else if (e.key === "Tab" && dropdownOpen) {
      e.preventDefault();
      applyToken(tokenMatch.prefix, filteredOptions[activeIndex]);
    } else if (e.key === "Tab") {
      e.preventDefault();
    } else if (e.key === "Enter" && dropdownOpen) {
      e.preventDefault();
      applyToken(tokenMatch.prefix, filteredOptions[activeIndex]);
    } else if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && input === "") {
      if (pendingAction) setPendingAction(null);
      else if (pendingObject) setPendingObject(null);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    setShowDropdown(parsePrefix(value) !== null);
  };

  return (
    <div className="flex-1 flex gap-2 items-center">
      <div className="relative flex-1">
        <div className="flex items-center gap-1 rounded-md border bg-transparent px-2 py-1 min-h-9 focus-within:ring-1 focus-within:ring-ring flex-wrap">
          <SearchIcon className="size-4 text-muted-foreground shrink-0" />
          {pendingObject && (
            <Chip label={`object:${pendingObject}`} onRemove={() => clearChip("object")} />
          )}
          {pendingAction && (
            <Chip label={`action:${pendingAction}`} onRemove={() => clearChip("action")} />
          )}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowDropdown(parsePrefix(input) !== null)}
            onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
            placeholder={
              !pendingObject && !pendingAction && !input
                ? "Search by title, or use object: action:"
                : ""
            }
            className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        {showDropdown && tokenMatch && filteredOptions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 rounded-md border bg-popover shadow-md">
            <ul className="max-h-60 overflow-auto py-1 text-sm">
              {filteredOptions.map((option, i) => (
                <li
                  key={option}
                  ref={(el) => {
                    optionRefs.current[i] = el;
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    applyToken(tokenMatch.prefix, option);
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`cursor-pointer px-3 py-1.5 ${
                    i === activeIndex ? "bg-accent" : "hover:bg-accent"
                  }`}
                >
                  <span className="text-muted-foreground">{tokenMatch.prefix}:</span>
                  <span>{option}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <Button variant="secondary" onClick={commit}>
        <SearchIcon />
      </Button>
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
