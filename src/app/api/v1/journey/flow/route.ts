import { NextResponse, type NextRequest } from "next/server";
import {
  JOURNEY_GROUP_BY,
  JOURNEY_TIME_OF_DAY,
  type JourneyGroupBy,
  type JourneyTimeOfDay,
} from "@/types";
import { requireApiSession } from "@/lib/auth/guard";
import { mockLatency } from "@/lib/mock/generator";
import { parseVisitorsQuery } from "@/lib/services/params";
import { getJourneyFlow } from "@/lib/services/journeys";

/**
 * GET /api/v1/journey/flow — visitor flow between journey phases (`groupBy=type`)
 * or between zones stop by stop (`groupBy=zone`), optionally sliced by
 * `timeOfDay` (all | morning | afternoon | evening).
 */
export async function GET(request: NextRequest) {
  const denied = await requireApiSession();
  if (denied) return denied;

  const parsed = parseVisitorsQuery(request.nextUrl.searchParams);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const groupBy = request.nextUrl.searchParams.get("groupBy") ?? "type";
  if (!JOURNEY_GROUP_BY.includes(groupBy as JourneyGroupBy)) {
    return NextResponse.json(
      { error: `groupBy must be one of: ${JOURNEY_GROUP_BY.join(", ")}` },
      { status: 400 },
    );
  }

  const timeOfDay = request.nextUrl.searchParams.get("timeOfDay") ?? "all";
  if (!JOURNEY_TIME_OF_DAY.includes(timeOfDay as JourneyTimeOfDay)) {
    return NextResponse.json(
      { error: `timeOfDay must be one of: ${JOURNEY_TIME_OF_DAY.join(", ")}` },
      { status: 400 },
    );
  }

  await mockLatency();
  return NextResponse.json(
    getJourneyFlow(parsed.query, {
      groupBy: groupBy as JourneyGroupBy,
      timeOfDay: timeOfDay as JourneyTimeOfDay,
    }),
  );
}
