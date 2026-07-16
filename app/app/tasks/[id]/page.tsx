"use client";

import { useParams } from "next/navigation";
import { TaskEditor } from "../task-editor";

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return <TaskEditor taskId={id} />;
}
