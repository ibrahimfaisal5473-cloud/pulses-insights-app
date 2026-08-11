import "server-only";

/**
 * Sessionized visits and per-zone stops — now READ from the pre-calculated
 * tables rather than derived from raw pulses on every request.
 *
 * WHAT MOVED, AND WHAT DID NOT
 * The logic itself is unchanged: the same two applications of gaps-and-islands,
 * the same 30-minute session rule, the same sample-weighted happiness. All of
 * it now lives in `refresh_rollups()` (migration 007) and runs on a one-minute
 * background schedule, writing `visit` and `visit_stop`. This module went from
 * sessionizing 200k+ raw rows per widget to selecting from 63k pre-built ones.
 *
 * The two relations this exposes — `stops` and `visits` — keep exactly the
 * column names and meanings they had before, so every query built on top of
 * them is untouched.
 *
 * `visits` is still derived by aggregating `stops` rather than read straight
 * from the `visit` table. That is deliberate: it preserves the previous
 * behaviour under a zone filter, where a visit is summarised from the stops
 * that survive the filter rather than from all of them. Reading `visit`
 * directly would quietly change every zone-filtered figure.
 */
export const STOPS = /* sql */ `
  WITH person_scoped AS (
    -- The demographic filters apply to PEOPLE, not detections. Resolution to
    -- one gender and one age per face already happened in the background job,
    -- so this is now a lookup instead of a per-request aggregation.
    SELECT face_id
    FROM person
    WHERE ($4::text[] IS NULL OR gender   = ANY($4::text[]))
      AND ($5::text[] IS NULL OR age_band = ANY($5::text[]))
  ),
  stops AS (
    SELECT vs.face_id, vs.visit_no, vs.stop_no, vs.zone_id,
           z.name AS zone_name, z.phase, l.timezone AS site_tz,
           vs.entered_at, vs.left_at, vs.dwell_minutes,
           vs.detections, vs.happiness, vs.checks
    FROM visit_stop vs
    JOIN person_scoped ps ON ps.face_id     = vs.face_id
    JOIN zone          z  ON z.zone_id      = vs.zone_id
    JOIN location      l  ON l.location_id  = z.location_id
    -- OVERLAP, not containment. Someone already in the building when the range
    -- begins was previously counted, because the old query filtered raw
    -- detections and simply clipped their visit at the boundary. Matching on
    -- entered_at alone would silently drop every visit in progress at the range
    -- start -- worth ~50 visitors on a 30-day window, which reads as data loss.
    WHERE vs.entered_at <  $2::timestamptz
      AND vs.left_at    >= $1::timestamptz
      AND ($3::int[] IS NULL OR vs.zone_id = ANY($3::int[]))
  ),
  visits AS (
    SELECT face_id, visit_no, min(site_tz) AS site_tz,
           min(entered_at) AS started_at,
           max(left_at)    AS ended_at,
           EXTRACT(EPOCH FROM (max(left_at) - min(entered_at))) / 60.0 AS total_minutes,
           count(*)                AS stop_count,
           count(DISTINCT zone_id) AS zone_count,
           bool_or(phase IN ('service', 'activity')) AS reached_service,
           -- Weighted by sample count so a one-reading stop cannot swing a
           -- whole visit's sentiment.
           sum(happiness * checks) / NULLIF(sum(checks), 0) AS happiness,
           sum(checks) AS checks
    FROM stops
    GROUP BY face_id, visit_no
  )
`;
