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
import {
  cohortDayVisitors,
  cohortHappinessOffset,
  dayHappiness,
  eachDay,
  hourWeights,
  resolveZones,
  sample,
  zoneDayHappiness,
} from "@/lib/mock/generator";
import {
  EXPERIENCE_THRESHOLD_MINUTES,
  JOURNEY_PHASES,
  MOCK_ZONES,
  type MockZone,
} from "@/lib/mock/zones";
import type { ParsedVisitorsQuery } from "./params";

/**
 * Journey analytics services — derive movement between zones from the same
 * deterministic visitor model used elsewhere, so totals stay consistent
 * across pages.
 */

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Total unique visitors across the range for the selected zones. */
function totalVisitors(q: ParsedVisitorsQuery): number {
  const zones = resolveZones(q.zoneIds);
  return eachDay(q.start, q.end).reduce(
    (sum, day) => sum + zones.reduce((s, z) => s + cohortDayVisitors(day, z, q), 0),
    0,
  );
}

/** Seed key that changes with the range, so stats move when the range does. */
function rangeKey(q: ParsedVisitorsQuery): string {
  return `${q.start.toISOString().slice(0, 10)}:${q.end.toISOString().slice(0, 10)}`;
}

export function getJourneyStats(q: ParsedVisitorsQuery): JourneyStats {
  const key = rangeKey(q);
  const days = eachDay(q.start, q.end);

  return {
    avgZonesPerJourney: round1(sample(`jz:${key}`, 2.1, 2.8)),
    avgDwellMinutes: Math.round(sample(`jd:${key}`, 41, 54)),
    reachServicePct: Math.round(sample(`jr:${key}`, 78, 87)),
    thresholdMinutes: EXPERIENCE_THRESHOLD_MINUTES,
    // Averaged from the same per-day series the threshold tracker plots, so
    // the card and the chart always tell the same story.
    exceedThresholdPct: Math.round(
      days.reduce((s, day) => s + thresholdSharePct(day), 0) / (days.length || 1),
    ),
  };
}

/* ---------- flow diagram ---------- */

export type JourneyFlowOptions = {
  groupBy: JourneyGroupBy;
  timeOfDay: JourneyTimeOfDay;
};

/** Opening hours covered by each time-of-day slice, inclusive. */
const TIME_OF_DAY_HOURS: Record<Exclude<JourneyTimeOfDay, "all">, [number, number]> = {
  morning: [7, 11],
  afternoon: [12, 16],
  evening: [17, 18],
};

/**
 * Share of a day's traffic falling inside the selected slice. Derived from the
 * same hour curve the volume chart uses, so the slices add back up to "All day".
 */
function timeOfDayShare(q: ParsedVisitorsQuery, timeOfDay: JourneyTimeOfDay): number {
  if (timeOfDay === "all") return 1;
  const [from, to] = TIME_OF_DAY_HOURS[timeOfDay];
  const weights = hourWeights(eachDay(q.start, q.end)[0] ?? "2026-01-01");
  return weights
    .filter((h) => h.hour >= from && h.hour <= to)
    .reduce((sum, h) => sum + h.weight, 0);
}

type ZoneTotal = { zone: MockZone; visitors: number; happiness: number };

/** Per-zone visitors and average happiness over the range, sliced by time of day. */
function zoneTotals(q: ParsedVisitorsQuery, share: number): ZoneTotal[] {
  const days = eachDay(q.start, q.end);
  return resolveZones(q.zoneIds).map((zone) => {
    const visitors = days.reduce((sum, day) => sum + cohortDayVisitors(day, zone, q), 0);
    const happiness =
      days.reduce((sum, day) => sum + zoneDayHappiness(day, zone), 0) / (days.length || 1) +
      cohortHappinessOffset(q);
    return { zone, visitors: Math.round(visitors * share), happiness };
  });
}

/** Visitor-weighted mean of a set of zones' happiness. */
function blendHappiness(totals: ZoneTotal[]): number {
  const visitors = totals.reduce((s, t) => s + t.visitors, 0);
  if (visitors === 0) return 84;
  return (
    Math.round((totals.reduce((s, t) => s + t.happiness * t.visitors, 0) / visitors) * 10) /
    10
  );
}

/**
 * Split a node's funnel/started counts across the zones that make it up,
 * proportional to each zone's footfall.
 */
