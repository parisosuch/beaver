import { useEffect, useRef, useState } from "react";

const HEARTBEAT_MS = 2_000;
const LEADER_TIMEOUT_MS = 5_000;

/**
 * Elects one leader tab per `scope` string. The leader returns `true`; all
 * other tabs return `false`. Leadership passes to another tab within
 * LEADER_TIMEOUT_MS when the leader tab closes or navigates away.
 *
 * Uses localStorage for persistence (so the storage event gives instant
 * cross-tab notification on close) and a heartbeat to detect frozen tabs.
 */
export function useTabLeader(scope: string): boolean {
  const [isLeader, setIsLeader] = useState(false);
  const tabId = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    const key = `tab-leader:${scope}`;
    const id = tabId.current;

    const tryClaimLeadership = () => {
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const { id: storedId, ts } = JSON.parse(raw) as { id: string; ts: number };
          if (Date.now() - ts < LEADER_TIMEOUT_MS) {
            setIsLeader(storedId === id);
            return storedId === id;
          }
        } catch {
          // corrupt entry — fall through and claim
        }
      }
      localStorage.setItem(key, JSON.stringify({ id, ts: Date.now() }));
      setIsLeader(true);
      return true;
    };

    tryClaimLeadership();

    const interval = setInterval(tryClaimLeadership, HEARTBEAT_MS);

    const onStorage = (e: StorageEvent) => {
      if (e.key === key) tryClaimLeadership();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", onStorage);
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const { id: storedId } = JSON.parse(raw) as { id: string };
          if (storedId === id) localStorage.removeItem(key);
        } catch {}
      }
    };
  }, [scope]);

  return isLeader;
}
