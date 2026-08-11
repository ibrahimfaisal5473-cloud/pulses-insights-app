import "server-only";
import { query } from "@/lib/db/client";
import type {
  JourneyPhaseId,
  Zone,
  ZonesHappinessTimeseriesResponse,
  ZonesResponse,
  ZonesTimeseriesResponse,
} from "@/types";
import type { ParsedVisitorsQuery } from "../params";
import { localBucket, num, scopeParams, truncUnit } from "./scope";
import { STOPS } from "./stops";

/**
 * Zone analytics from real pulses.
 *
 * `id` is the database zone_id as a string. Zone CODES are only unique within
 * a location, so the surrogate key is what the API exposes — precisely why the
 * primary key is a meaningless integer rather than the human-readable code.
 *
 * `totalVisitors` is the sum of DAILY unique visitors, not distinct people over
 * the whole range. A person who used the cafe on twenty days counts twenty
 * times. That is deliberate: this figure drives the treemap and the footfall
 * ranking, both of which describe traffic and frequency rather than headcount.
 * Distinct-over-range would make a daily commuter indistinguishable from a
 * one-off visitor.
 */
export async function getZones(q: ParsedVisitorsQuery): Promise<ZonesResponse> {
  const rows = await query<Record<string, string>>(
    // Counts people, so it reads the pre-sessionized stops rather than the
    // hourly cells: distinct visitors cannot be summed across hour buckets
    // without counting anyone who stayed past the hour twice.
    `${STOPS},
     per_zone_day AS (
       SELECT zone_id, zone_name, phase,
              ${localBucket("day", "entered_at")} AS day,
              count(DISTINCT face_id) AS visitors
       FROM stops
       GROUP BY zone_id, zone_name, phase, 4
     ),
     zone_sentiment AS (
       -- sum(score x samples) / sum(samples) reproduces the detection-weighted
       -- average exactly, because each stop already stores its own mean and the
       -- number of readings behind it.
       SELECT zone_id,
              sum(checks) AS happiness_checks,
              sum(happiness * checks) / NULLIF(sum(checks), 0) AS happiness
       FROM stops GROUP BY zone_id
     ),
     per_zone AS (
       SELECT d.zone_id, d.zone_name, d.phase,
              sum(d.visitors) AS visitors,
              max(s.happiness_checks) AS happiness_checks,
              max(s.happiness) AS happiness
       FROM per_zone_day d JOIN zone_sentiment s USING (zone_id)
       GROUP BY d.zone_id, d.zone_name, d.phase
     )
     SELECT zone_id, zone_name, phase, visitors, happiness_checks,
            round(coalesce(happiness, 0), 1) AS happiness,
            -- Share of the SUM of per-zone visitor counts, so the values total
            -- 100% across zones — that is what the UI's "% of total" label
            -- means, and it is the shape the mock service returned.
            --
            -- Note this is a share of zone visits, not of people: one person
            -- passing through four zones contributes to four of these counts.
            -- Dividing by unique site visitors instead would be a different
            -- (also valid) metric, but the rows would not sum to 100% and the
            -- entrance would always read 100%.
            round(100.0 * visitors / NULLIF(SUM(visitors) OVER (), 0), 1) AS pct
     FROM per_zone
     ORDER BY visitors DESC`,
    scopeParams(q),
  );

  const zones: Zone[] = rows.map((r) => ({
    id: String(r.zone_id),
    name: r.zone_name,
    phase: r.phase as JourneyPhaseId,
    totalVisitors: num(r.visitors),
    percentOfTotal: num(r.pct),
    happiness: num(r.happiness),
    happinessChecks: num(r.happiness_checks),
  }));

  return { zones };
}

/**
 * Unique visitors per zone over time.
 *
 * The response carries a `zones` legend plus one row per bucket, with counts
 * keyed by zone id. Zones missing from a bucket are filled with zero so the
 * chart keeps a stable set of series rather than lines vanishing mid-range.
 */
export async function getZonesTimeseries(
  q: ParsedVisitorsQuery,
): Promise<ZonesTimeseriesResponse> {
  const unit = truncUnit(q.granularity);

  const rows = await query<Record<string, string>>(
    `${STOPS}
     SELECT ${localBucket(unit, "entered_at")} AS bucket, zone_id, zone_name,
            count(DISTINCT face_id) AS visitors
     FROM stops GROUP BY 1, 2, 3 ORDER BY 1`,
    scopeParams(q),
  );

  return buildZoneSeries(rows, (r) => num(r.visitors));
}

/** Happiness per zone over time, with the sample size behind each value. */
export async function getZonesHappinessTimeseries(
  q: ParsedVisitorsQuery,
): Promise<ZonesHappinessTimeseriesResponse> {
  const unit = truncUnit(q.granularity);

  const rows = await query<Record<string, string>>(
    `${STOPS}
     SELECT ${localBucket(unit, "entered_at")} AS bucket, zone_id, zone_name,
            round(sum(happiness * checks) / NULLIF(sum(checks), 0), 1) AS happiness,
            sum(checks) AS checks
     FROM stops WHERE checks > 0
     GROUP BY 1, 2, 3 ORDER BY 1`,
    scopeParams(q),
  );

  const { zones, timeseries } = buildZoneSeries(rows, (r) => ({
    happiness: num(r.happiness),
    // Flagged rather than hidden: the UI dims thin cells so a viewer can see
    // both the value and the fact that it rests on very little data.
    checks: num(r.checks),
  }));

  return { zones, timeseries } as ZonesHappinessTimeseriesResponse;
}

/** Pivot (bucket, zone) rows into one entry per bucket keyed by zone id. */
function buildZoneSeries<V>(
  rows: Record<string, string>[],
  value: (r: Record<string, string>) => V,
) {
  const zones = new Map<string, string>();
  const buckets = new Map<string, Record<string, V>>();

  for (const r of rows) {
    zones.set(r.zone_id, r.zone_name);
    const time = new Date(r.bucket).toISOString();
    const entry = buckets.get(time) ?? {};
    entry[r.zone_id] = value(r);
    buckets.set(time, entry);
  }

  const zoneList = [...zones.entries()].map(([id, name]) => ({ id, name }));
  const empty = (typeof value({} as Record<string, string>) === "object"
    ? { happiness: 0, checks: 0 }
    : 0) as V;

  const timeseries = [...buckets.entries()].map(([time, entry]) => {
    const filled: Record<string, V> = {};
    for (const { id } of zoneList) filled[id] = entry[id] ?? empty;
    return { time, zones: filled };
  });

  return { zones: zoneList, timeseries } as never;
}
