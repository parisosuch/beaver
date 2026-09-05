import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { SendIcon, Trash2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

type Comment = {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  body: string;
  createdAt: string | Date;
};

type Member = { userId: number; userName: string };
type ChannelRef = { id: number; name: string };

// What counts as a token for each trigger, anchored at the cursor. Usernames stay
// on \w to match the server-side mention parser in lib/beaver/notification.ts;
// channel names also allow "-" because sanitizeName turns spaces into hyphens.
const TRIGGERS = {
  "@": /@(\w*)$/,
  "#": /#([\w-]*)$/,
} as const;

type Trigger = keyof typeof TRIGGERS;

const MAX_SUGGESTIONS = 6;

// How close to the end of the thread still counts as "reading the end of it".
const NEAR_BOTTOM_PX = 120;

// A posted comment comes back over the SSE stream rather than from the POST, so
// the scroll has to wait for a frame that may never arrive. Past this window the
// intent is stale and someone else's comment must not inherit it.
const FOLLOW_WINDOW_MS = 5000;

// scrollIntoView moves the nearest scrollable ancestor, which is the document on
// the event page and the <aside> in the feed's side panel. Read from the same
// element so the near-bottom test matches whatever the scroll will actually move.
function scrollContainer(el: HTMLElement | null): Element | null {
  for (let node = el?.parentElement ?? null; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
      return node;
    }
  }
  return document.scrollingElement;
}

function isNearBottom(el: HTMLElement | null) {
  const container = scrollContainer(el);
  if (!container) return false;
  return container.scrollHeight - container.scrollTop - container.clientHeight <= NEAR_BOTTOM_PX;
}

