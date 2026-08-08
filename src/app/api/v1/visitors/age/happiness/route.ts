import { NextResponse, type NextRequest } from "next/server";
import { requireApiSession } from "@/lib/auth/guard";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getAgeHappiness } from "@/lib/services/live/visitors";

/** GET /api/v1/visitors/age/happiness — average happiness per age band. Reads live from PostgreSQL. */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    return NextResponse.json(await getAgeHappiness(parsed.query));
  } catch (err) {
    console.error("[api] /visitors/age/happiness", err);
    return NextResponse.json({ error: "Failed to load data" }, { status: 500 });
  }
}
