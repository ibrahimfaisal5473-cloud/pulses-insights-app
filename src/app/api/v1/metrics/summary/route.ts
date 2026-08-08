import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseMetricFilters } from "@/lib/db/params";
import { getSummary } from "@/lib/db/metrics";

/**
 * GET /api/v1/metrics/summary
 *
 * Detections vs visits vs visitors — the same rows counted at three grains.
 * Filters: from, to, site, zone, sessionGapMinutes
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseMetricFilters(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getSummary(parsed.filters));
  } catch (err) {
    // Log the detail server-side; return a generic message. Database errors can
    // leak schema information, so they never reach the client verbatim.
    console.error("[api] /metrics/summary", err);
    return NextResponse.json({ error: "Failed to compute summary" }, { status: 500 });
  }
}
