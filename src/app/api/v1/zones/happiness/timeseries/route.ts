import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { mockLatency } from "@/lib/mock/generator";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getZonesHappinessTimeseries } from "@/lib/services/zones";

/** GET /api/v1/zones/happiness/timeseries — daily happiness per zone. */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await mockLatency();
  return NextResponse.json(getZonesHappinessTimeseries(parsed.query));
}
