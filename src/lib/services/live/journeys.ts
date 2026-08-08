import "server-only";
import { query, queryOne } from "@/lib/db/client";
import type {
  CommonJourneysResponse,
  DwellByZoneResponse,
  DwellSentimentResponse,
  JourneyFlowLink,
  JourneyFlowNode,
  JourneyFlowResponse,
  JourneyGroupBy,
  JourneyStats,
  JourneyTimeOfDay,
  JourneyVolumeResponse,
  ThresholdTrackerResponse,
} from "@/types";
import { EXPERIENCE_THRESHOLD_MINUTES, JOURNEY_PHASES } from "@/types";
import type { ParsedVisitorsQuery } from "../params";
import { num, scopeParams } from "./scope";
import { STOPS } from "./stops";

/**
 * Journey analytics from real pulses.
 *
 * Everything here reads the `stops` and `visits` relations built in ./stops —
 * a person's detections split into visits by a gap in time, then collapsed into
 * one row per zone arrival. That shared foundation is why these queries stay
 * readable despite answering quite different questions.
 */

const PHASE_NAME = new Map(JOURNEY_PHASES.map((p) => [p.id as string, p.name as string]));

/**
 * Restrict to visits that started in a slice of the day.
 *
 * Applied to the visit's START time rather than each detection, so a visit is
 * counted whole in the slice it began — otherwise a lunchtime visit spanning
 * 11:30–12:30 would be split across two slices and counted twice.
 */
function timeOfDayFilter(slice: JourneyTimeOfDay): string {
  const hour = "EXTRACT(hour FROM v.started_at AT TIME ZONE v.site_tz)";
  switch (slice) {
    case "morning":
      return `AND ${hour} < 12`;
    case "afternoon":
      return `AND ${hour} >= 12 AND ${hour} < 17`;
    case "evening":
      return `AND ${hour} >= 17`;
    default:
      return "";
  }
}

// ---------------------------------------------------------------------------
// Headline stats
// ---------------------------------------------------------------------------

export async function getJourneyStats(q: ParsedVisitorsQuery): Promise<JourneyStats> {
  const row = await queryOne<Record<string, string>>(
    `${STOPS}
     SELECT round(avg(zone_count)::numeric, 1)   AS avg_zones,
            round(avg(total_minutes)::numeric, 1) AS avg_minutes,
            round(100.0 * count(*) FILTER (WHERE reached_service) / NULLIF(count(*), 0), 1) AS reach_pct,
            round(100.0 * count(*) FILTER (WHERE total_minutes > ${EXPERIENCE_THRESHOLD_MINUTES})
                  / NULLIF(count(*), 0), 1) AS exceed_pct
     FROM visits`,
    scopeParams(q),
  );

  return {
    avgZonesPerJourney: num(row?.avg_zones),
    avgDwellMinutes: num(row?.avg_minutes),
    reachServicePct: num(row?.reach_pct),
    thresholdMinutes: EXPERIENCE_THRESHOLD_MINUTES,
    exceedThresholdPct: num(row?.exceed_pct),
  };
}

// ---------------------------------------------------------------------------
// Flow diagram (Sankey)
// ---------------------------------------------------------------------------

/**
 * Visitor flow, either between journey phases or between individual zones.
 *
 * Nodes sit in columns ordered by journey phase, so the diagram reads left to
 * right the way a visit actually unfolds. Only forward transitions become
 * links: a Sankey has to be acyclic, and someone wandering back from the cafe
 * to their desk would otherwise draw a right-to-left ribbon. Those movements
 * are real, so they are counted in `hiddenFlows` rather than silently dropped.
 */
