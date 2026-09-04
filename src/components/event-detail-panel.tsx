import { useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import type { EventWithChannelName } from "@/lib/beaver/event";
import EventDetail from "./event-detail";
import { Button } from "./ui/button";

type Loaded = { event: EventWithChannelName; canDelete: boolean };

/**
 * Right-hand pane of the feed's master-detail layout. Renders the same
 * EventDetail as the standalone /events/[eventID] page, fetched on selection.
 */
export default function EventDetailPanel({
  eventId,
  currentUserId,
  onClose,
}: {
  eventId: number | null;
  currentUserId: number;
  onClose: () => void;
}) {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLElement>(null);

  // EventDetail autofocuses its comment box, which scrolls this pane to the
  // bottom on open. Start every selection at the top of the event instead.
  useEffect(() => {
    if (data) scrollRef.current?.scrollTo({ top: 0 });
  }, [data]);

  useEffect(() => {
    if (eventId === null) {
      setData(null);
      setError(null);
      return;
    }

    // Guards against a slow response for a previous selection landing after a
    // newer one and overwriting the panel.
    let active = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (!active) return;
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          setError(
            res.status === 404
              ? "That event was deleted or never existed."
              : (body?.error ?? "Couldn't load this event."),
          );
          setData(null);
          return;
        }
        setData(await res.json());
      } catch {
        if (active) {
          setError("Couldn't reach the server. Check your connection and try again.");
          setData(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [eventId]);

  useEffect(() => {
    if (eventId === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [eventId, onClose]);

  return (
    <aside
      ref={scrollRef}
      aria-label="Event details"
      className="hidden lg:flex flex-col w-[420px] xl:w-[480px] 2xl:w-[560px] shrink-0 border-l overflow-y-auto"
    >
      {eventId === null ? (
        <div className="flex-1 grid place-items-center p-8 text-center">
          <div>
            <p className="text-sm font-medium">No event selected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Pick an event from the feed to see its tags, reactions, and comments here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex justify-end p-2 sticky top-0 bg-background z-10">
            <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close event details">
              <XIcon className="size-4" />
            </Button>
          </div>
          {loading ? (
            <div className="p-6 space-y-3" aria-busy="true">
              <div className="h-6 w-2/3 rounded bg-muted animate-pulse" />
              <div className="h-4 w-1/3 rounded bg-muted animate-pulse" />
              <div className="h-24 w-full rounded bg-muted animate-pulse" />
            </div>
          ) : error ? (
            <div className="p-6">
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            </div>
          ) : data ? (
            <EventDetail
              key={data.event.id}
              event={data.event}
              canDelete={data.canDelete}
              currentUserId={currentUserId}
            />
          ) : null}
        </>
      )}
    </aside>
  );
}
