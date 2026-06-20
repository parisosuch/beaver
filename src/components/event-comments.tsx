import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { SendIcon, Trash2Icon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Comment = {
  id: number;
  eventId: number;
  userId: number;
  userName: string;
  body: string;
  createdAt: string | Date;
};

type Member = { userId: number; userName: string };

function initials(name: string) {
  return name
    .split(/[\s_-]/)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function renderBody(body: string) {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="text-primary font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  );
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
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionAnchor, setMentionAnchor] = useState<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  // Scroll to bottom when comments load
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    // Detect @mention at cursor
    const cursor = e.target.selectionStart ?? val.length;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const start = cursor - match[0].length;
      setMentionQuery(match[1]);
      setMentionAnchor({ start, end: cursor });
    } else {
      setMentionQuery(null);
      setMentionAnchor(null);
    }
  };

  const insertMention = (userName: string) => {
    if (!mentionAnchor) return;
    const before = body.slice(0, mentionAnchor.start);
    const after = body.slice(mentionAnchor.end);
    const next = `${before}@${userName} ${after}`;
    setBody(next);
    setMentionQuery(null);
    setMentionAnchor(null);
    setTimeout(() => {
      const pos = mentionAnchor.start + userName.length + 2;
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  };

  const filteredMembers =
    mentionQuery !== null
      ? members.filter((m) => m.userName.toLowerCase().startsWith(mentionQuery.toLowerCase()))
      : [];

  const handleSubmit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: body.trim() }),
      });
      if (res.ok) {
        setBody("");
        setMentionQuery(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/events/${eventId}/comments/${id}`, { method: "DELETE" });
    setComments((prev) => prev.filter((c) => c.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
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
                {renderBody(c.body)}
              </p>
            </div>
            {(c.userId === currentUserId || canModerate) && (
              <button
                onClick={() => handleDelete(c.id)}
                className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 self-start mt-0.5"
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
          placeholder="Leave a comment… (⌘↵ to send, @ to mention)"
          rows={3}
          className="resize-none pr-12"
        />
        <Button
          size="icon"
          className="absolute bottom-2 right-2 size-7"
          onClick={handleSubmit}
          disabled={!body.trim() || submitting}
          aria-label="Send comment"
        >
          <SendIcon className="size-3.5" />
        </Button>

        {/* @mention dropdown */}
        {mentionQuery !== null && filteredMembers.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 w-56 rounded-md border bg-popover shadow-md z-50 overflow-hidden">
            {filteredMembers.slice(0, 6).map((m) => (
              <button
                key={m.userId}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m.userName);
                }}
              >
                <Avatar name={m.userName} />
                {m.userName}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
