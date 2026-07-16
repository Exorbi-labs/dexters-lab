import Link from "next/link";
import type { ReactNode } from "react";

/* Mono uppercase chip */
export function Chip({
  children,
  tone = "line",
}: {
  children: ReactNode;
  tone?: "line" | "accent" | "ink";
}) {
  const tones = {
    line: "border border-line text-ink-muted bg-white",
    accent: "border border-accent-line text-accent-deep bg-accent-soft",
    ink: "border border-ink text-white bg-ink",
  };
  return (
    <span className={`microlabel inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

/* Section heading: big serif headline left, muted copy right */
export function SectionHeader({
  chip,
  title,
  copy,
}: {
  chip?: string;
  title: ReactNode;
  copy?: string;
}) {
  return (
    <div className="space-y-6">
      {chip && (
        <>
          <Chip>{chip}</Chip>
          <div className="h-px bg-line" />
        </>
      )}
      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr] md:items-end">
        <h2 className="display text-4xl md:text-5xl text-ink">{title}</h2>
        {copy && (
          <p className="text-ink-muted font-normal text-sm leading-relaxed max-w-sm md:justify-self-end">
            {copy}
          </p>
        )}
      </div>
    </div>
  );
}

/* Rounded card */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div className={`rounded-[--radius-card] border border-line bg-white ${padded ? "p-5" : ""} ${className}`}>
      {children}
    </div>
  );
}

/* Pill buttons */
export function PillButton({
  children,
  href,
  variant = "ink",
  className = "",
  onClick,
  disabled,
}: {
  children: ReactNode;
  href?: string;
  variant?: "ink" | "ghost" | "accent";
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const variants = {
    ink: "bg-ink text-white hover:bg-ink/85",
    ghost: "bg-white text-ink border border-line hover:border-line-strong",
    accent: "bg-accent text-white hover:bg-accent-deep",
  };
  const cls = `inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-normal transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${variants[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button className={`${cls} disabled:opacity-50`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

/* Member avatar — initials on the member's accent color */
export function Avatar({
  initials,
  accent,
  size = 28,
  ring = true,
}: {
  initials: string;
  accent: string;
  size?: number;
  ring?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-mono text-white ${ring ? "ring-2 ring-white" : ""}`}
      style={{ background: accent, width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </span>
  );
}

/* Member badge — avatar + name */
export function MemberBadge({
  name,
  initials,
  accent,
}: {
  name: string;
  initials: string;
  accent: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar initials={initials} accent={accent} size={18} ring={false} />
      <span className="microlabel text-ink-muted">{name}</span>
    </span>
  );
}

/* Status dot + label */
const STATUS_COLORS: Record<string, string> = {
  todo: "#D9D9E0",
  doing: "#4F46E5",
  review: "#E0A93E",
  done: "#3FA88F",
  low: "#D9D9E0",
  med: "#E0A93E",
  high: "#E0679B",
  active: "#3FA88F",
  invited: "#9CA0AC",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLORS[status] ?? "#D9D9E0" }} />
      <span className="microlabel text-ink-muted">{label ?? status}</span>
    </span>
  );
}

/* Page header inside the app shell */
export function PageHeader({
  title,
  microcopy,
  actions,
}: {
  title: string;
  microcopy?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-6 border-b border-line">
      <div>
        {microcopy && <p className="microlabel text-ink-faint mb-2">{microcopy}</p>}
        <h1 className="display text-3xl md:text-4xl text-ink">{title}</h1>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* Quiet note for mocked / phased affordances */
export function MockNote({ children }: { children: ReactNode }) {
  return <p className="microlabel text-ink-faint">{children}</p>;
}
