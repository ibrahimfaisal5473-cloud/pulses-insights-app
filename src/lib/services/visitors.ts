import {
  AGE_BANDS,
  type AgeDistribution,
  type AgeHappiness,
  type AgeTimeseriesPoint,
  type AgeTimeseriesResponse,
  type GenderDistribution,
  type GenderTimeseriesResponse,
  type GenderHappiness,
  type HappinessHeatmapResponse,
  type HappinessTimeseriesResponse,
  type HeatmapCell,
  type HeatmapDay,
  type HeatmapResponse,
  type VisitorCounts,
  type VisitorsTimeseriesResponse,
  type WaitingTimeResponse,
} from "@/types";
import {
  ageWeights,
  cohortDayVisitors,
  cohortHappinessOffset,
  dayHappiness,
  dayOfWeek,
  eachDay,
  hourWeights,
  maleShare,
  newVisitorShare,
  resolveZones,
  sample,
  segmentHappinessOffset,
  weekdayFactor,
} from "@/lib/mock/generator";
import type { ParsedVisitorsQuery } from "./params";

/**
 * Visitor analytics services — aggregate the deterministic mock data into
 * the exact response shapes of the public API. Route handlers stay thin and
 * call these; a Server Component could call them directly too.
 */

/**
 * Unique visitors per day across the selected zones, narrowed to the cohort.
 *
 * `skip` drops one demographic dimension from the narrowing so a breakdown
 * endpoint can apply that dimension itself — otherwise a gender-split chart
 * built on gender-filtered totals would count the filter twice.
 */
function dailyTotals(
  q: ParsedVisitorsQuery,
  skip?: "gender" | "age",
): { day: string; total: number }[] {
  const zones = resolveZones(q.zoneIds);
  const cohort = {
    genders: skip === "gender" ? [] : q.genders,
    ages: skip === "age" ? [] : q.ages,
  };

  return eachDay(q.start, q.end).map((day) => ({
    day,
    total: zones.reduce((sum, z) => sum + cohortDayVisitors(day, z, cohort), 0),
  }));
}

/** Excluded segments read as zero rather than vanishing from the chart. */
const keptIf = (selected: string[], value: string, count: number) =>
  selected.length === 0 || selected.includes(value) ? count : 0;

