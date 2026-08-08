import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getUnhappyJourneys } from "@/lib/services/live/dissatisfied";

/** GET /api/v1/dissatisfied/journeys — paths that repeatedly produce unhappy visits. Reads live from PostgreSQL. */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getUnhappyJourneys(parsed.query));
  } catch (err) {
    console.error("[api] /dissatisfied/journeys", err);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
