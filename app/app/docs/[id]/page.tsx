"use client";

/**
 * Existing doc — loads by route param, edits autosave through the shared editor,
 * and a quiet danger zone deletes it (guarded against a late autosave) then
 * routes back to the list.
 */

import { useParams, useRouter } from "next/navigation";
import { DocEditor } from "../doc-editor";

export default function DocPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <DocEditor
      docId={id}
      mode="existing"
      onDeleted={() => router.push("/app/docs")}
    />
  );
}
