"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  TestTube01Icon,
  ArrowRight02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Card, PillButton } from "@/components/ui";
import {
  uid,
  ROLES,
  initialsFrom,
  accentForIndex,
  type Role,
  type Member,
} from "@/lib/mock-data";
import { usePersistentState, STORE_KEYS } from "@/lib/store";

const TOTAL = 2;

export default function OnboardingPage() {
  const router = useRouter();
  const [members, setMembers, membersLoaded] = usePersistentState<Member[]>(
    STORE_KEYS.members,
    [],
  );
  const [, setMe] = usePersistentState<string>(STORE_KEYS.me, "");

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("engineer");
  const [invites, setInvites] = useState("");

  const nameOk = name.trim().length > 0;

  function next() {
    if (step === 1) {
      if (!nameOk) return;
      setStep(2);
      return;
    }
    finish();
  }

  function finish() {
    if (!membersLoaded) return; // never write before hydration

    if (members.length === 0) {
      // create member #1 — the current user
      const member: Member = {
        id: uid(),
        name: name.trim(),
        initials: initialsFrom(name),
        role,
        accent: accentForIndex(0),
        email: email.trim() || undefined,
        joinedAt: Date.now(),
      };
      setMembers([member]);
      setMe(member.id);
    } else {
      // already onboarded (e.g. back-nav): just point `me` at the first member
      setMe(members[0].id);
    }
    router.push("/app/dashboard");
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
                    EMAIL (OPTIONAL)
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@team.com"
                    type="email"
                    className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
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
                    WE&apos;LL WIRE REAL INVITES IN PHASE 1 — INVITE THE REST OF
                    YOUR TEAM FROM THE TEAM PAGE ANYTIME
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Footer nav */}
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
            disabled={step === 1 && !nameOk}
          >
            {step === 1 ? "Continue" : "Enter the lab"}
            <Icon icon={ArrowRight02Icon} size={16} className="text-white" />
          </PillButton>
        </div>
      </div>
    </div>
  );
}
