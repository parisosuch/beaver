import type { EventWithChannelName, ReactionSummary } from "@/lib/beaver/event";
import EventComments from "./event-comments";
import { Button } from "./ui/button";
import { getEventTime } from "@/lib/utils";
import { BookmarkIcon, CheckIcon, LinkIcon, SmilePlusIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import {
  EmojiPicker,
  ReactionBar,
  postReaction,
  applyToggle,
  useReactionStream,
} from "./event-reactions";

// Only http(s) so a tag value like `javascript:…` can never become a clickable link.
function httpUrl(value: string | number | boolean): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

function TagBadge({ tagKey, value }: { tagKey: string; value: string | number | boolean }) {
  const displayValue = typeof value === "boolean" ? (value ? "true" : "false") : String(value);
  const url = httpUrl(value);

  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-gray-100 dark:bg-white/10 px-2.5 py-1 text-sm">
      <span className="font-medium text-foreground/75 shrink-0">{tagKey}</span>
      <span className="text-muted-foreground">=</span>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary underline underline-offset-2 hover:opacity-80 break-all"
        >
          <LinkIcon size={12} className="shrink-0" />
          {displayValue}
        </a>
      ) : (
        <span className="text-foreground break-all">{displayValue}</span>
      )}
    </div>
  );
}

export default function EventDetail({
  event,
  canDelete = false,
  currentUserId,
}: {
  event: EventWithChannelName;
  canDelete?: boolean;
  currentUserId: number;
}) {
  const tags = Object.entries(event.tags);
  const [bookmarked, setBookmarked] = useState(event.bookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reactions, setReactions] = useState<ReactionSummary[]>(event.reactions);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleReact = async (emoji: string) => {
    setPickerOpen(false);
    const updated = await postReaction(event.id, emoji);
    if (updated) setReactions((prev) => applyToggle(prev, updated));
  };

  // Live-update reactions as other users react. Merges are idempotent, so this
  // also reconciles the actor's own optimistic update above.
  useReactionStream(event.id, (updated) => setReactions((prev) => applyToggle(prev, updated)));

  const handleBookmark = async () => {
    setBookmarking(true);
    try {
      const res = await fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id }),
      });
      const data = await res.json();
      if (res.ok) setBookmarked(data.bookmarked);
    } finally {
      setBookmarking(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      if (res.ok) {
        window.location.href = `/dashboard/${event.projectId}/feed`;
      }
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <div>
            {/* Below sm the actions drop to their own row — sharing one row with
                the title left it about 130px to work with, which broke the
                channel name and timestamp across several lines. */}
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="bg-gray-100 dark:bg-white/10 p-2.5 sm:p-3 rounded-md shrink-0">
                  <p className="text-xl sm:text-2xl leading-none">
                    {event.icon ? event.icon : "🪵"}
                  </p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-1">
                    <span className="truncate">{event.eventObject}</span>
                    <span>·</span>
                    <span className="truncate">{event.eventAction}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-semibold break-words">{event.title}</h1>
                  <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                    <span className="whitespace-nowrap"># {event.channelName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="whitespace-nowrap">
                      {getEventTime(new Date(event.createdAt))}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center shrink-0 -ml-2 sm:ml-0">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleBookmark}
                        disabled={bookmarking}
                        className="shrink-0 hover:cursor-pointer"
                      >
                        <BookmarkIcon className={bookmarked ? "fill-current" : ""} size={18} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{bookmarked ? "Remove bookmark" : "Bookmark"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCopyLink}
                        className="shrink-0 hover:cursor-pointer"
                      >
                        {copied ? <CheckIcon size={18} /> : <LinkIcon size={18} />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{copied ? "Copied!" : "Copy link"}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {canDelete && (
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setConfirmDelete(true)}
                          className="shrink-0 hover:cursor-pointer text-destructive hover:text-destructive"
                        >
                          <Trash2Icon size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Delete event</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </div>

          {event.description && (
            <div className="mt-6">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-foreground/80">{event.description}</p>
              </div>
            </div>
          )}

          {tags.length > 0 && (
            <div className="mt-6">
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(([key, value]) => (
                    <TagBadge key={key} tagKey={key} value={value} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-2">
              <ReactionBar reactions={reactions} onToggle={handleReact} />
              <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 px-2 rounded-full">
                    <SmilePlusIcon size={14} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 [animation:none]!" align="start">
                  <EmojiPicker onSelect={handleReact} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t">
          <EventComments
            eventId={event.id}
            projectId={event.projectId}
            currentUserId={currentUserId}
            canModerate={canDelete}
          />
        </div>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete event?</DialogTitle>
            <DialogDescription>
              This will permanently delete &ldquo;{event.title}&rdquo;. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
