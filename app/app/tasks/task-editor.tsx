"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  type Member,
  type Task,
  type TaskStatus,
  type Priority,
  TASK_STATUSES,
  PRIORITIES,
  memberById,
} from "@/lib/mock-data";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import { Avatar } from "@/components/ui";
import { Icon } from "@/components/icon";
import {
  ArrowLeft02Icon,
  Flag02Icon,
  Cancel01Icon,
  Add01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";

/** Fields we let the editor mutate. */
type Draft = {
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  priority: Priority;
  due: string;
  tags: string[];
};

function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [value]);
  return ref;
}

export function TaskEditor({
  taskId,
  createDefaults,
}: {
  /** Existing task id ([id] page), or undefined for /new. */
  taskId?: string;
  /** Stable id + defaults for a brand-new task (/new page). */
  createDefaults?: { id: string; status: TaskStatus; assigneeId: string | null };
}) {
  const router = useRouter();
  const [tasks, setTasks, loaded] = usePersistentState<Task[]>(
    STORE_KEYS.tasks,
    [],
  );
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);

  const isNew = !taskId;
  const id = taskId ?? createDefaults!.id;

  // The task as it exists in the store (if any).
  const stored = tasks.find((t) => t.id === id) ?? null;
  const missing = !isNew && loaded && !stored;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const hydratedRef = useRef(false);

  // Hydrate the draft once, from the store (edit) or from defaults (new).
  useEffect(() => {
    if (hydratedRef.current || !loaded) return;
    if (isNew) {
      setDraft({
        title: "",
        description: "",
        status: createDefaults!.status,
        assigneeId: createDefaults!.assigneeId,
        priority: "med",
        due: "",
        tags: [],
      });
      hydratedRef.current = true;
    } else if (stored) {
      setDraft({
        title: stored.title,
        description: stored.description,
        status: stored.status,
        assigneeId: stored.assigneeId,
        priority: stored.priority,
        due: stored.due ?? "",
        tags: stored.tags,
      });
      hydratedRef.current = true;
    }
    // stored intentionally omitted — hydrate once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, isNew]);

  // Debounced upsert. Kept in a ref so unmount/back can flush it.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<Draft | null>(null);
  const setTasksRef = useRef(setTasks);
  setTasksRef.current = setTasks;

  const commit = useCallback(
    (d: Draft) => {
      // /new: don't create an orphan until there's a title.
      if (isNew && d.title.trim() === "" && !hasContent(d)) {
        // nothing to persist yet
        const exists = readHasTask(id);
        if (!exists) return;
      }
      setTasksRef.current((prev) => {
        const existing = prev.find((t) => t.id === id);
        if (existing) {
          return prev.map((t) =>
            t.id === id ? { ...t, ...toTask(d) } : t,
          );
        }
        // create
        const created: Task = {
          id,
          createdAt: Date.now(),
          ...toTask(d),
        };
        return [...prev, created];
      });
      setSavedAt(Date.now());
    },
    [id, isNew],
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current) {
      commit(pendingRef.current);
      pendingRef.current = null;
    }
  }, [commit]);

  const schedule = useCallback(
    (d: Draft) => {
      pendingRef.current = d;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        if (pendingRef.current) {
          commit(pendingRef.current);
          pendingRef.current = null;
        }
      }, 400);
    },
    [commit],
  );

  // Update helper: mutate draft and schedule a save.
  const update = useCallback(
    (patch: Partial<Draft>) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        schedule(next);
        return next;
      });
    },
    [schedule],
  );

  // Flush on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pendingRef.current) {
        commit(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, [commit]);

  // Escape → flush + go back.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        flush();
        router.push("/app/tasks");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush, router]);

  const titleRef = useAutoGrow(draft?.title ?? "");
  const descRef = useAutoGrow(draft?.description ?? "");
  const [tagInput, setTagInput] = useState("");

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl pt-6 pb-32">
        <BackBar savedLabel={null} onBack={() => router.push("/app/tasks")} />
        <div className="mt-16 text-center space-y-4">
          <p className="text-ink-muted">This task doesn&apos;t exist anymore.</p>
          <Link
            href="/app/tasks"
            className="microlabel text-accent-deep hover:underline"
          >
            Back to tasks
          </Link>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="mx-auto max-w-3xl pt-6 pb-32">
        <BackBar savedLabel={null} onBack={() => router.push("/app/tasks")} />
      </div>
    );
  }

  const addTag = () => {
    const v = tagInput.trim();
    if (!v || draft.tags.includes(v)) {
      setTagInput("");
      return;
    }
    update({ tags: [...draft.tags, v] });
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    update({ tags: draft.tags.filter((t) => t !== tag) });

  const del = () => {
    // Guard the pending save so it can't re-create after delete.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    pendingRef.current = null;
    setTasksRef.current((prev) => prev.filter((t) => t.id !== id));
    router.push("/app/tasks");
  };

  const savedLabel = savedAt
    ? "Saved"
    : isNew
      ? draft.title.trim()
        ? "Saving…"
        : "Not saved yet"
      : "Saved";

  const assignee = memberById(members, draft.assigneeId);

  return (
    <div className="mx-auto max-w-3xl pt-6 pb-32">
      <BackBar
        savedLabel={savedLabel}
        onBack={() => {
          flush();
          router.push("/app/tasks");
        }}
      />

      <textarea
        ref={titleRef}
        value={draft.title}
        onChange={(e) => update({ title: e.target.value })}
        placeholder="What needs doing?"
        rows={1}
        className="display mt-6 w-full resize-none border-0 bg-transparent text-3xl leading-tight text-ink outline-none placeholder:text-ink-faint md:text-4xl"
      />

      {/* Meta row */}
      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* Status */}
        <div className="flex flex-wrap items-center gap-1.5">
          {TASK_STATUSES.map((s) => (
            <PillToggle
              key={s.key}
              active={draft.status === s.key}
              onClick={() => update({ status: s.key })}
            >
              {s.label}
            </PillToggle>
          ))}
        </div>

        {/* Priority */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRIORITIES.map((p) => (
            <PillToggle
              key={p.key}
              active={draft.priority === p.key}
              onClick={() => update({ priority: p.key })}
            >
              <Icon icon={Flag02Icon} size={12} />
              {p.label}
            </PillToggle>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-4">
        {/* Assignee */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="microlabel mr-1 text-ink-faint">Assignee</span>
          {members.length === 0 ? (
            <span className="microlabel text-ink-faint">no members yet</span>
          ) : (
            members.map((m) => {
              const on = draft.assigneeId === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.name}
                  onClick={() =>
                    update({ assigneeId: on ? null : m.id })
                  }
                  className={`rounded-full p-0.5 transition-all ${
                    on ? "ring-2 ring-accent" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <Avatar
                    initials={m.initials}
                    accent={m.accent}
                    size={24}
                    ring={false}
                  />
                </button>
              );
            })
          )}
          {assignee && (
            <span className="microlabel text-ink-muted">{assignee.name}</span>
          )}
        </div>

        {/* Due date */}
        <label className="flex items-center gap-2">
          <span className="microlabel text-ink-faint">Due</span>
          <input
            type="date"
            value={draft.due}
            onChange={(e) => update({ due: e.target.value })}
            className="microlabel rounded-md border border-line bg-white px-2 py-1 text-ink-muted outline-none focus:border-line-strong"
          />
        </label>
      </div>

      {/* Tags */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="microlabel mr-1 text-ink-faint">Tags</span>
        {draft.tags.map((tag) => (
          <span
            key={tag}
            className="microlabel inline-flex items-center gap-1 rounded-md border border-accent-line bg-accent-soft px-2 py-1 text-accent-deep"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-accent-deep/70 hover:text-accent-deep"
              title="Remove tag"
            >
              <Icon icon={Cancel01Icon} size={12} />
            </button>
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="add tag"
            className="microlabel w-24 rounded-md border border-line bg-white px-2 py-1 text-ink-muted outline-none placeholder:text-ink-faint focus:border-line-strong"
          />
          {tagInput.trim() && (
            <button
              type="button"
              onClick={addTag}
              className="text-ink-faint hover:text-ink"
              title="Add tag"
            >
              <Icon icon={Add01Icon} size={14} />
            </button>
          )}
        </span>
      </div>

      {/* Description */}
      <div className="mt-8 border-t border-line pt-6">
        <p className="microlabel mb-3 text-ink-faint">Details</p>
        <textarea
          ref={descRef}
          value={draft.description}
          onChange={(e) => update({ description: e.target.value })}
          placeholder="Context, acceptance criteria, links…"
          className="min-h-[40vh] w-full resize-none border-0 bg-transparent font-light leading-relaxed text-ink outline-none placeholder:text-ink-faint"
        />
      </div>

      {/* Danger zone — edit only */}
      {!isNew && (
        <div className="mt-16 border-t border-line pt-6">
          <button
            type="button"
            onClick={del}
            className="inline-flex items-center gap-2 text-sm text-ink-faint transition-colors hover:text-[#E0679B]"
          >
            <Icon icon={Delete02Icon} size={15} />
            Delete task
          </button>
        </div>
      )}
    </div>
  );
}

function toTask(d: Draft): Omit<Task, "id" | "createdAt"> {
  return {
    title: d.title,
    description: d.description,
    status: d.status,
    assigneeId: d.assigneeId,
    priority: d.priority,
    due: d.due ? d.due : undefined,
    tags: d.tags,
  };
}

function hasContent(d: Draft) {
  return (
    d.title.trim() !== "" ||
    d.description.trim() !== "" ||
    d.tags.length > 0
  );
}

function readHasTask(id: string): boolean {
  try {
    const raw = window.localStorage.getItem(STORE_KEYS.tasks);
    if (!raw) return false;
    const arr = JSON.parse(raw) as Task[];
    return arr.some((t) => t.id === id);
  } catch {
    return false;
  }
}

function BackBar({
  savedLabel,
  onBack,
}: {
  savedLabel: string | null;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        type="button"
        onClick={onBack}
        className="microlabel inline-flex items-center gap-1.5 text-ink-faint transition-colors hover:text-ink"
      >
        <Icon icon={ArrowLeft02Icon} size={16} />
        Tasks
      </button>
      {savedLabel && (
        <span className="microlabel text-ink-faint">{savedLabel}</span>
      )}
    </div>
  );
}

function PillToggle({
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
      type="button"
      onClick={onClick}
      className={`microlabel inline-flex items-center gap-1 rounded-full border px-3 py-1.5 transition-colors ${
        active
          ? "border-accent-line bg-accent-soft text-accent-deep"
          : "border-line bg-white text-ink-muted hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}
