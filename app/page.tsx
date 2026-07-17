import Link from "next/link";
import {
  Notebook01Icon,
  KanbanIcon,
  SourceCodeIcon,
  File01Icon,
  ArrowRight02Icon,
  ArrowUpRight01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { Icon } from "@/components/icon";
import { Chip, SectionHeader, PillButton, Avatar } from "@/components/ui";
import { MEMBER_ACCENTS } from "@/lib/model";

/* ---------- decorative mock cards (non-interactive) ---------- */

function DocRowMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_18px_50px_-24px_rgba(22,23,27,0.35)]">
      <p className="microlabel text-ink-faint mb-3">DOCS</p>
      <div className="space-y-2.5">
        <div className="flex items-center gap-2.5">
          <Icon icon={File01Icon} size={15} className="shrink-0 text-ink-muted" />
          <span className="text-sm text-ink">Engineering handbook</span>
        </div>
        <div className="flex items-center gap-2.5 pl-5">
          <Icon icon={File01Icon} size={15} className="shrink-0 text-ink-faint" />
          <span className="text-sm text-ink-muted">Architecture decisions</span>
        </div>
        <div className="flex items-center gap-2.5 pl-5">
          <Icon icon={File01Icon} size={15} className="shrink-0 text-ink-faint" />
          <span className="text-sm text-ink-muted">Release checklist</span>
        </div>
      </div>
    </div>
  );
}

function TaskCardMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_18px_50px_-24px_rgba(22,23,27,0.35)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="microlabel text-ink-faint">IN PROGRESS</p>
        <span className="h-2 w-2 rounded-full" style={{ background: "#4F46E5" }} />
      </div>
      <p className="text-sm text-ink">Wire the tasks board</p>
      <div className="mt-4 flex items-center justify-between">
        <span className="microlabel text-ink-faint">HIGH</span>
        <Avatar initials="AL" accent={MEMBER_ACCENTS[2]} size={22} ring={false} />
      </div>
    </div>
  );
}

function CodeMock() {
  return (
    <div className="rounded-2xl border border-line bg-white p-4 shadow-[0_18px_50px_-24px_rgba(22,23,27,0.35)]">
      <div className="mb-3 flex items-center gap-2">
        <Icon icon={SourceCodeIcon} size={14} className="text-accent" />
        <p className="microlabel text-ink-faint">SNIPPET · TS</p>
      </div>
      <pre className="code overflow-hidden text-ink-muted">
        <span className="text-accent-deep">export const</span> uid = () =&gt;{"\n"}
        {"  "}crypto.randomUUID();
      </pre>
    </div>
  );
}

/* ---------- what's-in-the-lab tile ---------- */

function FeatureTile({
  icon,
  label,
  desc,
  mock,
}: {
  icon: typeof Notebook01Icon;
  label: string;
  desc: string;
  mock: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-[--radius-tile] gradient-accent border border-line p-6">
      <div className="mb-6 h-44">{mock}</div>
      <div className="flex items-center gap-2">
        <Icon icon={icon} size={16} className="text-accent" />
        <p className="microlabel text-ink">{label}</p>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{desc}</p>
    </div>
  );
}