function contributorsFor(
  totals: ZoneTotal[],
  fromFunnel: number,
  startedHere: number,
): JourneyFlowNode["contributors"] {
  const visitors = totals.reduce((s, t) => s + t.visitors, 0) || 1;
  return totals
    .map(({ zone, visitors: v }) => ({
      id: zone.id,
      name: zone.name,
      fromFunnel: Math.round((fromFunnel * v) / visitors),
      startedHere: Math.round((startedHere * v) / visitors),
    }))
    .filter((c) => c.fromFunnel + c.startedHere > 0)
    .sort((a, b) => b.fromFunnel + b.startedHere - (a.fromFunnel + a.startedHere));
}

/** Drop the long tail of low-volume links so the diagram stays readable. */
function pruneLinks(
  links: JourneyFlowLink[],
  minShareOfMax: number,
): { kept: JourneyFlowLink[]; hidden: number } {
  const max = Math.max(...links.map((l) => l.value), 1);
  const kept = links.filter((l) => l.value >= max * minShareOfMax);
  return { kept, hidden: links.length - kept.length };
}

/**
 * Columns are the journey phases; each node is a phase, made up of the zones
 * assigned to it. Visitors either arrive from an earlier phase (the funnel) or
 * enter the journey at that phase — the split every tooltip reports.
 */
function buildPhaseFlow(
  q: ParsedVisitorsQuery,
  opts: JourneyFlowOptions,
  share: number,
): JourneyFlowResponse {
  const key = `${rangeKey(q)}:${opts.timeOfDay}`;
  const totals = zoneTotals(q, share);

  const columns = JOURNEY_PHASES.map((phase) => ({
    phase,
    totals: totals.filter((t) => t.zone.phase === phase.id),
  })).filter((c) => c.totals.length > 0);

  const nodes: JourneyFlowNode[] = columns.map(({ phase, totals: zones }, column) => ({
    id: phase.id,
    name: phase.name,
    column,
    visitors: zones.reduce((s, t) => s + t.visitors, 0),
    fromFunnel: 0,
    startedHere: 0,
    happiness: blendHappiness(zones),
    contributors: [],
  }));

  // Push each node's outgoing budget forward: mostly to the next column, with
  // a smaller share skipping one (visitors who bypass a phase entirely).
  const links: JourneyFlowLink[] = [];
  nodes.forEach((node) => {
    const targets = nodes.filter(
      (t) => t.column === node.column + 1 || t.column === node.column + 2,
    );
    if (targets.length === 0) return;

    const budget = node.visitors * sample(`out:${key}:${node.id}`, 0.54, 0.74);
    const weights = targets.map((t) => {
      const skip = t.column === node.column + 2 ? 0.22 : 1;
      return t.visitors * skip * sample(`w:${key}:${node.id}:${t.id}`, 0.7, 1.3);
    });
    const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;

    targets.forEach((target, i) => {
      links.push({
        id: `${node.id}->${target.id}`,
        source: node.id,
        target: target.id,
        value: Math.round((budget * weights[i]) / totalWeight),
        sharePct: 0,
        happiness: 0,
      });
    });
  });

  const { kept, hidden } = pruneLinks(links, 0.05);

  // Incoming volume can't exceed the node itself, and every phase keeps some
  // walk-ins — so cap the funnel share and scale its links to match.
  kept.forEach((link) => {
    const target = nodes.find((n) => n.id === link.target);
    if (target) target.fromFunnel += link.value;
  });

  nodes.forEach((node) => {
    if (node.fromFunnel === 0) {
      node.startedHere = node.visitors;
      return;
    }
    const cap = node.visitors * sample(`cap:${key}:${node.id}`, 0.55, 0.8);
    if (node.fromFunnel > cap) {
      const scale = cap / node.fromFunnel;
      kept
        .filter((l) => l.target === node.id)
        .forEach((l) => (l.value = Math.round(l.value * scale)));
      node.fromFunnel = Math.round(cap);
    }
    node.startedHere = Math.max(0, node.visitors - node.fromFunnel);
  });

  nodes.forEach((node, i) => {
    node.contributors = contributorsFor(columns[i].totals, node.fromFunnel, node.startedHere);
  });

  const byId = new Map(nodes.map((n) => [n.id, n]));
  kept.forEach((link) => {
    const source = byId.get(link.source);
    const target = byId.get(link.target);
    link.sharePct = source?.visitors
      ? Math.round((link.value / source.visitors) * 1000) / 10
      : 0;
    link.happiness =
      Math.round((((source?.happiness ?? 84) + (target?.happiness ?? 84)) / 2) * 10) / 10;
  });

  return {
    groupBy: "type",
    timeOfDay: opts.timeOfDay,
    columns: columns.map((c) => c.phase.name),
    nodes,
    links: kept.filter((l) => l.value > 0),
    hiddenFlows: hidden,
    totalVisitors: Math.round(totalVisitors(q) * share),
  };
}

