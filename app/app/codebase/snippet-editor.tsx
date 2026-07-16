"use client";

/**
 * Shared full-page snippet editor (SNIPPETS only), used by /new and /[id].
 * NO-NAV-WHILE-TYPING: a stable id is minted in a ref on mount; the snippet is
 * lazily upserted into the store once the title OR code is non-empty, and any
 * pending debounced save is flushed on Escape / back / unmount. Nothing ever
 * navigates mid-typing.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AiMagicIcon,
  ArrowLeft02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { PillButton } from "@/components/ui";
import {
  usePersistentState,
  STORE_KEYS,
} from "@/lib/store";
import {
  uid,
  LANGUAGES,
  memberById,
  type Snippet,
  type Member,
} from "@/lib/mock-data";

const AUTOSAVE_MS = 400;

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className,
  spellCheck,
  onKeyDown,
  minHeight,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  spellCheck?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  minHeight?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, minHeight ?? 0)}px`;
  }, [minHeight]);
  useEffect(() => {
    resize();
  }, [value, resize]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      spellCheck={spellCheck}
      rows={1}
      className={`w-full resize-none bg-transparent outline-none placeholder:text-ink-faint ${className ?? ""}`}
    />
  );
}

export function SnippetEditor({ existingId }: { existingId?: string }) {
  const router = useRouter();
  const [snippets, setSnippets, loaded] = usePersistentState<Snippet[]>(
    STORE_KEYS.snippets,
    [],
  );
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const [meId] = usePersistentState<string | null>(STORE_KEYS.me, null);

  // Stable id for the whole editor lifetime (new: minted; existing: given).
  const idRef = useRef(existingId ?? uid());
  const id = idRef.current;
  const isNew = !existingId;

  // Local editing buffers.
  const [title, setTitle] = useState("");
  const [language, setLanguage] = useState<string>("typescript");
  const [code, setCode] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagDraft, setTagDraft] = useState("");
  const [authorId, setAuthorId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<number | null>(null);

  const [hydrated, setHydrated] = useState(false); // did we load the existing doc?
  const [missing, setMissing] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // AI
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Hydrate an existing snippet once the store is loaded.
  useEffect(() => {
    if (!loaded || hydrated) return;
    if (isNew) {
      setAuthorId(meId);
      setHydrated(true);
      return;
    }
    const found = snippets.find((s) => s.id === id);
    if (!found) {
      setMissing(true);
      setHydrated(true);
      return;
    }
    setTitle(found.title);
    setLanguage(found.language);
    setCode(found.code);
    setNote(found.note);
    setTags(found.tags);
    setAuthorId(found.authorId);
    setCreatedAt(found.createdAt);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, hydrated, isNew, id, meId]);

  // Check AI availability once.
  useEffect(() => {
    let alive = true;
    fetch("/api/status")
      .then((r) => r.json())
      .then((d: { aiProvider?: string | null }) => {
        if (alive) setAiReady(Boolean(d.aiProvider));
      })
      .catch(() => {
        if (alive) setAiReady(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // ---- Autosave (debounced, ref-flushable) ----
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef({ title, language, code, note, tags, authorId });
  latest.current = { title, language, code, note, tags, authorId };

  const commit = useCallback(() => {
    const cur = latest.current;
    const hasContent = cur.title.trim() !== "" || cur.code.trim() !== "";
    if (!hasContent) return; // no orphan snippets
    setSnippets((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      const base: Snippet = {
        id,
        kind: "snippet",
        title: cur.title,
        language: cur.language,
        code: cur.code,
        note: cur.note,
        authorId: cur.authorId,
        tags: cur.tags,
        createdAt: createdAt ?? Date.now(),
      };
      if (idx === -1) {
        if (!createdAt) setCreatedAt(base.createdAt);
        return [base, ...prev];
      }
      const next = [...prev];
      next[idx] = { ...prev[idx], ...base, createdAt: prev[idx].createdAt };
      return next;
    });
    setSavedAt(Date.now());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, createdAt, setSnippets]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      commit();
    }, AUTOSAVE_MS);
  }, [commit]);

  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    commit();
  }, [commit]);

  // Debounce on every field change (after hydration).
  useEffect(() => {
    if (!hydrated || missing) return;
    scheduleSave();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, language, code, note, tags, authorId, hydrated, missing]);

  // Flush on unmount.
  const flushRef = useRef(flush);
  flushRef.current = flush;
  useEffect(() => {
    return () => flushRef.current();
  }, []);

  const author = memberById(members, authorId);

  const goBack = useCallback(() => {
    flush();
    router.push("/app/codebase");
  }, [flush, router]);

  const onEscape = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        goBack();
      }
    },
    [goBack],
  );

  const addTag = () => {
    const t = tagDraft.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags([...tags, t]);
    setTagDraft("");
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — no-op
    }
  };

  const deleteSnippet = () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    setSnippets((prev) => prev.filter((s) => s.id !== id));
    router.push("/app/codebase");
  };

  const explain = async () => {
    if (!code.trim() || explaining) return;
    if (note.trim() && !window.confirm("Replace the current note with the AI explanation?")) {
      return;
    }
    setExplaining(true);
    setAiError(null);
    try {
      const res = await fetch("/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "explain",
          prompt: "Explain this snippet",
          context: code,
        }),
      });
      if (!res.ok) {
        setAiError("AI is unavailable right now.");
        return;
      }
      const data = (await res.json()) as { text?: string };
      if (data.text?.trim()) setNote(data.text.trim());
    } catch {
      setAiError("AI is unavailable right now.");
    } finally {
      setExplaining(false);
    }
  };

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl pt-6 pb-32">
        <Link
          href="/app/codebase"
          className="microlabel inline-flex items-center gap-1.5 text-ink-faint hover:text-ink"
        >
          <Icon icon={ArrowLeft02Icon} size={16} />
          CODEBASE
        </Link>
        <p className="display mt-16 text-2xl text-ink">
          This snippet doesn&apos;t exist anymore.
        </p>
        <div className="mt-6">
          <PillButton href="/app/codebase" variant="ghost">
            Back to codebase
          </PillButton>
        </div>
      </div>
    );
  }

  const savedLabel = !hydrated
    ? "—"
    : savedAt
      ? "Saved"
      : isNew
        ? "Draft"
        : "Saved";

  const aiLocked = aiReady === false;

  return (
    <div className="mx-auto max-w-3xl pt-6 pb-32" onKeyDown={onEscape}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={goBack}
          className="microlabel inline-flex items-center gap-1.5 text-ink-faint hover:text-ink"
        >
          <Icon icon={ArrowLeft02Icon} size={16} />
          CODEBASE
        </button>
        <div className="flex items-center gap-3">
          <span className="microlabel text-ink-faint">{savedLabel}</span>
          <button
            onClick={copyCode}
            disabled={!code.trim()}
            className="microlabel inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-ink-muted transition-colors hover:border-line-strong disabled:opacity-50"
          >
            <Icon icon={copied ? CheckmarkCircle02Icon : Copy01Icon} size={14} />
            {copied ? "COPIED" : "COPY CODE"}
          </button>
        </div>
      </div>

      {/* Title */}
      <div className="mt-10">
        <AutoGrowTextarea
          value={title}
          onChange={setTitle}
          placeholder="What does this do?"
          className="display text-2xl md:text-3xl text-ink leading-tight"
        />
      </div>

      {/* Meta row */}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="microlabel rounded-md border border-line bg-white px-2.5 py-1 text-ink-muted outline-none focus:border-line-strong"
        >
          {LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        {author && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="inline-flex items-center justify-center rounded-full font-mono text-white"
              style={{
                background: author.accent,
                width: 18,
                height: 18,
                fontSize: 18 * 0.36,
              }}
            >
              {author.initials}
            </span>
            <span className="microlabel text-ink-muted">{author.name}</span>
          </span>
        )}
        {/* Tags */}
        {tags.map((t) => (
          <button
            key={t}
            onClick={() => setTags(tags.filter((x) => x !== t))}
            className="microlabel inline-flex items-center gap-1.5 rounded-md border border-accent-line bg-accent-soft px-2.5 py-1 text-accent-deep transition-opacity hover:opacity-70"
          >
            {t}
            <Icon icon={Cancel01Icon} size={12} />
          </button>
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
          className="microlabel w-24 bg-transparent px-1 py-1 text-ink-muted outline-none placeholder:text-ink-faint"
        />
      </div>

      {/* Code */}
      <div className="mt-10 border-t border-line pt-6">
        <p className="microlabel text-ink-faint mb-3">CODE</p>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const el = e.currentTarget;
              const start = el.selectionStart;
              const end = el.selectionEnd;
              const next = code.slice(0, start) + "  " + code.slice(end);
              setCode(next);
              requestAnimationFrame(() => {
                el.selectionStart = el.selectionEnd = start + 2;
              });
            }
          }}
          spellCheck={false}
          placeholder="// paste or write the snippet"
          className="code min-h-[40vh] w-full resize-y rounded-xl border border-line bg-paper p-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-line-strong"
        />
      </div>

      {/* Note */}
      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="microlabel text-ink-faint">WHY / HOW</p>
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={explain}
              disabled={aiLocked || explaining || !code.trim()}
              className="microlabel inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-ink-muted transition-colors hover:border-line-strong disabled:opacity-50"
            >
              <Icon icon={AiMagicIcon} size={14} />
              {explaining ? "EXPLAINING…" : "EXPLAIN WITH AI"}
            </button>
            {aiLocked && (
              <span className="microlabel text-ink-faint">
                add an ai key in .env.local — settings → services
              </span>
            )}
            {aiError && !aiLocked && (
              <span className="microlabel text-ink-faint">{aiError}</span>
            )}
          </div>
        </div>
        <AutoGrowTextarea
          value={note}
          onChange={setNote}
          placeholder="When to reach for this, gotchas…"
          className="text-ink font-light leading-relaxed"
          minHeight={96}
        />
      </div>

      {/* Danger zone (existing only) */}
      {!isNew && (
        <div className="mt-16 border-t border-line pt-6">
          <button
            onClick={deleteSnippet}
            className="microlabel inline-flex items-center gap-1.5 text-ink-faint transition-colors hover:text-accent-deep"
          >
            <Icon icon={Delete02Icon} size={14} />
            DELETE SNIPPET
          </button>
        </div>
      )}
    </div>
  );
}
