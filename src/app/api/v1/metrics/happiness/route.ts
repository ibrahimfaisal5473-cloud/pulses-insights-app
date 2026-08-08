import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseMetricFilters } from "@/lib/db/params";
import { getHappiness } from "@/lib/db/metrics";

/**
 * GET /api/v1/metrics/happiness
 *
 * Happiness index (happy 100, neutral 50, sad 0) overall, per zone, and daily.
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseMetricFilters(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getHappiness(parsed.filters));
  } catch (err) {
    console.error("[api] /metrics/happiness", err);
    return NextResponse.json({ error: "Failed to compute happiness index" }, { status: 500 });
  }
}