/** How likely a visitor in one phase is to move to a zone in another. */
function phaseAffinity(from: MockZone, to: MockZone): number {
  const order = JOURNEY_PHASES.map((p) => p.id) as readonly string[];
  const step = order.indexOf(to.phase) - order.indexOf(from.phase);
  if (step === 1) return 1;
  if (step === 2) return 0.45;
  if (step > 2) return 0.2;
  if (step === 0) return 0.3;
  return 0.12; // doubling back
}

/**
 * Columns are ordinal stops (1st zone visited, 2nd, …) and nodes are zones, so
 * the same zone can appear in several columns. Volumes propagate through a
 * seeded transition matrix, which is what produces the long tail of minor
 * flows the footnote reports as hidden.
 */
function buildZoneFlow(
  q: ParsedVisitorsQuery,
  opts: JourneyFlowOptions,
  share: number,
): JourneyFlowResponse {
  const key = `${rangeKey(q)}:${opts.timeOfDay}`;
  const totals = zoneTotals(q, share);
  const STOPS = 4;
  const MAX_NODES_PER_STOP = 5;

  // Zones early in a visit are the likely first stop.
  const entryWeight: Record<MockZone["phase"], number> = {
    arrival: 1,
    registration: 0.45,
    waiting: 0.3,
    service: 0.14,
    activity: 0.1,
  };
  const entry = totals.map((t) => t.visitors * entryWeight[t.zone.phase]);
  const entryTotal = entry.reduce((s, w) => s + w, 0) || 1;
  const arrivals = Math.round(totalVisitors(q) * share);

  // volume[stop][zoneIndex]
  const volume: number[][] = [totals.map((_, i) => (arrivals * entry[i]) / entryTotal)];
  const allLinks: JourneyFlowLink[] = [];

  for (let stop = 0; stop < STOPS - 1; stop++) {
    const next = totals.map(() => 0);
    const continueRate = sample(`cont:${key}:${stop}`, 0.62, 0.78) * (1 - stop * 0.12);

    totals.forEach((from, a) => {
      if (volume[stop][a] <= 0) return;

      const weights = totals.map((to, b) =>
        a === b
          ? 0
          : to.visitors * phaseAffinity(from.zone, to.zone) *
            sample(`t:${key}:${from.zone.id}:${to.zone.id}`, 0.6, 1.4),
      );
      const totalWeight = weights.reduce((s, w) => s + w, 0) || 1;
      const moving = volume[stop][a] * continueRate;

      totals.forEach((to, b) => {
        const value = Math.round((moving * weights[b]) / totalWeight);
        if (value <= 0) return;
        next[b] += value;
        allLinks.push({
          id: `${from.zone.id}@${stop}->${to.zone.id}@${stop + 1}`,
          source: `${from.zone.id}@${stop}`,
          target: `${to.zone.id}@${stop + 1}`,
          value,
          sharePct: 0,
          happiness: Math.round(((from.happiness + to.happiness) / 2) * 10) / 10,
        });
      });
    });
    volume.push(next);
  }

  const { kept, hidden } = pruneLinks(allLinks, 0.08);

  // A node is only real if a kept link touches it (or it's a first stop).
  const nodes: JourneyFlowNode[] = [];
  volume.forEach((stopVolume, stop) => {
    totals.forEach((total, i) => {
      const incoming = kept.filter((l) => l.target === `${total.zone.id}@${stop}`);
      const outgoing = kept.filter((l) => l.source === `${total.zone.id}@${stop}`);
      const fromFunnel = incoming.reduce((s, l) => s + l.value, 0);
      const startedHere = stop === 0 ? Math.round(stopVolume[i]) : 0;
      if (fromFunnel + startedHere <= 0 || (stop > 0 && outgoing.length === 0 && fromFunnel === 0))
        return;

      nodes.push({
        id: `${total.zone.id}@${stop}`,
        name: total.zone.name,
        column: stop,
        visitors: fromFunnel + startedHere,
        fromFunnel,
        startedHere,
        happiness: Math.round(total.happiness * 10) / 10,
        contributors: incoming
          .map((l) => {
            const sourceZone = totals.find((t) => `${t.zone.id}@${stop - 1}` === l.source);
            return {
              id: l.source,
              name: sourceZone?.zone.name ?? l.source,
              fromFunnel: l.value,
              startedHere: 0,
            };
          })
          .sort((a, b) => b.fromFunnel - a.fromFunnel),
      });
    });
  });

  // Only the busiest zones per stop earn a bar — the rest would be hairlines
  // with colliding labels, and their flows are counted as hidden instead.
  const shown = Array.from({ length: STOPS }, (_, stop) =>
    nodes
      .filter((n) => n.column === stop)
      .sort((a, b) => b.visitors - a.visitors)
      .slice(0, MAX_NODES_PER_STOP),
  ).flat();

  const byId = new Map(shown.map((n) => [n.id, n]));
  const links = kept.filter((l) => byId.has(l.source) && byId.has(l.target));
  links.forEach((link) => {
    const source = byId.get(link.source);
    link.sharePct = source?.visitors
      ? Math.round((link.value / source.visitors) * 1000) / 10
      : 0;
  });

  // A node's totals must only count the flows still on screen.
  shown.forEach((node) => {
    if (node.column === 0) return;
    node.fromFunnel = links
      .filter((l) => l.target === node.id)
      .reduce((s, l) => s + l.value, 0);
    node.visitors = node.fromFunnel + node.startedHere;
    node.contributors = node.contributors.filter((c) => byId.has(c.id));
  });

  return {
    groupBy: "zone",
    timeOfDay: opts.timeOfDay,
    columns: Array.from({ length: STOPS }, (_, i) => `Stop ${i + 1}`),
    nodes: shown.filter((n) => n.visitors > 0),
    links: links.filter((l) => l.value > 0),
    hiddenFlows: hidden + (kept.length - links.length),
    totalVisitors: arrivals,
  };
}

