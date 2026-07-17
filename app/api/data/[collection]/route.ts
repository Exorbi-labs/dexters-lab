import { NextRequest, NextResponse } from "next/server";
import { serverMode, currentMember } from "@/lib/auth";
import {
  listItems,
  upsertItems,
  deleteItems,
  destroySessionsFor,
  type StoredItem,
} from "@/lib/db";

/**
 * /api/data/[collection] — the sync backend for lib/store.ts.
 * GET  → every item, in insertion order.
 * POST → { upserts: item[], deletes: id[] }, applied row-by-row so two
 *        teammates editing different items never clobber each other.
 * Session required; 503 when Phase 1 services aren't configured.
 */

const COLLECTIONS = new Set(["members", "docs", "tasks", "snippets", "repos"]);

async function guard(
  collection: string,
): Promise<NextResponse | null> {
  if (!COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: "unknown collection" }, { status: 404 });
  }
  if (!serverMode()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (!(await currentMember())) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }
  return null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collection: string }> },
) {
  const { collection } = await params;
  const denied = await guard(collection);
  if (denied) return denied;
  try {
    return NextResponse.json({ items: await listItems(collection) });
  } catch {
    return NextResponse.json({ error: "database error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> },
) {
  const { collection } = await params;
  const denied = await guard(collection);
  if (denied) return denied;

  const body = (await request.json().catch(() => null)) as {
    upserts?: unknown[];
    deletes?: unknown[];
  } | null;
  const upserts = (Array.isArray(body?.upserts) ? body.upserts : []).filter(
    (it): it is StoredItem =>
      Boolean(it) && typeof (it as StoredItem).id === "string",
  );
  const deletes = (Array.isArray(body?.deletes) ? body.deletes : []).filter(
    (id): id is string => typeof id === "string",
  );

  try {
    await upsertItems(collection, upserts);
    await deleteItems(collection, deletes);
    if (collection === "members") await destroySessionsFor(deletes);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "database error" }, { status: 500 });
  }
}
