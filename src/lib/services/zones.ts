import type { ZonesResponse } from "@/types";
import { dayHappiness, eachDay, zoneDayVisitors } from "@/lib/mock/generator";
import { MOCK_ZONES } from "@/lib/mock/zones";
import type { ParsedVisitorsQuery } from "./params";

/** Zone list with visitor totals and average happiness over the selected range. */
export function getZones(q: ParsedVisitorsQuery): ZonesResponse {
  const days = eachDay(q.start, q.end);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const totals = MOCK_ZONES.map((zone) => ({
    zone,
    total: days.reduce((sum, day) => sum + zoneDayVisitors(day, zone), 0),
    happiness: round1(
      days.reduce((sum, day) => sum + dayHappiness(day, [zone]), 0) /
        (days.length || 1),
    ),
  }));
  const grandTotal = totals.reduce((sum, t) => sum + t.total, 0) || 1;

  return {
    zones: totals.map(({ zone, total, happiness }) => ({
      id: zone.id,
      name: zone.name,
      totalVisitors: total,
      percentOfTotal: Math.round((total / grandTotal) * 1000) / 10,
      happiness,
    })),
  };
}