export function getJourneyFlow(
  q: ParsedVisitorsQuery,
  opts: JourneyFlowOptions = { groupBy: "type", timeOfDay: "all" },
): JourneyFlowResponse {
  const share = timeOfDayShare(q, opts.timeOfDay);
  return opts.groupBy === "zone"
    ? buildZoneFlow(q, opts, share)
    : buildPhaseFlow(q, opts, share);
}

export function getCommonJourneys(q: ParsedVisitorsQuery): CommonJourneysResponse {
  const key = rangeKey(q);
  const total = totalVisitors(q);
  const days = eachDay(q.start, q.end);

  /** Mean happiness across the zones a path visits. */
  const pathHappiness = (path: string[]): number => {
    const scores = path.flatMap((name) => {
      const zone = MOCK_ZONES.find((z) => z.name === name);
      if (!zone) return [];
      return [days.reduce((s, day) => s + zoneDayHappiness(day, zone), 0) / (days.length || 1)];
    });
    if (scores.length === 0) return 84;
    return round1(scores.reduce((s, v) => s + v, 0) / scores.length);
  };

  // Plausible end-to-end paths through the site, ranked by share.
  const paths: string[][] = [
    ["Entrance", "Service Desk"],
    ["Entrance", "Main Hall"],
    ["Entrance", "Waiting Area", "Service Desk"],
    ["Main Hall", "Café"],
    ["Entrance", "Help Desk"],
    ["Waiting Area", "Service Desk", "Main Hall"],
    ["Entrance", "Security", "Main Hall"],
    ["Service Desk", "Café"],
  ];

  const journeys = paths.map((path, i) => {
    const sharePct = round1(sample(`jc:${key}:${i}`, 2, 17) / (1 + i * 0.35));
    const avgMinutes = path.reduce((sum, name) => {
      const zone = MOCK_ZONES.find((z) => z.name === name);
      return sum + (zone?.dwellMinutes ?? 20);
    }, 0);
    return {
      id: `journey-${i}`,
      path,
      sharePct,
      visits: Math.round((total * sharePct) / 100),
      avgMinutes: Math.round(avgMinutes * sample(`jm:${key}:${i}`, 0.45, 0.8)),
      happiness: pathHappiness(path),
    };
  });

  journeys.sort((a, b) => b.sharePct - a.sharePct);
  return { journeys };
}

