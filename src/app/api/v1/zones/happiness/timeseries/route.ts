import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getZonesHappinessTimeseries } from "@/lib/services/live/zones";

/** GET /api/v1/zones/happiness/timeseries — happiness per zone over time. Reads live from PostgreSQL. */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getZonesHappinessTimeseries(parsed.query));
  } catch (err) {
    console.error("[api] /zones/happiness/timeseries", err);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
