"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Add01Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Delete02Icon,
  GitBranchIcon,
  GithubIcon,
  Search01Icon,
  SourceCodeIcon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Card, Chip, PageHeader, PillButton } from "@/components/ui";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import {
  uid,
  memberById,
  type Member,
  type Repo,
  type Snippet,
} from "@/lib/model";

type Tab = "snippets" | "repos";

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

function AuthorRow({
  authorId,
  members,
  ts,
}: {
  authorId: string | null;
  members: Member[];
  ts: number;
}) {
  const author = memberById(members, authorId);
  return (
    <div className="flex items-center gap-2">
      {author ? (
        <>
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
        </>
      ) : (
        <span className="microlabel text-ink-faint">Unknown</span>
      )}
      <span className="microlabel text-ink-faint">· {fmtDate(ts)}</span>
    </div>
  );
}

/* ---------------- Snippet card ---------------- */

function SnippetCard({
  snippet,
  members,
  onDelete,
}: {
  snippet: Snippet;
  members: Member[];
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const preview = snippet.code.split("\n").slice(0, 6).join("\n");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <Link
          href={`/app/codebase/${snippet.id}`}
          className="display text-lg text-ink leading-snug hover:text-accent-deep"
        >
          {snippet.title || "Untitled snippet"}
        </Link>
        <Chip>{snippet.language}</Chip>
      </div>

      {/* Code preview */}
      <div className="relative overflow-hidden rounded-lg bg-paper">
        <pre className="code max-h-[9rem] overflow-hidden p-3 text-xs text-ink-muted">
          {preview || "// empty"}
        </pre>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-paper to-transparent" />
      </div>

      {snippet.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {snippet.tags.map((t) => (
            <Chip key={t} tone="accent">
              {t}
            </Chip>
          ))}
        </div>
      )}

      <div className="mt-1 flex items-center justify-between gap-3">
        <AuthorRow
          authorId={snippet.authorId}
          members={members}
          ts={snippet.createdAt}
        />
        <div className="flex items-center gap-1">
          <button
            onClick={copy}
            className="microlabel inline-flex items-center gap-1 rounded-md px-2 py-1 text-ink-muted transition-colors hover:bg-paper"
          >
            <Icon
              icon={copied ? CheckmarkCircle02Icon : Copy01Icon}
              size={13}
            />
            {copied ? "COPIED" : "COPY"}
          </button>
          <button
            onClick={onDelete}
            className="inline-flex rounded-md p-1.5 text-ink-faint transition-colors hover:bg-paper hover:text-accent-deep"
            aria-label="Delete snippet"
          >
            <Icon icon={Delete02Icon} size={14} />
          </button>
        </div>
      </div>
    </Card>
  );
}

/* ---------------- Repo row ---------------- */

function RepoRow({
  repo,
  members,
  onDelete,
}: {
  repo: Repo;
  members: Member[];
  onDelete: () => void;
}) {
  const isGithub = /github\.com/i.test(repo.url);
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line py-4 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1.5">
        <a
          href={repo.url}
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2 text-ink hover:text-accent-deep"
        >
          <Icon icon={isGithub ? GithubIcon : GitBranchIcon} size={16} />
          <span className="font-normal">{repo.name || repo.url}</span>
          <Icon
            icon={ArrowUpRight01Icon}
            size={14}
            className="text-ink-faint group-hover:text-accent-deep"
          />
        </a>
        {repo.description && (
          <p className="text-sm text-ink-muted">{repo.description}</p>
        )}
        {repo.stack.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {repo.stack.map((s) => (
              <Chip key={s}>{s}</Chip>
            ))}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <AuthorRow
          authorId={repo.authorId}
          members={members}
          ts={repo.createdAt}
        />
        <button
          onClick={onDelete}
          className="inline-flex rounded-md p-1.5 text-ink-faint transition-colors hover:bg-paper hover:text-accent-deep"
          aria-label="Delete repo"
        >
          <Icon icon={Delete02Icon} size={14} />
        </button>
      </div>
    </div>
  );
}

/* ---------------- Repo composer ---------------- */

