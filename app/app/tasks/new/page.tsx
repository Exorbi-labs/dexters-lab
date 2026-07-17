"use client";

import { useRef } from "react";
import { uid, type TaskStatus, TASK_STATUSES } from "@/lib/model";
import { usePersistentState, STORE_KEYS } from "@/lib/store";
import { TaskEditor } from "../task-editor";

function statusFromQuery(): TaskStatus {
  if (typeof window === "undefined") return "todo";
  const q = new URLSearchParams(window.location.search).get("status");
  return TASK_STATUSES.some((s) => s.key === q) ? (q as TaskStatus) : "todo";
}

export default function NewTaskPage() {
  const idRef = useRef(uid());
  const statusRef = useRef<TaskStatus>(statusFromQuery());
  const [meId, , meLoaded] = usePersistentState<string | null>(
    STORE_KEYS.me,
    null,
  );

  // Wait for the current-user id to hydrate so a new task defaults to me,
  // not to unassigned. The editor itself only hydrates once, so a premature
  // null would stick.
  if (!meLoaded) {
    return <div className="mx-auto max-w-3xl pt-6 pb-32" />;
  }

  return (
    <TaskEditor
      createDefaults={{
        id: idRef.current,
        status: statusRef.current,
        assigneeId: meId,
      }}
    />
  );
}
