"use client";

import Link from "next/link";
import { memberById, type Member, type Notification } from "@/lib/model";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import { PageHeader, Card, PillButton, Avatar } from "@/components/ui";
import { Icon } from "@/components/icon";
import { Notification02Icon, Tick02Icon } from "@hugeicons/core-free-icons";

function timeAgo(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(ts).toLocaleDateString();
}

export default function NotificationsPage() {
  const [notifications, setNotifications, loaded] = usePersistentState<
    Notification[]
  >(STORE_KEYS.notifications, []);
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const [meId] = usePersistentState<string | null>(STORE_KEYS.me, null);

  const relevant = notifications
    .filter(
      (n) =>
        (n.targetId === null || n.targetId === meId) && n.actorId !== meId,
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  const isUnread = (n: Notification) =>
    Boolean(meId) && !n.readBy.includes(meId!);
  const unreadCount = relevant.filter(isUnread).length;

  const markRead = (ids: string[]) => {
    if (!meId || ids.length === 0) return;
    const set = new Set(ids);
    setNotifications((prev) =>
      prev.map((n) =>
        set.has(n.id) && !n.readBy.includes(meId)
          ? { ...n, readBy: [...n.readBy, meId] }
          : n,
      ),
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        microcopy="what the team's been up to"
        title="Notifications"
        actions={
          unreadCount > 0 ? (
            <PillButton
              variant="ghost"
              onClick={() => markRead(relevant.filter(isUnread).map((n) => n.id))}
            >
              <Icon icon={Tick02Icon} size={15} />
              Mark all read
            </PillButton>
          ) : undefined
        }
      />

      {loaded && relevant.length === 0 && (
        <Card className="flex flex-col items-center gap-4 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Icon icon={Notification02Icon} size={26} />
          </span>
          <p className="text-ink-muted font-normal">
            All quiet in the lab — activity from your team lands here.
          </p>
        </Card>
      )}

      {relevant.length > 0 && (
        <Card padded={false} className="overflow-hidden">
          <div className="divide-y divide-line">
            {relevant.map((n) => {
              const actor = memberById(members, n.actorId);
              const unread = isUnread(n);
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => markRead([n.id])}
                  className={`flex items-center gap-3 px-5 py-4 transition-colors hover:bg-paper ${
                    unread ? "bg-accent-soft/40" : ""
                  }`}
                >
                  {actor ? (
                    <Avatar
                      initials={actor.initials}
                      accent={actor.accent}
                      size={32}
                    />
                  ) : (
                    <Avatar initials="?" accent="#9CA0AC" size={32} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-ink">
                      <span className="font-normal">
                        {actor?.name ?? "Someone"}
                      </span>{" "}
                      <span className="text-ink-muted">{n.text}</span>
                    </span>
                    <span className="microlabel text-ink-faint">
                      {timeAgo(n.createdAt)}
                    </span>
                  </span>
                  {unread && (
                    <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
