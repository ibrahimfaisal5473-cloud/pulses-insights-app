import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseMetricFilters } from "@/lib/db/params";
import { getJourneys } from "@/lib/db/metrics";

/**
 * GET /api/v1/metrics/journeys
 *
 * Zone-to-zone transitions — the source data for a Sankey flow diagram.
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseMetricFilters(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getJourneys(parsed.filters));
  } catch (err) {
    console.error("[api] /metrics/journeys", err);
    return NextResponse.json({ error: "Failed to compute journeys" }, { status: 500 });
  }
}
