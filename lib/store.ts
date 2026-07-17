"use client";

/**
 * Dexter's Lab persistence.
 *
 * usePersistentState(key, initial) → [value, set, loaded]. `loaded` is false
 * until hydration completes — gate empty-states on it, never persist before it.
 * Keys namespaced "dex:*" (STORE_KEYS). Same-tab siblings + other tabs stay in
 * sync via events.
 *
 * localStorage is always the reactive cache every hook instance reads. When
 * Phase 1 is live (Postgres + Google sign-in — /api/me says mode "server"),
 * a per-collection sync engine overlays it: the server list is pulled into
 * the cache on load and on a gentle poll, and local edits are diffed by id
 * into upserts/deletes and pushed debounced to /api/data/[collection]. With
 * no backend configured everything degrades to plain localStorage.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const STORE_KEYS = {
  members: "dex:members",
  docs: "dex:docs",
  tasks: "dex:tasks",
  snippets: "dex:snippets",
  repos: "dex:repos",
  notifications: "dex:notifications",
  me: "dex:me", // current member id (string)
  settings: "dex:settings",
} as const;

const LOCAL_EVENT = "dex:store";

/** STORE_KEYS entries that are team collections synced to /api/data. */
const COLLECTION: Record<string, string> = {
  [STORE_KEYS.members]: "members",
  [STORE_KEYS.docs]: "docs",
  [STORE_KEYS.tasks]: "tasks",
  [STORE_KEYS.snippets]: "snippets",
  [STORE_KEYS.repos]: "repos",
  [STORE_KEYS.notifications]: "notifications",
};

function writeCache(key: string, json: string) {
  try {
    window.localStorage.setItem(key, json);
    window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: key }));
  } catch {
    // storage full/unavailable — in-memory state still updates
  }
}

/** Drop every dex:* cache entry — on sign-out or when switching workspaces. */
export function clearCache() {
  if (typeof window === "undefined") return;
  for (const key of Object.values(STORE_KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
  }
}

/* ---------- storage lane (local vs server) ---------- */

type Mode = { kind: "local" } | { kind: "server"; meId: string | null };

let modePromise: Promise<Mode> | null = null;

function getMode(): Promise<Mode> {
  if (!modePromise) {
    modePromise = fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (data): Mode =>
          data?.mode === "server"
            ? { kind: "server", meId: data.member?.id ?? null }
            : { kind: "local" },
      )
      .catch((): Mode => ({ kind: "local" }));
  }
  return modePromise;
}

/* ---------- collection sync engine (server mode only) ---------- */

type Item = { id: string };

const PUSH_DEBOUNCE_MS = 700;
const PUSH_RETRY_MS = 4000;
const POLL_MS = 4000;

class CollectionSync {
  private upserts = new Map<string, Item>();
  private deletes = new Set<string>();
  private timer: number | null = null;
  private pushing = false;
  readonly ready: Promise<void>;

  constructor(
    private key: string,
    private collection: string,
  ) {
    this.ready = this.pull(true);
    window.setInterval(() => void this.pull(), POLL_MS);
    window.addEventListener("focus", () => void this.pull());
    window.addEventListener("pagehide", () => void this.flush(true));
  }

  private dirty() {
    return this.upserts.size > 0 || this.deletes.size > 0;
  }

  /** Refresh the cache from the server — unless local edits are in flight. */
  private async pull(force = false): Promise<void> {
    if (!force && (document.hidden || this.dirty() || this.pushing)) return;
    try {
      const r = await fetch(`/api/data/${this.collection}`, {
        cache: "no-store",
      });
      if (!r.ok) return;
      const data = (await r.json()) as { items?: Item[] };
      if (this.dirty() || this.pushing) return; // an edit landed mid-pull
      const json = JSON.stringify(Array.isArray(data.items) ? data.items : []);
      if (json !== window.localStorage.getItem(this.key)) {
        writeCache(this.key, json);
      }
    } catch {
      // offline — the cache keeps working, next poll retries
    }
  }

