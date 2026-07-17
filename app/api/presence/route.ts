import { NextResponse } from "next/server";
import { serverMode, currentMember } from "@/lib/auth";
import { redis, redisConfigured } from "@/lib/redis";

/**
 * /api/presence — who's in the lab right now.
 * One sorted set: member id scored by last-heartbeat ms. Online = beat within
 * the last 60s. POST = heartbeat + read back; GET = read only.
 * online: null when Redis isn't configured — clients go dormant.
 */

const KEY = "dex:presence";
const ONLINE_WINDOW_MS = 60_000;

async function onlineIds(): Promise<string[]> {
  const now = Date.now();
  await redis("ZREMRANGEBYSCORE", KEY, 0, now - 10 * ONLINE_WINDOW_MS);
  return (await redis(
    "ZRANGEBYSCORE",
    KEY,
    now - ONLINE_WINDOW_MS,
    "+inf",
  )) as string[];
}

export async function GET() {
  if (!serverMode() || !redisConfigured()) {
    return NextResponse.json({ online: null });
  }
  if (!(await currentMember())) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }
  try {
    return NextResponse.json({ online: await onlineIds() });
  } catch {
    return NextResponse.json({ online: null });
  }
}

export async function POST() {
  if (!serverMode() || !redisConfigured()) {
    return NextResponse.json({ online: null });
  }
  const member = await currentMember();
  if (!member) {
    return NextResponse.json({ error: "signed out" }, { status: 401 });
  }
  try {
    await redis("ZADD", KEY, Date.now(), member.id);
    return NextResponse.json({ online: await onlineIds() });
  } catch {
    return NextResponse.json({ online: null });
  }
}
