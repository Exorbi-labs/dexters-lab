/**
 * Dexter's Lab data model — config + types only.
 * All collections start EMPTY and live in browser storage via lib/store.ts
 * until the Phase 1 backend. No seed data — do not add any.
 *
 * A team workspace: members collaborate on docs, tasks, and a shared codebase.
 * The current user is created during onboarding (STORE_KEYS.me holds their id).
 */

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

/* ---------- Members ---------- */

export type Role = "lead" | "engineer" | "design" | "product" | "ops";

export const ROLES: { key: Role; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "engineer", label: "Engineer" },
  { key: "design", label: "Design" },
  { key: "product", label: "Product" },
  { key: "ops", label: "Ops" },
];

export const roleLabel = (r: Role) => ROLES.find((x) => x.key === r)?.label ?? r;

/** Cycle members through this palette as they join (index by member count). */
export const MEMBER_ACCENTS = [
  "#4F46E5",
  "#0EA5A4",
  "#E0679B",
  "#E0A93E",
  "#7C6FF0",
  "#3FA88F",
  "#E8734A",
  "#5B8DEF",
];

export const accentForIndex = (i: number) =>
  MEMBER_ACCENTS[i % MEMBER_ACCENTS.length];

export type Member = {
  id: string;
  name: string;
  initials: string;
  role: Role;
  accent: string;
  email?: string;
  joinedAt: number;
  /** Google account id once the member has signed in (phase 1). */
  googleSub?: string;
};

/** "Ada Lovelace" -> "AL", "dexter" -> "DE". */
export const initialsFrom = (name: string): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const memberById = (members: Member[], id: string | null) =>
  id ? members.find((m) => m.id === id) ?? null : null;

/* ---------- Docs (Notion-style pages) ---------- */

export type Doc = {
  id: string;
  title: string;
  body: string;
  icon: string; // single emoji, or "" for the default page glyph
  parentId: string | null; // nestable
  authorId: string | null;
  updatedAt: number;
  tags: string[];
};

/* ---------- Tasks ---------- */

export type TaskStatus = "todo" | "doing" | "review" | "done";
export type Priority = "low" | "med" | "high";

export const TASK_STATUSES: { key: TaskStatus; label: string }[] = [
  { key: "todo", label: "To do" },
  { key: "doing", label: "In progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export const PRIORITIES: { key: Priority; label: string }[] = [
  { key: "low", label: "Low" },
  { key: "med", label: "Medium" },
  { key: "high", label: "High" },
];

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assigneeId: string | null;
  priority: Priority;
  due?: string; // YYYY-MM-DD
  tags: string[];
  createdAt: number;
};

/* ---------- Codebase ---------- */

export type Snippet = {
  id: string;
  kind: "snippet";
  title: string;
  language: string;
  code: string;
  note: string;
  authorId: string | null;
  tags: string[];
  createdAt: number;
};

export type Repo = {
  id: string;
  kind: "repo";
  name: string;
  url: string;
  description: string;
  stack: string[];
  authorId: string | null;
  createdAt: number;
};

/* ---------- Notifications ---------- */

export type NotificationType =
  | "task_assigned"
  | "task_done"
  | "task_created"
  | "doc_created"
  | "snippet_added"
  | "repo_added"
  | "member_invited"
  | "member_joined";

export type Notification = {
  id: string;
  type: NotificationType;
  actorId: string | null;
  /** member this is for — null means the whole team */
  targetId: string | null;
  text: string; // rendered once at creation, e.g. 'assigned you "Ship v1"'
  href: string;
  createdAt: number;
  readBy: string[];
};

export const LANGUAGES = [
  "typescript",
  "javascript",
  "python",
  "rust",
  "go",
  "move",
  "solidity",
  "sql",
  "bash",
  "json",
  "other",
] as const;
