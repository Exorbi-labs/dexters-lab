import { NextRequest, NextResponse, after } from "next/server";
import { serverMode, currentMember } from "@/lib/auth";
import {
  listItems,
  upsertItems,
  deleteItems,
  destroySessionsFor,
  getItemsByIds,
  getMember,
  pruneCollection,
  type StoredItem,
} from "@/lib/db";
import { deriveNotifications, type EmailJob } from "@/lib/notifications";
import { sendMail } from "@/lib/mail";
import type { Member } from "@/lib/model";

/**
 * /api/data/[collection] — the sync backend for lib/store.ts.
 * GET  → every item, in insertion order.
 * POST → { upserts: item[], deletes: id[] }, applied row-by-row so two
 *        teammates editing different items never clobber each other.
 *        Writes also derive team notifications (lib/notifications.ts) and
 *        send directed emails post-response.
 * Session required; 503 when Phase 1 services aren't configured.
 */

const COLLECTIONS = new Set([
  "members",
  "docs",
  "tasks",
  "snippets",
  "repos",
  "notifications",
]);

const NOTIFICATION_CAP = 200;

async function guard(
  collection: string,
): Promise<{ member: Member } | NextResponse> {
  if (!COLLECTIONS.has(collection)) {
    return NextResponse.json({ error: "unknown collection" }, { status: 404 });
  }
  if (!serverMode()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }
  return { member };
}

async function sendEmailJobs(jobs: EmailJob[], origin: string) {
  for (const job of jobs) {
    const member = await getMember(job.toMemberId);
    if (!member?.email) continue;
    await sendMail({
      to: member.email,
      subject: job.subject,
      text: `${job.text}\n\nOpen it: ${origin}${job.href}`,
      heading: job.subject,
      body: job.text,
      cta: "Open in the lab",
      url: `${origin}${job.href}`,
    });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ collection: string }> },
) {
  const { collection } = await params;
  const denied = await guard(collection);
  if (denied instanceof NextResponse) return denied;
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
  if (denied instanceof NextResponse) return denied;
  const { member } = denied;

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
    // notifications describe changes to the OTHER collections
    const derive = collection !== "notifications" && upserts.length > 0;
    const prior = derive
      ? await getItemsByIds(collection, upserts.map((u) => u.id))
      : new Map<string, StoredItem>();

    await upsertItems(collection, upserts);
    await deleteItems(collection, deletes);
    if (collection === "members") await destroySessionsFor(deletes);

    if (derive) {
      const { notes, emails } = deriveNotifications(
        collection,
        upserts,
        prior,
        member,
      );
      if (notes.length > 0) {
        await upsertItems(
          "notifications",
          notes as unknown as StoredItem[],
        );
        await pruneCollection("notifications", NOTIFICATION_CAP);
      }
      if (emails.length > 0) {
        const origin = request.nextUrl.origin;
        after(() => sendEmailJobs(emails, origin));
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "database error" }, { status: 500 });
  }
}
