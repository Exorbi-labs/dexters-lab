/**
 * Dexter's Lab database — the Phase 1 Postgres backend. Server-side only.
 *
 * Two tables, created lazily on first touch:
 * - items:    every team collection (members, docs, tasks, snippets, repos)
 *             stored one row per item as jsonb, keyed (collection, id).
 * - sessions: sign-in sessions for the dex_session cookie.
 *
 * When DATABASE_URL is unset nothing here is called — the app degrades to
 * browser localStorage (see lib/store.ts).
 */

import { randomBytes } from "node:crypto";
import { Pool } from "pg";
import type { Member } from "./model";

const g = globalThis as unknown as {
  dexPool?: Pool;
  dexSchemaReady?: Promise<void>;
};

export function dbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}

function pool(): Pool {
  if (!g.dexPool) {
    g.dexPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
    });
  }
  return g.dexPool;
}

/** Create tables if missing — memoized per process, re-attempted on failure. */
function ready(): Promise<void> {
  if (!g.dexSchemaReady) {
    g.dexSchemaReady = pool()
      .query(
        `create table if not exists items (
           collection text not null,
           id text not null,
           data jsonb not null,
           seq bigint generated always as identity,
           updated_at bigint not null,
           primary key (collection, id)
         );
         create table if not exists sessions (
           token text primary key,
           member_id text not null,
           created_at bigint not null,
           expires_at bigint not null
         );`,
      )
      .then(() => undefined)
      .catch((err) => {
        g.dexSchemaReady = undefined;
        throw err;
      });
  }
  return g.dexSchemaReady;
}

/* ---------- items (team collections) ---------- */

export type StoredItem = { id: string } & Record<string, unknown>;

/** All items of a collection, in insertion order (matches array append order). */
export async function listItems(collection: string): Promise<StoredItem[]> {
  await ready();
  const r = await pool().query(
    "select data from items where collection = $1 order by seq asc",
    [collection],
  );
  return r.rows.map((row) => row.data as StoredItem);
}

export async function upsertItems(
  collection: string,
  items: StoredItem[],
): Promise<void> {
  if (items.length === 0) return;
  await ready();
  const now = Date.now();
  const values: unknown[] = [];
  const tuples = items.map((item, i) => {
    values.push(collection, item.id, JSON.stringify(item), now);
    const b = i * 4;
    return `($${b + 1}, $${b + 2}, $${b + 3}::jsonb, $${b + 4})`;
  });
  await pool().query(
    `insert into items (collection, id, data, updated_at)
     values ${tuples.join(", ")}
     on conflict (collection, id)
     do update set data = excluded.data, updated_at = excluded.updated_at`,
    values,
  );
}

export async function deleteItems(
  collection: string,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await ready();
  await pool().query(
    "delete from items where collection = $1 and id = any($2)",
    [collection, ids],
  );
}

/* ---------- members ---------- */

export async function getMember(id: string): Promise<Member | null> {
  await ready();
  const r = await pool().query(
    "select data from items where collection = 'members' and id = $1",
    [id],
  );
  return (r.rows[0]?.data as Member) ?? null;
}

export async function memberCount(): Promise<number> {
  await ready();
  const r = await pool().query(
    "select count(*)::int as n from items where collection = 'members'",
  );
  return r.rows[0].n as number;
}

/**
 * The member a Google account maps to: by googleSub first, else claim the
 * invited profile whose email matches (stamping googleSub onto it).
 */
export async function memberForGoogle(
  sub: string,
  email: string | null,
): Promise<Member | null> {
  await ready();
  const bySub = await pool().query(
    "select data from items where collection = 'members' and data->>'googleSub' = $1 limit 1",
    [sub],
  );
  if (bySub.rows[0]) return bySub.rows[0].data as Member;
  if (!email) return null;
  const byEmail = await pool().query(
    "select data from items where collection = 'members' and lower(data->>'email') = lower($1) limit 1",
    [email],
  );
  const invited = byEmail.rows[0]?.data as Member | undefined;
  if (!invited) return null;
  const claimed: Member = { ...invited, googleSub: sub };
  await upsertItems("members", [claimed as unknown as StoredItem]);
  return claimed;
}

/* ---------- sessions ---------- */

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function createSession(memberId: string): Promise<string> {
  await ready();
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  await pool().query(
    "insert into sessions (token, member_id, created_at, expires_at) values ($1, $2, $3, $4)",
    [token, memberId, now, now + SESSION_TTL_MS],
  );
  return token;
}

/** The member behind a session token, or null when missing/expired. */
export async function sessionMember(
  token: string | undefined,
): Promise<Member | null> {
  if (!token || !dbConfigured()) return null;
  await ready();
  const r = await pool().query(
    "select member_id, expires_at from sessions where token = $1",
    [token],
  );
  const row = r.rows[0];
  if (!row || Number(row.expires_at) < Date.now()) return null;
  return getMember(row.member_id as string);
}

export async function destroySession(token: string): Promise<void> {
  await ready();
  await pool().query("delete from sessions where token = $1", [token]);
}

/** Removing a member signs them out everywhere. */
export async function destroySessionsFor(memberIds: string[]): Promise<void> {
  if (memberIds.length === 0) return;
  await ready();
  await pool().query("delete from sessions where member_id = any($1)", [
    memberIds,
  ]);
}
