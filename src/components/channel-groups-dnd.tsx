import type { Channel } from "@/lib/beaver/channel";
import type { ChannelGroupWithChannels } from "@/lib/beaver/channel-group";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { readUnreadCounts } from "@/lib/unread-store";
import { CSS } from "@dnd-kit/utilities";
import { ChevronRightIcon, FolderPlusIcon, PlusIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

// The list state as it stood before an optimistic edit, kept so a rejected
// write can be undone.
type Snapshot = { ungrouped: Channel[]; groups: ChannelGroupWithChannels[] };

// ─── ID helpers ───────────────────────────────────────────────────────────────
const grpId = (id: number) => `grp-${id}` as UniqueIdentifier;
const chId = (id: number) => `ch-${id}` as UniqueIdentifier;
const parseGrpId = (uid: UniqueIdentifier) => parseInt((uid as string).slice(4));
const parseChId = (uid: UniqueIdentifier) => parseInt((uid as string).slice(3));
const isGrp = (uid: UniqueIdentifier) => (uid as string).startsWith("grp-");
const isCh = (uid: UniqueIdentifier) => (uid as string).startsWith("ch-");

// ─── Sortable channel ─────────────────────────────────────────────────────────
function SortableChannel({
  channel,
  projectId,
  isActive,
  onNavigate,
  indent = false,
  unreadCount = 0,
  disabled = false,
}: {
  channel: Channel;
  projectId: number;
  isActive: boolean;
  onNavigate?: () => void;
  indent?: boolean;
  unreadCount?: number;
  disabled?: boolean;
}) {
  // A channel in a collapsed group stays mounted so the group can animate, but it
  // is clipped to zero height. Leaving it registered would let closestCenter pick
  // a row nobody can see, so a channel dropped on a collapsed group would land at
  // some index inside it rather than on the group header.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chId(channel.id),
    disabled,
  });
  const reduceMotion = useReducedMotion();

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <a
        href={`/dashboard/${projectId}/channels/${channel.id}`}
        onClick={() => onNavigate?.()}
        draggable={false}
        className={`flex text-lg items-center justify-between ${indent ? "pl-5 pr-3" : "px-3"} py-2 hover:font-medium cursor-grab active:cursor-grabbing ${
          isActive
            ? "bg-gray-100 dark:bg-white/8 rounded font-medium"
            : "hover:bg-gray-100 dark:hover:bg-white/8 hover:rounded"
        }`}
      >
        <span className="truncate"># {channel.name}</span>
        {/* No key on the count: the badge animates when it appears and when it
            goes away, not on every increment. Events stream in continuously, and
            re-running the entrance each time left the sidebar twitching in the
            corner of the eye. */}
        <AnimatePresence initial={false}>
          {unreadCount > 0 && (
            <motion.span
              initial={{ transform: "scale(0.95)", opacity: 0 }}
              animate={{ transform: "scale(1)", opacity: 1 }}
              exit={{ transform: "scale(0.95)", opacity: 0 }}
              transition={
                reduceMotion ? { duration: 0.15 } : { type: "spring", duration: 0.35, bounce: 0.2 }
              }
              className="ml-2 shrink-0 text-xs font-semibold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center leading-tight"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </a>
    </div>
  );
}

