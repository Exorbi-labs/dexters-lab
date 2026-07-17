import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyPayload,
  PENDING_COOKIE,
  type PendingProfile,
} from "@/lib/auth";

/** GET /api/auth/pending — the Google profile waiting to finish onboarding. */
export async function GET() {
  const store = await cookies();
  const pending = verifyPayload<PendingProfile>(
    store.get(PENDING_COOKIE)?.value,
  );
  return NextResponse.json({
    pending: pending ? { name: pending.name, email: pending.email } : null,
  });
}
