import "server-only";
import { query, queryOne } from "./client";

/**
 * The derived metrics, computed from raw pulses.
 *
 * Nothing here is stored — every figure is calculated on read. That is why
 * changing the session gap or the happiness weights is a code change and never
 * a data migration.
 */

export type MetricFilters = {
  from?: string;
  to?: string;
  site?: string;
  zone?: string;
  /** Silence longer than this ends a visit. The single most consequential knob. */
  sessionGapMinutes?: number;
};

export const DEFAULT_SESSION_GAP_MINUTES = 30;

/**
 * Every query starts from this CTE.
 *
 * The `$n IS NULL OR ...` pattern makes each filter optional while keeping the
 * parameter positions fixed, so one SQL string serves every combination of
 * filters. The alternative — concatenating WHERE fragments — means building SQL
 * from variables, which is exactly how injection bugs are born.
 *
 * The explicit `::type` casts are required because Postgres cannot infer the
 * type of a bare parameter that only ever appears next to NULL.
 */
const SCOPED = `
  WITH scoped AS (
    SELECT p.pulse_id, p.face_id, p.detected_at, p.age, p.gender, p.emotion,
           z.zone_id, z.name AS zone_name, z.code AS zone_code,
           l.code AS site_code, l.name AS site_name
    FROM pulse p
    JOIN camera   c ON c.camera_id   = p.camera_id
    JOIN zone     z ON z.zone_id     = c.zone_id
    JOIN location l ON l.location_id = z.location_id
    WHERE ($1::timestamptz IS NULL OR p.detected_at >= $1::timestamptz)
      AND ($2::timestamptz IS NULL OR p.detected_at <  $2::timestamptz)
      AND ($3::text        IS NULL OR l.code = $3::text)
      AND ($4::text        IS NULL OR z.code = $4::text)
  )
`;

function scopeParams(f: MetricFilters) {
  return [f.from ?? null, f.to ?? null, f.site ?? null, f.zone ?? null];
}

/**
 * node-postgres returns bigint and numeric as STRINGS, not numbers — because a
 * PostgreSQL bigint can exceed JavaScript's safe integer range, so silently
 * converting would lose precision. Every count(*) therefore needs converting.
 */
const num = (v: unknown): number => (v === null ? 0 : Number(v));

// ---------------------------------------------------------------------------
// 1. Visits vs visitors vs detections
// ---------------------------------------------------------------------------

export type Summary = {
  detections: number;
  visits: number;
  visitors: number;
  visitsPerVisitor: number;
  detectionsPerVisit: number;
};

export async function getSummary(f: MetricFilters): Promise<Summary> {
  const gap = f.sessionGapMinutes ?? DEFAULT_SESSION_GAP_MINUTES;

  const row = await queryOne<Record<string, string>>(
    `${SCOPED},
     ordered AS (
       SELECT face_id, detected_at,
              LAG(detected_at) OVER (PARTITION BY face_id ORDER BY detected_at) AS prev_seen
       FROM scoped
     ),
     marked AS (
       SELECT face_id,
              CASE WHEN prev_seen IS NULL
                     OR detected_at - prev_seen > make_interval(mins => $5::int)
                   THEN 1 ELSE 0 END AS starts_visit
       FROM ordered
     )
     SELECT count(*)                AS detections,
            coalesce(sum(starts_visit), 0) AS visits,
            count(DISTINCT face_id) AS visitors
     FROM marked`,
    [...scopeParams(f), gap],
  );

  const detections = num(row?.detections);
  const visits = num(row?.visits);
  const visitors = num(row?.visitors);

  return {
    detections,
    visits,
    visitors,
    visitsPerVisitor: visitors ? +(visits / visitors).toFixed(2) : 0,
    detectionsPerVisit: visits ? +(detections / visits).toFixed(1) : 0,
  };
}

// ---------------------------------------------------------------------------
// 2. Demographics — resolved per person, then aggregated
// ---------------------------------------------------------------------------

