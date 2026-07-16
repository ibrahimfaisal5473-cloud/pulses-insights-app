import type { ZonesResponse } from "@/types";
import { eachDay, zoneDayVisitors } from "@/lib/mock/generator";
import { MOCK_ZONES } from "@/lib/mock/zones";
import type { ParsedVisitorsQuery } from "./params";

/** Zone list with visitor totals over the selected range. */
export function getZones(q: ParsedVisitorsQuery): ZonesResponse {
  const days = eachDay(q.start, q.end);

  const totals = MOCK_ZONES.map((zone) => ({
    zone,
    total: days.reduce((sum, day) => sum + zoneDayVisitors(day, zone), 0),
  }));
  const grandTotal = totals.reduce((sum, t) => sum + t.total, 0) || 1;

  return {
    zones: totals.map(({ zone, total }) => ({
      id: zone.id,
      name: zone.name,
      totalVisitors: total,
      percentOfTotal: Math.round((total / grandTotal) * 1000) / 10,
    })),
  };
}