  /** Diff prev → next by id and queue the changes for a debounced push. */
  queue(prev: Item[], next: Item[]) {
    const prevById = new Map(prev.map((it) => [it.id, it]));
    const nextIds = new Set(next.map((it) => it.id));
    for (const item of next) {
      const old = prevById.get(item.id);
      if (!old || JSON.stringify(old) !== JSON.stringify(item)) {
        this.upserts.set(item.id, item);
        this.deletes.delete(item.id);
      }
    }
    for (const item of prev) {
      if (!nextIds.has(item.id)) {
        this.deletes.add(item.id);
        this.upserts.delete(item.id);
      }
    }
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => void this.flush(), PUSH_DEBOUNCE_MS);
  }

  private async flush(keepalive = false): Promise<void> {
    if (!this.dirty() || this.pushing) return;
    const payload = {
      upserts: [...this.upserts.values()],
      deletes: [...this.deletes],
    };
    this.upserts.clear();
    this.deletes.clear();
    this.pushing = true;
    try {
      const r = await fetch(`/api/data/${this.collection}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive,
      });
      if (!r.ok) throw new Error(String(r.status));
    } catch {
      // requeue what didn't land (newer local edits win) and retry
      for (const it of payload.upserts) {
        if (!this.upserts.has(it.id) && !this.deletes.has(it.id)) {
          this.upserts.set(it.id, it);
        }
      }
      for (const id of payload.deletes) {
        if (!this.upserts.has(id)) this.deletes.add(id);
      }
      window.setTimeout(() => void this.flush(), PUSH_RETRY_MS);
    } finally {
      this.pushing = false;
    }
  }
}

const syncs = new Map<string, CollectionSync>();

function syncFor(key: string): CollectionSync | null {
  const collection = COLLECTION[key];
  if (!collection) return null;
  let sync = syncs.get(key);
  if (!sync) {
    sync = new CollectionSync(key, collection);
    syncs.set(key, sync);
  }
  return sync;
}

/** Mirror a local edit to the server once we know we're in server mode. */
async function pushWhenServer(key: string, prev: unknown, next: unknown) {
  if (!COLLECTION[key]) return;
  const mode = await getMode();
  if (mode.kind !== "server") return;
  if (Array.isArray(prev) && Array.isArray(next)) {
    syncFor(key)?.queue(prev as Item[], next as Item[]);
  }
}

/* ---------- the hook ---------- */

export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    let active = true;

    const readCache = () => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) setValue(JSON.parse(raw) as T);
      } catch {
        // corrupted entry — start fresh
      }
    };
    readCache(); // instant paint from the cache

    void (async () => {
      const mode = await getMode();
      if (!active) return;
      if (mode.kind === "server") {
        if (key === STORE_KEYS.me) {
          // identity comes from the session, not the browser
          if (mode.meId) writeCache(key, JSON.stringify(mode.meId));
        } else if (COLLECTION[key]) {
          await syncFor(key)!.ready;
          if (!active) return;
        }
        readCache(); // the server's answer is in the cache now
      }
      setLoaded(true);
    })();

    const onExternal = (e: Event) => {
      const detailKey =
        e instanceof StorageEvent ? e.key : (e as CustomEvent<string>).detail;
      if (detailKey !== key) return;
      try {
        const raw = window.localStorage.getItem(key);
        setValue(raw !== null ? (JSON.parse(raw) as T) : initial);
      } catch {
        // ignore
      }
    };
    window.addEventListener("storage", onExternal);
    window.addEventListener(LOCAL_EVENT, onExternal);
    return () => {
      active = false;
      window.removeEventListener("storage", onExternal);
      window.removeEventListener(LOCAL_EVENT, onExternal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const prev = valueRef.current;
      const resolved =
        typeof next === "function" ? (next as (prev: T) => T)(prev) : next;
      setValue(resolved);
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
        window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: key }));
      } catch {
        // storage full/unavailable — state still updates in-memory
      }
      void pushWhenServer(key, prev, resolved);
    },
    [key],
  );

  return [value, set, loaded];
}

/** Read a collection outside React. */
export function readStore<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
