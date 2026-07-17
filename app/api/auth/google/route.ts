import { NextRequest, NextResponse } from "next/server";
import { serverMode, newStateToken, STATE_COOKIE } from "@/lib/auth";

/** GET /api/auth/google — kick off the Google OAuth consent flow. */
export async function GET(request: NextRequest) {
  if (!serverMode()) {
    return NextResponse.redirect(
      new URL("/login?error=unconfigured", request.url),
    );
  }

  const state = newStateToken();
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
  url.searchParams.set(
    "redirect_uri",
    new URL("/api/auth/callback", request.url).toString(),
  );
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");

  const res = NextResponse.redirect(url);
  res.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return res;
}
