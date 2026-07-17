import { NextRequest, NextResponse, after } from "next/server";
import { sendInviteEmails } from "@/lib/mail";
import {
  serverMode,
  verifyPayload,
  SESSION_COOKIE,
  PENDING_COOKIE,
  type PendingProfile,
} from "@/lib/auth";
import {
  createSession,
  listItems,
  memberCount,
  memberForGoogle,
  upsertItems,
  type StoredItem,
} from "@/lib/db";
import {
  uid,
  ROLES,
  initialsFrom,
  accentForIndex,
  type Member,
  type Role,
} from "@/lib/model";

/**
 * POST /api/auth/complete — finish onboarding for a pending Google profile:
 * create the member, open a session, clear the pending cookie.
 */
export async function POST(request: NextRequest) {
  if (!serverMode()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const pending = verifyPayload<PendingProfile>(
    request.cookies.get(PENDING_COOKIE)?.value,
  );
  if (!pending) {
    return NextResponse.json({ error: "no pending sign-in" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    name?: string;
    role?: string;
    invites?: unknown[];
  } | null;
  const name = body?.name?.trim();
  const role = ROLES.find((r) => r.key === body?.role)?.key as Role | undefined;
  if (!name || !role) {
    return NextResponse.json({ error: "name and role required" }, { status: 400 });
  }
  const invites = (Array.isArray(body?.invites) ? body.invites : [])
    .filter((e): e is string => typeof e === "string" && e.includes("@"))
    .map((e) => e.trim().toLowerCase())
    .slice(0, 50);

  try {
    // the account may have been created (or invited + claimed) meanwhile
    let member = await memberForGoogle(pending.sub, pending.email || null);
    if (!member) {
      member = {
        id: uid(),
        name,
        initials: initialsFrom(name),
        role,
        accent: accentForIndex(await memberCount()),
        email: pending.email || undefined,
        joinedAt: Date.now(),
        googleSub: pending.sub,
      } satisfies Member;
      await upsertItems("members", [member as unknown as StoredItem]);
    }

    // invited teammates become claimable stubs — signing in with a matching
    // Google email attaches to the stub instead of creating a duplicate
    const fresh = [...new Set(invites)].filter(
      (e) => e !== member.email?.toLowerCase(),
    );
    if (fresh.length > 0) {
      const existing = new Set(
        (await listItems("members"))
          .map((m) => String((m as { email?: string }).email ?? "").toLowerCase())
          .filter(Boolean),
      );
      const base = await memberCount();
      const stubs = fresh
        .filter((e) => !existing.has(e))
        .map((email, i) => {
          const guessedName = email.split("@")[0].replace(/[._-]+/g, " ");
          return {
            id: uid(),
            name: guessedName,
            initials: initialsFrom(guessedName),
            role: "engineer",
            accent: accentForIndex(base + i),
            email,
            joinedAt: Date.now(),
          } satisfies Member;
        });
      await upsertItems("members", stubs as unknown as StoredItem[]);
    }
    if (fresh.length > 0) {
      const origin = request.nextUrl.origin;
      const inviter = member;
      after(() => sendInviteEmails(fresh, inviter, origin)); // mail goes out post-response
    }

    const token = await createSession(member.id);
    const res = NextResponse.json({ member });
    res.cookies.delete(PENDING_COOKIE);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
      secure: request.nextUrl.protocol === "https:",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "database error" }, { status: 500 });
  }
}
