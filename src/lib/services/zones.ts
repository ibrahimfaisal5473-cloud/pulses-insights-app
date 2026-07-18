import type {
  ZonesHappinessTimeseriesResponse,
  ZonesResponse,
  ZonesTimeseriesResponse,
} from "@/types";
import {
  cohortDayVisitors,
  cohortHappinessOffset,
  eachDay,
  resolveZones,
  zoneDayChecks,
  zoneDayHappiness,
} from "@/lib/mock/generator";
import { MOCK_ZONES } from "@/lib/mock/zones";
import type { ParsedVisitorsQuery } from "./params";

/**
 * A zone's happiness for a day, shifted by whichever demographic cohort is
 * selected — so narrowing to a segment moves the zone grid the same way it
 * moves the site-wide score.
 */
function cohortZoneHappiness(
  day: string,
  zone: Parameters<typeof zoneDayHappiness>[1],
  q: ParsedVisitorsQuery,
): number {
  const shifted = zoneDayHappiness(day, zone) + cohortHappinessOffset(q);
  return Math.round(Math.min(97, Math.max(68, shifted)) * 10) / 10;
}

/** Zone list with visitor totals and average happiness over the selected range. */
export function getZones(q: ParsedVisitorsQuery): ZonesResponse {
  const days = eachDay(q.start, q.end);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const totals = MOCK_ZONES.map((zone) => {
    const checks = days.reduce((sum, day) => sum + zoneDayChecks(day, zone), 0);

    // Check-weighted, so a near-empty day can't swing the average as hard as a
    // busy one — and so this agrees with the per-day grid it sits above.
    const weighted = days.reduce(
      (sum, day) => sum + cohortZoneHappiness(day, zone, q) * zoneDayChecks(day, zone),
      0,
    );

    return {
      zone,
      total: days.reduce((sum, day) => sum + cohortDayVisitors(day, zone, q), 0),
      happiness: round1(checks > 0 ? weighted / checks : 0),
      checks,
    };
  });
  const grandTotal = totals.reduce((sum, t) => sum + t.total, 0) || 1;

  return {
    zones: totals.map(({ zone, total, happiness, checks }) => ({
      id: zone.id,
      name: zone.name,
      phase: zone.phase,
      totalVisitors: total,
      percentOfTotal: Math.round((total / grandTotal) * 1000) / 10,
      happiness,
      happinessChecks: checks,
    })),
  };
}

/** Daily happiness index per zone, with the sample size behind each value. */
export function getZonesHappinessTimeseries(
  q: ParsedVisitorsQuery,
): ZonesHappinessTimeseriesResponse {
  const zones = resolveZones(q.zoneIds);

  return {
    zones: zones.map((z) => ({ id: z.id, name: z.name })),
    timeseries: eachDay(q.start, q.end).map((day) => ({
      time: `${day}T00:00:00Z`,
      zones: Object.fromEntries(
        zones.map((zone) => [
          zone.id,
          {
            happiness: cohortZoneHappiness(day, zone, q),
            checks: zoneDayChecks(day, zone),
          },
        ]),
      ),
    })),
  };
}

/** Daily visitor counts broken down by zone. */
export function getZonesTimeseries(
  q: ParsedVisitorsQuery,
): ZonesTimeseriesResponse {
  const zones = resolveZones(q.zoneIds);

  return {
    zones: zones.map((z) => ({ id: z.id, name: z.name })),
    timeseries: eachDay(q.start, q.end).map((day) => ({
      time: `${day}T00:00:00Z`,
      zones: Object.fromEntries(
        zones.map((zone) => [zone.id, cohortDayVisitors(day, zone, q)]),
      ),
    })),
  };
}
