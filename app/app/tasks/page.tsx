"use client";

import Link from "next/link";
import { useState } from "react";
import {
  type Member,
  type Task,
  type TaskStatus,
  TASK_STATUSES,
  PRIORITIES,
  memberById,
} from "@/lib/model";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import { PageHeader, Card, PillButton, Avatar } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  KanbanIcon,
  Add01Icon,
  ArrowRight02Icon,
  ArrowTurnBackwardIcon,
  Delete02Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";

const STATUS_ORDER: TaskStatus[] = ["todo", "doing", "review", "done"];

const PRIORITY_DOT: Record<string, string> = {
  low: "#D9D9E0",
  med: "#E0A93E",
  high: "#E0679B",
};

const priorityLabel = (p: string) =>
  PRIORITIES.find((x) => x.key === p)?.label ?? p;

function nextStatus(s: TaskStatus): TaskStatus | null {
  const i = STATUS_ORDER.indexOf(s);
  return i >= 0 && i < STATUS_ORDER.length - 1 ? STATUS_ORDER[i + 1] : null;
}
function prevStatus(s: TaskStatus): TaskStatus | null {
  const i = STATUS_ORDER.indexOf(s);
  return i > 0 ? STATUS_ORDER[i - 1] : null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDue(due: string) {
  const d = new Date(due + "T00:00:00");
  if (Number.isNaN(d.getTime())) return due;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TasksPage() {
  const [tasks, setTasks, loaded] = usePersistentState<Task[]>(
    STORE_KEYS.tasks,
    [],
  );
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const [filter, setFilter] = useState<string | null | "all">("all");
  // "all" = everyone, null = unassigned, string = member id

  const advance = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const ns = nextStatus(t.status);
        return ns ? { ...t, status: ns } : t;
      }),
    );

  const stepBack = (id: string) =>
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const ps = prevStatus(t.status);
        return ps ? { ...t, status: ps } : t;
      }),
    );

  const remove = (id: string) =>
    setTasks((prev) => prev.filter((t) => t.id !== id));

  const visible = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === null) return t.assigneeId === null;
    return t.assigneeId === filter;
  });

  const isEmpty = loaded && tasks.length === 0;
  const today = todayISO();

  return (
    <div className="space-y-8">
      <PageHeader
        microcopy="who's on what"
        title="Tasks"
        actions={
          <PillButton href="/app/tasks/new" variant="ink">
            <Icon icon={Add01Icon} size={15} />
            New task
          </PillButton>
        }
      />

      {!isEmpty && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            Everyone
          </FilterChip>
          {members.map((m) => (
            <FilterChip
              key={m.id}
              active={filter === m.id}
              onClick={() => setFilter(m.id)}
            >
              <Avatar
                initials={m.initials}
                accent={m.accent}
                size={16}
                ring={false}
              />
              {m.name}
            </FilterChip>
          ))}
          <FilterChip active={filter === null} onClick={() => setFilter(null)}>
            <span className="h-4 w-4 rounded-full border border-line-strong" />
            Unassigned
          </FilterChip>
        </div>
      )}

      {isEmpty ? (
        <Card className="border-dashed" >
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <Icon icon={KanbanIcon} size={26} className="text-ink-faint" />
            <p className="text-ink-muted max-w-sm">
              No tasks yet — drop in the first thing the team needs to ship.
            </p>
            <PillButton href="/app/tasks/new" variant="ink">
              <Icon icon={Add01Icon} size={15} />
              New task
            </PillButton>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STATUS_ORDER.map((statusKey) => {
            const label =
              TASK_STATUSES.find((s) => s.key === statusKey)?.label ?? statusKey;
            const col = visible.filter((t) => t.status === statusKey);
            return (
              <div key={statusKey} className="min-w-0 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <span className="microlabel text-ink-muted">{label}</span>
                  <span className="microlabel text-ink-faint">{col.length}</span>
                </div>
                <div className="space-y-3">
                  {col.length === 0 ? (
                    <div className="rounded-[--radius-card] border border-dashed border-line px-3 py-6 text-center">
                      <span className="microlabel text-ink-faint">empty</span>
                    </div>
                  ) : (
                    col.map((t) => {
                      const assignee = memberById(members, t.assigneeId);
                      const overdue =
                        !!t.due && t.due < today && t.status !== "done";
                      const ns = nextStatus(t.status);
                      const ps = prevStatus(t.status);
                      return (
                        <Card key={t.id} className="space-y-3">
                          <Link
                            href={`/app/tasks/${t.id}`}
                            className="block text-ink-muted hover:text-ink transition-colors"
                          >
                            {t.title || "Untitled task"}
                          </Link>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <span className="inline-flex items-center gap-1.5">
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ background: PRIORITY_DOT[t.priority] }}
                              />
                              <span className="microlabel text-ink-faint">
                                {priorityLabel(t.priority)}
                              </span>
                            </span>

                            {t.due && (
                              <span
                                className="inline-flex items-center gap-1"
                                style={overdue ? { color: "#E0679B" } : undefined}
                              >
                                <Icon
                                  icon={Calendar03Icon}
                                  size={13}
                                  className={
                                    overdue ? "" : "text-ink-faint"
                                  }
                                />
                                <span
                                  className={`microlabel ${overdue ? "" : "text-ink-faint"}`}
                                >
                                  {fmtDue(t.due)}
                                </span>
                              </span>
                            )}

                            <span className="ml-auto">
                              {assignee ? (
                                <Avatar
                                  initials={assignee.initials}
                                  accent={assignee.accent}
                                  size={22}
                                  ring={false}
                                />
                              ) : (
                                <span className="inline-block h-[22px] w-[22px] rounded-full border border-dashed border-line-strong" />
                              )}
                            </span>
                          </div>

                          {t.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {t.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="microlabel rounded border border-line px-1.5 py-0.5 text-ink-faint"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1 border-t border-line pt-2">
                            {ns && (
                              <MiniButton
                                title={`Move to ${TASK_STATUSES.find((s) => s.key === ns)?.label}`}
                                onClick={() => advance(t.id)}
                              >
                                <Icon icon={ArrowRight02Icon} size={14} />
                              </MiniButton>
                            )}
                            {ps && (
                              <MiniButton
                                title={`Back to ${TASK_STATUSES.find((s) => s.key === ps)?.label}`}
                                onClick={() => stepBack(t.id)}
                              >
                                <Icon icon={ArrowTurnBackwardIcon} size={14} />
                              </MiniButton>
                            )}
                            <MiniButton
                              title="Delete task"
                              onClick={() => remove(t.id)}
                              className="ml-auto hover:text-[#E0679B]"
                            >
                              <Icon icon={Delete02Icon} size={14} />
                            </MiniButton>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`microlabel inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 transition-colors ${
        active
          ? "border-accent-line bg-accent-soft text-accent-deep"
          : "border-line bg-white text-ink-muted hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}

function MiniButton({
  children,
  onClick,
  title,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-paper hover:text-ink ${className}`}
    >
      {children}
    </button>
  );
}
