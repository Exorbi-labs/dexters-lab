"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconSvgElement } from "@/components/icon";
import { usePresence } from "@/lib/presence";
import { useUnreadCount } from "@/components/sidebar";
import {
  DashboardCircleIcon,
  KanbanIcon,
  Notebook01Icon,
  Notification02Icon,
  Settings01Icon,
  SourceCodeIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

const NAV: { href: string; label: string; icon: IconSvgElement }[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: DashboardCircleIcon },
  { href: "/app/notifications", label: "Activity", icon: Notification02Icon },
  { href: "/app/docs", label: "Docs", icon: Notebook01Icon },
  { href: "/app/tasks", label: "Tasks", icon: KanbanIcon },
  { href: "/app/codebase", label: "Codebase", icon: SourceCodeIcon },
  { href: "/app/team", label: "Team", icon: UserGroupIcon },
  { href: "/app/settings", label: "Settings", icon: Settings01Icon },
];

export function MobileNav() {
  const pathname = usePathname();
  const online = usePresence();
  const unread = useUnreadCount();

  return (
    <div className="md:hidden sticky top-0 z-40 border-b border-line bg-white/92 backdrop-blur">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <Link href="/app/dashboard" className="flex items-center">
          <span className="serif-soft text-lg text-ink">Dexter&apos;s Lab</span>
        </Link>
        {online.size > 0 ? (
          <span className="microlabel flex items-center gap-1.5 text-ink-faint">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: "#3FA88F" }}
            />
            {online.size} online
          </span>
        ) : (
          <span className="microlabel flex items-center gap-1.5 text-ink-faint">
            <span className="h-1.5 w-1.5 rounded-full border border-line-strong" />
            synced
          </span>
        )}
      </div>
      <nav className="no-scrollbar scroll-fade-r flex gap-1.5 overflow-x-auto pl-4 pr-7 pb-2.5">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          const showBadge =
            item.href === "/app/notifications" && unread > 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
                active
                  ? "border-line bg-white font-normal text-ink shadow-[0_1px_2px_rgba(22,23,27,0.05)]"
                  : "border-transparent font-light text-ink-muted"
              }`}
            >
              <Icon icon={item.icon} size={13} className={active ? "text-accent" : "text-ink-faint"} />
              {item.label}
              {showBadge && (
                <span className="microlabel rounded-full bg-accent px-1.5 text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
