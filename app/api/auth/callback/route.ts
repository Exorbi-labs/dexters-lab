import { NextRequest, NextResponse } from "next/server";
import {
  serverMode,
  signPayload,
  SESSION_COOKIE,
  PENDING_COOKIE,
  STATE_COOKIE,
  type PendingProfile,
} from "@/lib/auth";
import { createSession, memberForGoogle } from "@/lib/db";

/**
 * GET /api/auth/callback — Google redirects here after consent.
 * Known member (by googleSub, or invited email) → session + straight in.
 * New face → signed pending cookie + onboarding to pick a role.
 */
export async function GET(request: NextRequest) {
  const fail = (reason: string) => {
    const res = NextResponse.redirect(
      new URL(`/login?error=${reason}`, request.url),
    );
    res.cookies.delete(STATE_COOKIE);
    return res;
  };

  if (!serverMode()) return fail("unconfigured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return fail("auth_failed");
  }

  let profile: PendingProfile;
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: new URL("/api/auth/callback", request.url).toString(),
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("auth_failed");
    const tokens = (await tokenRes.json()) as { id_token?: string };
    if (!tokens.id_token) return fail("auth_failed");
    // payload came straight from Google's token endpoint over TLS — decode is enough
    const claims = JSON.parse(
      Buffer.from(tokens.id_token.split(".")[1], "base64url").toString(),
    ) as { sub?: string; email?: string; name?: string };
    if (!claims.sub) return fail("auth_failed");
    profile = {
      sub: claims.sub,
      email: claims.email ?? "",
      name: claims.name ?? "",
    };
  } catch {
    return fail("auth_failed");
  }

  try {
    const member = await memberForGoogle(profile.sub, profile.email || null);
    if (member) {
      const token = await createSession(member.id);
      const res = NextResponse.redirect(new URL("/app/dashboard", request.url));
      res.cookies.delete(STATE_COOKIE);
      res.cookies.set(SESSION_COOKIE, token, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
        secure: request.nextUrl.protocol === "https:",
      });
      return res;
    }

    const res = NextResponse.redirect(new URL("/onboarding", request.url));
    res.cookies.delete(STATE_COOKIE);
    res.cookies.set(PENDING_COOKIE, signPayload(profile), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900,
    });
    return res;
  } catch {
    return fail("db_failed");
  }
}
