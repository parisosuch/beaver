import {
  BarChart2Icon,
  BookmarkIcon,
  BookOpenIcon,
  InboxIcon,
  MailIcon,
  Settings,
  UserIcon,
  UsersIcon,
} from "lucide-react";

const navCss =
  "flex px-3 py-2 space-x-2 items-center hover:bg-gray-100 dark:hover:bg-white/8 hover:cursor-pointer hover:font-medium rounded ";
const activeNavCss = navCss + "bg-gray-100 dark:bg-white/8 font-medium rounded-md";

export default function SidePanelNav({
  projectId,
  pathname,
  userRole,
  isAdmin,
  onNavigate,
}: {
  projectId: number;
  pathname: string;
  userRole: "owner" | "maintainer" | "guest";
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const canEdit = userRole === "owner" || userRole === "maintainer";
  const is = (p: string) => pathname === p;
  const startsWith = (p: string) => pathname.startsWith(p);

  return (
    <div className="mt-4 space-y-2">
      <h1 className="text-sm font-mono">Navigation</h1>
      <a
        className={is(`/dashboard/${projectId}/feed`) ? activeNavCss : navCss}
        href={`/dashboard/${projectId}/feed`}
        onClick={() => onNavigate?.()}
      >
        <InboxIcon size={20} />
        <p>Feed</p>
      </a>
      <a
        className={is(`/dashboard/${projectId}/bookmarks`) ? activeNavCss : navCss}
        href={`/dashboard/${projectId}/bookmarks`}
        onClick={() => onNavigate?.()}
      >
        <BookmarkIcon size={20} />
        <p>Bookmarks</p>
      </a>
      <a
        className={startsWith(`/dashboard/${projectId}/metrics`) ? activeNavCss : navCss}
        href={`/dashboard/${projectId}/metrics`}
        onClick={() => onNavigate?.()}
      >
        <BarChart2Icon size={20} />
        <p>Metrics</p>
      </a>
      {canEdit && (
        <a
          className={is(`/dashboard/${projectId}/settings`) ? activeNavCss : navCss}
          href={`/dashboard/${projectId}/settings`}
          onClick={() => onNavigate?.()}
        >
          <Settings size={20} />
          <p>Settings</p>
        </a>
      )}
      {canEdit && (
        <a
          className={is(`/dashboard/${projectId}/api-docs`) ? activeNavCss : navCss}
          href={`/dashboard/${projectId}/api-docs`}
          onClick={() => onNavigate?.()}
        >
          <BookOpenIcon size={20} />
          <p>API Docs</p>
        </a>
      )}
      <a
        className={is(`/dashboard/${projectId}/account`) ? activeNavCss : navCss}
        href={`/dashboard/${projectId}/account`}
        onClick={() => onNavigate?.()}
      >
        <UserIcon size={20} />
        <p>Account</p>
      </a>
      {isAdmin && (
        <a
          className={is("/admin/users") ? activeNavCss : navCss}
          href="/admin/users"
          onClick={() => onNavigate?.()}
        >
          <UsersIcon size={20} />
          <p>Users</p>
        </a>
      )}
      {isAdmin && (
        <a
          className={is("/admin/settings") ? activeNavCss : navCss}
          href="/admin/settings"
          onClick={() => onNavigate?.()}
        >
          <MailIcon size={20} />
          <p>Email Settings</p>
        </a>
      )}
    </div>
  );
}
