"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TestTube01Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Card, PillButton } from "@/components/ui";
import { ROLES, type Role } from "@/lib/model";
import { clearCache } from "@/lib/store";

const TOTAL = 2;

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("engineer");
  const [invites, setInvites] = useState("");

  // a Google sign-in must be pending completion to be here
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const me = await fetch("/api/me", { cache: "no-store" }).then((r) =>
          r.json(),
        );
        if (!active) return;
        if (me?.member) {
          router.replace("/app/dashboard"); // already a member
          return;
        }
        const data = await fetch("/api/auth/pending", {
          cache: "no-store",
        }).then((r) => r.json());
        if (!active) return;
        if (!data?.pending) {
          router.replace("/login"); // no Google sign-in waiting — start over
          return;
        }
        setReady(true);
        setName((current) => current || data.pending.name || "");
        setEmail(data.pending.email || "");
      } catch {
        if (active) router.replace("/login");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  const nameOk = name.trim().length > 0;

  function next() {
    if (step === 1) {
      if (!nameOk) return;
      setStep(2);
      return;
    }
    void finish();
  }

  async function finish() {
    if (!ready || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          invites: invites.split(/[\s,;]+/).filter((e) => e.includes("@")),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      clearCache(); // this browser's cache starts fresh — the team workspace is authoritative
      router.push("/app/dashboard");
    } catch {
      setError("Couldn't finish setup — try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 py-16">
      <div className="w-full max-w-xl">
        {/* Wordmark */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-soft">
            <Icon icon={TestTube01Icon} size={16} className="text-accent" />
          </span>
          <span className="serif-soft text-lg text-ink">Dexter&apos;s Lab</span>
        </div>

        {/* Step indicator + progress rail */}
        <div className="mb-6 flex items-center justify-between">
          <p className="microlabel text-ink-faint">
            STEP {String(step).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
          </p>
        </div>
        <div className="mb-10 grid grid-cols-2 gap-2">
          {[1, 2].map((s) => (
            <div key={s} className="h-1 rounded-full bg-line">
              <div
                className="h-1 rounded-full bg-accent transition-all"
                style={{ width: step >= s ? "100%" : "0%" }}
              />
            </div>
          ))}
        </div>

        <Card padded={false} className="p-8">
          {step === 1 ? (
            <div>
              <h1 className="display text-3xl text-ink">Set up your profile.</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                This creates you as the first member of the workspace.
              </p>

              <div className="mt-8 space-y-6">
                <div>
                  <label className="microlabel mb-2 block text-ink-faint">
                    YOUR NAME
                  </label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ada Lovelace"
                    autoFocus
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
                  />
                </div>

                <div>
                  <label className="microlabel mb-2 block text-ink-faint">
                    EMAIL — FROM YOUR GOOGLE ACCOUNT
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@team.com"
                    type="email"
                    disabled
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent disabled:bg-paper disabled:text-ink-muted"
                  />
                </div>

                <div>
                  <label className="microlabel mb-2 block text-ink-faint">
                    YOUR ROLE
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => {
                      const active = role === r.key;
                      return (
                        <button
                          key={r.key}
                          onClick={() => setRole(r.key)}
                          className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                            active
                              ? "border-accent-line bg-accent-soft text-accent-deep"
                              : "border-line bg-white text-ink-muted hover:border-line-strong"
                          }`}
                        >
                          {r.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="display text-3xl text-ink">Name your lab.</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                Your workspace is ready — invite the rest of the team whenever
                you like.
              </p>

              <div className="mt-8 space-y-6">
                <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3.5">
                  <Icon
                    icon={CheckmarkCircle02Icon}
                    size={18}
                    className="text-accent"
                  />
                  <div>
                    <p className="text-sm text-ink">Dexter&apos;s Lab</p>
                    <p className="microlabel text-ink-faint">
                      YOUR SHARED WORKSPACE
                    </p>
                  </div>
                </div>

                <div>
                  <label className="microlabel mb-2 block text-ink-faint">
                    INVITE TEAMMATES (OPTIONAL)
                  </label>
                  <textarea
                    value={invites}
                    onChange={(e) => setInvites(e.target.value)}
                    placeholder="Paste teammate emails, comma or line separated…"
                    rows={3}
                    className="w-full resize-none rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
                  />
                  <p className="microlabel mt-2 text-ink-faint">
                    WE&apos;LL EMAIL EACH OF THEM A SIGN-IN LINK — THEY LAND IN
                    THIS WORKSPACE THE MOMENT THEY SIGN IN WITH GOOGLE
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Footer nav */}
        {error && (
          <p className="mt-6 text-center text-sm text-ink-muted">{error}</p>
        )}
        <div className="mt-8 flex items-center justify-between">
          {step === 2 ? (
            <PillButton variant="ghost" onClick={() => setStep(1)}>
              Back
            </PillButton>
          ) : (
            <span />
          )}
          <PillButton
            variant="ink"
            onClick={next}
            disabled={(step === 1 && !nameOk) || submitting}
          >
            {step === 1
              ? "Continue"
              : submitting
                ? "Setting up…"
                : "Enter the lab"}
            <Icon icon={ArrowRight02Icon} size={16} className="text-white" />
          </PillButton>
        </div>
      </div>
    </div>
  );
}
