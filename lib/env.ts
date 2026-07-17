/**
 * Dexter's Lab service configuration — the single place that knows which
 * external services are wired up. Server-side only.
 * Add real keys in .env.local (see .env.example). Features degrade honestly
 * when a service is unconfigured — nothing crashes.
 */

export type ServiceKey =
  | "postgres"
  | "redis"
  | "deepseek"
  | "anthropic"
  | "google"
  | "github";

export const SERVICES: Record<
  ServiceKey,
  { label: string; purpose: string; phase: string; env: string[] }
> = {
  postgres: {
    label: "Postgres",
    purpose: "Real database — replaces browser storage, syncs the team",
    phase: "phase 1",
    env: ["DATABASE_URL"],
  },
  redis: {
    label: "Redis",
    purpose: "Presence — who's in the lab right now",
    phase: "phase 3",
    env: ["UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"],
  },
  deepseek: {
    label: "DeepSeek API",
    purpose: "Budget AI lane — draft docs, summarize threads",
    phase: "now",
    env: ["DEEPSEEK_API_KEY"],
  },
  anthropic: {
    label: "Claude API",
    purpose: "Quality AI lane — draft docs, explain code",
    phase: "now",
    env: ["ANTHROPIC_API_KEY"],
  },
  google: {
    label: "Google OAuth",
    purpose: "Team sign-in (one workspace, many members)",
    phase: "phase 1",
    env: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
  },
  github: {
    label: "GitHub",
    purpose: "Link repos + pull code into the codebase library",
    phase: "phase 2",
    env: ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET"],
  },
};

export function isConfigured(key: ServiceKey): boolean {
  return SERVICES[key].env.every((v) => Boolean(process.env[v]?.trim()));
}

export function serviceStatus(): Record<ServiceKey, boolean> {
  return Object.fromEntries(
    (Object.keys(SERVICES) as ServiceKey[]).map((k) => [k, isConfigured(k)]),
  ) as Record<ServiceKey, boolean>;
}

/** Which AI provider should assist routes use? */
export function aiProvider(): "deepseek" | "anthropic" | null {
  const forced = process.env.DEX_AI_PROVIDER?.toLowerCase();
  if (forced === "deepseek" && isConfigured("deepseek")) return "deepseek";
  if (forced === "anthropic" && isConfigured("anthropic")) return "anthropic";
  if (isConfigured("anthropic")) return "anthropic";
  if (isConfigured("deepseek")) return "deepseek";
  return null;
}
