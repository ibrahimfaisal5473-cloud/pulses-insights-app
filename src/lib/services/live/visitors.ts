import "server-only";
import { query, queryOne } from "@/lib/db/client";
import {
  AGE_BANDS,
  HEATMAP_DAYS,
  LOW_SAMPLE_CHECKS,
  type AgeBand,
  type AgeDistribution,
  type AgeHappiness,
  type AgeTimeseriesPoint,
  type AgeTimeseriesResponse,
  type GenderDistribution,
  type GenderHappiness,
  type GenderTimeseriesResponse,
  type HappinessHeatmapResponse,
  type HappinessPoint,
  type HappinessTimeseriesResponse,
  type HeatmapCell,
  type HeatmapDay,
  type HeatmapResponse,
  type VisitorCounts,
  type VisitorsTimeseriesResponse,
  type WaitingTimeResponse,
} from "@/types";
import type { ParsedVisitorsQuery } from "../params";
import {
  HAPPINESS,
  SCOPE,
  SESSION_GAP_MINUTES,
  localBucket,
  num,
  scopeParams,
  truncUnit,
} from "./scope";
import { STOPS } from "./stops";

/**
 * Visitor analytics, computed from real pulses.
 *
 * These replace the mock generator's equivalents and return the IDENTICAL
 * shapes, so the route handlers and every widget above them are untouched.
 * That is what the typed API contract was for.
 */

/**
 * Unique people, first-timers, returners, and footfall.
 *
 * NEW vs REPEAT is decided WITHIN the selected range: a person who made one
 * visit is new, a person who came back is a repeat visitor.
 *
 * The tempting alternative — "new means their first-ever detection falls in
 * this range" — is broken for a dashboard. Widen the range far enough and every
 * person's first visit is inside it, so repeat visitors collapse to zero
 * exactly when you have the most data. Deciding it inside the range instead
 * makes the metric behave sensibly: widening the window moves people from new
 * to repeat, which is what a viewer expects.
 *
 * Footfall counts ZONE ENTRIES, not detections. Someone lingering in front of
 * one camera produces hundreds of rows but entered once, so consecutive
 * detections in the same zone collapse into a single entry.
 */
export async function getVisitorCounts(q: ParsedVisitorsQuery): Promise<VisitorCounts> {
  const row = await queryOne<Record<string, string>>(
    `${SCOPE},
     ordered AS (
       SELECT face_id, zone_id, detected_at,
              LAG(detected_at) OVER (PARTITION BY face_id ORDER BY detected_at) AS prev_seen,
              LAG(zone_id)     OVER (PARTITION BY face_id ORDER BY detected_at) AS prev_zone
       FROM cohort
     ),
     marked AS (
       SELECT face_id,
              CASE WHEN prev_seen IS NULL
                     OR detected_at - prev_seen > make_interval(mins => ${SESSION_GAP_MINUTES})
                   THEN 1 ELSE 0 END AS starts_visit,
              CASE WHEN prev_zone IS DISTINCT FROM zone_id THEN 1 ELSE 0 END AS enters_zone
       FROM ordered
     ),
     per_person AS (
       SELECT face_id, sum(starts_visit) AS visits FROM marked GROUP BY face_id
     )
     SELECT (SELECT count(*) FROM per_person)                  AS total_visitors,
            (SELECT count(*) FROM per_person WHERE visits <= 1) AS new_visitors,
            (SELECT count(*) FROM per_person WHERE visits > 1)  AS repeat_visitors,
            (SELECT coalesce(sum(enters_zone), 0) FROM marked)  AS total_headcount`,
    scopeParams(q),
  );

  return {
    totalVisitors: num(row?.total_visitors),
    newVisitors: num(row?.new_visitors),
    repeatedVisitors: num(row?.repeat_visitors),
    totalHeadcount: num(row?.total_headcount),
  };
}

