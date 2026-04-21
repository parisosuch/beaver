import type { Channel } from "@/lib/beaver/channel";
import type { ChannelGroupWithChannels } from "@/lib/beaver/channel-group";
import type { Project } from "@/lib/beaver/project";
import { useEffect, useRef, useState } from "react";
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
import { CSS } from "@dnd-kit/utilities";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  FolderPlusIcon,
  InboxIcon,
  LogOutIcon,
  MenuIcon,
  PlusIcon,
  Settings,
  UsersIcon,
  XIcon,
} from "lucide-react";
import { useAuth, UserProvider } from "../context/user-context";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import ThemeToggle from "./theme-toggle";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "./ui/context-menu";

// ─── ID helpers ───────────────────────────────────────────────────────────────
const grpId = (id: number) => `grp-${id}` as UniqueIdentifier;
const chId = (id: number) => `ch-${id}` as UniqueIdentifier;
const parseGrpId = (uid: UniqueIdentifier) =>
  parseInt((uid as string).slice(4));
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
}: {
  channel: Channel;
  projectId: number;
  isActive: boolean;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chId(channel.id) });

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
        className={`flex text-lg items-center ${indent ? "pl-5 pr-3" : "px-3"} py-2 hover:font-medium cursor-grab active:cursor-grabbing ${
          isActive
            ? "bg-gray-100 dark:bg-white/8 rounded font-medium"
            : "hover:bg-gray-100 dark:hover:bg-white/8 hover:rounded"
        }`}
      >
        # {channel.name}
      </a>
    </div>
  );
}

// ─── Sortable group header ────────────────────────────────────────────────────
function SortableGroup({
  group,
  collapsed,
  onToggle,
  onRename,
  onDelete,
  onNewGroup,
  projectId,
  pathname,
  onNavigate,
  channelItems,
  dimChannels,
}: {
  group: ChannelGroupWithChannels;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (id: number) => void;
  onDelete: (id: number) => void;
  onNewGroup: () => void;
  projectId: number;
  pathname: string;
  onNavigate?: () => void;
  channelItems: UniqueIdentifier[];
  dimChannels?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: grpId(group.id) });

  const isChannelActive = (id: number) =>
    pathname === `/dashboard/${projectId}/channels/${id}`;

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
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            {...attributes}
            {...listeners}
            onClick={onToggle}
            className="flex w-full items-center gap-1 px-1 py-0.5 text-xs font-semibold capitalize text-muted-foreground hover:text-foreground rounded hover:bg-gray-100 dark:hover:bg-white/8 cursor-grab active:cursor-grabbing transition-colors select-none"
          >
            {collapsed ? (
              <ChevronRightIcon size={12} className="shrink-0" />
            ) : (
              <ChevronDownIcon size={12} className="shrink-0" />
            )}
            <span className="truncate">{group.name}</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onSelect={() => onRename(group.id)}>
            Rename
          </ContextMenuItem>
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

      {!collapsed && (
        <SortableContext
          items={channelItems}
          strategy={verticalListSortingStrategy}
        >
          <div
            className={`mt-0.5 ${dimChannels ? "opacity-50 pointer-events-none" : ""}`}
          >
            {group.channels.map((ch) => (
              <SortableChannel
                key={ch.id}
                channel={ch}
                projectId={projectId}
                isActive={isChannelActive(ch.id)}
                onNavigate={onNavigate}
                indent
              />
            ))}
          </div>
        </SortableContext>
      )}
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