export async function getJourneyFlow(
  q: ParsedVisitorsQuery,
  opts: { groupBy: JourneyGroupBy; timeOfDay: JourneyTimeOfDay } = {
    groupBy: "type",
    timeOfDay: "all",
  },
): Promise<JourneyFlowResponse> {
  const byZone = opts.groupBy === "zone";

  // Ordered stops for each visit. The graph is assembled in TypeScript rather
  // than SQL because the collapsing rule below is far clearer as a loop, and
  // this is a few tens of thousands of rows, not millions.
  const rows = await query<Record<string, string>>(
    `${STOPS},
     scoped_visits AS (
       SELECT v.face_id, v.visit_no FROM visits v
       WHERE true ${timeOfDayFilter(opts.timeOfDay)}
     )
     SELECT s.face_id, s.visit_no, s.stop_no,
            s.zone_id::text AS zone_id, s.zone_name, s.phase,
            s.happiness, s.checks
     FROM stops s
     JOIN scoped_visits sv USING (face_id, visit_no)
     ORDER BY s.face_id, s.visit_no, s.stop_no`,
    scopeParams(q),
  );

  type Agg = {
    id: string;
    name: string;
    column: number;
    visitors: number;
    fromFunnel: number;
    startedHere: number;
    weight: number;
    checks: number;
    contributors: Map<string, { id: string; name: string; fromFunnel: number; startedHere: number }>;
  };

  const nodes = new Map<string, Agg>();
  const links = new Map<
    string,
    { source: string; target: string; value: number; weight: number; checks: number }
  >();

  const MAX_COLUMNS = 5;

  // Group the flat row list back into one ordered path per visit.
  type Step = { key: string; zoneId: string; zoneName: string; phase: string; weight: number; checks: number };
  const visitsSeen: Step[][] = [];
  let current: Step[] = [];
  let currentKey = "";

  for (const r of rows) {
    const visitKey = `${r.face_id}#${r.visit_no}`;
    if (visitKey !== currentKey) {
      if (current.length > 0) visitsSeen.push(current);
      current = [];
      currentKey = visitKey;
    }

    const checks = num(r.checks);
    const step: Step = {
      key: byZone ? r.zone_id : r.phase,
      zoneId: r.zone_id,
      zoneName: r.zone_name,
      phase: r.phase,
      weight: num(r.happiness) * checks,
      checks,
    };

    // Collapse consecutive steps that resolve to the SAME node.
    //
    // In phase mode this is what stops "desk -> cafe -> desk" from being three
    // separate Activity entries with two undrawable same-column ribbons between
    // them. At the phase level that wandering IS one stretch of Activity, so
    // merging it is the honest model rather than a workaround — and it is why
    // the diagram no longer discards the building's most common movement.
    const last = current[current.length - 1];
    if (last && last.key === step.key) {
      last.weight += step.weight;
      last.checks += step.checks;
    } else {
      current.push(step);
    }
  }
  if (current.length > 0) visitsSeen.push(current);

  let hiddenFlows = 0;

  for (const path of visitsSeen) {
    // Column is the position in the visit, which guarantees every ribbon runs
    // strictly left to right — a Sankey has to be acyclic. Anything past the
    // fifth stop is beyond what the diagram can show legibly.
    const steps = path.slice(0, MAX_COLUMNS);
    hiddenFlows += Math.max(0, path.length - MAX_COLUMNS);

    steps.forEach((step, column) => {
      const id = `${step.key}@${column}`;

      let node = nodes.get(id);
      if (!node) {
        node = {
          id,
          name: byZone ? step.zoneName : (PHASE_NAME.get(step.phase) ?? step.phase),
          column,
          visitors: 0,
          fromFunnel: 0,
          startedHere: 0,
          weight: 0,
          checks: 0,
          contributors: new Map(),
        };
        nodes.set(id, node);
      }

      node.visitors += 1;
      node.weight += step.weight;
      node.checks += step.checks;
      if (column === 0) node.startedHere += 1;
      else node.fromFunnel += 1;

      const contrib = node.contributors.get(step.zoneId) ?? {
        id: step.zoneId,
        name: step.zoneName,
        fromFunnel: 0,
        startedHere: 0,
      };
      if (column === 0) contrib.startedHere += 1;
      else contrib.fromFunnel += 1;
      node.contributors.set(step.zoneId, contrib);

      const next = steps[column + 1];
      if (!next) return;

      const targetId = `${next.key}@${column + 1}`;
      const lk = `${id}->${targetId}`;
      const link = links.get(lk) ?? { source: id, target: targetId, value: 0, weight: 0, checks: 0 };
      link.value += 1;
      link.weight += step.weight;
      link.checks += step.checks;
      links.set(lk, link);
    });
  }

  const outNodes: JourneyFlowNode[] = [...nodes.values()]
    .sort((a, b) => a.column - b.column || b.visitors - a.visitors)
    .map((n) => ({
      id: n.id,
      name: n.name,
      column: n.column,
      visitors: n.visitors,
      fromFunnel: n.fromFunnel,
      startedHere: n.startedHere,
      happiness: n.checks ? +(n.weight / n.checks).toFixed(1) : 0,
      contributors: [...n.contributors.values()].sort(
        (a, b) => b.fromFunnel + b.startedHere - (a.fromFunnel + a.startedHere),
      ),
    }));

  const visitorsById = new Map(outNodes.map((n) => [n.id, n.visitors]));

  // Genuinely tiny ribbons are pruned — that is what "minor flows hidden" means
  // to a reader, and a Sankey with a hundred hairline links is unreadable.
  const allLinks = [...links.values()].sort((a, b) => b.value - a.value);
  const cutoff = Math.max(2, (visitsSeen.length || 0) * 0.002);
  const kept = allLinks.filter((l) => l.value >= cutoff);
  hiddenFlows += allLinks.length - kept.length;

  const outLinks: JourneyFlowLink[] = kept.map((l) => ({
    id: `${l.source}->${l.target}`,
    source: l.source,
    target: l.target,
    value: l.value,
    sharePct: +(100 * (l.value / (visitorsById.get(l.source) || 1))).toFixed(1),
    happiness: l.checks ? +(l.weight / l.checks).toFixed(1) : 0,
  }));

  // Columns are POSITIONS in the visit, so the headers say so. Labelling them
  // with phase names would be a lie: the fourth stop of a visit is very often
  // Arrival again on the way out, and a node called "Arrival" sitting under a
  // header reading "SERVICE" is worse than no header at all.
  const usedColumns = [...new Set(outNodes.map((n) => n.column))].sort((a, b) => a - b);
  const columns = usedColumns.map((c) => `Stop ${c + 1}`);

  const totalVisitors = outNodes
    .filter((n) => n.column === 0)
    .reduce((sum, n) => sum + n.visitors, 0);

  return {
    groupBy: opts.groupBy,
    timeOfDay: opts.timeOfDay,
    columns,
    nodes: outNodes,
    links: outLinks,
    hiddenFlows,
    totalVisitors,
  };
}