/** Gender split, counted per person rather than per detection. */
export async function getGenderDistribution(
  q: ParsedVisitorsQuery,
): Promise<GenderDistribution> {
  const rows = await query<Record<string, string>>(
    `${SCOPE},
     resolved AS (
       SELECT face_id, mode() WITHIN GROUP (ORDER BY gender) AS gender
       FROM cohort WHERE gender IS NOT NULL GROUP BY face_id
     )
     SELECT gender, count(*) AS people FROM resolved GROUP BY gender`,
    scopeParams(q),
  );

  const by = new Map(rows.map((r) => [r.gender, num(r.people)]));
  return { male: by.get("male") ?? 0, female: by.get("female") ?? 0 };
}

/**
 * Age distribution across decade bands.
 *
 * Every band is present in the response even when empty, so the chart keeps a
 * stable set of categories instead of bars appearing and disappearing as the
 * filters change.
 */
export async function getAgeDistribution(q: ParsedVisitorsQuery): Promise<AgeDistribution> {
  const rows = await query<Record<string, string>>(
    `${SCOPE},
     resolved AS (
       SELECT face_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY age)::int AS age
       FROM cohort GROUP BY face_id
     )
     SELECT CASE WHEN age IS NULL THEN 'Unknown'
                 ELSE (floor(age / 10) * 10)::int::text || 's' END AS band,
            count(*) AS people
     FROM resolved GROUP BY band`,
    scopeParams(q),
  );

  const by = new Map(rows.map((r) => [r.band, num(r.people)]));
  const out = {} as AgeDistribution;
  for (const band of AGE_BANDS) out[band as AgeBand] = by.get(band) ?? 0;
  return out;
}

/** Happiness index over time, plus the headline figures above the chart. */
export async function getHappinessTimeseries(
  q: ParsedVisitorsQuery,
): Promise<HappinessTimeseriesResponse> {
  const unit = truncUnit(q.granularity);

  const params = scopeParams(q);

  // Two queries, run in parallel:
  //   - the chart's buckets, at whatever granularity was asked for
  //   - the most recent DAY, which the headline gauge shows
  //
  // The gauge must not move when the user changes chart resolution. Granularity
  // controls how finely the line is drawn; it is not a change to the question
  // being asked, so the headline figure has to be computed independently of it.
  const [rows, latestDay] = await Promise.all([
    // `samples` comes back alongside each bucket because the summary figures
    // below are meaningless without knowing how much data backs each point.
    query<Record<string, string>>(
      `${SCOPE}
       SELECT ${localBucket(unit)} AS bucket,
              round(avg(${HAPPINESS}), 1) AS value,
              count(*) AS samples
       FROM cohort WHERE emotion IS NOT NULL
       GROUP BY 1 ORDER BY 1`,
      params,
    ),
    query<Record<string, string>>(
      `${SCOPE}
       SELECT round(avg(${HAPPINESS}), 1) AS value
       FROM cohort WHERE emotion IS NOT NULL
       GROUP BY ${localBucket("day")}
       ORDER BY ${localBucket("day")} DESC
       LIMIT 1`,
      params,
    ),
  ]);

  const buckets = rows.map((r) => ({
    time: new Date(r.bucket).toISOString(),
    value: num(r.value),
    samples: num(r.samples),
  }));

  const timeseries: HappinessPoint[] = buckets.map(({ time, value }) => ({ time, value }));

  if (buckets.length === 0) {
    return { score: 0, average: 0, peak: 0, lowest: 0, timeseries };
  }

  // Weighted by sample count, not a mean of means. At hourly granularity a
  // 3-detection bucket at 2am would otherwise carry the same weight as a
  // 900-detection bucket at lunchtime, and the average would drift as soon as
  // the user changed granularity — even though the underlying data is
  // identical.
  const totalSamples = buckets.reduce((a, b) => a + b.samples, 0);
  const average = totalSamples
    ? buckets.reduce((a, b) => a + b.value * b.samples, 0) / totalSamples
    : 0;

  // Peak and lowest are quoted as facts about the venue, so a bucket with a
  // handful of readings must not be allowed to set them. The floor scales with
  // the bucket size, so it adapts to whatever granularity was requested.
  const meanSamples = totalSamples / buckets.length;
  const floor = Math.max(5, meanSamples * 0.2);
  const solid = buckets.filter((b) => b.samples >= floor);
  const basis = solid.length > 0 ? solid : buckets;
  const values = basis.map((b) => b.value);

  return {
    // Most recent day, independent of the chart's bucket size.
    score: latestDay.length > 0 ? num(latestDay[0].value) : basis[basis.length - 1].value,
    average: +average.toFixed(1),
    peak: Math.max(...values),
    lowest: Math.min(...values),
    timeseries,
  };
}

