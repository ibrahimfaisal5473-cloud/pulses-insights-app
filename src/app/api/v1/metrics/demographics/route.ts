import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseMetricFilters } from "@/lib/db/params";
import { getDemographics } from "@/lib/db/metrics";

/**
 * GET /api/v1/metrics/demographics
 *
 * Gender and age-band distribution. Both are resolved to one value per person
 * BEFORE counting, so the result measures people rather than dwell time.
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseMetricFilters(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getDemographics(parsed.filters));
  } catch (err) {
    console.error("[api] /metrics/demographics", err);
    return NextResponse.json({ error: "Failed to compute demographics" }, { status: 500 });
  }
}
