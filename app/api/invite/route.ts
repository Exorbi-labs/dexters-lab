import { NextRequest, NextResponse } from "next/server";
import { serverMode, currentMember } from "@/lib/auth";
import { mailConfigured, sendInviteEmails } from "@/lib/mail";

/**
 * POST /api/invite { emails } — email teammates a sign-in link.
 * The member stubs themselves are created by the caller (Team page or
 * onboarding); this only handles the mail, and reports how many went out.
 */
export async function POST(request: NextRequest) {
  if (!serverMode()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    emails?: unknown[];
  } | null;
  const emails = [
    ...new Set(
      (Array.isArray(body?.emails) ? body.emails : [])
        .filter((e): e is string => typeof e === "string" && e.includes("@"))
        .map((e) => e.trim().toLowerCase()),
    ),
  ].slice(0, 50);

  if (!mailConfigured()) {
    return NextResponse.json({ sent: 0, configured: false });
  }
  const sent = await sendInviteEmails(
    emails,
    member,
    request.nextUrl.origin,
  );
  return NextResponse.json({ sent, configured: true });
}