export default function Home() {
  return (
    <div className="scroll-smooth min-h-screen bg-white text-ink">
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center">
          <span className="serif-soft text-lg text-ink">Dexter&apos;s Lab</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {[
            { label: "DOCS", href: "#docs" },
            { label: "TASKS", href: "#tasks" },
            { label: "CODEBASE", href: "#codebase" },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="microlabel rounded-full px-3 py-1.5 text-ink-muted transition-colors hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <PillButton href="/login" variant="ink" className="px-4 py-2">
          Enter the lab
        </PillButton>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-16 pb-10 md:pt-28">
        <Chip tone="accent">A FREE NOTION ALTERNATIVE FOR TEAMS</Chip>
        <h1 className="display mt-6 text-5xl leading-[1.05] text-ink md:text-8xl">
          One lab for the whole team&apos;s docs, tasks, and code.
        </h1>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-ink-muted md:text-lg">
          A simple, free Notion alternative. Write together, ship together, and
          keep the code you keep re-sharing all in one place.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <PillButton href="/login" variant="ink">
            Enter the lab
            <Icon icon={ArrowRight02Icon} size={16} className="text-white" />
          </PillButton>
          <a
            href="#docs"
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-5 py-2.5 text-sm text-ink transition-colors hover:border-line-strong"
          >
            See how it works
          </a>
        </div>

        {/* Gradient hero panel with floating mock cards */}
        <div className="relative mt-16 h-[380px] w-full overflow-hidden rounded-[2rem] border border-line gradient-accent md:h-[440px]">
          <div className="absolute left-6 top-10 w-64 md:left-14 md:top-14 md:w-72">
            <DocRowMock />
          </div>
          <div className="absolute right-6 top-20 w-56 md:right-16 md:top-24 md:w-60">
            <TaskCardMock />
          </div>
          <div className="absolute bottom-10 left-1/2 w-64 -translate-x-1/2 md:w-80">
            <CodeMock />
          </div>
        </div>
      </section>

      {/* What's in the lab */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <SectionHeader
          chip="WHAT'S IN THE LAB"
          title="Three surfaces, one shared workspace."
          copy="Everything a small team keeps re-sharing, finally in one home."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          <div id="docs" className="scroll-mt-24">
            <FeatureTile
              icon={Notebook01Icon}
              label="DOCS"
              desc="Nested pages and full-page writing. The team's shared brain."
              mock={<DocRowMock />}
            />
          </div>
          <div id="tasks" className="scroll-mt-24">
            <FeatureTile
              icon={KanbanIcon}
              label="TASKS"
              desc="A shared board. Who's on what, and what's shipping next."
              mock={<TaskCardMock />}
            />
          </div>
          <div id="codebase" className="scroll-mt-24">
            <FeatureTile
              icon={SourceCodeIcon}
              label="CODEBASE"
              desc="Snippets and repos your teammates keep re-asking you for."
              mock={<CodeMock />}
            />
          </div>
        </div>
      </section>

      {/* Built for a team, not a tab */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <Chip>BUILT FOR A TEAM, NOT A TAB</Chip>
        <div className="mt-6 h-px bg-line" />
        <div className="mt-10 grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
          <h2 className="display text-4xl text-ink md:text-5xl">
            One workspace. Everyone in it.
          </h2>
          <div className="flex items-center gap-3 md:justify-self-end">
            <div className="flex -space-x-2">
              {["DX", "AL", "MR", "JS"].map((ini, i) => (
                <Avatar
                  key={ini}
                  initials={ini}
                  accent={MEMBER_ACCENTS[i]}
                  size={34}
                />
              ))}
            </div>
            <span className="microlabel text-ink-faint">+ your whole team</span>
          </div>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {[
            {
              t: "One shared space",
              d: "No per-person silos. Docs, tasks, and code all live where the whole team can find them.",
            },
            {
              t: "Roles, not walls",
              d: "Lead, engineer, design, product, ops. Everyone sees the same workspace, tagged by who owns what.",
            },
            {
              t: "Everything editable",
              d: "Anyone can pick up a doc or task and edit it in place. No hand-offs, no lost context.",
            },
          ].map((c) => (
            <div key={c.t} className="border-t border-line pt-5">
              <p className="text-base text-ink">{c.t}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{c.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Free, and yours */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="rounded-[2rem] border border-line gradient-accent px-8 py-14 md:px-14">
          <h2 className="display max-w-2xl text-4xl text-ink md:text-5xl">
            Free, and yours.
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted">
            No paywalls between your team and its own work. Your data stays your
            data. Export it, self-host it, keep it.
          </p>
          <div className="mt-8 flex flex-wrap gap-2.5">
            {["NO SEAT LIMITS", "SELF-HOST READY", "EXPORTS"].map((c) => (
              <Chip key={c}>
                <Icon
                  icon={CheckmarkCircle02Icon}
                  size={13}
                  className="text-accent"
                />
                {c}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-7xl px-6 pb-14 pt-10">
        <div className="h-px bg-line" />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-ink">
            Dexter&apos;s Lab, built for teams who&apos;d rather ship.
          </p>
          <a
            href="/login"
            className="inline-flex items-center gap-1.5 microlabel text-ink-muted transition-colors hover:text-ink"
          >
            ENTER THE LAB
            <Icon icon={ArrowUpRight01Icon} size={13} className="text-ink-muted" />
          </a>
        </div>
        <p className="microlabel mt-6 text-ink-faint">© 2026 · PRIVATE BETA</p>
      </footer>
    </div>
  );
}
