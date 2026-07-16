"use client";

/**
 * Shared full-page Notion-like doc editor used by /new and /[id].
 *
 * CRITICAL — no-nav-while-typing: /new never routes on keystroke. Callers pass a
 * stable id (generated in a ref on mount). Every edit debounces (~400ms) and
 * UPSERTS under that id once title OR body is non-empty. flush() writes
 * synchronously and is wired to Escape, the back link, and unmount. If nothing
 * ever became non-empty, nothing is created (no orphan docs).
 *
 * Everything the author wrote stays inline-editable. AI draft is one path among
 * two — the body remains a plain textarea after any generation. When no AI key
 * is configured the AI pill locks with a friendly microlabel.
 */

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AiMagicIcon,
  ArrowLeft02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Notebook01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { MemberBadge, PillButton } from "@/components/ui";
import {
  type Doc,
  type Member,
  initialsFrom,
  memberById,
} from "@/lib/mock-data";
import { STORE_KEYS, usePersistentState } from "@/lib/store";

const EMOJI = [
  "📄", "📝", "📌", "💡", "🧪", "🚀", "🗂️", "📊",
  "🎯", "🛠️", "🔥", "🌱", "🧭", "📚", "⚙️", "✨",
];

function editedLabel(ts: number): string {
  const d = new Date(ts);
  const mon = d.toLocaleString("en-US", { month: "short" });
  return `edited ${mon} ${d.getDate()}`;
}

function wordCount(body: string): number {
  const t = body.trim();
  return t ? t.split(/\s+/).length : 0;
}

