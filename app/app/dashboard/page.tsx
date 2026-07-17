"use client";

import Link from "next/link";
import {
  memberById,
  TASK_STATUSES,
  type Member,
  type Doc,
  type Task,
  type Snippet,
  type Repo,
} from "@/lib/model";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import { PageHeader, Card, Avatar } from "@/components/ui";
import { Icon, type IconSvgElement } from "@/components/icon";
import {
  Notebook01Icon,
  KanbanIcon,
  SourceCodeIcon,
  UserGroupIcon,
  Settings01Icon,
  ArrowUpRight01Icon,
} from "@hugeicons/core-free-icons";

export default function DashboardPage() {
  const [members, , membersLoaded] = usePersistentState<Member[]>(
    STORE_KEYS.members,
    [],
  );
  const [docs, , docsLoaded] = usePersistentState<Doc[]>(STORE_KEYS.docs, []);
  const [tasks, , tasksLoaded] = usePersistentState<Task[]>(
    STORE_KEYS.tasks,
    [],
  );
  const [snippets, , snippetsLoaded] = usePersistentState<Snippet[]>(
    STORE_KEYS.snippets,
    [],
  );
  const [repos, , reposLoaded] = usePersistentState<Repo[]>(
    STORE_KEYS.repos,
    [],
  );
  const [meId] = usePersistentState<string | null>(STORE_KEYS.me, null);

  const me = memberById(members, meId);

  const openTasks = tasks.filter((t) => t.status !== "done").length;
  const doneTasks = tasks.filter((t) => t.status === "done").length;

  const allLoaded =
    membersLoaded &&
    docsLoaded &&
    tasksLoaded &&
    snippetsLoaded &&
    reposLoaded;

  const totalsEmpty =
    docs.length === 0 && openTasks === 0 && snippets.length === 0;

  const num = (loaded: boolean, n: number) => (loaded ? String(n) : "—");

  const myOpen = tasks
    .filter((t) => t.assigneeId === meId && t.status !== "done")
    .slice(0, 3);

  const recentDocs = [...docs]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3);

  const countByStatus = (key: string) =>
    tasks.filter((t) => t.status === key).length;

  return (
    <div className="space-y-8">
      <PageHeader microcopy="the lab, right now" title="Dashboard" />

      {/* Welcome strip */}
      <div className="gradient-accent relative overflow-hidden rounded-2xl p-7 md:p-9">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="min-w-0">
            <h2 className="display text-2xl text-ink md:text-3xl">
              {me ? `Welcome back, ${me.name.split(" ")[0]}.` : "Welcome to the lab."}
            </h2>
            <p className="mt-2 text-sm font-normal text-ink-muted">
              {allLoaded && totalsEmpty
                ? "Fresh lab — start with a doc or a task."
                : `${num(docsLoaded, docs.length)} docs · ${num(
                    tasksLoaded,
                    openTasks,
                  )} open tasks · ${num(snippetsLoaded, snippets.length)} snippets`}
            </p>
          </div>
          {members.length > 0 && (
            <div className="flex -space-x-2">
              {members.slice(0, 6).map((m) => (
                <Avatar
                  key={m.id}
                  initials={m.initials}
                  accent={m.accent}
                  size={34}
                />
              ))}
              {members.length > 6 && (
                <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-white font-mono text-[11px] text-ink-muted ring-2 ring-white">
                  +{members.length - 6}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Feature tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          icon={Notebook01Icon}
          label="Docs"
          href="/app/docs"
          stat={
            docsLoaded
              ? docs.length > 0
                ? `${docs.length} ${docs.length === 1 ? "page" : "pages"}`
                : "write the first page"
              : "—"
          }
        />
        <Tile
          icon={KanbanIcon}
          label="Tasks"
          href="/app/tasks"
          stat={
            tasksLoaded
              ? tasks.length > 0
                ? `${openTasks} open · ${doneTasks} done`
                : "no tasks yet"
              : "—"
          }
        />
        <Tile
          icon={SourceCodeIcon}
          label="Codebase"
          href="/app/codebase"
          stat={
            snippetsLoaded && reposLoaded
              ? snippets.length > 0 || repos.length > 0
                ? `${snippets.length} snippets · ${repos.length} repos`
                : "share your first snippet"
              : "—"
          }
        />
        <Tile
          icon={UserGroupIcon}
          label="Team"
          href="/app/team"
          stat={
            membersLoaded
              ? `${members.length} ${
                  members.length === 1 ? "member" : "members"
                }`
              : "—"
          }
        />
        <Tile
          icon={Settings01Icon}
          label="Settings"
          href="/app/settings"
          stat="workspace · services"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Task board glance */}
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="microlabel text-ink-faint">task board glance</p>
            <Link
              href="/app/tasks"
              className="text-ink-faint transition-colors hover:text-ink"
            >
              <Icon icon={ArrowUpRight01Icon} size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {TASK_STATUSES.map((s) => (
              <div key={s.key} className="space-y-1">
                <p className="font-mono text-2xl text-ink">
                  {tasksLoaded ? countByStatus(s.key) : "—"}
                </p>
                <p className="microlabel text-ink-faint">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="h-px bg-line" />

          {allLoaded && myOpen.length === 0 ? (
            <p className="text-sm text-ink-muted">
              nothing on your plate — or nothing added yet.
            </p>
          ) : (
            <div className="space-y-1">
              {myOpen.map((t) => (
                <Link
                  key={t.id}
                  href={`/app/tasks/${t.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-paper"
                >
                  <span className="truncate text-sm font-normal text-ink">
                    {t.title || "Untitled task"}
                  </span>
                  <span className="microlabel shrink-0 text-ink-faint">
                    {TASK_STATUSES.find((s) => s.key === t.status)?.label}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Recent docs */}
        <Card className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="microlabel text-ink-faint">recent docs</p>
            <Link
              href="/app/docs"
              className="text-ink-faint transition-colors hover:text-ink"
            >
              <Icon icon={ArrowUpRight01Icon} size={16} />
            </Link>
          </div>

          {allLoaded && recentDocs.length === 0 ? (
            <p className="text-sm text-ink-muted">
              no docs yet — write the first page.
            </p>
          ) : (
            <div className="space-y-1">
              {recentDocs.map((d) => (
                <Link
                  key={d.id}
                  href={`/app/docs/${d.id}`}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-paper"
                >
                  <span className="text-base leading-none">
                    {d.icon || "📄"}
                  </span>
                  <span className="truncate text-sm font-normal text-ink">
                    {d.title || "Untitled"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function Tile({
  icon,
  label,
  href,
  stat,
}: {
  icon: IconSvgElement;
  label: string;
  href: string;
  stat: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-[--radius-card] border border-line bg-white p-5 transition-colors hover:border-line-strong"
    >
      <div className="flex items-start justify-between">
        <p className="microlabel text-ink-faint">go to</p>
        <span className="text-ink-faint transition-colors group-hover:text-accent">
          <Icon icon={icon} size={20} />
        </span>
      </div>
      <h3 className="display mt-3 text-2xl text-ink">{label}</h3>
      <p className="mt-1 text-sm font-normal text-ink-muted">{stat}</p>
    </Link>
  );
}
