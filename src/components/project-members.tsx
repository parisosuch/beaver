import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { UserMinusIcon, UserPlusIcon } from "lucide-react";

type Role = "owner" | "maintainer" | "guest";

type Member = {
  id: number;
  userId: number;
  userName: string;
  role: Role;
};

type NonMember = {
  id: number;
  userName: string;
};

export default function ProjectMembers({
  projectId,
  currentUserId,
}: {
  projectId: number;
  currentUserId: number;
}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [nonMembers, setNonMembers] = useState<NonMember[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<Role>("guest");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchMembers = async () => {
    const res = await fetch(`/api/project-members?projectId=${projectId}`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members);
      setNonMembers(data.nonMembers);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [projectId]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    setError("");
    const res = await fetch("/api/project-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        userId: parseInt(selectedUserId),
        role: selectedRole,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setAddOpen(false);
      setSelectedUserId("");
      setSelectedRole("guest");
      await fetchMembers();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to add member.");
    }
  };

  const handleRoleChange = async (userId: number, role: Role) => {
    const res = await fetch("/api/project-members", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, userId, role }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role } : m)));
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to update role.");
    }
  };

  const handleRemoveMember = async () => {
    if (!removeTarget) return;
    setLoading(true);
    const res = await fetch("/api/project-members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, userId: removeTarget.userId }),
    });
    setLoading(false);
    if (res.ok) {
      setRemoveTarget(null);
      await fetchMembers();
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to remove member.");
    }
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col space-y-2">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-2 border-b last:border-0 gap-2"
          >
            <span className="font-medium">@{member.userName}</span>
            <div className="flex items-center gap-2">
              <Select
                value={member.role}
                onValueChange={(val) => handleRoleChange(member.userId, val as Role)}
                disabled={member.userId === currentUserId}
              >
                <SelectTrigger className="w-full sm:w-32 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="maintainer">Maintainer</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
              {member.userId !== currentUserId && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setRemoveTarget(member)}
                    >
                      <UserMinusIcon size={16} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Remove member</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        ))}

        {nonMembers.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2 self-start"
            onClick={() => setAddOpen(true)}
          >
            <UserPlusIcon size={14} className="mr-1" />
            Add Member
          </Button>
        )}
      </div>

      {/* Add member dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a user…" />
                </SelectTrigger>
                <SelectContent>
                  {nonMembers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      @{u.userName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select value={selectedRole} onValueChange={(val) => setSelectedRole(val as Role)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="maintainer">Maintainer</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} disabled={loading || !selectedUserId}>
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove confirmation dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Remove <strong>@{removeTarget?.userName}</strong> from this project?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember} disabled={loading}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
