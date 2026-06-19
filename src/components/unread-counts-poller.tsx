import type { Channel } from "@/lib/beaver/channel";
import type { EventWithChannelName } from "@/lib/beaver/event";
import { useTabLeader } from "@/lib/tab-leader";
import { useEffect, useRef } from "react";

function dispatch(counts: Record<number, number>) {
  window.dispatchEvent(new CustomEvent("unread:updated", { detail: { counts } }));
}

export default function UnreadCountsPoller({
  projectId,
  channels: initialChannels,
}: {
  projectId: number;
  channels: Channel[];
}) {
  const isLeader = useTabLeader(`unread:${projectId}`);
  const channelsRef = useRef(initialChannels);
  const pathnameRef = useRef("");
  const countsRef = useRef<Record<number, number>>({});

  // Sync channels list as channels are added/removed
  useEffect(() => {
    const onCreated = (e: CustomEvent<{ channel: Channel }>) => {
      channelsRef.current = [...channelsRef.current, e.detail.channel];
    };
    const onDeleted = (e: CustomEvent<{ id: number }>) => {
      channelsRef.current = channelsRef.current.filter((c) => c.id !== e.detail.id);
    };
    window.addEventListener("channel:created", onCreated as EventListener);
    window.addEventListener("channel:deleted", onDeleted as EventListener);
    return () => {
      window.removeEventListener("channel:created", onCreated as EventListener);
      window.removeEventListener("channel:deleted", onDeleted as EventListener);
    };
  }, []);

  // Track current pathname for "am I viewing this channel?" check
  useEffect(() => {
    pathnameRef.current = window.location.pathname;
    const handleNav = () => {
      pathnameRef.current = window.location.pathname;
    };
    document.addEventListener("astro:page-load", handleNav);
    window.addEventListener("popstate", handleNav);
    return () => {
      document.removeEventListener("astro:page-load", handleNav);
      window.removeEventListener("popstate", handleNav);
    };
  }, []);

  // Handle channel:read → clear that channel's count
  useEffect(() => {
    const handleRead = (e: CustomEvent<{ channelId: number }>) => {
      const next = { ...countsRef.current, [e.detail.channelId]: 0 };
      countsRef.current = next;
      dispatch(next);
    };
    window.addEventListener("channel:read", handleRead as EventListener);
    return () => window.removeEventListener("channel:read", handleRead as EventListener);
  }, []);

  useEffect(() => {
    const bc = new BroadcastChannel(`beaver:unread:${projectId}`);
    let eventSource: EventSource | null = null;
    let resync: ReturnType<typeof setInterval> | null = null;

    const activeChannelId = (): number | null => {
      const m = pathnameRef.current.match(/\/channels\/(\d+)(?:$|[/?])/);
      return m ? parseInt(m[1]) : null;
    };

    const applyEvents = (events: EventWithChannelName[]) => {
      const active = activeChannelId();
      const next = { ...countsRef.current };
      for (const ev of events) {
        const channel = channelsRef.current.find((c) => c.name === ev.channelName);
        if (!channel || channel.id === active) continue;
        next[channel.id] = (next[channel.id] ?? 0) + 1;
      }
      countsRef.current = next;
      dispatch(next);
    };

    if (isLeader) {
      const fetchUnread = async () => {
        try {
          const res = await fetch(`/api/unread?projectId=${projectId}`);
          if (res.ok) {
            const data = await res.json();
            countsRef.current = data.counts;
            dispatch(data.counts);
            bc.postMessage({ type: "unread-snapshot", counts: data.counts });
          }
        } catch {
          // ignore
        }
      };

      const start = async () => {
        await fetchUnread();
        resync = setInterval(fetchUnread, 60_000);

        let maxId = 0;
        try {
          const res = await fetch("/api/events/max-id");
          maxId = (await res.json()).maxId ?? 0;
        } catch {
          // ignore
        }

        eventSource = new EventSource(
          `/api/events/project/${projectId}/event-stream?afterId=${maxId}`,
        );
        eventSource.addEventListener("message", (e) => {
          let events: EventWithChannelName[];
          try {
            events = JSON.parse(e.data);
          } catch {
            return;
          }
          applyEvents(events);
          bc.postMessage({ type: "project-events", events });
        });
      };

      start();
    } else {
      fetch(`/api/unread?projectId=${projectId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            countsRef.current = data.counts;
            dispatch(data.counts);
          }
        })
        .catch(() => {});

      bc.onmessage = (e: MessageEvent) => {
        if (e.data.type === "unread-snapshot") {
          countsRef.current = e.data.counts;
          dispatch(e.data.counts);
        } else if (e.data.type === "project-events") {
          applyEvents(e.data.events);
        }
      };
    }

    return () => {
      if (eventSource) eventSource.close();
      if (resync) clearInterval(resync);
      bc.close();
    };
  }, [projectId, isLeader]);

  return null;
}