export type Demographics = {
  gender: { gender: string; people: number; pct: number }[];
  ageBands: { band: string; people: number; pct: number }[];
};

export async function getDemographics(f: MetricFilters): Promise<Demographics> {
  const params = scopeParams(f);

  // mode() picks each person's most frequently observed gender, which cancels
  // out occasional misreads. Counting raw detections instead would weight the
  // result by how long each person lingered in front of a camera.
  const gender = await query<Record<string, string>>(
    `${SCOPED},
     per_person AS (
       SELECT face_id, mode() WITHIN GROUP (ORDER BY gender) AS gender
       FROM scoped WHERE gender IS NOT NULL GROUP BY face_id
     )
     SELECT gender, count(*) AS people,
            round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
     FROM per_person GROUP BY gender ORDER BY people DESC`,
    params,
  );

  // The median resists outliers in a way the mean does not: a handful of wild
  // age estimates cannot drag it.
  const ageBands = await query<Record<string, string>>(
    `${SCOPED},
     per_person AS (
       SELECT face_id, percentile_cont(0.5) WITHIN GROUP (ORDER BY age)::int AS age
       FROM scoped WHERE age IS NOT NULL GROUP BY face_id
     )
     SELECT CASE WHEN age < 25 THEN '18-24'
                 WHEN age < 35 THEN '25-34'
                 WHEN age < 45 THEN '35-44'
                 WHEN age < 55 THEN '45-54'
                 ELSE '55+' END AS band,
            count(*) AS people,
            round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
     FROM per_person GROUP BY band ORDER BY band`,
    params,
  );

  return {
    gender: gender.map((r) => ({
      gender: r.gender,
      people: num(r.people),
      pct: num(r.pct),
    })),
    ageBands: ageBands.map((r) => ({
      band: r.band,
      people: num(r.people),
      pct: num(r.pct),
    })),
  };
}

// ---------------------------------------------------------------------------
// 3. Happiness index — happy 100, neutral 50, sad 0
// ---------------------------------------------------------------------------

const HAPPINESS_SCORE = `
  CASE emotion WHEN 'happy' THEN 100 WHEN 'neutral' THEN 50 ELSE 0 END
`;

export type Happiness = {
  overall: number;
  byZone: { site: string; zone: string; detections: number; happiness: number }[];
  daily: { day: string; detections: number; happiness: number }[];
};

export async function getHappiness(f: MetricFilters): Promise<Happiness> {
  const params = scopeParams(f);

  const overall = await queryOne<Record<string, string>>(
    `${SCOPED}
     SELECT round(avg(${HAPPINESS_SCORE}), 1) AS happiness
     FROM scoped WHERE emotion IS NOT NULL`,
    params,
  );

  const byZone = await query<Record<string, string>>(
    `${SCOPED}
     SELECT site_code AS site, zone_name AS zone, count(*) AS detections,
            round(avg(${HAPPINESS_SCORE}), 1) AS happiness
     FROM scoped WHERE emotion IS NOT NULL
     GROUP BY site_code, zone_name ORDER BY happiness DESC`,
    params,
  );

  const daily = await query<Record<string, string>>(
    `${SCOPED}
     SELECT detected_at::date AS day, count(*) AS detections,
            round(avg(${HAPPINESS_SCORE}), 1) AS happiness
     FROM scoped WHERE emotion IS NOT NULL
     GROUP BY 1 ORDER BY 1`,
    params,
  );

  return {
    overall: num(overall?.happiness),
    byZone: byZone.map((r) => ({
      site: r.site,
      zone: r.zone,
      detections: num(r.detections),
      happiness: num(r.happiness),
    })),
    daily: daily.map((r) => ({
      day: new Date(r.day).toISOString().slice(0, 10),
      detections: num(r.detections),
      happiness: num(r.happiness),
    })),
  };
}

// ---------------------------------------------------------------------------
// 4. Visitor journeys — zone-to-zone movement
// ---------------------------------------------------------------------------

