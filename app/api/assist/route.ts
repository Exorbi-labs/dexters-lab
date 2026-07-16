import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { aiProvider } from "@/lib/env";

/**
 * POST /api/assist — team writing helper (draft a doc, summarize, explain code).
 * Body: { task: "draft" | "summarize" | "explain", prompt: string, context?: string }
 * Returns: { text }  — plain markdown-ish text.
 *
 * Two provider lanes auto-picked by which key exists (Claude preferred; force
 * with DEX_AI_PROVIDER). Degrades to 503 with a friendly message when neither
 * key is set, so the UI can lock the button instead of failing on click.
 */

const SYSTEMS: Record<string, string> = {
  draft:
    "You are a sharp writing partner for a small product/engineering team's shared workspace. Draft a clear, well-structured document from the user's prompt. Use short headings and tight prose. Return markdown-ish text only, no preamble.",
  summarize:
    "You summarize team notes and threads into a crisp brief: 3-6 bullet points plus a one-line takeaway. Return text only, no preamble.",
  explain:
    "You are a senior engineer explaining code to teammates. Explain what the given code does, its key ideas, and any gotchas, concisely. Return text only, no preamble.",
};

async function withAnthropic(system: string, user: string): Promise<string> {
  const client = new Anthropic();
  const res = await client.messages.create({
    model: process.env.DEX_ASSIST_MODEL ?? "claude-opus-4-8",
    max_tokens: 1500,
    system,
    messages: [{ role: "user", content: user }],
  });
  if (res.stop_reason === "refusal") throw new Error("refusal");
  return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
}

async function withDeepseek(system: string, user: string): Promise<string> {
  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.DEX_ASSIST_MODEL ?? "deepseek-v4-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 1500,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`deepseek ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(request: Request) {
  const provider = aiProvider();
  if (!provider) {
    return NextResponse.json(
      { error: "no_api_key", message: "Add DEEPSEEK_API_KEY or ANTHROPIC_API_KEY to .env.local to enable AI assist." },
      { status: 503 },
    );
  }

  let body: { task?: string; prompt?: string; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const system = SYSTEMS[body.task ?? "draft"] ?? SYSTEMS.draft;
  const prompt = body.prompt?.trim();
  if (!prompt) return NextResponse.json({ error: "empty_prompt" }, { status: 400 });
  const user = body.context ? `${prompt}\n\n---\nContext:\n${body.context}` : prompt;

  try {
    const text =
      provider === "anthropic"
        ? await withAnthropic(system, user)
        : await withDeepseek(system, user);
    if (!text.trim()) return NextResponse.json({ error: "empty_result" }, { status: 502 });
    return NextResponse.json({ text, provider });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "bad_api_key" }, { status: 503 });
    }
    console.error("assist route error", err);
    return NextResponse.json({ error: "assist_failed" }, { status: 502 });
  }
}
