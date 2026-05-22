import type { EventWithChannelName } from "@/lib/beaver/event";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { getEventTime } from "@/lib/utils";
import { ArrowLeftIcon, BookmarkIcon, CheckIcon, LinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

function TagBadge({ tagKey, value }: { tagKey: string; value: string | number | boolean }) {
  const displayValue = typeof value === "boolean" ? (value ? "true" : "false") : String(value);

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 dark:bg-white/10 px-2.5 py-1 text-sm">
      <span className="font-medium text-foreground/75">{tagKey}</span>
      <span className="text-muted-foreground">=</span>
      <span className="text-foreground">{displayValue}</span>
    </div>
  );
}

export default function EventDetail({ event }: { event: EventWithChannelName }) {
  const tags = Object.entries(event.tags);
  const [bookmarked, setBookmarked] = useState(event.bookmarked);
  const [bookmarking, setBookmarking] = useState(false);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    fetch("/api/unread", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelName: event.channelName,
        projectId: event.projectId,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        window.dispatchEvent(
          new CustomEvent("channel:read", {
            detail: {
              channelId: data.channelId,
              channelName: event.channelName,
            },
          }),
        );
      })
      .catch(() => {});
  }, [event.id]);

  const handleBack = () => {
    if (sessionStorage.getItem("beaver:hasInAppNav") === "1") {
      window.history.back();
    } else {
      window.location.href = `/dashboard/${event.projectId}/feed`;
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Back to feed
        </Button>
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center space-x-4 min-w-0">
                <div className="bg-gray-100 dark:bg-white/10 p-3 rounded-md">
                  <p className="text-2xl">{event.icon ? event.icon : "🪵"}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono mb-1">
                    <span>{event.eventObject}</span>
                    <span>·</span>
                    <span>{event.eventAction}</span>
                  </div>
                  <CardTitle className="text-2xl">{event.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <span># {event.channelName}</span>
                    <span className="text-muted-foreground">·</span>
                    <span>{getEventTime(new Date(event.createdAt))}</span>
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center shrink-0">
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
              </div>
            </div>
          </CardHeader>

          {event.description && (
            <CardContent>
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Description</h3>
                <p className="text-foreground/80">{event.description}</p>
              </div>
            </CardContent>
          )}

          {tags.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(([key, value]) => (
                    <TagBadge key={key} tagKey={key} value={value} />
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
