"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconSvgElement } from "@/components/icon";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import { usePresence } from "@/lib/presence";
import { Avatar } from "@/components/ui";
import { accentForIndex, initialsFrom, type Member } from "@/lib/model";
import {
  DashboardCircleIcon,
  KanbanIcon,
  Notebook01Icon,
  Settings01Icon,
  SourceCodeIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

export const NAV: { href: string; label: string; icon: IconSvgElement }[] = [
  { href: "/app/dashboard", label: "Dashboard", icon: DashboardCircleIcon },
  { href: "/app/docs", label: "Docs", icon: Notebook01Icon },
  { href: "/app/tasks", label: "Tasks", icon: KanbanIcon },
  { href: "/app/codebase", label: "Codebase", icon: SourceCodeIcon },
  { href: "/app/team", label: "Team", icon: UserGroupIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const online = usePresence();

  return (
    <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-line bg-paper/60 px-4 py-6 sticky top-0 h-screen">
      <Link href="/app/dashboard" className="flex items-center px-2">
        <span className="serif-soft text-xl text-ink">Dexter&apos;s Lab</span>
      </Link>

      <nav className="mt-8 flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-white border border-line text-ink font-normal shadow-[0_1px_2px_rgba(22,23,27,0.04)]"
                  : "text-ink-muted hover:text-ink font-light border border-transparent"
              }`}
            >
              <Icon icon={item.icon} size={17} className={active ? "text-accent" : "text-ink-faint"} />
              {item.label}
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3">
        <Link
          href="/app/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
            pathname.startsWith("/app/settings")
              ? "bg-white border border-line text-ink font-normal"
              : "text-ink-muted hover:text-ink font-light"
          }`}
        >
          <Icon icon={Settings01Icon} size={17} className={pathname.startsWith("/app/settings") ? "text-accent" : "text-ink-faint"} />
          Settings
        </Link>

        <p className="microlabel px-3 text-ink-faint">⌘K — jump anywhere</p>

        <div className="rounded-2xl border border-line bg-white p-3">
          <p className="microlabel text-ink-faint mb-2">workspace</p>
          <div className="flex items-center gap-2">
            {members.length === 0 ? (
              <span className="text-xs text-ink-muted font-light">just you, so far</span>
            ) : (
              <>
                <div className="flex -space-x-2">
                  {members.slice(0, 4).map((m, i) => (
                    <Avatar key={m.id} initials={m.initials || initialsFrom(m.name)} accent={m.accent || accentForIndex(i)} size={26} />
                  ))}
                </div>
                <span className="text-xs text-ink-muted font-light">
                  {members.length} {members.length === 1 ? "member" : "members"}
                </span>
              </>
            )}
          </div>
          <p className="mt-2 flex items-center gap-1.5">
            {online.size > 0 ? (
              <>
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: "#3FA88F" }}
                />
                <span className="microlabel text-ink-faint">
                  {online.size} online now
                </span>
              </>
            ) : (
              <>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full border border-line-strong" />
                <span className="microlabel text-ink-faint">
                  synced · team workspace
                </span>
              </>
            )}
          </p>
        </div>
      </div>
    </aside>
  );
}