// ---------------------------------------------------------------------------
// Happiness split by demographic
// ---------------------------------------------------------------------------

/**
 * Average happiness per gender.
 *
 * The person's gender is resolved first, then their detections are scored —
 * so a single misread frame cannot move someone between groups.
 */
export async function getGenderHappiness(q: ParsedVisitorsQuery): Promise<GenderHappiness> {
  const rows = await query<Record<string, string>>(
    `${SCOPE},
     resolved AS (
       SELECT face_id, mode() WITHIN GROUP (ORDER BY gender) AS gender
       FROM cohort WHERE gender IS NOT NULL GROUP BY face_id
     )
     SELECT r.gender, round(avg(${HAPPINESS}), 1) AS happiness
     FROM cohort c JOIN resolved r USING (face_id)
     WHERE c.emotion IS NOT NULL
     GROUP BY r.gender`,
    scopeParams(q),
  );

  const by = new Map(rows.map((r) => [r.gender, num(r.happiness)]));
  return { male: by.get("male") ?? 0, female: by.get("female") ?? 0 };
}

/** Average happiness per age band, resolved per person first. */
export async function getAgeHappiness(q: ParsedVisitorsQuery): Promise<AgeHappiness> {
  const rows = await query<Record<string, string>>(
    `${SCOPE},
     resolved AS (
       SELECT face_id,
              CASE WHEN percentile_cont(0.5) WITHIN GROUP (ORDER BY age) IS NULL THEN 'Unknown'
                   ELSE (floor(percentile_cont(0.5) WITHIN GROUP (ORDER BY age) / 10) * 10)::int::text || 's'
              END AS band
       FROM cohort GROUP BY face_id
     )
     SELECT r.band, round(avg(${HAPPINESS}), 1) AS happiness
     FROM cohort c JOIN resolved r USING (face_id)
     WHERE c.emotion IS NOT NULL
     GROUP BY r.band`,
    scopeParams(q),
  );

  const by = new Map(rows.map((r) => [r.band, num(r.happiness)]));
  const out = {} as AgeHappiness;
  for (const band of AGE_BANDS) out[band as AgeBand] = by.get(band) ?? 0;
  return out;
}

// ---------------------------------------------------------------------------
// Time series
// ---------------------------------------------------------------------------

/**
 * Visitors over time, split into first-time and returning.
 *
 * Within each bucket a person is "new" if this bucket holds their FIRST
 * appearance in the selected range. Summing `new` across buckets therefore
 * reproduces the range's unique-visitor total, which is the property that makes
 * the stacked chart add up.
 */