// ---------------------------------------------------------------------------
// Common journeys
// ---------------------------------------------------------------------------

/**
 * The most-walked paths through the building.
 *
 * Each visit's stops are strung into an ordered array of zone names, then
 * identical arrays are grouped. `string_agg` over an ordered set is what turns
 * a set of rows back into a single path value.
 */
export async function getCommonJourneys(
  q: ParsedVisitorsQuery,
): Promise<CommonJourneysResponse> {
  const rows = await query<Record<string, string>>(
    `${STOPS},
     paths AS (
       SELECT s.face_id, s.visit_no,
              array_agg(s.zone_name ORDER BY s.stop_no) AS path,
              sum(s.dwell_minutes) AS minutes,
              sum(s.happiness * s.checks) AS weight,
              sum(s.checks) AS checks
       FROM stops s GROUP BY s.face_id, s.visit_no
     )
     SELECT path,
            count(*) AS visits,
            round(avg(minutes)::numeric, 1) AS avg_minutes,
            round((sum(weight) / NULLIF(sum(checks), 0))::numeric, 1) AS happiness,
            round(100.0 * count(*) / NULLIF((SELECT count(*) FROM paths), 0), 1) AS share_pct
     FROM paths
     GROUP BY path
     ORDER BY visits DESC
     LIMIT 12`,
    scopeParams(q),
  );

  return {
    journeys: rows.map((r, i) => ({
      id: `journey-${i + 1}`,
      path: r.path as unknown as string[],
      sharePct: num(r.share_pct),
      visits: num(r.visits),
      avgMinutes: num(r.avg_minutes),
      happiness: num(r.happiness),
    })),
  };
}

