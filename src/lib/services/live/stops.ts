import "server-only";
import { HAPPINESS, SCOPE, SESSION_GAP_MINUTES } from "./scope";

/**
 * Sessionized visits and per-zone stops — the foundation for every journey,
 * dwell, and sentiment metric.
 *
 * Two applications of gaps-and-islands, stacked:
 *
 *   1. A gap in TIME splits one person's detections into separate visits.
 *   2. A change in PLACE collapses the run of detections inside one zone into a
 *      single stop.
 *
 * What survives is the ordered path each person walked, with a dwell time and
 * an average sentiment per stop.
 *
 * Exposes two relations:
 *   stops  — one row per (person, visit, zone arrival)
 *   visits — one row per (person, visit)
 */
export const STOPS = /* sql */ `
  ${SCOPE},
  ordered AS (
    SELECT face_id, detected_at, zone_id, zone_name, phase, emotion, site_tz,
           LAG(detected_at) OVER (PARTITION BY face_id ORDER BY detected_at) AS prev_seen
    FROM cohort
  ),
  visit_marked AS (
    SELECT *, SUM(CASE WHEN prev_seen IS NULL
                         OR detected_at - prev_seen > make_interval(mins => ${SESSION_GAP_MINUTES})
                       THEN 1 ELSE 0 END)
              OVER (PARTITION BY face_id ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS visit_no
    FROM ordered
  ),
  zone_lag AS (
    -- Partitioned by (face_id, visit_no), NOT face_id alone. Lagging across a
    -- visit boundary would compare the first zone of today against the last
    -- zone of yesterday and, if they matched, silently merge two visits'
    -- stops into one.
    SELECT *, LAG(zone_id) OVER (PARTITION BY face_id, visit_no ORDER BY detected_at) AS prev_zone
    FROM visit_marked
  ),
  stop_marked AS (
    SELECT *, SUM(CASE WHEN prev_zone IS DISTINCT FROM zone_id THEN 1 ELSE 0 END)
              OVER (PARTITION BY face_id, visit_no ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS stop_no
    FROM zone_lag
  ),
  stops AS (
    SELECT face_id, visit_no, stop_no, zone_id, zone_name, phase, site_tz,
           min(detected_at) AS entered_at,
           max(detected_at) AS left_at,
           -- Dwell is the observed span between first and last detection in the
           -- zone. It slightly UNDERSTATES reality (a person is present before
           -- the first frame that recognises them and after the last), and a
           -- single-detection stop measures zero. Honest and consistent, which
           -- matters more here than a fudge factor.
           EXTRACT(EPOCH FROM (max(detected_at) - min(detected_at))) / 60.0 AS dwell_minutes,
           count(*) AS detections,
           avg(${HAPPINESS}) FILTER (WHERE emotion IS NOT NULL) AS happiness,
           count(*) FILTER (WHERE emotion IS NOT NULL) AS checks
    FROM stop_marked
    GROUP BY face_id, visit_no, stop_no, zone_id, zone_name, phase, site_tz
  ),
  visits AS (
    SELECT face_id, visit_no, site_tz,
           min(entered_at) AS started_at,
           max(left_at)    AS ended_at,
           EXTRACT(EPOCH FROM (max(left_at) - min(entered_at))) / 60.0 AS total_minutes,
           count(*)        AS stop_count,
           count(DISTINCT zone_id) AS zone_count,
           bool_or(phase IN ('service', 'activity')) AS reached_service,
           -- Weighted by sample count so a one-reading stop cannot swing a
           -- whole visit's sentiment.
           sum(happiness * checks) / NULLIF(sum(checks), 0) AS happiness,
           sum(checks) AS checks
    FROM stops
    GROUP BY face_id, visit_no, site_tz
  )
`;