export async function getVisitorsTimeseries(
  q: ParsedVisitorsQuery,
): Promise<VisitorsTimeseriesResponse> {
  const unit = truncUnit(q.granularity);

  const rows = await query<Record<string, string>>(
    `${SCOPE},
     bucketed AS (
       SELECT face_id, ${localBucket(unit)} AS bucket FROM cohort GROUP BY 1, 2
     ),
     first_bucket AS (
       SELECT face_id, min(bucket) AS first_bucket FROM bucketed GROUP BY face_id
     )
     SELECT b.bucket,
            count(*) AS total,
            count(*) FILTER (WHERE b.bucket = f.first_bucket) AS new_visitors,
            count(*) FILTER (WHERE b.bucket > f.first_bucket) AS repeated
     FROM bucketed b JOIN first_bucket f USING (face_id)
     GROUP BY b.bucket ORDER BY b.bucket`,
    scopeParams(q),
  );

  return {
    timeseries: rows.map((r) => ({
      time: new Date(r.bucket).toISOString(),
      total: num(r.total),
      new: num(r.new_visitors),
      repeated: num(r.repeated),
    })),
  };
}

/** Unique visitors per bucket, split by resolved gender. */
export async function getGenderTimeseries(
  q: ParsedVisitorsQuery,
): Promise<GenderTimeseriesResponse> {
  const unit = truncUnit(q.granularity);

  const rows = await query<Record<string, string>>(
    `${SCOPE},
     resolved AS (
       SELECT face_id, mode() WITHIN GROUP (ORDER BY gender) AS gender
       FROM cohort WHERE gender IS NOT NULL GROUP BY face_id
     ),
     bucketed AS (
       SELECT ${localBucket(unit)} AS bucket, c.face_id, r.gender
       FROM cohort c JOIN resolved r USING (face_id)
       GROUP BY 1, 2, 3
     )
     SELECT bucket,
            count(*) FILTER (WHERE gender = 'male')   AS male,
            count(*) FILTER (WHERE gender = 'female') AS female
     FROM bucketed GROUP BY bucket ORDER BY bucket`,
    scopeParams(q),
  );

  const timeseries = rows.map((r) => ({
    time: new Date(r.bucket).toISOString(),
    male: num(r.male),
    female: num(r.female),
  }));

  return { totals: await getGenderDistribution(q), timeseries };
}

/** Unique visitors per bucket, split by resolved age band. */
export async function getAgeTimeseries(q: ParsedVisitorsQuery): Promise<AgeTimeseriesResponse> {
  const unit = truncUnit(q.granularity);

  const rows = await query<Record<string, string>>(
    `${SCOPE},
     resolved AS (
       SELECT face_id,
              CASE WHEN percentile_cont(0.5) WITHIN GROUP (ORDER BY age) IS NULL THEN 'Unknown'
                   ELSE (floor(percentile_cont(0.5) WITHIN GROUP (ORDER BY age) / 10) * 10)::int::text || 's'
              END AS band
       FROM cohort GROUP BY face_id
     ),
     bucketed AS (
       SELECT ${localBucket(unit)} AS bucket, c.face_id, r.band
       FROM cohort c JOIN resolved r USING (face_id)
       GROUP BY 1, 2, 3
     )
     SELECT bucket, band, count(*) AS people
     FROM bucketed GROUP BY bucket, band ORDER BY bucket`,
    scopeParams(q),
  );

  // Every band appears in every bucket, even at zero, so the stacked chart
  // keeps a stable set of series instead of layers popping in and out.
  const byBucket = new Map<string, AgeTimeseriesPoint>();
  for (const r of rows) {
    const time = new Date(r.bucket).toISOString();
    let point = byBucket.get(time);
    if (!point) {
      point = { time } as AgeTimeseriesPoint;
      for (const band of AGE_BANDS) point[band as AgeBand] = 0;
      byBucket.set(time, point);
    }
    if ((AGE_BANDS as readonly string[]).includes(r.band)) {
      point[r.band as AgeBand] = num(r.people);
    }
  }

  return { totals: await getAgeDistribution(q), timeseries: [...byBucket.values()] };
}

// ---------------------------------------------------------------------------
// Heatmaps — day of week x hour of day
// ---------------------------------------------------------------------------

/**
 * Visit arrivals by weekday and hour.
 *
 * Counts VISIT STARTS, not detections. Raw detections would measure where
 * people linger; arrivals measure when they show up, which is what a staffing
 * heatmap is asked for.
 */
