import { NextResponse } from "next/server";
import { SERVICES, serviceStatus, aiProvider, type ServiceKey } from "@/lib/env";

/** GET /api/status — which external services are configured (presence only). */
export async function GET() {
  const status = serviceStatus();
  return NextResponse.json({
    services: (Object.keys(SERVICES) as ServiceKey[]).map((key) => ({
      key,
      label: SERVICES[key].label,
      purpose: SERVICES[key].purpose,
      phase: SERVICES[key].phase,
      configured: status[key],
    })),
    aiProvider: aiProvider(),
  });
}
