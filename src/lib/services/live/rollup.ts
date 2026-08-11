import "server-only";

/**
 * The hourly aggregate layer — `pulse_hourly`, filled by the background job.
 *
 * WHEN TO USE THIS RATHER THAN `STOPS`
 * Only for measures that are ADDITIVE across buckets: detection counts and the
 * emotion sum/count pair. Those roll up from hours into days or weeks with a
 * plain SUM, which is the whole point of storing them at one-hour granularity.
 *
 * Anything counting PEOPLE must not come from here. A distinct count is not
 * additive — somebody in the Cafe at 09:00 and again at 10:00 is one visitor
 * but two rows — so summing `faces` across buckets would overcount them. Those
 * questions are answered from `visit`/`visit_stop` via STOPS, where one row is
 * one real visit and a DISTINCT count stays exact.
 *
 * Averages are always reconstructed as sum/count, never by averaging the
 * per-bucket averages: that would weight a 3-detection hour at 2am the same as
 * a 900-detection hour at lunchtime.
 *
 * Takes the same five bind parameters as the other fragments, so `scopeParams`
 * is unchanged. One consequence of bucketing: the range is matched on the hour
 * a detection falls into, so a range boundary mid-hour includes that whole
 * hour. The dashboard's ranges are day-aligned, where this is exact.
 */
export const HOURLY = /* sql */ `
  WITH cells AS (
    SELECT h.bucket, h.zone_id, z.name AS zone_name, z.phase,
           l.timezone AS site_tz,
           h.gender, h.age_band,
           h.detections, h.faces, h.happiness_sum, h.happiness_checks
    FROM pulse_hourly h
    JOIN zone     z ON z.zone_id     = h.zone_id
    JOIN location l ON l.location_id = z.location_id
    WHERE h.bucket >= $1::timestamptz
      AND h.bucket <  $2::timestamptz
      AND ($3::int[]  IS NULL OR h.zone_id  = ANY($3::int[]))
      AND ($4::text[] IS NULL OR h.gender   = ANY($4::text[]))
      AND ($5::text[] IS NULL OR h.age_band = ANY($5::text[]))
  )
`;