export async function getVisitorsHeatmap(q: ParsedVisitorsQuery): Promise<HeatmapResponse> {
  const rows = await query<Record<string, string>>(
    `${STOPS}
     SELECT to_char(started_at AT TIME ZONE site_tz, 'Dy') AS dow,
            EXTRACT(hour FROM started_at AT TIME ZONE site_tz)::int AS hour,
            count(*) AS count
     FROM visits GROUP BY 1, 2`,
    scopeParams(q),
  );

  return { heatmap: fillHeatmap(rows, (r) => ({ count: num(r.count) })) as HeatmapCell[] };
}

/** Average happiness by weekday and hour, with thin cells flagged. */
export async function getHappinessHeatmap(
  q: ParsedVisitorsQuery,
): Promise<HappinessHeatmapResponse> {
  const rows = await query<Record<string, string>>(
    `${SCOPE}
     SELECT to_char(detected_at AT TIME ZONE site_tz, 'Dy') AS dow,
            EXTRACT(hour FROM detected_at AT TIME ZONE site_tz)::int AS hour,
            round(avg(${HAPPINESS}), 1) AS score,
            count(*) AS checks
     FROM cohort WHERE emotion IS NOT NULL GROUP BY 1, 2`,
    scopeParams(q),
  );

  return {
    heatmap: fillHeatmap(rows, (r) => ({
      score: num(r.score),
      lowSample: num(r.checks) < LOW_SAMPLE_CHECKS,
    })) as HappinessHeatmapResponse["heatmap"],
  };
}

/**
 * Expand a sparse day/hour result into the full 7x24 grid.
 * A missing cell means "no traffic", which the UI must render as an empty
 * square rather than a hole in the layout.
 */
function fillHeatmap<T extends object>(
  rows: Record<string, string>[],
  build: (r: Record<string, string>) => T,
): (T & { day: HeatmapDay; hour: number })[] {
  const found = new Map<string, T>();
  for (const r of rows) found.set(`${r.dow}-${r.hour}`, build(r));

  const empty = build({} as Record<string, string>);
  const zeroed = Object.fromEntries(
    Object.entries(empty).map(([k, v]) => [k, typeof v === "number" ? 0 : v]),
  ) as T;

  const out: (T & { day: HeatmapDay; hour: number })[] = [];
  for (const day of HEATMAP_DAYS) {
    for (let hour = 0; hour < 24; hour++) {
      out.push({ ...(found.get(`${day}-${hour}`) ?? zeroed), day, hour });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Waiting time
// ---------------------------------------------------------------------------

/**
 * Time spent in waiting areas.
 *
 * Measured as dwell in zones whose journey phase is "waiting" — the wait is a
 * property of where someone stood, so it is derived from the zone's role rather
 * than from a hardcoded zone name.
 */
export async function getWaitingTime(q: ParsedVisitorsQuery): Promise<WaitingTimeResponse> {
  const unit = truncUnit(q.granularity);

  const rows = await query<Record<string, string>>(
    `${STOPS}
     SELECT ${localBucket(unit, "entered_at")} AS bucket,
            round(avg(dwell_minutes)::numeric, 1) AS minutes
     FROM stops WHERE phase = 'waiting'
     GROUP BY 1 ORDER BY 1`,
    scopeParams(q),
  );

  const timeseries = rows.map((r) => ({
    time: new Date(r.bucket).toISOString(),
    minutes: num(r.minutes),
  }));

  const overall = await queryOne<Record<string, string>>(
    `${STOPS}
     SELECT round(avg(dwell_minutes)::numeric, 1) AS average
     FROM stops WHERE phase = 'waiting'`,
    scopeParams(q),
  );

  return {
    average: num(overall?.average),
    peak: timeseries.length > 0 ? Math.max(...timeseries.map((p) => p.minutes)) : 0,
    timeseries,
  };
}
