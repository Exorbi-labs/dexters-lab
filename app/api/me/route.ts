import { NextResponse } from "next/server";
import { serverMode, currentMember } from "@/lib/auth";

/**
 * GET /api/me — which storage lane the client is in, and who's signed in.
 * mode "local"  → no backend configured, browser storage only.
 * mode "server" → Postgres + Google live; member is null when signed out.
 */
export async function GET() {
  if (!serverMode()) {
    return NextResponse.json({ mode: "local", member: null });
  }
  try {
    return NextResponse.json({ mode: "server", member: await currentMember() });
  } catch {
    // database unreachable — let the client fall back to local storage
    return NextResponse.json({ mode: "local", member: null });
  }
}
