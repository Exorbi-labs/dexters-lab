"use client";

/**
 * Dexter's Lab persistence — browser localStorage until the Phase 1 backend.
 *
 * usePersistentState(key, initial) → [value, set, loaded]. `loaded` is false
 * until hydration completes — gate empty-states on it, never persist before it.
 * Keys namespaced "dex:*" (STORE_KEYS). Same-tab siblings + other tabs stay in
 * sync via events.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export const STORE_KEYS = {
  members: "dex:members",
  docs: "dex:docs",
  tasks: "dex:tasks",
  snippets: "dex:snippets",
  repos: "dex:repos",
  me: "dex:me", // current member id (string)
  settings: "dex:settings",
} as const;

const LOCAL_EVENT = "dex:store";

export function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {
      // corrupted entry — start fresh
    }
    setLoaded(true);

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
      window.removeEventListener("storage", onExternal);
      window.removeEventListener(LOCAL_EVENT, onExternal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      const resolved =
        typeof next === "function"
          ? (next as (prev: T) => T)(valueRef.current)
          : next;
      setValue(resolved);
      try {
        window.localStorage.setItem(key, JSON.stringify(resolved));
        window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: key }));
      } catch {
        // storage full/unavailable — state still updates in-memory
      }
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
