import { useState } from "react";
import { AtSignIcon, MessageSquareIcon, TriangleAlertIcon, CheckCheckIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "./ui/button";
import type { NotificationType } from "@/lib/beaver/notification";

type SerializedNotification = {
  id: number;
  type: NotificationType;
  message: string;
  linkPath: string;
  readAt: string | null;
  createdAt: string;
};

const ICONS: Record<NotificationType, typeof AtSignIcon> = {
  mention: AtSignIcon,
  comment_reply: MessageSquareIcon,
  alert: TriangleAlertIcon,
};

export default function NotificationsView({
  projectId,
  initialNotifications,
}: {
  projectId: number;
  initialNotifications: SerializedNotification[];
}) {
  const [items, setItems] = useState(initialNotifications);
  const [marking, setMarking] = useState(false);

  const unreadCount = items.filter((n) => !n.readAt).length;

  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || marking) return;
    setMarking(true);
    try {
      const res = await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      if (!res.ok) return;
      const now = new Date().toISOString();
      setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })));
      window.dispatchEvent(new CustomEvent("notifications:updated", { detail: { count: 0 } }));
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="px-4 md:px-8 py-4 md:py-8 w-full max-w-3xl">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full px-2 py-0.5 tabular-nums">
              {unreadCount}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleMarkAllRead}
          disabled={unreadCount === 0 || marking}
          title="Mark all as read"
        >
          <CheckCheckIcon className="size-4 mr-2" />
          Mark all as read
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center pt-16">
          <h2 className="text-xl">You&rsquo;re all caught up 🎉</h2>
          <p className="text-muted-foreground mt-2">No notifications yet.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((n) => {
            const Icon = ICONS[n.type];
            const unread = !n.readAt;
            return (
              <li key={n.id}>
                <a
                  href={n.linkPath}
                  className={`flex items-start gap-3 rounded-md px-3 py-3 transition-colors hover:bg-muted ${
                    unread ? "bg-primary/5" : ""
                  }`}
                >
                  <Icon
                    className={`size-4 mt-0.5 shrink-0 ${unread ? "text-primary" : "text-muted-foreground"}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm break-words ${unread ? "font-medium" : ""}`}>
                      {n.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
