import {
  AGE_BANDS,
  type AgeDistribution,
  type AgeHappiness,
  type GenderDistribution,
  type GenderHappiness,
  type HappinessTimeseriesResponse,
  type HeatmapCell,
  type HeatmapResponse,
  type VisitorCounts,
  type VisitorsTimeseriesResponse,
} from "@/types";
import {
  ageWeights,
  dayHappiness,
  dayOfWeek,
  eachDay,
  hourWeights,
  maleShare,
  newVisitorShare,
  resolveZones,
  segmentHappinessOffset,
  zoneDayVisitors,
} from "@/lib/mock/generator";
import type { ParsedVisitorsQuery } from "./params";

/**
 * Visitor analytics services — aggregate the deterministic mock data into
 * the exact response shapes of the public API. Route handlers stay thin and
 * call these; a Server Component could call them directly too.
 */

/** Unique visitors per day across the selected zones. */
function dailyTotals(q: ParsedVisitorsQuery): { day: string; total: number }[] {
  const zones = resolveZones(q.zoneIds);
  return eachDay(q.start, q.end).map((day) => ({
    day,
    total: zones.reduce((sum, z) => sum + zoneDayVisitors(day, z), 0),
  }));
}

export function getVisitorCounts(q: ParsedVisitorsQuery): VisitorCounts {
  const zones = resolveZones(q.zoneIds);
  let total = 0;
  let newVisitors = 0;
  let headcount = 0;

  for (const day of eachDay(q.start, q.end)) {
    let dayTotal = 0;
    for (const zone of zones) {
      const visitors = zoneDayVisitors(day, zone);
      dayTotal += visitors;
      headcount += Math.round(visitors * zone.entriesPerVisitor);
    }
    total += dayTotal;
    newVisitors += Math.round(dayTotal * newVisitorShare(day));
  }

  return {
    totalVisitors: total,
    newVisitors,
    repeatedVisitors: total - newVisitors,
    totalHeadcount: headcount,
  };
}

export function getGenderDistribution(q: ParsedVisitorsQuery): GenderDistribution {
  let male = 0;
  let female = 0;
  for (const { day, total } of dailyTotals(q)) {
    const m = Math.round(total * maleShare(day));
    male += m;
    female += total - m;
  }
  return { male, female };
}

export function getAgeDistribution(q: ParsedVisitorsQuery): AgeDistribution {
  const result = Object.fromEntries(AGE_BANDS.map((b) => [b, 0])) as AgeDistribution;
  for (const { day, total } of dailyTotals(q)) {
    const weights = ageWeights(day);
    for (const band of AGE_BANDS) {
      result[band] += Math.round(total * weights[band]);
    }
  }
  return result;
}

/** Site-wide average happiness across the range (baseline for segments). */
function averageHappiness(q: ParsedVisitorsQuery): number {
  const zones = resolveZones(q.zoneIds);
  const days = eachDay(q.start, q.end);
  return (
    days.reduce((sum, day) => sum + dayHappiness(day, zones), 0) /
    (days.length || 1)
  );
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const clampScore = (n: number) => Math.min(97, Math.max(68, n));

export function getGenderHappiness(q: ParsedVisitorsQuery): GenderHappiness {
  const base = averageHappiness(q);
  return {
    male: round1(clampScore(base + segmentHappinessOffset("gender:male"))),
    female: round1(clampScore(base + segmentHappinessOffset("gender:female"))),
  };
}

export function getAgeHappiness(q: ParsedVisitorsQuery): AgeHappiness {
  const base = averageHappiness(q);
  return Object.fromEntries(
    AGE_BANDS.map((band) => [
      band,
      round1(clampScore(base + segmentHappinessOffset(`age:${band}`))),
    ]),
  ) as AgeHappiness;
}

export function getVisitorsTimeseries(
  q: ParsedVisitorsQuery,
): VisitorsTimeseriesResponse {
  return {
    timeseries: dailyTotals(q).map(({ day, total }) => {
      const newCount = Math.round(total * newVisitorShare(day));
      return {
        time: `${day}T00:00:00Z`,
        total,
        new: newCount,
        repeated: total - newCount,
      };
    }),
  };
}

export function getHappinessTimeseries(
  q: ParsedVisitorsQuery,
): HappinessTimeseriesResponse {
  const zones = resolveZones(q.zoneIds);
  const series = eachDay(q.start, q.end).map((day) => ({
    time: `${day}T00:00:00Z`,
    value: dayHappiness(day, zones),
  }));
  const values = series.map((p) => p.value);
  const round1 = (n: number) => Math.round(n * 10) / 10;

  return {
    score: values[values.length - 1] ?? 0,
    average: round1(values.reduce((s, v) => s + v, 0) / (values.length || 1)),
    peak: Math.max(...values),
    lowest: Math.min(...values),
    timeseries: series,
  };
}

export function getVisitorsHeatmap(q: ParsedVisitorsQuery): HeatmapResponse {
  const zones = resolveZones(q.zoneIds);
  const cells = new Map<string, HeatmapCell>();

  for (const day of eachDay(q.start, q.end)) {
    const dow = dayOfWeek(day);
    const dayTotal = zones.reduce((sum, z) => sum + zoneDayVisitors(day, z), 0);
    for (const { hour, weight } of hourWeights(day)) {
      const key = `${dow}:${hour}`;
      const cell = cells.get(key) ?? { day: dow, hour, count: 0 };
      cell.count += Math.round(dayTotal * weight);
      cells.set(key, cell);
    }
  }

  return { heatmap: [...cells.values()] };
}