export type Journeys = {
  transitions: { from: string; to: string; journeys: number }[];
};

/**
 * Gaps-and-islands, applied twice:
 *   - a gap in TIME  splits a person's detections into separate visits
 *   - a change in PLACE collapses repeated detections into a single stop
 * What survives is the ordered path a person actually walked.
 */
export async function getJourneys(f: MetricFilters): Promise<Journeys> {
  const gap = f.sessionGapMinutes ?? DEFAULT_SESSION_GAP_MINUTES;

  const rows = await query<Record<string, string>>(
    `${SCOPED},
     ordered AS (
       SELECT face_id, detected_at, zone_id, zone_name,
              LAG(detected_at) OVER (PARTITION BY face_id ORDER BY detected_at) AS prev_seen
       FROM scoped
     ),
     visits AS (
       SELECT *, SUM(CASE WHEN prev_seen IS NULL
                            OR detected_at - prev_seen > make_interval(mins => $5::int)
                          THEN 1 ELSE 0 END)
                 OVER (PARTITION BY face_id ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS visit_no
       FROM ordered
     ),
     zone_changes AS (
       SELECT *, LAG(zone_id) OVER (PARTITION BY face_id, visit_no ORDER BY detected_at) AS prev_zone
       FROM visits
     ),
     stops AS (
       -- IS DISTINCT FROM, not <>: on the first row of a visit prev_zone is
       -- NULL, and NULL <> 5 yields NULL rather than true, losing the flag.
       SELECT *, SUM(CASE WHEN prev_zone IS DISTINCT FROM zone_id THEN 1 ELSE 0 END)
                 OVER (PARTITION BY face_id, visit_no ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS stop_no
       FROM zone_changes
     ),
     collapsed AS (
       SELECT face_id, visit_no, stop_no, zone_name FROM stops
       GROUP BY 1, 2, 3, 4
     ),
     transitions AS (
       SELECT zone_name AS from_zone,
              LEAD(zone_name) OVER (PARTITION BY face_id, visit_no ORDER BY stop_no) AS to_zone
       FROM collapsed
     )
     SELECT from_zone, to_zone, count(*) AS journeys
     FROM transitions WHERE to_zone IS NOT NULL
     GROUP BY 1, 2 ORDER BY journeys DESC`,
    [...scopeParams(f), gap],
  );

  return {
    transitions: rows.map((r) => ({
      from: r.from_zone,
      to: r.to_zone,
      journeys: num(r.journeys),
    })),
  };
}

// ---------------------------------------------------------------------------
// 5. The hierarchy itself
// ---------------------------------------------------------------------------

export type Hierarchy = {
  locations: {
    code: string;
    name: string;
    city: string | null;
    timezone: string;
    zones: { code: string; name: string; capacity: number | null; cameras: number }[];
  }[];
};

export async function getHierarchy(): Promise<Hierarchy> {
  const rows = await query<Record<string, string>>(
    `SELECT l.code AS site_code, l.name AS site_name, l.city, l.timezone,
            z.code AS zone_code, z.name AS zone_name, z.capacity,
            count(c.camera_id) AS cameras
     FROM location l
     JOIN zone z USING (location_id)
     LEFT JOIN camera c USING (zone_id)
     GROUP BY l.code, l.name, l.city, l.timezone, z.code, z.name, z.capacity
     ORDER BY l.code, z.code`,
  );

  const byCode = new Map<string, Hierarchy["locations"][number]>();
  for (const r of rows) {
    let loc = byCode.get(r.site_code);
    if (!loc) {
      loc = {
        code: r.site_code,
        name: r.site_name,
        city: r.city ?? null,
        timezone: r.timezone,
        zones: [],
      };
      byCode.set(r.site_code, loc);
    }
    loc.zones.push({
      code: r.zone_code,
      name: r.zone_name,
      capacity: r.capacity === null ? null : num(r.capacity),
      cameras: num(r.cameras),
    });
  }

  return { locations: [...byCode.values()] };
}
