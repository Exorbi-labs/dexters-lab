"use client";

/**
 * Docs list — the team's shared brain. Docs render as a nested tree by
 * parentId (top-level, with indented children), each row linking to its editor,
 * with a quiet "＋ subpage" action. Search filters by title. Empty + loading
 * states avoid any hydration flash.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Add01Icon,
  Notebook01Icon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Avatar, Card, PageHeader, PillButton } from "@/components/ui";
import { type Doc, type Member, memberById } from "@/lib/mock-data";
import { STORE_KEYS, usePersistentState } from "@/lib/store";

const MAX_DEPTH = 2; // top level + two levels of nesting

function editedShort(ts: number): string {
  const d = new Date(ts);
  return `${d.toLocaleString("en-US", { month: "short" })} ${d.getDate()}`;
}

export default function DocsPage() {
  const [docs, , loaded] = usePersistentState<Doc[]>(STORE_KEYS.docs, []);
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();

  // When searching, show a flat filtered list (nesting gets in the way of a search).
  const filtered = useMemo(
    () => (q ? docs.filter((d) => d.title.toLowerCase().includes(q)) : docs),
    [docs, q],
  );

  // Children indexed by parentId, each level sorted by updatedAt desc.
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, Doc[]>();
    for (const d of filtered) {
      const key = d.parentId ?? null;
      const arr = map.get(key) ?? [];
      arr.push(d);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => b.updatedAt - a.updatedAt);
    return map;
  }, [filtered]);

  // Roots: docs with no parent, OR (while searching) docs whose parent is filtered out.
  const roots = useMemo(() => {
    const ids = new Set(filtered.map((d) => d.id));
    return filtered
      .filter((d) => !d.parentId || !ids.has(d.parentId))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [filtered]);

  const renderRow = (doc: Doc, depth: number): React.ReactNode => {
    const author = memberById(members, doc.authorId);
    const kids = depth < MAX_DEPTH ? childrenOf.get(doc.id) ?? [] : [];
    return (
      <div key={doc.id}>
        <div
          className="group flex items-center gap-3 rounded-lg py-2.5 pr-2 hover:bg-paper/60 transition-colors"
          style={{ paddingLeft: depth * 22 }}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base leading-none">
            {doc.icon ? (
              doc.icon
            ) : (
              <Icon icon={Notebook01Icon} size={16} className="text-ink-faint" />
            )}
          </span>
          <Link
            href={`/app/docs/${doc.id}`}
            className="min-w-0 flex-1 truncate text-ink-muted hover:text-ink transition-colors font-light"
          >
            {doc.title.trim() || "Untitled"}
          </Link>
          {author && (
            <Avatar
              initials={author.initials}
              accent={author.accent}
              size={20}
              ring={false}
            />
          )}
          <span className="microlabel text-ink-faint hidden sm:inline">
            {editedShort(doc.updatedAt)}
          </span>
          <Link
            href={`/app/docs/new?parent=${doc.id}`}
            className="microlabel inline-flex items-center gap-1 text-ink-faint opacity-0 group-hover:opacity-100 hover:text-accent-deep transition-all"
            aria-label="Add subpage"
          >
            <Icon icon={Add01Icon} size={12} />
            subpage
          </Link>
        </div>
        {kids.map((k) => renderRow(k, depth + 1))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        microcopy="the team's shared brain"
        title="Docs"
        actions={
          <PillButton href="/app/docs/new" variant="ink">
            <Icon icon={Add01Icon} size={15} />
            New doc
          </PillButton>
        }
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2">
          <Icon icon={Search01Icon} size={16} className="text-ink-faint" />
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search docs"
          className="w-full rounded-full border border-line bg-white py-2.5 pl-10 pr-4 text-sm font-light text-ink outline-none focus:border-accent-line placeholder:text-ink-faint/60"
        />
      </div>

      {/* Body */}
      {!loaded ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 py-2.5">
              <span className="h-5 w-5 rounded bg-line" />
              <span className="h-4 w-40 rounded bg-line" />
              <span className="ml-auto microlabel text-ink-faint">—</span>
            </div>
          ))}
        </div>
      ) : roots.length === 0 ? (
        q ? (
          <p className="text-ink-muted font-light">No docs match “{query}”.</p>
        ) : (
          <Card className="border-dashed text-center py-14">
            <div className="mx-auto flex max-w-sm flex-col items-center gap-4">
              <Icon icon={Notebook01Icon} size={26} className="text-ink-faint" />
              <p className="text-ink-muted font-light">
                No docs yet — write the first page the team will actually read.
              </p>
              <PillButton href="/app/docs/new" variant="ink">
                <Icon icon={Add01Icon} size={15} />
                New doc
              </PillButton>
            </div>
          </Card>
        )
      ) : (
        <div className="border-t border-line pt-2">{roots.map((d) => renderRow(d, 0))}</div>
      )}
    </div>
  );
}