// ─── Channel groups DnD list ──────────────────────────────────────────────────
function ChannelGroups({
  initialUngrouped,
  initialGroups,
  projectId,
  pathname,
  onNavigate,
  triggerCreate,
  onTriggerCreateDone,
}: {
  initialUngrouped: Channel[];
  initialGroups: ChannelGroupWithChannels[];
  projectId: number;
  pathname: string;
  onNavigate?: () => void;
  triggerCreate: boolean;
  onTriggerCreateDone: () => void;
}) {
  const [ungrouped, setUngrouped] = useState<Channel[]>(initialUngrouped);
  const [groups, setGroups] =
    useState<ChannelGroupWithChannels[]>(initialGroups);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [isDraggingGroup, setIsDraggingGroup] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [renamingGroupId, setRenamingGroupId] = useState<number | null>(null);

  // Refs for current state (avoids stale closures in drag handlers)
  const ungroupedRef = useRef(ungrouped);
  const groupsRef = useRef(groups);
  useEffect(() => {
    ungroupedRef.current = ungrouped;
  }, [ungrouped]);
  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Snapshot for cancel
  const snapshotRef = useRef<{
    ungrouped: Channel[];
    groups: ChannelGroupWithChannels[];
  } | null>(null);
  const collapsedSnapshotRef = useRef<Set<number>>(new Set());

  // Sync external trigger for creating group
  useEffect(() => {
    if (triggerCreate) {
      setCreatingGroup(true);
      onTriggerCreateDone();
    }
  }, [triggerCreate, onTriggerCreateDone]);

  // ── Custom event sync ──────────────────────────────────────────────────────
  useEffect(() => {
    const onCreated = (e: CustomEvent<{ channel: Channel }>) => {
      setUngrouped((prev) => [...prev, e.detail.channel]);
    };
    const onDeleted = (e: CustomEvent<{ id: number }>) => {
      setUngrouped((prev) => prev.filter((c) => c.id !== e.detail.id));
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          channels: g.channels.filter((c) => c.id !== e.detail.id),
        })),
      );
    };
    window.addEventListener("channel:created", onCreated as EventListener);
    window.addEventListener("channel:deleted", onDeleted as EventListener);
    return () => {
      window.removeEventListener("channel:created", onCreated as EventListener);
      window.removeEventListener("channel:deleted", onDeleted as EventListener);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // ── Container lookup ───────────────────────────────────────────────────────
  // Returns "ungrouped" | groupId | null
  const findContainer = (id: UniqueIdentifier): "ungrouped" | number | null => {
    const u = ungroupedRef.current;
    const g = groupsRef.current;
    // Direct container IDs
    if (id === "ungrouped") return "ungrouped";
    if (isGrp(id)) return parseGrpId(id);
    // Channel lookup
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

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id);
    snapshotRef.current = {
      ungrouped: ungroupedRef.current.map((c) => ({ ...c })),
      groups: groupsRef.current.map((g) => ({
        ...g,
        channels: g.channels.map((c) => ({ ...c })),
      })),
    };
    if (isGrp(active.id)) {
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

    // Remove from source, insert into destination
    setUngrouped((prev) => {
      const without = prev.filter((c) => c.id !== chNum);
      if (dstContainer !== "ungrouped") return without;
      if (isCh(over.id)) {
        const overNum = parseChId(over.id);
        const overIdx = without.findIndex((c) => c.id === overNum);
        const updated = [...without];
        updated.splice(overIdx >= 0 ? overIdx : updated.length, 0, {
          ...channel,
          groupId: null,
        });
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
          updated.splice(overIdx >= 0 ? overIdx : updated.length, 0, {
            ...channel,
            groupId: g.id,
          });
          return { ...g, channels: updated };
        }
        return { ...g, channels: [...without, { ...channel, groupId: g.id }] };
      }),
    );
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);

    if (!over) {
      if (snapshotRef.current) {
        setUngrouped(snapshotRef.current.ungrouped);
        setGroups(snapshotRef.current.groups);
      }
      setIsDraggingGroup(false);
      snapshotRef.current = null;
      return;
    }

    // ── Group reorder ──
    if (isGrp(active.id)) {
      setIsDraggingGroup(false);
      setCollapsed(collapsedSnapshotRef.current);
      if (!isGrp(over.id)) {
        snapshotRef.current = null;
        return;
      }
      const cur = groupsRef.current;
      const oldIdx = cur.findIndex((g) => grpId(g.id) === active.id);
      const newIdx = cur.findIndex((g) => grpId(g.id) === over.id);
      if (oldIdx !== newIdx) {
        const reordered = arrayMove(cur, oldIdx, newIdx);
        setGroups(reordered);
        fetch("/api/channel-group", {
          method: "PATCH",
          body: JSON.stringify({
            groups: reordered.map((g, i) => ({ id: g.id, order: i })),
          }),
          headers: { "Content-Type": "application/json" },
        });
      }
      snapshotRef.current = null;
      return;
    }

    // ── Channel reorder / move ──
    if (isCh(active.id) && isCh(over.id) && active.id !== over.id) {
      const chNum = parseChId(active.id);
      const overNum = parseChId(over.id);
      const srcContainer = findContainer(active.id);
      const dstContainer = findContainer(over.id);

      if (srcContainer === dstContainer) {
        // Same-container reorder
        if (srcContainer === "ungrouped") {
          setUngrouped((prev) => {
            const oldIdx = prev.findIndex((c) => c.id === chNum);
            const newIdx = prev.findIndex((c) => c.id === overNum);
            return arrayMove(prev, oldIdx, newIdx);
          });
        } else if (typeof srcContainer === "number") {
          setGroups((prev) =>
            prev.map((g) => {
              if (g.id !== srcContainer) return g;
              const oldIdx = g.channels.findIndex((c) => c.id === chNum);
              const newIdx = g.channels.findIndex((c) => c.id === overNum);
              return { ...g, channels: arrayMove(g.channels, oldIdx, newIdx) };
            }),
          );
        }
      }
    }

    // Persist after all state updates settle
    setTimeout(() => {
      const u = ungroupedRef.current;
      const g = groupsRef.current;
      const allItems = [
        ...u.map((c, i) => ({ id: c.id, order: i, groupId: null as null })),
        ...g.flatMap((grp) =>
          grp.channels.map((c, i) => ({ id: c.id, order: i, groupId: grp.id })),
        ),
      ];
      fetch("/api/channel", {
        method: "PATCH",
        body: JSON.stringify({ channels: allItems }),
        headers: { "Content-Type": "application/json" },
      });
    }, 0);

    snapshotRef.current = null;
  };

  const handleDragCancel = () => {
    if (snapshotRef.current) {
      setUngrouped(snapshotRef.current.ungrouped);
      setGroups(snapshotRef.current.groups);
    }
    setCollapsed(collapsedSnapshotRef.current);
    setActiveId(null);
    setIsDraggingGroup(false);
    snapshotRef.current = null;
  };

  // ── Group CRUD ─────────────────────────────────────────────────────────────
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
    setGroups((prev) => prev.map((g) => (g.id === id ? { ...g, name } : g)));
    await fetch("/api/channel-group", {
      method: "PUT",
      body: JSON.stringify({ id, name }),
      headers: { "Content-Type": "application/json" },
    });
  };

  const handleDeleteGroup = async (id: number) => {
    const group = groupsRef.current.find((g) => g.id === id);
    if (group) {
      setUngrouped((prev) => [
        ...prev,
        ...group.channels.map((c) => ({ ...c, groupId: null })),
      ]);
    }
    setGroups((prev) => prev.filter((g) => g.id !== id));
    await fetch("/api/channel-group", {
      method: "DELETE",
      body: JSON.stringify({ id }),
      headers: { "Content-Type": "application/json" },
    });
  };

  // ── Derived ────────────────────────────────────────────────────────────────
  const ungroupedItems = ungrouped.map((c) => chId(c.id));
  const groupItems = groups.map((g) => grpId(g.id));
  const activeChannel =
    activeId && isCh(activeId) ? getChannel(activeId) : null;
  const activeGroup =
    activeId && isGrp(activeId)
      ? groups.find((g) => grpId(g.id) === activeId)
      : null;
  const isChannelActive = (id: number) =>
    pathname === `/dashboard/${projectId}/channels/${id}`;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Ungrouped channels */}
      <SortableContext
        items={ungroupedItems}
        strategy={verticalListSortingStrategy}
      >
        {ungrouped.map((ch) => (
          <SortableChannel
            key={ch.id}
            channel={ch}
            projectId={projectId}
            isActive={isChannelActive(ch.id)}
            onNavigate={onNavigate}
          />
        ))}
      </SortableContext>

      {/* Groups */}
      <SortableContext
        items={groupItems}
        strategy={verticalListSortingStrategy}
      >
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
              onToggle={() =>
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  if (next.has(group.id)) next.delete(group.id);
                  else next.add(group.id);
                  return next;
                })
              }
              onRename={setRenamingGroupId}
              onDelete={handleDeleteGroup}
              onNewGroup={() => setCreatingGroup(true)}
              projectId={projectId}
              pathname={pathname}
              onNavigate={onNavigate}
              channelItems={group.channels.map((c) => chId(c.id))}
              dimChannels={isDraggingGroup}
            />
          );
        })}
      </SortableContext>

      {/* Inline create group */}
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
  );
}

