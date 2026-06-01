import { useEffect } from "react";
import { useTabLeader } from "@/lib/tab-leader";

const POLL_INTERVAL_MS = 10_000;

export default function MetricsPoller({ projectId }: { projectId: number }) {
  const isLeader = useTabLeader(`metrics:${projectId}`);

  useEffect(() => {
    const bc = new BroadcastChannel(`beaver:metrics:${projectId}`);
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const dispatch = (metrics: unknown[]) => {
      window.dispatchEvent(new CustomEvent("metrics:updated", { detail: { metrics } }));
    };

    if (isLeader) {
      const poll = async () => {
        try {
          const res = await fetch(`/api/metrics?projectId=${projectId}&includeSparklines=true`);
          if (!res.ok || cancelled) return;
          const data = await res.json();
          if (cancelled) return;
          dispatch(data.metrics);
          bc.postMessage({ metrics: data.metrics });
        } catch {}
      };
      poll();
      intervalId = setInterval(poll, POLL_INTERVAL_MS);
    } else {
      bc.onmessage = (e: MessageEvent) => {
        if (!cancelled) dispatch(e.data.metrics);
      };
    }

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      bc.close();
    };
  }, [projectId, isLeader]);

  return null;
}
