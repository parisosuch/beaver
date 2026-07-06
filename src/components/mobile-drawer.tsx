import type { Channel } from "@/lib/beaver/channel";
import type { ChannelGroupWithChannels } from "@/lib/beaver/channel-group";
import type { Project } from "@/lib/beaver/project";
import { MenuIcon, XIcon } from "lucide-react";
import { useEffect, useState } from "react";
import ChannelGroupsDnd from "./channel-groups-dnd";
import NotificationsNavLink from "./notifications-nav-link";
import ProjectSwitcher from "./project-switcher";
import SidePanelNav from "./side-panel-nav";
import ThemeToggle from "./theme-toggle";
import UserMenu from "./user-menu";

export default function MobileDrawer({
  project,
  projects,
  channels,
  groups,
  userRole,
  userName,
  isAdmin,
  canCreateProjects,
  currentPath,
}: {
  project: Project;
  projects: Project[];
  channels: Channel[];
  groups: ChannelGroupWithChannels[];
  userRole: "owner" | "maintainer" | "guest";
  userName: string;
  isAdmin: boolean;
  canCreateProjects: boolean;
  currentPath: string;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pathname, setPathname] = useState(currentPath);

  const canEdit = userRole === "owner" || userRole === "maintainer";
  const ungroupedChannels = channels.filter((c) => !c.groupId);

  useEffect(() => {
    const handleNav = () => {
      setPathname(window.location.pathname);
      setDrawerOpen(false);
    };
    document.addEventListener("astro:page-load", handleNav);
    window.addEventListener("popstate", handleNav);
    return () => {
      document.removeEventListener("astro:page-load", handleNav);
      window.removeEventListener("popstate", handleNav);
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

  const close = () => setDrawerOpen(false);

  return (
    <div className="md:hidden">
      {/* Mobile top bar */}
      <div className="w-full border-b px-4 py-3 flex items-center">
        <button
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-white/8 rounded-md"
        >
          <MenuIcon size={20} />
        </button>
      </div>

      {/* Overlay */}
      {drawerOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={close} />}

      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-screen w-full bg-background overflow-y-auto p-6 transition-transform duration-200 ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end">
          <button
            onClick={close}
            aria-label="Close menu"
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/8 rounded"
          >
            <XIcon size={20} />
          </button>
        </div>

        <UserMenu userName={userName} />
        <ProjectSwitcher
          projects={projects}
          currentProjectId={project.id}
          canCreate={isAdmin || canCreateProjects}
          onNavigate={close}
        />
        <SidePanelNav
          projectId={project.id}
          pathname={pathname}
          userRole={userRole}
          isAdmin={isAdmin}
          onNavigate={close}
        />
        <NotificationsNavLink projectId={project.id} pathname={pathname} onNavigate={close} />
        <ChannelGroupsDnd
          initialUngrouped={ungroupedChannels}
          initialGroups={groups}
          projectId={project.id}
          currentPath={pathname}
          onNavigate={close}
          canEdit={canEdit}
        />
        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
          <h1 className="text-sm font-mono">Theme</h1>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
