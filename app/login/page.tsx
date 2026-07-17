"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loading03Icon } from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui";

/* Official multi-color Google "G" mark */
function GoogleGlyph({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

const AUTH_ERRORS: Record<string, string> = {
  auth_failed: "Google sign-in didn't complete — try again.",
  db_failed: "Signed in, but the database couldn't be reached.",
  unconfigured: "Google sign-in isn't configured yet.",
};

export default function LoginPage() {
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("error");
    if (code) setError(AUTH_ERRORS[code] ?? "Sign-in failed — try again.");

    let active = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (active && data?.member) router.replace("/app/dashboard");
      })
      .catch(() => {
        // signed out — stay on the login screen
      });
    return () => {
      active = false;
    };
  }, [router]);

  function handleGoogle() {
    setSigningIn(true);
    setError(null);
    // real Google OAuth — round-trips through /api/auth/callback
    window.location.href = "/api/auth/google";
  }

  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          {/* Wordmark */}
          <div className="mb-10 flex items-center justify-center">
            <span className="serif-soft text-lg text-ink">Dexter&apos;s Lab</span>
          </div>

          <h1 className="display text-4xl text-ink">Enter the lab.</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-muted">
            One workspace for the whole team.
          </p>

          <Card className="mt-10">
            <button
              onClick={handleGoogle}
              disabled={signingIn}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-full border border-line bg-white px-5 py-3 text-sm text-ink transition-colors hover:border-line-strong disabled:opacity-60"
            >
              {signingIn ? (
                <>
                  <Icon
                    icon={Loading03Icon}
                    size={16}
                    className="animate-spin text-ink-muted"
                  />
                  Signing in…
                </>
              ) : (
                <>
                  <GoogleGlyph size={17} />
                  Continue with Google
                </>
              )}
            </button>
            {error && (
              <p className="mt-4 text-sm text-ink-muted">{error}</p>
            )}
            <p className="microlabel mt-4 text-ink-faint">
              YOUR TEAM&apos;S PRIVATE WORKSPACE
            </p>
          </Card>
        </div>
      </main>

      {/* Warm gradient wash — softly fades up from the bottom, no hard edge */}
      <div
        className="gradient-accent pointer-events-none h-72 w-full"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 75%)",
          maskImage: "linear-gradient(to bottom, transparent, #000 75%)",
        }}
      />
    </div>
  );
}
