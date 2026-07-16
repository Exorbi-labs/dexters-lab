"use client";

import { useParams } from "next/navigation";
import { SnippetEditor } from "../snippet-editor";

export default function SnippetPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  return <SnippetEditor existingId={id} />;
}