// ─── Sortable group header ────────────────────────────────────────────────────
function SortableGroup({
  group,
  collapsed,
  animateCollapse,
  onToggle,
  onRename,
  onDelete,
  onNewGroup,
  projectId,
  pathname,
  onNavigate,
  channelItems,
  dimChannels,
  canEdit,
  unreadCounts,
}: {
  group: ChannelGroupWithChannels;
  collapsed: boolean;
  animateCollapse: boolean;
  onToggle: () => void;
  onRename: (id: number) => void;
  onDelete: (id: number) => void;
  onNewGroup: () => void;
  projectId: number;
  pathname: string;
  onNavigate?: () => void;
  channelItems: UniqueIdentifier[];
  dimChannels?: boolean;
  canEdit: boolean;
  unreadCounts: Record<number, number>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: grpId(group.id),
    disabled: !canEdit,
  });

  const isChannelActive = (id: number) => pathname === `/dashboard/${projectId}/channels/${id}`;

  const headerButton = (
    <button
      {...(canEdit ? { ...attributes, ...listeners } : {})}
      onClick={onToggle}
      className={`flex w-full items-center gap-1 px-1 py-0.5 text-xs font-semibold capitalize text-muted-foreground hover:text-foreground rounded hover:bg-gray-100 dark:hover:bg-white/8 transition-[transform,background-color,border-color,color,box-shadow] duration-150 ease-out active:scale-[0.97] select-none ${canEdit ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"}`}
    >
      <ChevronRightIcon
        size={12}
        className={`shrink-0 ${collapsed ? "" : "rotate-90"} ${
          animateCollapse ? "transition-transform duration-150 ease-out" : ""
        }`}
      />
      <span className="truncate">{group.name}</span>
    </button>
  );

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
      }}
      className="mt-2"
    >
      {canEdit ? (
        <ContextMenu>
          <ContextMenuTrigger asChild>{headerButton}</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem onSelect={() => onRename(group.id)}>Rename</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={onNewGroup}>Add New Group</ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              onSelect={() => onDelete(group.id)}
              className="text-destructive focus:text-destructive"
            >
              Delete Group
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        headerButton
      )}

      {/* The channel list stays mounted and collapses by animating the grid row from 0fr
          to 1fr, so dnd-kit's SortableContext is not torn down and rebuilt on every toggle.
          `animateCollapse` is false while a group is being dragged: every group is force
          collapsed at drag start, and animating all of them closed would fight the drag. */}
      <div
        className={`grid ${collapsed ? "grid-rows-[0fr]" : "grid-rows-[1fr]"} ${
          animateCollapse ? "transition-[grid-template-rows] duration-200 ease-out" : ""
        }`}
      >
        <div className="overflow-hidden" inert={collapsed}>
          <SortableContext items={channelItems} strategy={verticalListSortingStrategy}>
            <div className={`mt-0.5 ${dimChannels ? "opacity-50 pointer-events-none" : ""}`}>
              {group.channels.map((ch) => (
                <SortableChannel
                  key={ch.id}
                  channel={ch}
                  projectId={projectId}
                  isActive={isChannelActive(ch.id)}
                  onNavigate={onNavigate}
                  indent
                  unreadCount={unreadCounts[ch.id] ?? 0}
                  disabled={collapsed}
                />
              ))}
            </div>
          </SortableContext>
        </div>
      </div>
    </div>
  );
}

// ─── Inline name input ────────────────────────────────────────────────────────
function InlineNameInput({
  defaultValue = "",
  placeholder,
  onConfirm,
  onCancel,
  className,
}: {
  defaultValue?: string;
  placeholder: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const committed = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    const trimmed = value.trim();
    if (trimmed) onConfirm(trimmed);
    else onCancel();
  };

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          committed.current = true;
          onCancel();
        }
      }}
      onBlur={commit}
      className={className}
    />
  );
}

