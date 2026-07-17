/**
 * Dexter's Lab auth — Google sign-in sessions. Server-side only.
 *
 * serverMode() is true when Postgres + Google OAuth are both configured;
 * that's the switch the whole app keys off (real sign-in + synced storage
 * vs the local, per-browser mock lane).
 *
 * The pending cookie carries a just-authenticated Google profile between
 * /api/auth/callback and onboarding, HMAC-signed with AUTH_SECRET.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isConfigured } from "./env";
import { dbConfigured, sessionMember } from "./db";
import type { Member } from "./model";

export const SESSION_COOKIE = "dex_session";
export const PENDING_COOKIE = "dex_pending";
export const STATE_COOKIE = "dex_oauth_state";

export function serverMode(): boolean {
  return dbConfigured() && isConfigured("google");
}

function secret(): string {
  const s = process.env.AUTH_SECRET?.trim() || process.env.GOOGLE_CLIENT_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set");
  return s;
}

/* ---------- signed payloads ---------- */

export type PendingProfile = { sub: string; email: string; name: string };

export function signPayload(payload: object): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyPayload<T>(token: string | undefined): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return null;
  }
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString()) as T;
  } catch {
    return null;
  }
}

export const newStateToken = () => randomBytes(16).toString("hex");

/* ---------- request identity ---------- */

/** The signed-in member for this request, or null. */
export async function currentMember(): Promise<Member | null> {
  const store = await cookies();
  return sessionMember(store.get(SESSION_COOKIE)?.value);
}
