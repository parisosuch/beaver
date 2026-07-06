import { useEffect, useState } from "react";
import { BellIcon } from "lucide-react";

// Matches the nav link styling in side-panel-nav.tsx (plus justify-between for the badge).
const navCss =
  "flex px-3 py-2 items-center justify-between hover:bg-gray-100 dark:hover:bg-white/8 hover:cursor-pointer hover:font-medium rounded ";
const activeNavCss = navCss + "bg-gray-100 dark:bg-white/8 font-medium";

export default function NotificationsNavLink({
  projectId,
  pathname,
  onNavigate,
}: {
  projectId: number;
  pathname: string;
  onNavigate?: () => void;
}) {
  const [count, setCount] = useState(0);
  const href = `/dashboard/${projectId}/notifications`;
  const isActive = pathname === href;

  // ponytail: plain interval poll, not the SSE + BroadcastChannel-leader setup
  // used for channel unread counts. Upgrade only if the extra requests matter.
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch(`/api/notifications/unread-count?projectId=${projectId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setCount(data.count ?? 0);
      } catch {
        // ignore
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 45_000);
    const onUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ count?: number }>).detail;
      if (detail && typeof detail.count === "number") setCount(detail.count);
      else fetchCount();
    };
    window.addEventListener("notifications:updated", onUpdated);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("notifications:updated", onUpdated);
    };
  }, [projectId]);

  return (
    <a href={href} onClick={() => onNavigate?.()} className={isActive ? activeNavCss : navCss}>
      <span className="flex items-center space-x-2">
        <BellIcon size={20} />
        <span>Notifications</span>
      </span>
      {count > 0 && (
        <span className="ml-2 shrink-0 text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </a>
  );
}
