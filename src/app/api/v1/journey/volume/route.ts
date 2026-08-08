import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getJourneyVolume } from "@/lib/services/live/journeys";

/** GET /api/v1/journey/volume — transitions and occupancy by hour. Reads live from PostgreSQL. */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getJourneyVolume(parsed.query));
  } catch (err) {
    console.error("[api] /journey/volume", err);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
