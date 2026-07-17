/**
 * Notification derivation — server-side only.
 *
 * Runs inside /api/data writes: compares each upsert with its prior version
 * and turns the meaningful transitions into Notification rows (stored in the
 * "notifications" collection, synced to every client like any other data).
 * Personally-directed events (a task assigned to you) also produce an email
 * job the route sends post-response.
 */

import {
  uid,
  type Doc,
  type Member,
  type Notification,
  type Repo,
  type Snippet,
  type Task,
} from "./model";
import type { StoredItem } from "./db";

export type EmailJob = {
  toMemberId: string;
  subject: string;
  text: string;
  href: string; // app path, e.g. /app/tasks/abc
};

export type Derived = { notes: Notification[]; emails: EmailJob[] };

const note = (
  partial: Omit<Notification, "id" | "createdAt" | "readBy">,
): Notification => ({
  ...partial,
  id: uid(),
  createdAt: Date.now(),
  readBy: partial.actorId ? [partial.actorId] : [],
});

const title = (s: string | undefined, fallback: string) => {
  const t = s?.trim();
  return t ? (t.length > 60 ? `${t.slice(0, 57)}…` : t) : fallback;
};

export function deriveNotifications(
  collection: string,
  upserts: StoredItem[],
  prior: Map<string, StoredItem>,
  actor: Member,
): Derived {
  const notes: Notification[] = [];
  const emails: EmailJob[] = [];

  for (const raw of upserts) {
    const old = prior.get(raw.id);

    if (collection === "tasks") {
      const task = raw as unknown as Task;
      const oldTask = old as unknown as Task | undefined;
      const t = title(task.title, "an untitled task");
      const href = `/app/tasks/${task.id}`;

      const newlyAssigned =
        task.assigneeId &&
        task.assigneeId !== actor.id &&
        (!oldTask || oldTask.assigneeId !== task.assigneeId);
      if (newlyAssigned) {
        notes.push(
          note({
            type: "task_assigned",
            actorId: actor.id,
            targetId: task.assigneeId,
            text: `assigned you "${t}"`,
            href,
          }),
        );
        emails.push({
          toMemberId: task.assigneeId!,
          subject: `${actor.name} assigned you a task — ${t}`,
          text: `${actor.name} assigned you "${t}" in Dexter's Lab.`,
          href,
        });
      } else if (!oldTask) {
        notes.push(
          note({
            type: "task_created",
            actorId: actor.id,
            targetId: null,
            text: `added a task: "${t}"`,
            href,
          }),
        );
      }

      if (oldTask && oldTask.status !== "done" && task.status === "done") {
        notes.push(
          note({
            type: "task_done",
            actorId: actor.id,
            targetId: null,
            text: `completed "${t}"`,
            href,
          }),
        );
      }
    }

    if (collection === "docs" && !old) {
      const doc = raw as unknown as Doc;
      notes.push(
        note({
          type: "doc_created",
          actorId: actor.id,
          targetId: null,
          text: `started a doc: "${title(doc.title, "Untitled")}"`,
          href: `/app/docs/${doc.id}`,
        }),
      );
    }

    if (collection === "snippets" && !old) {
      const snippet = raw as unknown as Snippet;
      notes.push(
        note({
          type: "snippet_added",
          actorId: actor.id,
          targetId: null,
          text: `added a snippet: "${title(snippet.title, "untitled")}"`,
          href: `/app/codebase/${snippet.id}`,
        }),
      );
    }

    if (collection === "repos" && !old) {
      const repo = raw as unknown as Repo;
      notes.push(
        note({
          type: "repo_added",
          actorId: actor.id,
          targetId: null,
          text: `linked a repo: ${title(repo.name, repo.url ?? "a repo")}`,
          href: "/app/codebase",
        }),
      );
    }

    if (collection === "members" && !old) {
      const invited = raw as unknown as Member;
      if (invited.id !== actor.id) {
        notes.push(
          note({
            type: "member_invited",
            actorId: actor.id,
            targetId: null,
            text: `invited ${invited.name} to the lab`,
            href: "/app/team",
          }),
        );
      }
    }
  }

  return { notes, emails };
}
