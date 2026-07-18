import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { mockLatency } from "@/lib/mock/generator";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getDissatisfiedByHour } from "@/lib/services/dissatisfied";

/** GET /api/v1/dissatisfied/by-hour — dissatisfied visitors by hour of day. */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  await mockLatency();
  return NextResponse.json(getDissatisfiedByHour(parsed.query));
}