// ---------------------------------------------------------------------------
// Dwell by zone
// ---------------------------------------------------------------------------

export async function getDwellByZone(q: ParsedVisitorsQuery): Promise<DwellByZoneResponse> {
  const rows = await query<Record<string, string>>(
    `${STOPS}
     SELECT zone_id::text, zone_name,
            round(avg(dwell_minutes)::numeric, 1) AS minutes,
            round((sum(happiness * checks) / NULLIF(sum(checks), 0))::numeric, 1) AS happiness
     FROM stops
     GROUP BY zone_id, zone_name
     ORDER BY minutes DESC`,
    scopeParams(q),
  );

  return {
    zones: rows.map((r) => ({
      id: r.zone_id,
      name: r.zone_name,
      minutes: num(r.minutes),
      happiness: num(r.happiness),
    })),
  };
}

// ---------------------------------------------------------------------------
// Volume by hour
// ---------------------------------------------------------------------------

/**
 * Movement and occupancy across the day.
 *
 * `transitions` counts zone-to-zone moves in the hour. `occupancy` counts
 * people PRESENT during the hour — a visit spanning 09:00–11:00 contributes to
 * three hours, which is what "how full is the building" means, as opposed to
 * how many arrived.
 */
export async function getJourneyVolume(
  q: ParsedVisitorsQuery,
): Promise<JourneyVolumeResponse> {
  const rows = await query<Record<string, string>>(
    `${STOPS},
     moves AS (
       SELECT EXTRACT(hour FROM entered_at AT TIME ZONE site_tz)::int AS hour,
              count(*) AS transitions,
              sum(happiness * checks) AS weight,
              sum(checks) AS checks
       FROM stops WHERE stop_no > 1
       GROUP BY 1
     ),
     presence AS (
       SELECT h.hour, count(DISTINCT (v.face_id, v.visit_no)) AS occupancy
       FROM visits v
       CROSS JOIN LATERAL generate_series(
         EXTRACT(hour FROM v.started_at AT TIME ZONE v.site_tz)::int,
         EXTRACT(hour FROM v.ended_at   AT TIME ZONE v.site_tz)::int
       ) AS h(hour)
       GROUP BY h.hour
     )
     SELECT g.hour,
            coalesce(m.transitions, 0) AS transitions,
            coalesce(p.occupancy, 0)   AS occupancy,
            round((m.weight / NULLIF(m.checks, 0))::numeric, 1) AS happiness
     FROM generate_series(0, 23) AS g(hour)
     LEFT JOIN moves    m ON m.hour = g.hour
     LEFT JOIN presence p ON p.hour = g.hour
     ORDER BY g.hour`,
    scopeParams(q),
  );

  const hours = rows.map((r) => ({
    hour: num(r.hour),
    transitions: num(r.transitions),
    occupancy: num(r.occupancy),
    happiness: num(r.happiness),
  }));

  const peak = hours.reduce(
    (best, h) => (h.transitions > best.transitions ? h : best),
    hours[0] ?? { hour: 0, transitions: 0, occupancy: 0, happiness: 0 },
  );

  return { peakHour: peak.hour, peakTransitions: peak.transitions, hours };
}