// ─── Channel groups DnD list (includes section header) ───────────────────────
export default function ChannelGroupsDnd({
  initialUngrouped,
  initialGroups,
  projectId,
  currentPath,
  onNavigate,
  canEdit,
}: {
  initialUngrouped: Channel[];
  initialGroups: ChannelGroupWithChannels[];
  projectId: number;
  currentPath: string;
  onNavigate?: () => void;
  canEdit: boolean;
}) {
  const [ungrouped, setUngrouped] = useState<Channel[]>(initialUngrouped);
  const [groups, setGroups] = useState<ChannelGroupWithChannels[]>(initialGroups);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  // Only a user toggle animates the collapse. The drag-start force collapse below turns
  // this off so eight groups do not animate shut as a drag begins.
  const [animateCollapse, setAnimateCollapse] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingGroupId, setRenamingGroupId] = useState<number | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [pathname, setPathname] = useState(currentPath);

  const ungroupedRef = useRef(ungrouped);
  const groupsRef = useRef(groups);
  useEffect(() => {
    ungroupedRef.current = ungrouped;
  }, [ungrouped]);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  const snapshotRef = useRef<Snapshot | null>(null);

  // Every write below is applied to local state first, so a rejected request has
  // to put the list back. Restoring the pre-drag snapshot is what the cancel case
  // already does; the failure case is the same undo with something said about it.
  const restoreSnapshot = (snapshot: Snapshot | null) => {
    if (!snapshot) return;
    setUngrouped(snapshot.ungrouped);
    setGroups(snapshot.groups);
  };

  const persistOrRollback = async (
    send: () => Promise<Response>,
    snapshot: Snapshot | null,
    message: string,
  ) => {
    let ok = false;
    try {
      ok = (await send()).ok;
    } catch {
      ok = false;
    }
    if (ok) return;
    restoreSnapshot(snapshot);
    toast.error(message);
  };

  const collapsedSnapshotRef = useRef<Set<number>>(new Set());

  // Sync pathname on navigation
  useEffect(() => {
    const handleNav = () => setPathname(window.location.pathname);
    document.addEventListener("astro:page-load", handleNav);
    window.addEventListener("popstate", handleNav);
    return () => {
      document.removeEventListener("astro:page-load", handleNav);
      window.removeEventListener("popstate", handleNav);
    };
  }, []);

  // Sync unread counts from the poller. It hydrates before this island does, so
  // seed from the store to pick up any dispatch that landed before we subscribed.
  useEffect(() => {
    setUnreadCounts(readUnreadCounts());
    const handle = (e: CustomEvent<{ counts: Record<number, number> }>) => {
      setUnreadCounts(e.detail.counts);
    };
    window.addEventListener("unread:updated", handle as EventListener);
    return () => window.removeEventListener("unread:updated", handle as EventListener);
  }, []);

  // Create-group trigger from the static Astro button via custom event
  useEffect(() => {
    const handle = () => setCreatingGroup(true);
    window.addEventListener("channel-group:create", handle);
    return () => window.removeEventListener("channel-group:create", handle);
  }, []);

  // Channel list sync
  useEffect(() => {
    const onCreated = (e: CustomEvent<{ channel: Channel }>) => {
      setUngrouped((prev) => [...prev, e.detail.channel]);
    };
    const onDeleted = (e: CustomEvent<{ id: number }>) => {
      setUngrouped((prev) => prev.filter((c) => c.id !== e.detail.id));
      setGroups((prev) =>
        prev.map((g) => ({ ...g, channels: g.channels.filter((c) => c.id !== e.detail.id) })),
      );
    };
    const onUpdated = (e: CustomEvent<{ id: number; name: string; description: string }>) => {
      const patch = (c: Channel) =>
        c.id === e.detail.id ? { ...c, name: e.detail.name, description: e.detail.description } : c;
      setUngrouped((prev) => prev.map(patch));
      setGroups((prev) => prev.map((g) => ({ ...g, channels: g.channels.map(patch) })));
    };
    window.addEventListener("channel:created", onCreated as EventListener);
    window.addEventListener("channel:deleted", onDeleted as EventListener);
    window.addEventListener("channel:updated", onUpdated as EventListener);
    return () => {
      window.removeEventListener("channel:created", onCreated as EventListener);
      window.removeEventListener("channel:deleted", onDeleted as EventListener);
      window.removeEventListener("channel:updated", onUpdated as EventListener);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: canEdit ? { distance: 6 } : { distance: 999999 },
    }),
  );

  const findContainer = (id: UniqueIdentifier): "ungrouped" | number | null => {
    const u = ungroupedRef.current;
    const g = groupsRef.current;
    if (id === "ungrouped") return "ungrouped";
    if (isGrp(id)) return parseGrpId(id);
    if (isCh(id)) {
      const chNum = parseChId(id);
      if (u.find((c) => c.id === chNum)) return "ungrouped";
      for (const grp of g) {
        if (grp.channels.find((c) => c.id === chNum)) return grp.id;
      }
    }
    return null;
  };

  const getChannel = (id: UniqueIdentifier): Channel | undefined => {
    const chNum = parseChId(id);
    return (
      ungroupedRef.current.find((c) => c.id === chNum) ??
      groupsRef.current.flatMap((g) => g.channels).find((c) => c.id === chNum)
    );
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
    snapshotRef.current = {
      ungrouped: ungroupedRef.current.map((c) => ({ ...c })),
      groups: groupsRef.current.map((g) => ({ ...g, channels: g.channels.map((c) => ({ ...c })) })),
    };
    if (isGrp(active.id)) {
      setAnimateCollapse(false);
      setIsDraggingGroup(true);
      collapsedSnapshotRef.current = new Set(collapsed);
      setCollapsed(new Set(groupsRef.current.map((g) => g.id)));
    }
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over || !isCh(active.id)) return;

    const srcContainer = findContainer(active.id);
    let dstContainer: "ungrouped" | number | null = null;

    if (over.id === "ungrouped") {
      dstContainer = "ungrouped";
    } else if (isCh(over.id)) {
      dstContainer = findContainer(over.id);
    } else if (isGrp(over.id)) {
      dstContainer = parseGrpId(over.id);
    }

    if (dstContainer === null || srcContainer === dstContainer) return;

    const chNum = parseChId(active.id);
    const channel = getChannel(active.id);
    if (!channel) return;

    setUngrouped((prev) => {
      const without = prev.filter((c) => c.id !== chNum);
      if (dstContainer !== "ungrouped") return without;
      if (isCh(over.id)) {
        const overNum = parseChId(over.id);
        const overIdx = without.findIndex((c) => c.id === overNum);
        const updated = [...without];
        updated.splice(overIdx >= 0 ? overIdx : updated.length, 0, { ...channel, groupId: null });
        return updated;
      }
      return [...without, { ...channel, groupId: null }];
    });

    setGroups((prev) =>
      prev.map((g) => {
        const without = g.channels.filter((c) => c.id !== chNum);
        if (g.id !== dstContainer) return { ...g, channels: without };
        if (isCh(over.id)) {
          const overNum = parseChId(over.id);
          const overIdx = without.findIndex((c) => c.id === overNum);
          const updated = [...without];
          updated.splice(overIdx >= 0 ? overIdx : updated.length, 0, { ...channel, groupId: g.id });
          return { ...g, channels: updated };
        }
        return { ...g, channels: [...without, { ...channel, groupId: g.id }] };
      }),
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);

    // Hold the pre-drag state for the length of the request. The ref is cleared
    // here so the next drag starts clean either way.
    const snapshot = snapshotRef.current;
    snapshotRef.current = null;

    if (!over) {
      restoreSnapshot(snapshot);
      setIsDraggingGroup(false);
      return;
    }

    if (isGrp(active.id)) {
      setIsDraggingGroup(false);
      setCollapsed(collapsedSnapshotRef.current);
      if (!isGrp(over.id)) return;
      const cur = groupsRef.current;
      const oldIdx = cur.findIndex((g) => grpId(g.id) === active.id);
      const newIdx = cur.findIndex((g) => grpId(g.id) === over.id);
      if (oldIdx === newIdx) return;
      const reordered = arrayMove(cur, oldIdx, newIdx);
      setGroups(reordered);
      void persistOrRollback(
        () =>
          fetch("/api/channel-group", {
            method: "PATCH",
            body: JSON.stringify({ groups: reordered.map((g, i) => ({ id: g.id, order: i })) }),
            headers: { "Content-Type": "application/json" },
          }),
        snapshot,
        "Could not save the new group order. The groups are back where they were.",
      );
      return;
    }

    // The channel write used to run from a setTimeout(0) reading the refs, because
    // the reorder below landed through setState and the refs only catch up after
    // the next render. Building the next lists here instead means the request has
    // both of them in hand and a failure has somewhere to be reported.
    let nextUngrouped = ungroupedRef.current;
    let nextGroups = groupsRef.current;

    if (isCh(active.id) && isCh(over.id) && active.id !== over.id) {
      const chNum = parseChId(active.id);
      const overNum = parseChId(over.id);
      const srcContainer = findContainer(active.id);
      const dstContainer = findContainer(over.id);

      if (srcContainer === dstContainer) {
        if (srcContainer === "ungrouped") {
          const oldIdx = nextUngrouped.findIndex((c) => c.id === chNum);
          const newIdx = nextUngrouped.findIndex((c) => c.id === overNum);
          nextUngrouped = arrayMove(nextUngrouped, oldIdx, newIdx);
          setUngrouped(nextUngrouped);
        } else if (typeof srcContainer === "number") {
          nextGroups = nextGroups.map((g) => {
            if (g.id !== srcContainer) return g;
            const oldIdx = g.channels.findIndex((c) => c.id === chNum);
            const newIdx = g.channels.findIndex((c) => c.id === overNum);
            return { ...g, channels: arrayMove(g.channels, oldIdx, newIdx) };
          });
          setGroups(nextGroups);
        }
      }
    }

    const allItems = [
      ...nextUngrouped.map((c, i) => ({ id: c.id, order: i, groupId: null as null })),
      ...nextGroups.flatMap((grp) =>
        grp.channels.map((c, i) => ({ id: c.id, order: i, groupId: grp.id })),
      ),
    ];
    void persistOrRollback(
      () =>
        fetch("/api/channel", {
          method: "PATCH",
          body: JSON.stringify({ channels: allItems }),
          headers: { "Content-Type": "application/json" },
        }),
      snapshot,
      "Could not save the new channel order. The channels are back where they were.",
    );
  };

  const handleDragCancel = () => {
    restoreSnapshot(snapshotRef.current);
    setCollapsed(collapsedSnapshotRef.current);
    setActiveId(null);
    setIsDraggingGroup(false);
    snapshotRef.current = null;
  };

  const handleCreateGroup = async (name: string) => {
    setCreatingGroup(false);
    const res = await fetch("/api/channel-group", {
      method: "POST",
      body: JSON.stringify({ name, project_id: projectId }),
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      const group = await res.json();
      setGroups((prev) => [...prev, { ...group, channels: [] }]);
    }
  };

  const handleRenameGroup = async (id: number, name: string) => {
    setRenamingGroupId(null);
    const previousName = groupsRef.current.find((g) => g.id === id)?.name;
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));

    let ok = false;
    try {
      ok = (
        await fetch("/api/channel-group", {
          method: "PUT",
          body: JSON.stringify({ id, name }),
          headers: { "Content-Type": "application/json" },
        })
      ).ok;
    } catch {
      ok = false;
    }
    if (ok) return;

    // Only the one name moved, so put that back rather than a whole snapshot —
    // a channel event landing mid-request should survive the undo.
    if (previousName !== undefined) {
      setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name: previousName } : g)));
    }
    toast.error("Could not rename the group. The old name is back.");
  };

  const handleDeleteGroup = async (id: number) => {
    const group = groupsRef.current.find((g) => g.id === id);
    // The delete moves channels as well as groups, so both lists go into the
    // snapshot that a failure restores.
    const snapshot: Snapshot = { ungrouped: ungroupedRef.current, groups: groupsRef.current };
    if (group) {
      setUngrouped((prev) => [...prev, ...group.channels.map((c) => ({ ...c, groupId: null }))]);
    }
    setGroups((prev) => prev.filter((g) => g.id !== id));
    await persistOrRollback(
      () =>
        fetch("/api/channel-group", {
          method: "DELETE",
          body: JSON.stringify({ id }),
          headers: { "Content-Type": "application/json" },
        }),
      snapshot,
      "Could not delete the group. It is back in the sidebar.",
    );
  };

  const ungroupedItems = ungrouped.map((c) => chId(c.id));
  const groupItems = groups.map((g) => grpId(g.id));
  const activeChannel = activeId && isCh(activeId) ? getChannel(activeId) : null;
  const activeGroup =
    activeId && isGrp(activeId) ? groups.find((g) => grpId(g.id) === activeId) : null;
  const isChannelActive = (id: number) => pathname === `/dashboard/${projectId}/channels/${id}`;

  return (
    <>
      {/* Channels section header */}
      <div className="flex w-full items-center justify-between mt-4 mb-1">
        <h1 className="text-sm font-mono">Channels</h1>
        {canEdit && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setCreatingGroup(true)}
              title="New group"
              aria-label="New group"
              className="text-muted-foreground hover:text-foreground"
            >
              <FolderPlusIcon className="size-4" />
            </Button>
            <Button
              asChild
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground"
            >
              <a
                href={`/dashboard/${projectId}/create-channel`}
                onClick={() => onNavigate?.()}
                title="New channel"
                aria-label="New channel"
              >
                <PlusIcon className="size-4" />
              </a>
            </Button>
          </div>
        )}
      </div>

      <DndContext
        id="side-panel-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={ungroupedItems} strategy={verticalListSortingStrategy}>
          {ungrouped.map((ch) => (
            <SortableChannel
              key={ch.id}
              channel={ch}
              projectId={projectId}
              isActive={isChannelActive(ch.id)}
              onNavigate={onNavigate}
              unreadCount={unreadCounts[ch.id] ?? 0}
            />
          ))}
        </SortableContext>

        <SortableContext items={groupItems} strategy={verticalListSortingStrategy}>
          {groups.map((group) => {
            if (renamingGroupId === group.id) {
              return (
                <div key={group.id} className="mt-2">
                  <InlineNameInput
                    defaultValue={group.name}
                    placeholder="Group name…"
                    onConfirm={(name) => handleRenameGroup(group.id, name)}
                    onCancel={() => setRenamingGroupId(null)}
                  />
                </div>
              );
            }
            return (
              <SortableGroup
                key={group.id}
                group={group}
                collapsed={isDraggingGroup || collapsed.has(group.id)}
                animateCollapse={animateCollapse}
                onToggle={() => {
                  setAnimateCollapse(true);
                  setCollapsed((prev) => {
                    const next = new Set(prev);
                    if (next.has(group.id)) next.delete(group.id);
                    else next.add(group.id);
                    return next;
                  });
                }}
                onRename={setRenamingGroupId}
                onDelete={handleDeleteGroup}
                onNewGroup={() => setCreatingGroup(true)}
                projectId={projectId}
                pathname={pathname}
                onNavigate={onNavigate}
                channelItems={group.channels.map((c) => chId(c.id))}
                dimChannels={isDraggingGroup}
                canEdit={canEdit}
                unreadCounts={unreadCounts}
              />
            );
          })}
        </SortableContext>

        {creatingGroup && (
          <div className="mt-2">
            <InlineNameInput
              placeholder="New group name…"
              onConfirm={handleCreateGroup}
              onCancel={() => setCreatingGroup(false)}
            />
          </div>
        )}

        <DragOverlay>
          {activeChannel && (
            <div className="flex text-lg items-center px-3 py-2 rounded bg-gray-100 dark:bg-white/8 font-medium shadow-lg cursor-grabbing opacity-95">
              # {activeChannel.name}
            </div>
          )}
          {activeGroup && (
            <div className="flex text-xs font-semibold capitalize items-center gap-1 px-2 py-1 rounded bg-background border border-border shadow-lg cursor-grabbing opacity-95">
              <ChevronRightIcon size={12} />
              {activeGroup.name}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </>
  );
}