function RepoComposer({
  onAdd,
}: {
  onAdd: (r: { name: string; url: string; description: string; stack: string[] }) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [stack, setStack] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const isGithubUrl = /github\.com/i.test(url);

  // pull real metadata off the GitHub API — fields stay hand-editable after
  async function fetchDetails() {
    const target = url.trim();
    if (!target || fetching) return;
    setFetching(true);
    setFetchError(null);
    try {
      const res = await fetch("/api/github/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "lookup failed");
      setUrl(data.url || target);
      setName(data.name || "");
      setDescription(data.description || "");
      setStack((data.stack ?? []).join(", "));
    } catch (err) {
      setFetchError(
        err instanceof Error ? err.message : "couldn't reach GitHub",
      );
    } finally {
      setFetching(false);
    }
  }

  const submit = () => {
    if (!name.trim() && !url.trim()) return;
    onAdd({
      name: name.trim(),
      url: url.trim(),
      description: description.trim(),
      stack: stack
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setName("");
    setUrl("");
    setDescription("");
    setStack("");
    setFetchError(null);
  };

  const field =
    "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-line-strong";

  return (
    <Card className="space-y-3">
      <p className="microlabel text-ink-faint">ADD REPO</p>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setFetchError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isGithubUrl) void fetchDetails();
          }}
          placeholder="https://github.com/team/repo"
          className={`${field} min-w-0 flex-1`}
        />
        <PillButton
          variant="ghost"
          onClick={() => void fetchDetails()}
          disabled={!isGithubUrl || fetching}
        >
          <Icon icon={GithubIcon} size={15} />
          {fetching ? "Fetching…" : "Fetch details"}
        </PillButton>
      </div>
      {fetchError && (
        <p className="microlabel text-ink-faint">{fetchError.toUpperCase()}</p>
      )}
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Repo name"
        className={field}
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What lives here?"
        className={field}
      />
      <input
        value={stack}
        onChange={(e) => setStack(e.target.value)}
        placeholder="Stack — comma separated (next, postgres, …)"
        className={field}
      />
      <div>
        <PillButton onClick={submit} variant="ink">
          <Icon icon={Add01Icon} size={15} />
          Add repo
        </PillButton>
      </div>
    </Card>
  );
}

/* ---------------- Page ---------------- */

export default function CodebasePage() {
  const [tab, setTab] = useState<Tab>("snippets");
  const [query, setQuery] = useState("");

  const [snippets, setSnippets, snippetsLoaded] = usePersistentState<Snippet[]>(
    STORE_KEYS.snippets,
    [],
  );
  const [repos, setRepos, reposLoaded] = usePersistentState<Repo[]>(
    STORE_KEYS.repos,
    [],
  );
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const [meId] = usePersistentState<string | null>(STORE_KEYS.me, null);

  const q = query.trim().toLowerCase();

  const filteredSnippets = useMemo(() => {
    if (!q) return snippets;
    return snippets.filter((s) => {
      const hay = [s.title, s.language, ...s.tags].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [snippets, q]);

  const filteredRepos = useMemo(() => {
    if (!q) return repos;
    return repos.filter((r) => {
      const hay = [r.name, r.description, ...r.stack].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [repos, q]);

  const addRepo = (r: {
    name: string;
    url: string;
    description: string;
    stack: string[];
  }) => {
    const repo: Repo = {
      id: uid(),
      kind: "repo",
      name: r.name,
      url: r.url,
      description: r.description,
      stack: r.stack,
      authorId: meId,
      createdAt: Date.now(),
    };
    setRepos((prev) => [repo, ...prev]);
  };

  const tabBtn = (t: Tab, label: string) =>
    `microlabel rounded-full px-4 py-1.5 transition-colors ${
      tab === t
        ? "bg-ink text-white"
        : "text-ink-muted hover:text-ink"
    }`;

  return (
    <div className="space-y-8">
      <PageHeader
        microcopy="share it once, find it forever"
        title="Codebase"
        actions={
          <PillButton href="/app/codebase/new" variant="ink">
            <Icon icon={Add01Icon} size={15} />
            New snippet
          </PillButton>
        }
      />

      {/* Toggle + search */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex items-center gap-1 rounded-full border border-line bg-white p-1">
          <button className={tabBtn("snippets", "Snippets")} onClick={() => setTab("snippets")}>
            Snippets
          </button>
          <button className={tabBtn("repos", "Repos")} onClick={() => setTab("repos")}>
            Repos
          </button>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2">
          <Icon icon={Search01Icon} size={15} className="text-ink-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tab === "snippets" ? "Search snippets…" : "Search repos…"}
            className="w-44 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint md:w-56"
          />
        </div>
      </div>

      {/* Snippets */}
      {tab === "snippets" && (
        <div>
          {!snippetsLoaded ? (
            <p className="microlabel text-ink-faint">—</p>
          ) : filteredSnippets.length === 0 && !q ? (
            <Card className="flex flex-col items-center gap-4 border-dashed py-16 text-center">
              <Icon icon={SourceCodeIcon} size={26} className="text-ink-faint" />
              <p className="text-ink-muted">
                No snippets yet — paste the code your teammates keep re-asking for.
              </p>
              <PillButton href="/app/codebase/new" variant="ink">
                <Icon icon={Add01Icon} size={15} />
                New snippet
              </PillButton>
            </Card>
          ) : filteredSnippets.length === 0 ? (
            <p className="text-sm text-ink-muted">No snippets match “{query}”.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSnippets.map((s) => (
                <SnippetCard
                  key={s.id}
                  snippet={s}
                  members={members}
                  onDelete={() =>
                    setSnippets((prev) => prev.filter((x) => x.id !== s.id))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Repos */}
      {tab === "repos" && (
        <div className="space-y-6">
          {!reposLoaded ? (
            <p className="microlabel text-ink-faint">—</p>
          ) : repos.length === 0 ? (
            <>
              <Card className="flex flex-col items-center gap-4 border-dashed py-16 text-center">
                <Icon icon={GitBranchIcon} size={26} className="text-ink-faint" />
                <p className="text-ink-muted">
                  No repos linked yet — drop in the ones the team actually clones.
                </p>
              </Card>
              <RepoComposer onAdd={addRepo} />
            </>
          ) : (
            <>
              <Card padded={false}>
                <div className="px-5">
                  {filteredRepos.length === 0 ? (
                    <p className="py-6 text-sm text-ink-muted">
                      No repos match “{query}”.
                    </p>
                  ) : (
                    filteredRepos.map((r) => (
                      <RepoRow
                        key={r.id}
                        repo={r}
                        members={members}
                        onDelete={() =>
                          setRepos((prev) => prev.filter((x) => x.id !== r.id))
                        }
                      />
                    ))
                  )}
                </div>
              </Card>
              <RepoComposer onAdd={addRepo} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
