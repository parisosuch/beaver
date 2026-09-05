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
import type { ReactNode } from "react";

const navCss =
  "flex px-3 py-2 space-x-2 items-center hover:bg-gray-100 dark:hover:bg-white/8 hover:cursor-pointer hover:font-medium rounded ";
const activeNavCss = navCss + "bg-gray-100 dark:bg-white/8 font-medium rounded-md";

type NavLink = { href: string; label: string; icon: ReactNode; active: boolean };

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

  // Three separate jobs — reading the data, configuring the project, and
  // account/instance settings — so each gets its own heading instead of one
  // undifferentiated run of eight links. A group whose links are all gated away
  // by role drops out rather than leaving a bare heading behind.
  const groups: { heading: string; links: NavLink[] }[] = [
    {
      heading: "Data",
      links: [
        {
          href: `/dashboard/${projectId}/feed`,
          label: "Feed",
          icon: <InboxIcon size={20} />,
          active: is(`/dashboard/${projectId}/feed`),
        },
        {
          href: `/dashboard/${projectId}/bookmarks`,
          label: "Bookmarks",
          icon: <BookmarkIcon size={20} />,
          active: is(`/dashboard/${projectId}/bookmarks`),
        },
        {
          href: `/dashboard/${projectId}/metrics`,
          label: "Metrics",
          icon: <BarChart2Icon size={20} />,
          active: startsWith(`/dashboard/${projectId}/metrics`),
        },
      ],
    },
    {
      heading: "Configuration",
      links: canEdit
        ? [
            {
              href: `/dashboard/${projectId}/settings`,
              label: "Settings",
              icon: <Settings size={20} />,
              active: is(`/dashboard/${projectId}/settings`),
            },
            {
              href: `/dashboard/${projectId}/api-docs`,
              label: "API Docs",
              icon: <BookOpenIcon size={20} />,
              active: is(`/dashboard/${projectId}/api-docs`),
            },
          ]
        : [],
    },
    {
      heading: "Account",
      links: [
        {
          href: `/dashboard/${projectId}/account`,
          label: "Account",
          icon: <UserIcon size={20} />,
          active: is(`/dashboard/${projectId}/account`),
        },
        ...(isAdmin
          ? [
              {
                href: "/admin/users",
                label: "Users",
                icon: <UsersIcon size={20} />,
                active: is("/admin/users"),
              },
              {
                href: "/admin/settings",
                label: "Email Settings",
                icon: <MailIcon size={20} />,
                active: is("/admin/settings"),
              },
            ]
          : []),
      ],
    },
  ].filter((group) => group.links.length > 0);

  return (
    <div className="mt-4 space-y-4">
      {groups.map((group, i) => (
        <div key={group.heading} className={i > 0 ? "space-y-2 border-t pt-4" : "space-y-2"}>
          <h2 className="text-sm font-mono">{group.heading}</h2>
          {group.links.map((link) => (
            <a
              key={link.href}
              className={link.active ? activeNavCss : navCss}
              href={link.href}
              onClick={() => onNavigate?.()}
            >
              {link.icon}
              <p>{link.label}</p>
            </a>
          ))}
        </div>
      ))}
    </div>
  );
}