export function DocEditor({
  docId,
  initialParentId = null,
  mode,
  onDeleted,
}: {
  docId: string;
  /** Only used when creating a brand-new doc (from ?parent=). */
  initialParentId?: string | null;
  mode: "new" | "existing";
  /** Called after an existing doc is removed, so the parent can navigate away. */
  onDeleted?: () => void;
}) {
  const [docs, setDocs, loaded] = usePersistentState<Doc[]>(STORE_KEYS.docs, []);
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const [meId] = usePersistentState<string | null>(STORE_KEYS.me, null);

  const existing = docs.find((d) => d.id === docId) ?? null;

  // Local editing state — the source of truth while typing.
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [icon, setIcon] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number>(() => Date.now());

  // Hydrate local state from the store once, when the doc first appears.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || !loaded) return;
    if (existing) {
      setTitle(existing.title);
      setBody(existing.body);
      setIcon(existing.icon);
      setTags(existing.tags);
      setAuthorId(existing.authorId);
      setUpdatedAt(existing.updatedAt);
      hydratedRef.current = true;
    } else if (mode === "existing") {
      // Doc truly missing — mark hydrated so we render the "gone" state.
      hydratedRef.current = true;
    }
    // For mode==="new" we intentionally stay un-hydrated until first upsert.
  }, [loaded, existing, mode]);

  // Keep latest values in refs so flush() can write synchronously on unmount.
  const latest = useRef({ title, body, icon, tags, authorId, meId, initialParentId });
  latest.current = { title, body, icon, tags, authorId, meId, initialParentId };

  const setDocsRef = useRef(setDocs);
  setDocsRef.current = setDocs;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");

  // Once a doc has been deleted from /[id], stop any pending write from resurrecting it.
  const deletedRef = useRef(false);

  const upsert = useCallback(() => {
    if (deletedRef.current) return;
    const { title: t, body: b, icon: ic, tags: tg, authorId: a, meId: m, initialParentId: p } =
      latest.current;
    const nonEmpty = t.trim().length > 0 || b.trim().length > 0;

    setDocsRef.current((prev) => {
      const idx = prev.findIndex((d) => d.id === docId);
      if (idx === -1) {
        // Never create an orphan from an empty doc.
        if (!nonEmpty) return prev;
        const created: Doc = {
          id: docId,
          title: t,
          body: b,
          icon: ic,
          parentId: p,
          authorId: a ?? m,
          updatedAt: Date.now(),
          tags: tg,
        };
        return [...prev, created];
      }
      const next = [...prev];
      next[idx] = {
        ...next[idx],
        title: t,
        body: b,
        icon: ic,
        tags: tg,
        updatedAt: Date.now(),
      };
      return next;
    });
  }, [docId]);

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    upsert();
    setSaveState("saved");
  }, [upsert]);

  // Debounced save on any local edit (after hydration / first content).
  const scheduleSave = useCallback(() => {
    if (deletedRef.current) return;
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      upsert();
      setUpdatedAt(Date.now());
      setSaveState("saved");
    }, 400);
  }, [upsert]);

  // Flush on unmount so exiting mid-typing never drops keystrokes.
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      upsert();
    };
  }, [upsert]);

  // Escape flushes (and blurs) without navigating.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") flush();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flush]);

  const edit = useCallback(
    (fn: () => void) => {
      fn();
      scheduleSave();
    },
    [scheduleSave],
  );

  const me = memberById(members, meId);
  const author = memberById(members, authorId ?? meId) ?? me;

  /* ---- AI draft ---- */
  const [aiProvider, setAiProvider] = useState<string | null | "loading">("loading");
  useEffect(() => {
    let live = true;
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { aiProvider: string | null }) => {
        if (live) setAiProvider(d.aiProvider ?? null);
      })
      .catch(() => {
        if (live) setAiProvider(null);
      });
    return () => {
      live = false;
    };
  }, []);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const runDraft = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiBusy) return;
    setAiBusy(true);
    setAiError(null);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task: "draft", prompt, context: body || undefined }),
      });
      if (res.status === 503) {
        setAiProvider(null);
        setAiError("add an ai key in .env.local — settings → services");
        return;
      }
      if (!res.ok) {
        setAiError(res.status === 429 ? "rate limited — try again shortly" : "couldn't draft — try again");
        return;
      }
      const data = (await res.json()) as { text: string };
      const text = (data.text ?? "").trim();
      if (!text) {
        setAiError("empty result — try a different prompt");
        return;
      }
      let nextBody = text;
      if (body.trim()) {
        const append = window.confirm(
          "You already have text. OK to append the AI draft below it? (Cancel to keep what you have.)",
        );
        if (!append) return;
        nextBody = `${body.trimEnd()}\n\n${text}`;
      }
      setBody(nextBody);
      scheduleSave();
      setAiOpen(false);
      setAiPrompt("");
    } catch {
      setAiError("network error — try again");
    } finally {
      setAiBusy(false);
    }
  }, [aiPrompt, aiBusy, body, scheduleSave]);

  /* ---- auto-grow textareas ---- */
  const grow = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  const [pickerOpen, setPickerOpen] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (!tags.includes(t)) {
      edit(() => setTags((prev) => [...prev, t]));
    }
    setTagDraft("");
  };

  // Missing-doc guard for /[id].
  if (mode === "existing" && loaded && hydratedRef.current && !existing) {
    return (
      <div className="mx-auto max-w-3xl pt-6 pb-32">
        <Link
          href="/app/docs"
          className="inline-flex items-center gap-2 text-ink-faint hover:text-ink transition-colors"
        >
          <Icon icon={ArrowLeft02Icon} size={16} />
          <span className="microlabel">Docs</span>
        </Link>
        <p className="mt-16 text-ink-muted font-light">This doc doesn&apos;t exist anymore.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pt-6 pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/app/docs"
          onClick={() => flush()}
          className="inline-flex items-center gap-2 text-ink-faint hover:text-ink transition-colors"
        >
          <Icon icon={ArrowLeft02Icon} size={16} />
          <span className="microlabel">Docs</span>
        </Link>
        <span className="inline-flex items-center gap-1.5 microlabel text-ink-faint">
          {saveState === "saving" && "saving"}
          {saveState === "saved" && (
            <>
              <Icon icon={CheckmarkCircle02Icon} size={12} className="text-accent" />
              saved
            </>
          )}
        </span>
      </div>

      {/* Emoji + title */}
      <div className="mt-10 relative">
        <button
          type="button"
          onClick={() => setPickerOpen((o) => !o)}
          className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-white text-2xl leading-none hover:border-line-strong transition-colors"
          aria-label="Choose page icon"
        >
          {icon ? (
            icon
          ) : (
            <Icon icon={Notebook01Icon} size={22} className="text-ink-faint" />
          )}
        </button>
        {pickerOpen && (
          <div className="absolute z-10 top-14 left-0 w-64 rounded-xl border border-line bg-white p-2 shadow-lg">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    edit(() => setIcon(e));
                    setPickerOpen(false);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-lg hover:bg-paper transition-colors"
                >
                  {e}
                </button>
              ))}
            </div>
            {icon && (
              <button
                type="button"
                onClick={() => {
                  edit(() => setIcon(""));
                  setPickerOpen(false);
                }}
                className="mt-2 w-full microlabel text-ink-faint hover:text-ink transition-colors text-left px-1"
              >
                remove icon
              </button>
            )}
          </div>
        )}

        <textarea
          value={title}
          rows={1}
          placeholder="Untitled"
          onChange={(e) => {
            const v = e.target.value.replace(/\n/g, "");
            edit(() => setTitle(v));
            grow(e.target);
          }}
          ref={grow}
          className="display block w-full resize-none border-none bg-transparent p-0 text-3xl md:text-4xl text-ink outline-none placeholder:text-ink-faint/60"
        />
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        {author ? (
          <MemberBadge name={author.name} initials={author.initials} accent={author.accent} />
        ) : (
          <span className="microlabel text-ink-faint">—</span>
        )}
        <span className="microlabel text-ink-faint">{editedLabel(updatedAt)}</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <span
              key={t}
              className="microlabel inline-flex items-center gap-1 rounded-md border border-accent-line bg-accent-soft px-2 py-0.5 text-accent-deep"
            >
              {t}
              <button
                type="button"
                onClick={() => edit(() => setTags((prev) => prev.filter((x) => x !== t)))}
                aria-label={`Remove tag ${t}`}
                className="hover:text-ink transition-colors"
              >
                <Icon icon={Cancel01Icon} size={11} />
              </button>
            </span>
          ))}
          <input
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="add tag"
            className="microlabel w-20 border-none bg-transparent p-0 text-ink-muted outline-none placeholder:text-ink-faint/60"
          />
        </div>
      </div>

      <div className="mt-8 h-px bg-line" />

      {/* Body */}
      <textarea
        value={body}
        placeholder="Start writing — full space, no box."
        onChange={(e) => {
          const v = e.target.value;
          edit(() => setBody(v));
          grow(e.target);
        }}
        ref={grow}
        className="mt-8 block min-h-[45vh] w-full resize-none border-none bg-transparent p-0 text-base leading-relaxed font-light text-ink outline-none placeholder:text-ink-faint/60"
      />

      <p className="mt-2 microlabel text-ink-faint">
        {wordCount(body)} {wordCount(body) === 1 ? "word" : "words"}
      </p>

      {/* AI draft */}
      <div className="mt-10 border-t border-line pt-6">
        {aiOpen ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    runDraft();
                  }
                }}
                placeholder="What should this doc cover?"
                className="flex-1 rounded-full border border-line bg-white px-4 py-2.5 text-sm font-light text-ink outline-none focus:border-accent-line placeholder:text-ink-faint/60"
              />
              <PillButton variant="accent" onClick={runDraft} disabled={aiBusy || !aiPrompt.trim()}>
                <Icon icon={AiMagicIcon} size={15} />
                {aiBusy ? "drafting…" : "Draft"}
              </PillButton>
              <PillButton
                variant="ghost"
                onClick={() => {
                  setAiOpen(false);
                  setAiError(null);
                }}
              >
                Cancel
              </PillButton>
            </div>
            {aiError && <p className="microlabel text-accent-deep">{aiError}</p>}
          </div>
        ) : aiProvider === null ? (
          <div className="space-y-2">
            <PillButton variant="ghost" disabled>
              <Icon icon={AiMagicIcon} size={15} />
              Draft with AI
            </PillButton>
            <p className="microlabel text-ink-faint">
              add an ai key in .env.local — settings → services
            </p>
          </div>
        ) : (
          <PillButton
            variant="ghost"
            onClick={() => setAiOpen(true)}
            disabled={aiProvider === "loading"}
          >
            <Icon icon={AiMagicIcon} size={15} />
            Draft with AI
          </PillButton>
        )}
      </div>

      {/* Danger zone (existing docs only) */}
      {mode === "existing" && existing && (
        <div className="mt-16 border-t border-line pt-6">
          <DeleteZone
            onDelete={() => {
              deletedRef.current = true;
              if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
              }
              setDocsRef.current((prev) => prev.filter((d) => d.id !== docId));
              onDeleted?.();
            }}
          />
        </div>
      )}
    </div>
  );
}

/** Two-step delete so it's never a one-click accident; router push handled by parent via reload of list. */
function DeleteZone({ onDelete }: { onDelete: () => void }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="flex items-center gap-3">
      {armed ? (
        <>
          <span className="text-sm font-light text-ink-muted">Delete this doc for good?</span>
          <button
            type="button"
            onClick={onDelete}
            className="microlabel rounded-full border border-line px-3 py-1.5 text-accent-deep hover:border-accent-line hover:bg-accent-soft transition-colors"
          >
            <span className="inline-flex items-center gap-1.5">
              <Icon icon={Cancel01Icon} size={12} />
              Delete doc
            </span>
          </button>
          <button
            type="button"
            onClick={() => setArmed(false)}
            className="microlabel text-ink-faint hover:text-ink transition-colors"
          >
            keep it
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setArmed(true)}
          className="microlabel text-ink-faint hover:text-accent-deep transition-colors"
        >
          Delete doc
        </button>
      )}
    </div>
  );
}