// ---------------------------------------------------------------------------
// Dwell vs sentiment
// ---------------------------------------------------------------------------

const DWELL_BUCKETS = [
  { id: "under-15", label: "Under 15 min", min: 0, max: 15 },
  { id: "15-30", label: "15–30 min", min: 15, max: 30 },
  { id: "30-60", label: "30–60 min", min: 30, max: 60 },
  { id: "60-120", label: "1–2 hours", min: 60, max: 120 },
  { id: "over-120", label: "Over 2 hours", min: 120, max: 100000 },
] as const;

/** Does a longer visit feel worse? Sentiment bucketed by visit length. */
export async function getDwellSentiment(
  q: ParsedVisitorsQuery,
): Promise<DwellSentimentResponse> {
  const cases = DWELL_BUCKETS.map(
    (b) => `WHEN total_minutes >= ${b.min} AND total_minutes < ${b.max} THEN '${b.id}'`,
  ).join(" ");

  const rows = await query<Record<string, string>>(
    `${STOPS}
     SELECT CASE ${cases} ELSE 'over-120' END AS bucket,
            count(*) AS visits,
            round((sum(happiness * checks) / NULLIF(sum(checks), 0))::numeric, 1) AS happiness,
            sum(checks) AS checks
     FROM visits
     GROUP BY 1`,
    scopeParams(q),
  );

  const by = new Map(rows.map((r) => [r.bucket, r]));
  const buckets = DWELL_BUCKETS.map((b) => ({
    id: b.id,
    label: b.label,
    happiness: num(by.get(b.id)?.happiness),
    visits: num(by.get(b.id)?.visits),
  }));

  // Only buckets with real traffic can be called the worst — an empty bucket
  // reads as happiness 0 and would always win.
  const populated = buckets.filter((b) => b.visits > 0);
  const worst = populated.reduce(
    (lowest, b) => (b.happiness < lowest.happiness ? b : lowest),
    populated[0] ?? buckets[0],
  );

  return { buckets, worstBucketId: worst?.id ?? buckets[0].id };
}

// ---------------------------------------------------------------------------
// Threshold tracker
// ---------------------------------------------------------------------------

/** Share of each day's visits that ran longer than the experience threshold. */
export async function getThresholdTracker(
  q: ParsedVisitorsQuery,
): Promise<ThresholdTrackerResponse> {
  const rows = await query<Record<string, string>>(
    // to_char, not a raw date: pg returns date columns as JS Date objects, and
    // stringifying one gives "Thu Aug 06 2026 ..." rather than an ISO day.
    `${STOPS}
     SELECT to_char((started_at AT TIME ZONE site_tz)::date, 'YYYY-MM-DD') AS day,
            count(*) FILTER (WHERE total_minutes > ${EXPERIENCE_THRESHOLD_MINUTES}) AS over,
            count(*) AS total
     FROM visits
     GROUP BY 1 ORDER BY 1`,
    scopeParams(q),
  );

  const points = rows.map((r) => {
    const total = num(r.total);
    const over = num(r.over);
    return {
      date: r.day,
      sharePct: total ? +((100 * over) / total).toFixed(1) : 0,
      visits: over,
    };
  });

  const totalVisits = rows.reduce((a, r) => a + num(r.total), 0);
  const totalOver = rows.reduce((a, r) => a + num(r.over), 0);

  const peak = points.reduce(
    (best, p) => (p.sharePct > best.sharePct ? p : best),
    points[0] ?? { date: "", sharePct: 0, visits: 0 },
  );

  return {
    thresholdMinutes: EXPERIENCE_THRESHOLD_MINUTES,
    points,
    peakDate: peak.date,
    // Weighted across all visits, not a mean of daily percentages — a quiet
    // Sunday with four visits must not count as much as a busy Tuesday.
    averagePct: totalVisits ? +((100 * totalOver) / totalVisits).toFixed(1) : 0,
  };
}
