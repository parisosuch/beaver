import type { Channel } from "@/lib/beaver/channel";
import type { Project } from "@/lib/beaver/project";
import { useEffect, useState } from "react";
import {
  BarChart2Icon,
  BookmarkIcon,
  BookOpenIcon,
  HashIcon,
  InboxIcon,
  PlusIcon,
  Settings,
  UsersIcon,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./ui/command";
import { useAuth, UserProvider } from "../context/user-context";

function CommandPaletteContent({
  currentProject,
  currentProjects,
  currentChannels,
  userRole,
}: {
  currentProject: Project | null;
  currentProjects: Project[];
  currentChannels: Channel[];
  userRole: "owner" | "maintainer" | "guest";
}) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  // Keep currentProject in sync across navigations
  const [project, setProject] = useState(currentProject);
  const [channels, setChannels] = useState(currentChannels);
  useEffect(() => {
    setProject(currentProject);
    setChannels(currentChannels);
  }, [currentProject, currentChannels]);

  function navigate(href: string) {
    setOpen(false);
    window.location.href = href;
  }

  const canEdit = userRole === "owner" || userRole === "maintainer";
  const otherProjects = currentProjects.filter((p) => p.id !== project?.id);

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      showCloseButton={false}
      title="Command Palette"
      description="Search for a page or action"
    >
      <CommandInput placeholder="Search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {project && (
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => navigate(`/dashboard/${project.id}/feed`)}>
              <InboxIcon />
              Feed
            </CommandItem>
            <CommandItem onSelect={() => navigate(`/dashboard/${project.id}/bookmarks`)}>
              <BookmarkIcon />
              Bookmarks
            </CommandItem>
            <CommandItem onSelect={() => navigate(`/dashboard/${project.id}/metrics`)}>
              <BarChart2Icon />
              Metrics
            </CommandItem>
            {canEdit && (
              <CommandItem onSelect={() => navigate(`/dashboard/${project.id}/settings`)}>
                <Settings />
                Settings
              </CommandItem>
            )}
            {canEdit && (
              <CommandItem onSelect={() => navigate(`/dashboard/${project.id}/api-docs`)}>
                <BookOpenIcon />
                API Docs
              </CommandItem>
            )}
            {user?.isAdmin && (
              <CommandItem onSelect={() => navigate("/admin/users")}>
                <UsersIcon />
                Users
              </CommandItem>
            )}
          </CommandGroup>
        )}

        {!project && user?.isAdmin && (
          <CommandGroup heading="Navigate">
            <CommandItem onSelect={() => navigate("/admin/users")}>
              <UsersIcon />
              Users
            </CommandItem>
          </CommandGroup>
        )}

        {channels.length > 0 && project && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Channels">
              {channels.map((ch) => (
                <CommandItem
                  key={ch.id}
                  onSelect={() => navigate(`/dashboard/${project.id}/channels/${ch.id}`)}
                >
                  <HashIcon />
                  {ch.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {otherProjects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={project ? "Switch Project" : "Projects"}>
              {otherProjects.map((p) => (
                <CommandItem key={p.id} onSelect={() => navigate(`/dashboard/${p.id}/feed`)}>
                  {p.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Create">
          {project && (
            <CommandItem onSelect={() => navigate(`/dashboard/${project.id}/create-channel`)}>
              <PlusIcon />
              New Channel
            </CommandItem>
          )}
          {(user?.isAdmin || user?.canCreateProjects) && (
            <CommandItem onSelect={() => navigate("/dashboard/create-project")}>
              <PlusIcon />
              New Project
            </CommandItem>
          )}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export type CommandPaletteProps = Parameters<typeof CommandPaletteContent>[0];

export default function CommandPalette(props: CommandPaletteProps) {
  return (
    <UserProvider>
      <CommandPaletteContent {...props} />
    </UserProvider>
  );
}
