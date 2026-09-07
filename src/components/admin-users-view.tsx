import { useState, useEffect } from "react";
import type { User } from "@/lib/beaver/user";
import type { Role } from "@/lib/beaver/project-member";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { RoleSelectItem } from "./role-select-item";
import { toast } from "sonner";
import {
  ArrowLeftIcon,
  CheckIcon,
  ClipboardIcon,
  FolderIcon,
  FolderPlusIcon,
  PlusIcon,
  RefreshCwIcon,
  ShieldIcon,
  ShieldOffIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";

type ProjectOption = { id: number; name: string };
type OwnedProject = { id: number; name: string; eventCount: number };
type Assignment = { projectId: string; role: Role };

function TempPasswordCell({ tempPassword }: { tempPassword: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">{tempPassword}</code>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleCopy}
            aria-label="Copy password"
            className="size-6 text-muted-foreground hover:text-foreground"
          >
            {copied ? <CheckIcon className="size-4" /> : <ClipboardIcon className="size-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{copied ? "Copied!" : "Copy password"}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function UserRoleBadge({ isAdmin }: { isAdmin: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
        isAdmin ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
      }`}
    >
      {isAdmin ? "Admin" : "User"}
    </span>
  );
}

function UserActions({
  user,
  currentUserId,
  onToggleCanCreateProjects,
  onToggleAdmin,
  onReset,
  onDelete,
}: {
  user: User;
  currentUserId: number;
  onToggleCanCreateProjects: (id: number, val: boolean) => void;
  onToggleAdmin: (id: number, val: boolean) => void;
  onReset: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  return (
    <>
      {user.id !== currentUserId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onToggleCanCreateProjects(user.id, !user.canCreateProjects)}
              aria-label={
                user.canCreateProjects ? "Revoke project creation" : "Allow project creation"
              }
              className="text-muted-foreground hover:text-foreground"
            >
              {user.canCreateProjects ? (
                <FolderPlusIcon className="size-4" />
              ) : (
                <FolderIcon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {user.canCreateProjects ? "Revoke project creation" : "Allow project creation"}
          </TooltipContent>
        </Tooltip>
      )}
      {user.id !== currentUserId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onToggleAdmin(user.id, !user.isAdmin)}
              aria-label={user.isAdmin ? "Remove admin" : "Make admin"}
              className="text-muted-foreground hover:text-foreground"
            >
              {user.isAdmin ? (
                <ShieldOffIcon className="size-4" />
              ) : (
                <ShieldIcon className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{user.isAdmin ? "Remove admin" : "Make admin"}</TooltipContent>
        </Tooltip>
      )}
      {!(user.id === currentUserId && user.isAdmin) && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onReset(user)}
              aria-label="Reset password"
              className="text-muted-foreground hover:text-foreground"
            >
              <RefreshCwIcon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset password</TooltipContent>
        </Tooltip>
      )}
      {user.id !== currentUserId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onDelete(user)}
              aria-label="Delete user"
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2Icon className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Delete user</TooltipContent>
        </Tooltip>
      )}
    </>
  );
}

export default function AdminUsersView({
  initialUsers,
  currentUserId,
  backUrl,
  allProjects,
}: {
  initialUsers: User[];
  currentUserId: number;
  backUrl: string;
  allProjects: ProjectOption[];
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [resolvedBackUrl, setResolvedBackUrl] = useState(backUrl);

  useEffect(() => {
    const lastId = localStorage.getItem("lastProjectId");
    if (lastId) setResolvedBackUrl(`/dashboard/${lastId}/feed`);
  }, []);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newCanCreateProjects, setNewCanCreateProjects] = useState(false);
  const [newAssignments, setNewAssignments] = useState<Assignment[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const addAssignmentRow = () => {
    const taken = new Set(newAssignments.map((a) => a.projectId));
    const next = allProjects.find((p) => !taken.has(String(p.id)));
    if (!next) return;
    setNewAssignments((prev) => [...prev, { projectId: String(next.id), role: "guest" }]);
  };

  const updateAssignment = (index: number, patch: Partial<Assignment>) => {
    setNewAssignments((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const removeAssignment = (index: number) => {
    setNewAssignments((prev) => prev.filter((_, i) => i !== index));
  };

  const projectOptionsFor = (index: number) => {
    const takenByOthers = new Set(
      newAssignments.filter((_, i) => i !== index).map((a) => a.projectId),
    );
    return allProjects.filter((p) => !takenByOthers.has(String(p.id)));
  };

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [ownedProjects, setOwnedProjects] = useState<OwnedProject[] | null>(null);
  const [ownedLoading, setOwnedLoading] = useState(false);
  const [ownedError, setOwnedError] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [reassignTo, setReassignTo] = useState<Record<number, string>>({});
  const [reassigningId, setReassigningId] = useState<number | null>(null);

  // isStale guards against a reply for a user whose dialog has already been closed
  // landing in the dialog of the next one.
  const loadOwnedProjects = async (userId: number, isStale: () => boolean = () => false) => {
    setOwnedLoading(true);
    setOwnedError(null);
    try {
      const res = await fetch(`/api/users/owned-projects?userId=${userId}`);
      const data = await res.json().catch(() => null);
      if (isStale()) return;
      if (!res.ok) {
        setOwnedError(data?.error || "Could not check which projects this user owns.");
        return;
      }
      setOwnedProjects(data.ownedProjects as OwnedProject[]);
    } catch {
      if (isStale()) return;
      setOwnedError("Could not check which projects this user owns.");
    } finally {
      if (!isStale()) setOwnedLoading(false);
    }
  };

  // What the delete would take with it, fetched when the dialog opens.
  useEffect(() => {
    if (!deleteTarget) return;
    setOwnedProjects(null);
    setOwnedError(null);
    setDeleteConfirmName("");
    setReassignTo({});

    let cancelled = false;
    loadOwnedProjects(deleteTarget.id, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [deleteTarget]);

  // Reset password confirmation
  const [resetTarget, setResetTarget] = useState<User | null>(null);
  const [resetting, setResetting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userName: newUsername.trim(),
          canCreateProjects: newCanCreateProjects,
          projectAssignments: newAssignments.map((a) => ({
            projectId: parseInt(a.projectId),
            role: a.role,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.error || "Failed to create user.");
        return;
      }
      setUsers((prev) => [...prev, data]);
      setNewUsername("");
      setNewCanCreateProjects(false);
      setNewAssignments([]);
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleReassign = async (project: OwnedProject) => {
    const newOwnerId = reassignTo[project.id];
    if (!newOwnerId) return;
    setReassigningId(project.id);
    try {
      const res = await fetch("/api/project/transfer-owner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, newOwnerId: parseInt(newOwnerId) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "Failed to transfer ownership.");
        return;
      }
      const newOwner = users.find((u) => String(u.id) === newOwnerId);
      toast.success(`${project.name} now belongs to @${newOwner?.userName ?? "its new owner"}.`);
      setOwnedProjects((prev) => (prev ? prev.filter((p) => p.id !== project.id) : prev));
    } catch {
      toast.error("Failed to transfer ownership.");
    } finally {
      setReassigningId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: deleteTarget.id,
          deleteOwnedProjects: (ownedProjects?.length ?? 0) > 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to delete user.");
        return;
      }
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete user.");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleAdmin = async (id: number, isAdmin: boolean) => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isAdmin }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, isAdmin } : u)));
    }
  };

  const handleToggleCanCreateProjects = async (id: number, canCreateProjects: boolean) => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, canCreateProjects }),
    });
    if (res.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, canCreateProjects } : u)));
    }
  };

  const handleResetConfirm = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resetTarget.id }),
      });
      if (res.ok) {
        const { tempPassword } = await res.json();
        setUsers((prev) =>
          prev.map((u) =>
            u.id === resetTarget.id ? { ...u, tempPassword, mustChangePassword: true } : u,
          ),
        );
        setResetTarget(null);
      }
    } finally {
      setResetting(false);
    }
  };

  const ownsProjects = (ownedProjects?.length ?? 0) > 0;
  const ownedSummary = (ownedProjects ?? [])
    .map((p) => `${p.name} (${p.eventCount.toLocaleString()} events)`)
    .join(", ");
  const reassignCandidates = users.filter((u) => u.id !== deleteTarget?.id);
  const deleteBlocked =
    deleting ||
    ownedLoading ||
    !!ownedError ||
    ownedProjects === null ||
    (ownsProjects && deleteConfirmName !== deleteTarget?.userName);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <a
              href={resolvedBackUrl}
              data-astro-reload
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
            >
              <ArrowLeftIcon size={14} />
              Back
            </a>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-mono text-muted-foreground">Admin</p>
                <h1 className="text-2xl font-semibold">Users</h1>
              </div>

              {/* Create user dialog */}
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon size={16} />
                    New user
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create user</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreate} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        value={newUsername}
                        onChange={(e) =>
                          setNewUsername(
                            e.target.value.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-{2,}/g, "-"),
                          )
                        }
                        placeholder="e.g. paris"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="canCreateProjects"
                        checked={newCanCreateProjects}
                        onChange={(e) => setNewCanCreateProjects(e.target.checked)}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="canCreateProjects">Can create projects</Label>
                    </div>
                    {allProjects.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Project assignment</Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={addAssignmentRow}
                            disabled={newAssignments.length >= allProjects.length}
                          >
                            <PlusIcon size={14} />
                            Add project
                          </Button>
                        </div>
                        {newAssignments.map((assignment, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <Select
                              value={assignment.projectId}
                              onValueChange={(val) => updateAssignment(i, { projectId: val })}
                            >
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select a project…" />
                              </SelectTrigger>
                              <SelectContent>
                                {projectOptionsFor(i).map((p) => (
                                  <SelectItem key={p.id} value={String(p.id)}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select
                              value={assignment.role}
                              onValueChange={(val) => updateAssignment(i, { role: val as Role })}
                            >
                              <SelectTrigger className="w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <RoleSelectItem role="owner" />
                                <RoleSelectItem role="maintainer" />
                                <RoleSelectItem role="guest" />
                              </SelectContent>
                            </Select>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeAssignment(i)}
                            >
                              <XIcon size={14} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      A temporary password will be generated. Share it with the user — they'll be
                      prompted to set a new one on first login.
                    </p>
                    {createError && <p className="text-sm text-destructive">{createError}</p>}
                    <Button type="submit" className="w-full" disabled={creating}>
                      {creating ? "Creating…" : "Create user"}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Username
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Role</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Temp password
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`border-b last:border-0 ${i % 2 === 0 ? "" : "bg-muted/20"}`}
                  >
                    <td className="px-4 py-3 font-mono">@{user.userName}</td>
                    <td className="px-4 py-3">
                      <UserRoleBadge isAdmin={user.isAdmin} />
                    </td>
                    <td className="px-4 py-3">
                      {user.tempPassword ? (
                        <TempPasswordCell tempPassword={user.tempPassword} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <UserActions
                          user={user}
                          currentUserId={currentUserId}
                          onToggleCanCreateProjects={handleToggleCanCreateProjects}
                          onToggleAdmin={handleToggleAdmin}
                          onReset={setResetTarget}
                          onDelete={setDeleteTarget}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {users.map((user) => (
              <div key={user.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-medium">@{user.userName}</span>
                  <UserRoleBadge isAdmin={user.isAdmin} />
                </div>
                {user.tempPassword && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Temp password</p>
                    <TempPasswordCell tempPassword={user.tempPassword} />
                  </div>
                )}
                <div className="flex items-center justify-end gap-1 pt-1 border-t">
                  <UserActions
                    user={user}
                    currentUserId={currentUserId}
                    onToggleCanCreateProjects={handleToggleCanCreateProjects}
                    onToggleAdmin={handleToggleAdmin}
                    onReset={setResetTarget}
                    onDelete={setDeleteTarget}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Delete confirmation dialog */}
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete user</DialogTitle>
            </DialogHeader>

            {ownedLoading && (
              <p className="text-sm text-muted-foreground">
                Checking what @{deleteTarget?.userName} owns…
              </p>
            )}

            {ownedError && (
              <div className="space-y-2">
                <p className="text-sm text-destructive">{ownedError}</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => deleteTarget && loadOwnedProjects(deleteTarget.id)}
                >
                  Try again
                </Button>
              </div>
            )}

            {!ownedLoading && !ownedError && ownedProjects !== null && !ownsProjects && (
              <p className="text-sm text-muted-foreground">
                Are you sure you want to delete{" "}
                <span className="font-mono font-medium text-foreground">
                  @{deleteTarget?.userName}
                </span>
                ? This cannot be undone.
              </p>
            )}

            {!ownedLoading && !ownedError && ownsProjects && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono font-medium text-foreground">
                    @{deleteTarget?.userName}
                  </span>{" "}
                  owns {ownedProjects?.length}{" "}
                  {ownedProjects?.length === 1 ? "project" : "projects"}:{" "}
                  <span className="text-foreground">{ownedSummary}</span>. Deleting this account
                  deletes those projects and everything in them — events, comments, alert rules and
                  member access. This cannot be undone.
                </p>

                <div className="space-y-2">
                  <Label>Reassign instead</Label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {ownedProjects?.map((project) => (
                      <div key={project.id} className="flex items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {project.eventCount.toLocaleString()}{" "}
                            {project.eventCount === 1 ? "event" : "events"}
                          </p>
                        </div>
                        <Select
                          value={reassignTo[project.id] ?? ""}
                          onValueChange={(val) =>
                            setReassignTo((prev) => ({ ...prev, [project.id]: val }))
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue placeholder="New owner…" />
                          </SelectTrigger>
                          <SelectContent>
                            {reassignCandidates.map((candidate) => (
                              <SelectItem key={candidate.id} value={String(candidate.id)}>
                                @{candidate.userName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={!reassignTo[project.id] || reassigningId === project.id}
                          onClick={() => handleReassign(project)}
                        >
                          {reassigningId === project.id ? "Reassigning…" : "Reassign"}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="delete-confirm-username">
                    Type the username to confirm deletion
                  </Label>
                  <Input
                    id="delete-confirm-username"
                    autoComplete="off"
                    placeholder={deleteTarget?.userName}
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end mt-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteBlocked}>
                {deleting ? "Deleting…" : ownsProjects ? "Delete user and projects" : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset password confirmation dialog */}
        <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will generate a new temporary password for{" "}
              <span className="font-mono font-medium text-foreground">
                @{resetTarget?.userName}
              </span>{" "}
              and sign them out. They'll need to set a new password on next login.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="secondary" onClick={() => setResetTarget(null)}>
                Cancel
              </Button>
              <Button onClick={handleResetConfirm} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset password"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