export function getVisitorCounts(q: ParsedVisitorsQuery): VisitorCounts {
  const zones = resolveZones(q.zoneIds);
  let total = 0;
  let newVisitors = 0;
  let headcount = 0;

  for (const day of eachDay(q.start, q.end)) {
    let dayTotal = 0;
    for (const zone of zones) {
      const visitors = cohortDayVisitors(day, zone, q);
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
  for (const { day, total } of dailyTotals(q, "gender")) {
    const m = Math.round(total * maleShare(day));
    male += keptIf(q.genders, "male", m);
    female += keptIf(q.genders, "female", total - m);
  }
  return { male, female };
}

export function getAgeDistribution(q: ParsedVisitorsQuery): AgeDistribution {
  const result = Object.fromEntries(AGE_BANDS.map((b) => [b, 0])) as AgeDistribution;
  for (const { day, total } of dailyTotals(q, "age")) {
    const weights = ageWeights(day);
    for (const band of AGE_BANDS) {
      result[band] += keptIf(q.ages, band, Math.round(total * weights[band]));
    }
  }
  return result;
}

/** Site-wide average happiness across the range (baseline for segments). */
function averageHappiness(q: ParsedVisitorsQuery): number {
  const zones = resolveZones(q.zoneIds);
  const days = eachDay(q.start, q.end);
  return (
    days.reduce((sum, day) => sum + cohortDayHappiness(day, zones, q), 0) /
    (days.length || 1)
  );
}

/** A day's site-wide happiness, shifted by whichever cohort is selected. */
function cohortDayHappiness(
  day: string,
  zones: ReturnType<typeof resolveZones>,
  q: ParsedVisitorsQuery,
): number {
  return clampScore(dayHappiness(day, zones) + cohortHappinessOffset(q));
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

export function getGenderTimeseries(
  q: ParsedVisitorsQuery,
): GenderTimeseriesResponse {
  const totals: GenderDistribution = { male: 0, female: 0 };
  const timeseries = dailyTotals(q, "gender").map(({ day, total }) => {
    const m = Math.round(total * maleShare(day));
    const male = keptIf(q.genders, "male", m);
    const female = keptIf(q.genders, "female", total - m);
    totals.male += male;
    totals.female += female;
    return { time: `${day}T00:00:00Z`, male, female };
  });
  return { totals, timeseries };
}

export function getAgeTimeseries(q: ParsedVisitorsQuery): AgeTimeseriesResponse {
  const totals = Object.fromEntries(AGE_BANDS.map((b) => [b, 0])) as AgeDistribution;
  const timeseries = dailyTotals(q, "age").map(({ day, total }) => {
    const weights = ageWeights(day);
    const point = { time: `${day}T00:00:00Z` } as AgeTimeseriesPoint;
    for (const band of AGE_BANDS) {
      point[band] = keptIf(q.ages, band, Math.round(total * weights[band]));
      totals[band] += point[band];
    }
    return point;
  });
  return { totals, timeseries };
}

export function getHappinessTimeseries(
  q: ParsedVisitorsQuery,
): HappinessTimeseriesResponse {
  const zones = resolveZones(q.zoneIds);
  const series = eachDay(q.start, q.end).map((day) => ({
    time: `${day}T00:00:00Z`,
    value: round1(cohortDayHappiness(day, zones, q)),
  }));
  const values = series.map((p) => p.value);

  return {
    score: values[values.length - 1] ?? 0,
    average: round1(values.reduce((s, v) => s + v, 0) / (values.length || 1)),
    peak: Math.max(...values),
    lowest: Math.min(...values),
    timeseries: series,
  };
}

export function getHappinessHeatmap(
  q: ParsedVisitorsQuery,
): HappinessHeatmapResponse {
  const zones = resolveZones(q.zoneIds);
  const cells = new Map<string, { total: number; n: number; samples: number }>();

  for (const day of eachDay(q.start, q.end)) {
    const dow = dayOfWeek(day);
    const base = cohortDayHappiness(day, zones, q);
    const dayTotal = zones.reduce((sum, z) => sum + cohortDayVisitors(day, z, q), 0);

    for (const { hour, weight } of hourWeights(day)) {
      const key = `${dow}:${hour}`;
      const cell = cells.get(key) ?? { total: 0, n: 0, samples: 0 };
      cell.total += base + sample(`hh:${day}:${hour}`, -4, 4);
      cell.n += 1;
      cell.samples += Math.round(dayTotal * weight);
      cells.set(key, cell);
    }
  }

  return {
    heatmap: [...cells.entries()].map(([key, cell]) => {
      const [day, hour] = key.split(":");
      return {
        day: day as HeatmapDay,
        hour: Number(hour),
        score: round1(clampScore(cell.total / cell.n)),
        // Too few happiness checks to trust the score — dimmed in the UI.
        lowSample: cell.samples < 25,
      };
    }),
  };
}

export function getWaitingTime(q: ParsedVisitorsQuery): WaitingTimeResponse {
  const series = eachDay(q.start, q.end).map((day) => ({
    time: `${day}T00:00:00Z`,
    minutes: round1(sample(`wait:${day}`, 8, 46) * weekdayFactor(day)),
  }));
  const values = series.map((p) => p.minutes);

  return {
    average: round1(values.reduce((s, v) => s + v, 0) / (values.length || 1)),
    peak: Math.max(...values),
    timeseries: series,
  };
}

export function getVisitorsHeatmap(q: ParsedVisitorsQuery): HeatmapResponse {
  const zones = resolveZones(q.zoneIds);
  const cells = new Map<string, HeatmapCell>();

  for (const day of eachDay(q.start, q.end)) {
    const dow = dayOfWeek(day);
    const dayTotal = zones.reduce((sum, z) => sum + cohortDayVisitors(day, z, q), 0);
    for (const { hour, weight } of hourWeights(day)) {
      const key = `${dow}:${hour}`;
      const cell = cells.get(key) ?? { day: dow, hour, count: 0 };
      cell.count += Math.round(dayTotal * weight);
      cells.set(key, cell);
    }
  }

  return { heatmap: [...cells.values()] };
}
