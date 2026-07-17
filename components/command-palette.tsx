"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon, type IconSvgElement } from "@/components/icon";
import {
  Add01Icon,
  DashboardCircleIcon,
  KanbanIcon,
  Notebook01Icon,
  Notification02Icon,
  Search01Icon,
  Settings01Icon,
  SourceCodeIcon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons";

type Item = {
  id: string;
  label: string;
  hint: "create" | "go to";
  href: string;
  icon: IconSvgElement;
  keywords: string;
};

const ITEMS: Item[] = [
  { id: "new-doc", label: "New doc", hint: "create", href: "/app/docs/new", icon: Add01Icon, keywords: "page write notion document" },
  { id: "new-task", label: "New task", hint: "create", href: "/app/tasks/new", icon: Add01Icon, keywords: "todo ticket assign board" },
  { id: "new-snippet", label: "New snippet", hint: "create", href: "/app/codebase/new", icon: Add01Icon, keywords: "code share repo paste" },
  { id: "dashboard", label: "Dashboard", hint: "go to", href: "/app/dashboard", icon: DashboardCircleIcon, keywords: "home overview pulse" },
  { id: "docs", label: "Docs", hint: "go to", href: "/app/docs", icon: Notebook01Icon, keywords: "pages wiki notes knowledge" },
  { id: "tasks", label: "Tasks", hint: "go to", href: "/app/tasks", icon: KanbanIcon, keywords: "board todo assignments sprint" },
  { id: "codebase", label: "Codebase", hint: "go to", href: "/app/codebase", icon: SourceCodeIcon, keywords: "snippets repos code library" },
  { id: "team", label: "Team", hint: "go to", href: "/app/team", icon: UserGroupIcon, keywords: "members people roles directory" },
  { id: "notifications", label: "Notifications", hint: "go to", href: "/app/notifications", icon: Notification02Icon, keywords: "activity updates alerts bell unread" },
  { id: "settings", label: "Settings", hint: "go to", href: "/app/settings", icon: Settings01Icon, keywords: "workspace services integrations" },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    const wantsCreate = /^(new|add|create|start|write|draft)\b/.test(q);
    return ITEMS.filter(
      (i) => i.label.toLowerCase().includes(q) || i.keywords.includes(q),
    ).sort((a, b) => {
      const rank = (i: Item) =>
        (i.hint === "create" ? (wantsCreate ? 0 : 1) : wantsCreate ? 1 : 0) * 2 +
        (i.label.toLowerCase().startsWith(q) ? 0 : 1);
      return rank(a) - rank(b);
    });
  }, [query]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  const go = useCallback(
    (item: Item) => {
      close();
      router.push(item.href);
    },
    [router, close],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape" && open) {
        close();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-[2px]"
      onMouseDown={close}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="mx-auto mt-[14vh] w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-line bg-white shadow-[0_24px_60px_rgba(22,23,27,0.18)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon icon={Search01Icon} size={16} className="text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, results.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              } else if (e.key === "Enter" && results[active]) {
                e.preventDefault();
                go(results[active]);
              }
            }}
            placeholder="Jump anywhere, start anything…"
            className="w-full bg-transparent py-3.5 text-sm font-light text-ink outline-none placeholder:text-ink-faint"
          />
          <span className="microlabel shrink-0 text-ink-faint">esc</span>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 && (
            <p className="px-3 py-6 text-center text-sm font-light text-ink-faint">
              Nothing matches — try another word.
            </p>
          )}
          {results.map((item, i) => (
            <button
              key={item.id}
              data-index={i}
              onMouseEnter={() => setActive(i)}
              onClick={() => go(item)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                i === active ? "bg-paper text-ink" : "text-ink-muted"
              }`}
            >
              <Icon icon={item.icon} size={16} className={i === active ? "text-accent" : "text-ink-faint"} />
              <span className="font-normal">{item.label}</span>
              <span className="microlabel ml-auto text-ink-faint">{item.hint}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
