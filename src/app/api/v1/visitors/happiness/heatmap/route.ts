import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { mockLatency } from "@/lib/mock/generator";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getHappinessHeatmap } from "@/lib/services/visitors";

/** GET /api/v1/visitors/happiness/heatmap — happiness index by day and hour. */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await mockLatency();
  return NextResponse.json(getHappinessHeatmap(parsed.query));
}