export function getDwellByZone(q: ParsedVisitorsQuery): DwellByZoneResponse {
  const key = rangeKey(q);
  const days = eachDay(q.start, q.end);
  const zones = resolveZones(q.zoneIds)
    .map((zone) => ({
      id: zone.id,
      name: zone.name,
      minutes: Math.round(zone.dwellMinutes * sample(`dw:${key}:${zone.id}`, 0.9, 1.1)),
      happiness: round1(
        days.reduce((s, day) => s + zoneDayHappiness(day, zone), 0) / (days.length || 1),
      ),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  return { zones };
}

export function getJourneyVolume(q: ParsedVisitorsQuery): JourneyVolumeResponse {
  const days = eachDay(q.start, q.end);
  const total = totalVisitors(q);
  const stats = getJourneyStats(q);
  const zones = resolveZones(q.zoneIds);

  // Transitions ≈ visitors × zones per journey, spread over the open hours.
  const transitions = total * stats.avgZonesPerJourney;
  const weights = hourWeights(days[0] ?? "2026-01-01");
  const baseline =
    days.reduce((s, day) => s + dayHappiness(day, zones), 0) / (days.length || 1) +
    cohortHappinessOffset(q);
  const busiest = Math.max(...weights.map((w) => w.weight), 0.0001);

  const hours = weights.map(({ hour, weight }) => {
    // Sentiment sags when the centre is full — that's the point of overlaying
    // the two series, so the crowding penalty has to come off the same curve
    // the bars are drawn from.
    const crowding = weight / busiest;
    const happiness =
      baseline - crowding * sample(`crowd:${rangeKey(q)}`, 3, 6) +
      sample(`hh:${rangeKey(q)}:${hour}`, -1.2, 1.2);

    return {
      hour,
      transitions: Math.round((transitions * weight) / (days.length || 1)),
      occupancy: Math.round((total * weight * 1.35) / (days.length || 1)),
      happiness: round1(Math.min(97, Math.max(55, happiness))),
    };
  });

  const peak = hours.reduce((best, h) => (h.transitions > best.transitions ? h : best), hours[0]);

  return { hours, peakHour: peak.hour, peakTransitions: peak.transitions };
}

/* ---------- sentiment vs. visit length ---------- */

const DWELL_BUCKETS = [
  { id: "0-10", label: "0–10 min" },
  { id: "10-20", label: "10–20 min" },
  { id: "20-30", label: "20–30 min" },
  { id: "30+", label: "30+ min" },
] as const;

/** Share of visits landing in each dwell bucket — most visits are short. */
const BUCKET_WEIGHTS = [0.34, 0.28, 0.21, 0.17];

export function getDwellSentiment(q: ParsedVisitorsQuery): DwellSentimentResponse {
  const key = rangeKey(q);
  const zones = resolveZones(q.zoneIds);
  const days = eachDay(q.start, q.end);
  const total = totalVisitors(q);
  const baseline =
    days.reduce((s, day) => s + dayHappiness(day, zones), 0) / (days.length || 1) +
    cohortHappinessOffset(q);

  // Longer visits read slightly worse, but only slightly — the widget asks the
  // question, the data shouldn't answer it too loudly.
  const buckets = DWELL_BUCKETS.map((bucket, i) => ({
    id: bucket.id,
    label: bucket.label,
    happiness: round1(baseline - i * sample(`ds:${key}:${bucket.id}`, 0.15, 0.6)),
    visits: Math.round(total * BUCKET_WEIGHTS[i]),
  }));

  const worst = buckets.reduce((low, b) => (b.happiness < low.happiness ? b : low), buckets[0]);
  return { buckets, worstBucketId: worst.id };
}

/* ---------- threshold tracker ---------- */

/** Share of a day's visits that ran past the experience threshold. */
function thresholdSharePct(day: string): number {
  // A rare bad day spikes well above the usual band — those are the days worth
  // clicking into, so the shape has to allow them.
  const spike = sample(`spike:${day}`) > 0.94 ? sample(`sp:${day}`, 14, 28) : 0;
  return round1(sample(`thr:${day}`, 16, 34) + spike);
}

export function getThresholdTracker(q: ParsedVisitorsQuery): ThresholdTrackerResponse {
  const zones = resolveZones(q.zoneIds);
  const points = eachDay(q.start, q.end).map((day) => {
    const dayVisits = zones.reduce((s, z) => s + cohortDayVisitors(day, z, q), 0);
    const sharePct = thresholdSharePct(day);
    return { date: day, sharePct, visits: Math.round((dayVisits * sharePct) / 100) };
  });

  const peak = points.reduce((best, p) => (p.sharePct > best.sharePct ? p : best), points[0]);
  const averagePct = points.reduce((s, p) => s + p.sharePct, 0) / (points.length || 1);

  return {
    thresholdMinutes: EXPERIENCE_THRESHOLD_MINUTES,
    points,
    peakDate: peak?.date ?? "",
    averagePct: round1(averagePct),
  };
}
