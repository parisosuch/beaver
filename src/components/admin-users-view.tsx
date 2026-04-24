import { useState } from "react";
import type { User } from "@/lib/beaver/user";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
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
} from "lucide-react";

function TempPasswordCell({ tempPassword }: { tempPassword: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
        {tempPassword}
      </code>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
          </button>
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
        isAdmin
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
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
            <button
              onClick={() =>
                onToggleCanCreateProjects(user.id, !user.canCreateProjects)
              }
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {user.canCreateProjects ? (
                <FolderPlusIcon size={15} />
              ) : (
                <FolderIcon size={15} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {user.canCreateProjects
              ? "Revoke project creation"
              : "Allow project creation"}
          </TooltipContent>
        </Tooltip>
      )}
      {user.id !== currentUserId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onToggleAdmin(user.id, !user.isAdmin)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {user.isAdmin ? (
                <ShieldOffIcon size={15} />
              ) : (
                <ShieldIcon size={15} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            {user.isAdmin ? "Remove admin" : "Make admin"}
          </TooltipContent>
        </Tooltip>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onReset(user)}
            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCwIcon size={15} />
          </button>
        </TooltipTrigger>
        <TooltipContent>Reset password</TooltipContent>
      </Tooltip>
      {user.id !== currentUserId && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onDelete(user)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-destructive transition-colors"
            >
              <Trash2Icon size={15} />
            </button>
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
}: {
  initialUsers: User[];
  currentUserId: number;
  backUrl: string;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);

  // Create
  const [createOpen, setCreateOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newCanCreateProjects, setNewCanCreateProjects] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

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
      setCreateOpen(false);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
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
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, isAdmin } : u)),
      );
    }
  };

  const handleToggleCanCreateProjects = async (
    id: number,
    canCreateProjects: boolean,
  ) => {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, canCreateProjects }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, canCreateProjects } : u)),
      );
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
            u.id === resetTarget.id
              ? { ...u, tempPassword, mustChangePassword: true }
              : u,
          ),
        );
        setResetTarget(null);
      }
    } finally {
      setResetting(false);
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="max-w-4xl mx-auto p-4 md:p-8">
          {/* Header */}
          <div className="mb-8">
            <a
              href={backUrl}
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
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g. paris"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="canCreateProjects"
                        checked={newCanCreateProjects}
                        onChange={(e) =>
                          setNewCanCreateProjects(e.target.checked)
                        }
                        className="h-4 w-4"
                      />
                      <Label htmlFor="canCreateProjects">
                        Can create projects
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      A temporary password will be generated. Share it with the
                      user — they'll be prompted to set a new one on first
                      login.
                    </p>
                    {createError && (
                      <p className="text-sm text-destructive">{createError}</p>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={creating}
                    >
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
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Role
                  </th>
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
                          onToggleCanCreateProjects={
                            handleToggleCanCreateProjects
                          }
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
                  <span className="font-mono font-medium">
                    @{user.userName}
                  </span>
                  <UserRoleBadge isAdmin={user.isAdmin} />
                </div>
                {user.tempPassword && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Temp password
                    </p>
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
        <Dialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete user</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-mono font-medium text-foreground">
                @{deleteTarget?.userName}
              </span>
              ? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteConfirm}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset password confirmation dialog */}
        <Dialog
          open={!!resetTarget}
          onOpenChange={(open) => !open && setResetTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset password</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              This will generate a new temporary password for{" "}
              <span className="font-mono font-medium text-foreground">
                @{resetTarget?.userName}
              </span>{" "}
              and sign them out. They'll need to set a new password on next
              login.
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
