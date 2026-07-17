import { NextRequest, NextResponse } from "next/server";
import { currentMember, serverMode } from "@/lib/auth";
import { isConfigured } from "@/lib/env";

/**
 * POST /api/github/lookup { url } — real repo metadata for a github.com link:
 * name, description, primary language + topics (→ stack), stars.
 * Works unauthenticated for public repos (60 req/h per IP); add
 * GITHUB_CLIENT_ID/SECRET for the 5000 req/h lane.
 */

function parseGithubUrl(raw: string): { owner: string; repo: string } | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!/(^|\.)github\.com$/i.test(u.hostname)) return null;
    const [owner, repo] = u.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return null;
    return { owner, repo: repo.replace(/\.git$/i, "") };
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!serverMode()) {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (!(await currentMember())) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    url?: string;
  } | null;
  const parsed = body?.url ? parseGithubUrl(body.url.trim()) : null;
  if (!parsed) {
    return NextResponse.json(
      { error: "that's not a github.com repo link" },
      { status: 400 },
    );
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "dexters-lab",
  };
  if (isConfigured("github")) {
    headers.Authorization =
      "Basic " +
      Buffer.from(
        `${process.env.GITHUB_CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`,
      ).toString("base64");
  }

  try {
    const res = await fetch(
      `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
      { headers, cache: "no-store" },
    );
    if (res.status === 404) {
      return NextResponse.json(
        { error: "repo not found — private repos need a GitHub key" },
        { status: 404 },
      );
    }
    if (res.status === 403 || res.status === 429) {
      return NextResponse.json(
        { error: "GitHub rate limit hit — try again in a bit" },
        { status: 429 },
      );
    }
    if (!res.ok) {
      return NextResponse.json({ error: "GitHub error" }, { status: 502 });
    }
    const data = (await res.json()) as {
      full_name?: string;
      html_url?: string;
      description?: string | null;
      language?: string | null;
      topics?: string[];
      stargazers_count?: number;
      default_branch?: string;
    };
    const stack = [data.language, ...(data.topics ?? [])]
      .filter((s): s is string => Boolean(s))
      .map((s) => s.toLowerCase());
    return NextResponse.json({
      name: data.full_name ?? `${parsed.owner}/${parsed.repo}`,
      url: data.html_url ?? `https://github.com/${parsed.owner}/${parsed.repo}`,
      description: data.description ?? "",
      stack: [...new Set(stack)].slice(0, 6),
      stars: data.stargazers_count ?? 0,
    });
  } catch {
    return NextResponse.json(
      { error: "couldn't reach GitHub" },
      { status: 502 },
    );
  }
}