// ─── Panel content ────────────────────────────────────────────────────────────
function PanelContent({
  currentProject,
  currentProjects,
  currentChannels,
  currentGroups,
  pathname,
  onNavigate,
}: {
  currentProject: Project;
  currentProjects: Project[];
  currentChannels: Channel[];
  currentGroups: ChannelGroupWithChannels[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [projects] = useState<Project[]>(currentProjects);
  const [triggerCreateGroup, setTriggerCreateGroup] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignout = async () => {
    await signOut();
    window.location.replace("/login");
  };

  const project = currentProject;
  const isFeedActive = () => pathname === `/dashboard/${project.id}/feed`;
  const isSettingsActive = () =>
    pathname === `/dashboard/${project.id}/settings`;
  const isApiDocsActive = () =>
    pathname === `/dashboard/${project.id}/api-docs`;

  const navCss =
    "flex px-3 py-2 space-x-2 items-center hover:bg-gray-100 dark:hover:bg-white/8 hover:cursor-pointer hover:font-medium rounded ";
  const activeNavCss =
    navCss + "bg-gray-100 dark:bg-white/8 font-medium rounded-md";

  const ungroupedChannels = currentChannels.filter((c) => !c.groupId);

  return (
    <Popover>
      {/* User */}
      <div className="mt-4 space-y-2">
        <h1 className="text-sm font-mono">User</h1>
        <PopoverTrigger asChild>
          <p className="font-semibold hover:underline hover:cursor-pointer">
            @{user?.userName}
          </p>
        </PopoverTrigger>
        <PopoverContent>
          <Button
            className="w-full hover:cursor-pointer"
            variant="secondary"
            onClick={handleSignout}
          >
            <LogOutIcon />
            Sign out
          </Button>
        </PopoverContent>
      </div>

      {/* Project */}
      <div className="flex space-x-2 w-full items-center justify-between mt-4">
        <h1 className="text-sm font-mono">Project</h1>
        <a href="/dashboard/create-project">
          <PlusIcon
            size={20}
            className="hover:cursor-pointer hover:text-black/50"
          />
        </a>
      </div>
      <Select
        defaultValue={String(currentProject.id)}
        onValueChange={(value) => {
          const p = projects.find((p) => String(p.id) === value);
          if (p) {
            window.location.href = `/dashboard/${p.id}/feed`;
            onNavigate?.();
          }
        }}
      >
        <SelectTrigger className="w-full mt-2">
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          {projects.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Navigation */}
      <div className="mt-4 space-y-2">
        <h1 className="text-sm font-mono">Navigation</h1>
        <a
          className={isFeedActive() ? activeNavCss : navCss}
          href={`/dashboard/${project.id}/feed`}
          onClick={() => onNavigate?.()}
        >
          <InboxIcon size={20} />
          <p>Feed</p>
        </a>
        <a
          className={isSettingsActive() ? activeNavCss : navCss}
          href={`/dashboard/${project.id}/settings`}
          onClick={() => onNavigate?.()}
        >
          <Settings size={20} />
          <p>Settings</p>
        </a>
        <a
          className={isApiDocsActive() ? activeNavCss : navCss}
          href={`/dashboard/${project.id}/api-docs`}
          onClick={() => onNavigate?.()}
        >
          <BookOpenIcon size={20} />
          <p>API Docs</p>
        </a>
        {user?.isAdmin && (
          <a
            className={pathname === "/admin/users" ? activeNavCss : navCss}
            href="/admin/users"
            onClick={() => onNavigate?.()}
          >
            <UsersIcon size={20} />
            <p>Users</p>
          </a>
        )}
      </div>

      {/* Channels header */}
      <div className="flex w-full items-center justify-between mt-4 mb-1">
        <h1 className="text-sm font-mono">Channels</h1>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTriggerCreateGroup(true)}
            title="New group"
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <FolderPlusIcon size={15} />
          </button>
          <a
            href={`/dashboard/${project.id}/create-channel`}
            onClick={() => onNavigate?.()}
            title="New channel"
            className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-white/8 text-muted-foreground hover:text-foreground transition-colors"
          >
            <PlusIcon size={15} />
          </a>
        </div>
      </div>

      <ChannelGroups
        initialUngrouped={ungroupedChannels}
        initialGroups={currentGroups}
        projectId={project.id}
        pathname={pathname}
        onNavigate={onNavigate}
        triggerCreate={triggerCreateGroup}
        onTriggerCreateDone={() => setTriggerCreateGroup(false)}
      />

      {/* Theme */}
      <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
        <h1 className="text-sm font-mono">Theme</h1>
        <ThemeToggle />
      </div>
    </Popover>
  );
}

// ─── Side panel wrapper ───────────────────────────────────────────────────────
function SidePanelContent({
  currentProject,
  currentProjects,
  currentChannels,
  currentGroups,
  currentPath,
}: {
  currentProject: Project;
  currentProjects: Project[];
  currentChannels: Channel[];
  currentGroups: ChannelGroupWithChannels[];
  currentPath: string;
}) {
  const [pathname, setPathname] = useState(currentPath);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    const handleNav = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", handleNav);
    document.addEventListener("astro:page-load", handleNav);
    return () => {
      window.removeEventListener("popstate", handleNav);
      document.removeEventListener("astro:page-load", handleNav);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    if (drawerOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  const sharedProps = {
    currentProject,
    currentProjects,
    currentChannels,
    currentGroups,
    pathname,
  };

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden w-full border-b px-4 py-3 flex items-center">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 hover:bg-gray-100 rounded-md"
        >
          <MenuIcon size={20} />
        </button>
      </div>

      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      <div
        className={`md:hidden fixed top-0 left-0 z-50 h-screen w-[300px] bg-white border-r overflow-y-auto p-6 transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end">
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
            className="p-2 hover:bg-gray-100 rounded"
          >
            <XIcon size={20} />
          </button>
        </div>
        <PanelContent
          {...sharedProps}
          onNavigate={() => setDrawerOpen(false)}
        />
      </div>

      {/* Desktop */}
      <div className="hidden md:block w-[350px] shrink-0 border-r h-screen sticky top-0 overflow-y-auto p-8">
        <PanelContent {...sharedProps} />
      </div>
    </>
  );
}

function SidePanel(props: Parameters<typeof SidePanelContent>[0]) {
  return (
    <UserProvider>
      <SidePanelContent {...props} />
    </UserProvider>
  );
}

export default SidePanel;
