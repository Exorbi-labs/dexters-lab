"use client";

/**
 * New doc — never navigates while typing. A stable id is minted once on mount;
 * the shared editor lazily upserts under it after the first non-empty keystroke.
 * The optional ?parent=<id> query nests the new doc under an existing one.
 */

import { useEffect, useRef, useState } from "react";
import { uid } from "@/lib/model";
import { DocEditor } from "../doc-editor";

export default function NewDocPage() {
  const idRef = useRef<string>(uid());
  const [parentId, setParentId] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setParentId(params.get("parent"));
  }, []);

  return (
    <DocEditor docId={idRef.current} initialParentId={parentId} mode="new" />
  );
}
