import "server-only";
import type { ParsedVisitorsQuery } from "../params";

/**
 * Shared SQL scaffolding for the live (database-backed) services.
 *
 * Every widget answers a question about the SAME slice of data — a date range,
 * a set of zones, and a demographic cohort — so that slice is defined once here
 * and every query builds on it.
 */

/**
 * `filtered` narrows pulses to the range and zones.
 * `person`   resolves each face to ONE gender and ONE age, because the camera
 *            re-estimates both on every detection and they disagree.
 * `cohort`   applies the demographic filters to PEOPLE, not detections — if a
 *            user filters to "female", they mean female visitors, not
 *            detections that happened to be read as female.
 */
export const SCOPE = /* sql */ `
  WITH filtered AS (
    SELECT p.face_id, p.detected_at, p.age, p.gender, p.emotion,
           z.zone_id, z.name AS zone_name, z.phase, z.capacity,
           l.code AS site_code,
           -- Carried through so time buckets can be cut on the OFFICE's local
           -- day rather than the database server's. Without this, "visits
           -- today" silently means "today in whatever timezone the server
           -- happens to run in".
           l.timezone AS site_tz
    FROM pulse p
    JOIN camera   c ON c.camera_id   = p.camera_id
    JOIN zone     z ON z.zone_id     = c.zone_id
    JOIN location l ON l.location_id = z.location_id
    WHERE p.detected_at >= $1::timestamptz
      AND p.detected_at <  $2::timestamptz
      AND ($3::int[] IS NULL OR z.zone_id = ANY($3::int[]))
  ),
  person AS (
    SELECT face_id,
           mode() WITHIN GROUP (ORDER BY gender) AS gender,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY age)::int AS age
    FROM filtered
    GROUP BY face_id
  ),
  person_banded AS (
    SELECT face_id, gender,
           CASE WHEN age IS NULL THEN 'Unknown'
                ELSE (floor(age / 10) * 10)::int::text || 's' END AS age_band
    FROM person
  ),
  cohort AS (
    SELECT f.*
    FROM filtered f
    JOIN person_banded pb USING (face_id)
    WHERE ($4::text[] IS NULL OR pb.gender   = ANY($4::text[]))
      AND ($5::text[] IS NULL OR pb.age_band = ANY($5::text[]))
  )
`;

/** Happiness scale: happy 100, neutral 50, sad 0. */
export const HAPPINESS = `
  CASE emotion WHEN 'happy' THEN 100 WHEN 'neutral' THEN 50 ELSE 0 END
`;

/**
 * Silence longer than this ends a visit and starts a new one.
 *
 * There is no correct value, only a documented one — and the choice directly
 * determines the visits-to-visitors ratio, so it lives in exactly one place.
 */
export const SESSION_GAP_MINUTES = 30;

/**
 * Truncate a timestamp to a bucket in the SITE's local timezone.
 *
 * `date_trunc` alone cuts on the database session's timezone, so a "day" would
 * start at midnight wherever the server is, not midnight at the office. The
 * round trip through `AT TIME ZONE` shifts into local time, truncates there,
 * and shifts back to an absolute instant.
 */
export function localBucket(unit: string, column = "detected_at", tz = "site_tz"): string {
  return `(date_trunc('${unit}', ${column} AT TIME ZONE ${tz}) AT TIME ZONE ${tz})`;
}

/**
 * Zone ids arrive from the URL as strings. Anything non-numeric is dropped
 * rather than passed through — the value reaches an int[] cast, and a bad one
 * would surface as a database type error instead of a clean empty filter.
 */
export function scopeParams(q: ParsedVisitorsQuery): unknown[] {
  const zoneIds = q.zoneIds
    .map((z) => Number.parseInt(z, 10))
    .filter((n) => Number.isInteger(n));

  return [
    q.start.toISOString(),
    // `end` is inclusive in the UI but the SQL uses a half-open range, so push
    // it to the end of that day. Otherwise the final day is silently excluded.
    new Date(q.end.getTime() + 86_400_000).toISOString(),
    zoneIds.length > 0 ? zoneIds : null,
    q.genders.length > 0 ? q.genders : null,
    q.ages.length > 0 ? q.ages : null,
  ];
}

/** pg returns bigint/numeric as strings to avoid silent precision loss. */
export const num = (v: unknown): number => (v === null || v === undefined ? 0 : Number(v));

/** Bucket width for time series. */
export function truncUnit(granularity: string): string {
  switch (granularity) {
    case "hour":
      return "hour";
    case "week":
      return "week";
    case "month":
      return "month";
    default:
      return "day";
  }
}
