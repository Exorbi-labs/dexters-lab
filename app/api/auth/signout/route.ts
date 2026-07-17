import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { dbConfigured, destroySession } from "@/lib/db";

/** POST /api/auth/signout — end the session and clear the cookie. */
export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token && dbConfigured()) {
    try {
      await destroySession(token);
    } catch {
      // cookie still clears — the orphaned row expires on its own
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