function excerpt(body: string, max = 80) {
  const text = body.trim().replace(/\s+/g, " ");
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function initials(name: string) {
  return name
    .split(/[\s_-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function renderBody(body: string, projectId: number, channelIds: Map<string, number>) {
  const parts = body.split(/(@\w+|#[\w-]+)/g);
  return parts.map((part, i) => {
    if (part.startsWith("@")) {
      return (
        <span key={i} className="text-primary font-medium">
          {part}
        </span>
      );
    }
    if (part.startsWith("#")) {
      // Only link tokens that name a real channel, so prose like "issue #42"
      // stays prose.
      const id = channelIds.get(part.slice(1).toLowerCase());
      if (id === undefined) return part;
      return (
        <a
          key={i}
          href={`/dashboard/${projectId}/channels/${id}`}
          className="text-primary font-medium hover:underline"
        >
          {part}
        </a>
      );
    }
    return part;
  });
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="size-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-xs font-semibold text-muted-foreground select-none">
      {initials(name)}
    </div>
  );
}

export default function EventComments({
  eventId,
  projectId,
  currentUserId,
  canModerate,
}: {
  eventId: number;
  projectId: number;
  currentUserId: number;
  canModerate: boolean;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [channels, setChannels] = useState<ChannelRef[]>([]);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [autocomplete, setAutocomplete] = useState<{
    trigger: Trigger;
    query: string;
    start: number;
    end: number;
  } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<Comment | null>(null);
  // Held separately from pendingDelete so the dialog still reads correctly
  // while it fades out, after the target has been cleared.
  const [deletePreview, setDeletePreview] = useState("");
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const followUntilRef = useRef(0);

  // Load initial comments
  useEffect(() => {
    fetch(`/api/events/${eventId}/comments`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setComments(data);
      })
      .catch(() => {});
  }, [eventId]);

  // Load project members for @mention autocomplete
  useEffect(() => {
    fetch(`/api/project-members?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.members) {
          setMembers(
            data.members.map((m: { userId: number; userName: string }) => ({
              userId: m.userId,
              userName: m.userName,
            })),
          );
        }
      })
      .catch(() => {});
  }, [projectId]);

  // Load project channels for #channel autocomplete and link rendering
  useEffect(() => {
    fetch(`/api/channel?project_id=${projectId}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setChannels(data.map((c: ChannelRef) => ({ id: c.id, name: c.name })));
        }
      })
      .catch(() => {});
  }, [projectId]);

  // SSE for real-time comments
  useEffect(() => {
    const es = new EventSource(`/api/events/${eventId}/comments/stream`);
    es.onmessage = (e) => {
      try {
        const comment: Comment = JSON.parse(e.data);
        setComments((prev) => {
          if (prev.some((c) => c.id === comment.id)) return prev;
          return [...prev, comment];
        });
      } catch {}
    };
    return () => es.close();
  }, [eventId]);

  // Follow the thread only for a comment this reader just posted, and only if
  // they were already at the end of it. Everything else — the initial fetch and
  // every SSE frame from someone else — leaves the viewport where they put it.
  useEffect(() => {
    if (Date.now() > followUntilRef.current) return;
    followUntilRef.current = 0;
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [comments.length]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    // Detect an @ or # token at the cursor. Only one can match — they anchor at
    // the same spot and start with different characters.
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    for (const [trigger, pattern] of Object.entries(TRIGGERS)) {
      const match = before.match(pattern);
      if (match) {
        setAutocomplete({
          trigger: trigger as Trigger,
          query: match[1],
          start: cursor - match[0].length,
          end: cursor,
        });
        return;
      }
    }
    setAutocomplete(null);
  };

  const insertSuggestion = (name: string) => {
    if (!autocomplete) return;
    const { trigger, start, end } = autocomplete;
    const token = `${trigger}${name} `;
    setBody(`${body.slice(0, start)}${token}${body.slice(end)}`);
    setAutocomplete(null);
    setTimeout(() => {
      const pos = start + token.length;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const suggestions = useMemo(() => {
    if (!autocomplete) return [];
    const query = autocomplete.query.toLowerCase();
    const source =
      autocomplete.trigger === "@"
        ? members.map((m) => ({ key: `user-${m.userId}`, name: m.userName }))
        : channels.map((c) => ({ key: `channel-${c.id}`, name: c.name }));
    return source.filter((s) => s.name.toLowerCase().startsWith(query)).slice(0, MAX_SUGGESTIONS);
  }, [autocomplete, members, channels]);

  // Keep the highlight on the first match as the query narrows
  useEffect(() => {
    setActiveIndex(0);
  }, [autocomplete?.trigger, autocomplete?.query]);

  const channelIds = useMemo(
    () => new Map(channels.map((c) => [c.name.toLowerCase(), c.id])),
    [channels],
  );

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    // Measure before the request: by the time it resolves the thread may have
    // grown, and the question is where the reader was when they hit send.
    const wasAtBottom = isNearBottom(bottomRef.current);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.ok) {
        setBody("");
        setAutocomplete(null);
        followUntilRef.current = wasAtBottom ? Date.now() + FOLLOW_WINDOW_MS : 0;
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/events/${eventId}/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const askDelete = (c: Comment) => {
    setPendingDelete(c);
    setDeletePreview(excerpt(c.body));
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await handleDelete(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (autocomplete && suggestions.length > 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        setAutocomplete(null);
      } else if (e.key === "Tab") {
        e.preventDefault();
        insertSuggestion(suggestions[activeIndex].name);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
      }
      return;
    }
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-muted-foreground">
        Comments {comments.length > 0 && `(${comments.length})`}
      </h3>

      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first.</p>
      )}

      <div className="space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3 group">
            <Avatar name={c.userName} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{c.userName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                {renderBody(c.body, projectId, channelIds)}
              </p>
            </div>
            {(c.userId === currentUserId || canModerate) && (
              <button
                onClick={() => askDelete(c)}
                className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 self-start mt-0.5"
                aria-label="Delete comment"
              >
                <Trash2Icon className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={body}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Leave a comment… (⌘↵ to send, @ to mention, # for a channel)"
          rows={3}
          className="block resize-none pr-12"
        />
        <Button
          size="icon"
          // Disabled defaults to the primary fill at 50% opacity, which reads as
          // a dark smudge over the input rather than an inert control.
          className="absolute bottom-3 right-3 size-7 disabled:opacity-100 disabled:bg-muted disabled:text-muted-foreground"
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
          aria-label="Send comment"
        >
          <SendIcon className="size-3.5" />
        </Button>

        {/* @mention / #channel dropdown — ↹ completes the highlighted row */}
        {autocomplete && suggestions.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-56 rounded-md border bg-popover shadow-md z-50 overflow-hidden">
            {suggestions.map((s, i) => (
              <button
                key={s.key}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 ${
                  i === activeIndex ? "bg-accent" : "hover:bg-accent"
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertSuggestion(s.name);
                }}
              >
                {autocomplete.trigger === "@" ? (
                  <>
                    <Avatar name={s.name} />
                    {s.name}
                  </>
                ) : (
                  <span className="truncate"># {s.name}</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete comment?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{deletePreview}&rdquo;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
