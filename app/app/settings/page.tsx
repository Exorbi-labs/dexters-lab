"use client";

import { useEffect, useState } from "react";
import { memberById, roleLabel, type Member } from "@/lib/model";
import { usePersistentState, clearCache, STORE_KEYS } from "@/lib/store";
import {
  PageHeader,
  Card,
  Chip,
  Avatar,
  MockNote,
  PillButton,
} from "@/components/ui";
import { Icon, type IconSvgElement } from "@/components/icon";
import {
  Database01Icon,
  Database02Icon,
  AiMagicIcon,
  GoogleIcon,
  GithubIcon,
} from "@hugeicons/core-free-icons";

type Service = {
  key: string;
  label: string;
  purpose: string;
  phase: string;
  configured: boolean;
};

type Status = {
  services: Service[];
  aiProvider: "deepseek" | "anthropic" | null;
};

const SERVICE_ICON: Record<string, IconSvgElement> = {
  postgres: Database01Icon,
  redis: Database02Icon,
  deepseek: AiMagicIcon,
  anthropic: AiMagicIcon,
  google: GoogleIcon,
  github: GithubIcon,
};

export default function SettingsPage() {
  const [members] = usePersistentState<Member[]>(STORE_KEYS.members, []);
  const [meId] = usePersistentState<string | null>(STORE_KEYS.me, null);
  const me = memberById(members, meId);

  const [status, setStatus] = useState<Status | null>(null);
  const [statusState, setStatusState] = useState<"loading" | "ok" | "error">(
    "loading",
  );
  const [serverAuth, setServerAuth] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (live) setServerAuth(data?.mode === "server" && Boolean(data.member));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  async function signOut() {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      // cookie clear is what matters — proceed either way
    }
    clearCache();
    window.location.href = "/login";
  }

  useEffect(() => {
    let active = true;
    fetch("/api/status")
      .then((r) => {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then((data: Status) => {
        if (!active) return;
        setStatus(data);
        setStatusState("ok");
      })
      .catch(() => {
        if (!active) return;
        setStatusState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="space-y-10">
      <PageHeader microcopy="workspace · services · privacy" title="Settings" />

      {/* Workspace */}
      <section className="space-y-4">
        <h2 className="microlabel text-ink-faint">workspace</h2>
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="display text-2xl text-ink">Dexter&apos;s Lab</p>
              <p className="mt-1 text-sm text-ink-muted">
                {members.length} {members.length === 1 ? "member" : "members"}
              </p>
            </div>
            <MockNote>one workspace — the whole team</MockNote>
          </div>

          {me && (
            <>
              <div className="h-px bg-line" />
              <div className="flex flex-wrap items-center gap-3">
                <Avatar
                  initials={me.initials}
                  accent={me.accent}
                  size={40}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-normal text-ink">{me.name}</p>
                    <Chip tone="accent">you</Chip>
                  </div>
                  <p className="mt-0.5 microlabel text-ink-faint">
                    {roleLabel(me.role)}
                    {me.email ? ` · ${me.email}` : ""}
                  </p>
                </div>
                {serverAuth && (
                  <PillButton variant="ghost" onClick={signOut}>
                    Sign out
                  </PillButton>
                )}
              </div>
            </>
          )}
        </Card>
      </section>

      {/* Services */}
      <section className="space-y-4">
        <h2 className="microlabel text-ink-faint">services</h2>
        <Card padded={false} className="overflow-hidden">
          {statusState === "loading" && (
            <p className="px-5 py-6 text-sm text-ink-muted">
              checking services…
            </p>
          )}
          {statusState === "error" && (
            <p className="px-5 py-6 text-sm text-ink-muted">
              status unavailable
            </p>
          )}
          {statusState === "ok" && status && (
            <div className="divide-y divide-line">
              {status.services.map((s) => (
                <div
                  key={s.key}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={
                        s.configured
                          ? { background: "#3FA88F" }
                          : {
                              background: "transparent",
                              boxShadow: "inset 0 0 0 1.5px #9CA0AC",
                            }
                      }
                    />
                    <span className="microlabel text-ink-faint">
                      {s.configured ? "READY" : "ADD KEY"}
                    </span>
                  </span>

                  <span className="text-ink-muted">
                    <Icon
                      icon={SERVICE_ICON[s.key] ?? Database01Icon}
                      size={16}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="font-normal text-ink">{s.label}</span>
                    <span className="block text-sm text-ink-muted">
                      {s.purpose}
                    </span>
                  </span>

                  <Chip>{s.phase}</Chip>
                </div>
              ))}
            </div>
          )}
        </Card>

        {statusState === "ok" && status && (
          <MockNote>
            {status.aiProvider
              ? `ai lane: ${status.aiProvider}`
              : "no ai key yet — assist features are waiting (.env.local)"}
          </MockNote>
        )}

        <MockNote>
          keys live in .env.local — see .env.example. restart dev after adding
          one.
        </MockNote>
      </section>

      {/* Privacy */}
      <section className="space-y-4">
        <h2 className="microlabel text-ink-faint">privacy</h2>
        <Card className="space-y-3">
          <p className="text-sm text-ink-muted">
            workspace data is shared with every member (phase 1)
          </p>
          <div className="h-px bg-line" />
          <p className="text-sm text-ink-muted">
            oauth tokens encrypted at rest, never in the browser
          </p>
        </Card>
      </section>

      <MockNote>
        {serverAuth
          ? "synced to postgres — the whole team sees this workspace"
          : "stored locally in this browser for now — cloud sync + team sign-in arrive with phase 1"}
      </MockNote>
    </div>
  );
}
