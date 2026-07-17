"use client";

/**
 * usePresence() → Set of member ids online right now.
 *
 * One page-wide heartbeat loop shared by every subscriber: POST /api/presence
 * every 25s while the tab is visible (the server counts a member online for
 * 60s per beat). Goes dormant when the backend reports presence unavailable.
 */

import { useEffect, useState } from "react";

const HEARTBEAT_MS = 25_000;

let online = new Set<string>();
const subscribers = new Set<(o: Set<string>) => void>();
let started = false;
let dormant = false;

async function beat() {
  if (dormant || document.hidden) return;
  try {
    const res = await fetch("/api/presence", { method: "POST" });
    if (!res.ok) return;
    const data = (await res.json()) as { online?: string[] | null };
    if (data.online === null) {
      dormant = true; // presence not configured — stop asking
      return;
    }
    online = new Set(data.online ?? []);
    subscribers.forEach((fn) => fn(online));
  } catch {
    // offline — next beat retries
  }
}

function ensureLoop() {
  if (started) return;
  started = true;
  window.setInterval(() => void beat(), HEARTBEAT_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) void beat();
  });
}

export function usePresence(): Set<string> {
  const [state, setState] = useState(online);
  useEffect(() => {
    subscribers.add(setState);
    setState(online);
    ensureLoop();
    void beat();
    return () => {
      subscribers.delete(setState);
    };
  }, []);
  return state;
}
