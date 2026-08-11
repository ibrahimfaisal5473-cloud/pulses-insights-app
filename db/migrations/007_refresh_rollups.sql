-- 007_refresh_rollups.sql
-- The background job that fills the tables from 006.
--
-- INCREMENTAL BY FACE, NOT BY TIME
-- A new pulse can extend a visit that started before the watermark, so
-- processing "only rows newer than X" would leave half-built visits behind.
-- Instead the job finds which FACES have new pulses and rebuilds those people
-- completely, from all of their history. Rebuilding a whole person is cheap
-- (a busy face has a few hundred pulses) and it is always correct -- there is
-- no partial-visit edge case to get wrong, which matters more than shaving
-- milliseconds off a job that runs in the background.
--
-- Recomputing rather than patching also makes the job idempotent: running it
-- twice, or running it after a crash, converges on the same answer.

BEGIN;

CREATE OR REPLACE FUNCTION refresh_rollups(p_full boolean DEFAULT false)
RETURNS TABLE (faces integer, visits integer, stops integer, buckets integer, ms integer)
LANGUAGE plpgsql
AS $$
DECLARE
    v_started    timestamptz := clock_timestamp();
    v_watermark  timestamptz;
    v_high       timestamptz;
    v_faces      integer := 0;
    v_visits     integer := 0;
    v_stops      integer := 0;
    v_buckets    integer := 0;
BEGIN
    -- The job is scheduled every minute; a long run must not overlap itself.
    -- Returning quietly rather than queueing is right for a periodic refresh --
    -- the next tick will pick up whatever this one would have done.
    IF NOT pg_try_advisory_lock(hashtext('refresh_rollups')) THEN
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
        RETURN;
    END IF;

    SELECT last_pulse_at INTO v_watermark FROM rollup_state WHERE id;
    IF p_full OR v_watermark IS NULL THEN
        v_watermark := '-infinity'::timestamptz;
    END IF;

    -- Fixed BEFORE any work, so pulses landing mid-run are simply picked up by
    -- the next tick instead of being skipped by a watermark that moved past
    -- them without processing them.
    SELECT max(detected_at) INTO v_high FROM pulse;
    IF v_high IS NULL THEN
        PERFORM pg_advisory_unlock(hashtext('refresh_rollups'));
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
        RETURN;
    END IF;

    CREATE TEMP TABLE _faces ON COMMIT DROP AS
        SELECT DISTINCT face_id
        FROM pulse
        WHERE detected_at > v_watermark AND detected_at <= v_high;

    SELECT count(*) INTO v_faces FROM _faces;
    IF v_faces = 0 THEN
        UPDATE rollup_state
           SET last_run_at = now(),
               last_run_ms = 0,
               last_faces  = 0,
               runs        = runs + 1
         WHERE id;
        PERFORM pg_advisory_unlock(hashtext('refresh_rollups'));
        RETURN QUERY SELECT 0, 0, 0, 0, 0;
        RETURN;
    END IF;

    -- Every pulse belonging to an affected person, resolved up the hierarchy.
    CREATE TEMP TABLE _scoped ON COMMIT DROP AS
        SELECT p.face_id, p.detected_at, p.age, p.gender, p.emotion,
               z.zone_id, z.phase, l.location_id
        FROM pulse p
        JOIN _faces  f ON f.face_id     = p.face_id
        JOIN camera  c ON c.camera_id   = p.camera_id
        JOIN zone    z ON z.zone_id     = c.zone_id
        JOIN location l ON l.location_id = z.location_id;

    CREATE INDEX ON _scoped (face_id, detected_at);

    -- -----------------------------------------------------------------------
    -- person -- resolve each face to one gender and one age.
    -- -----------------------------------------------------------------------
    WITH resolved AS (
        SELECT face_id,
               COALESCE(mode() WITHIN GROUP (ORDER BY gender), 'unknown') AS gender,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY age)::int      AS age,
               min(detected_at) AS first_seen,
               max(detected_at) AS last_seen,
               count(*)         AS detections
        FROM _scoped
        GROUP BY face_id
    )
    INSERT INTO person (face_id, gender, age, age_band, first_seen, last_seen, detections)
    SELECT face_id, gender, age,
           CASE WHEN age IS NULL THEN 'Unknown'
                ELSE (floor(age / 10) * 10)::int::text || 's' END,
           first_seen, last_seen, detections
    FROM resolved
    ON CONFLICT (face_id) DO UPDATE
       SET gender     = EXCLUDED.gender,
           age        = EXCLUDED.age,
           age_band   = EXCLUDED.age_band,
           first_seen = EXCLUDED.first_seen,
           last_seen  = EXCLUDED.last_seen,
           detections = EXCLUDED.detections;

    -- -----------------------------------------------------------------------
    -- visit + visit_stop -- the same gaps-and-islands logic as before, applied
    -- twice: once over time to split visits, once over place to collapse a run
    -- of detections in one zone into a single stop.
    -- -----------------------------------------------------------------------
    DELETE FROM visit v USING _faces f WHERE v.face_id = f.face_id;  -- stops cascade

    CREATE TEMP TABLE _stops ON COMMIT DROP AS
    WITH ordered AS (
        SELECT *, LAG(detected_at) OVER (PARTITION BY face_id ORDER BY detected_at) AS prev_seen
        FROM _scoped
    ),
    visit_marked AS (
        SELECT *, SUM(CASE WHEN prev_seen IS NULL
                             OR detected_at - prev_seen > make_interval(mins => 30)
                           THEN 1 ELSE 0 END)
                  OVER (PARTITION BY face_id ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS visit_no
        FROM ordered
    ),
    zone_lag AS (
        SELECT *, LAG(zone_id) OVER (PARTITION BY face_id, visit_no ORDER BY detected_at) AS prev_zone
        FROM visit_marked
    ),
    stop_marked AS (
        SELECT *, SUM(CASE WHEN prev_zone IS DISTINCT FROM zone_id THEN 1 ELSE 0 END)
                  OVER (PARTITION BY face_id, visit_no ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS stop_no
        FROM zone_lag
    )
    SELECT face_id, visit_no, stop_no, zone_id, phase, location_id,
           min(detected_at) AS entered_at,
           max(detected_at) AS left_at,
           EXTRACT(EPOCH FROM (max(detected_at) - min(detected_at))) / 60.0 AS dwell_minutes,
           count(*) AS detections,
           avg(CASE emotion WHEN 'happy' THEN 100 WHEN 'neutral' THEN 50 ELSE 0 END)
             FILTER (WHERE emotion IS NOT NULL) AS happiness,
           count(*) FILTER (WHERE emotion IS NOT NULL) AS checks
    FROM stop_marked
    GROUP BY face_id, visit_no, stop_no, zone_id, phase, location_id;

    INSERT INTO visit (face_id, visit_no, location_id, started_at, ended_at,
                       total_minutes, stop_count, zone_count, reached_service,
                       happiness, checks)
    SELECT face_id, visit_no, min(location_id),
           min(entered_at), max(left_at),
           EXTRACT(EPOCH FROM (max(left_at) - min(entered_at))) / 60.0,
           count(*), count(DISTINCT zone_id),
           bool_or(phase IN ('service', 'activity')),
           -- Weighted by sample count, so a one-reading stop cannot swing it.
           sum(happiness * checks) / NULLIF(sum(checks), 0),
           sum(checks)
    FROM _stops
    GROUP BY face_id, visit_no;

    GET DIAGNOSTICS v_visits = ROW_COUNT;

    INSERT INTO visit_stop (face_id, visit_no, stop_no, zone_id, entered_at,
                            left_at, dwell_minutes, detections, happiness, checks)
    SELECT face_id, visit_no, stop_no, zone_id, entered_at, left_at,
           dwell_minutes, detections, happiness, checks
    FROM _stops;

    GET DIAGNOSTICS v_stops = ROW_COUNT;

    -- -----------------------------------------------------------------------
    -- pulse_hourly -- additive statistics at the agreed one-hour granularity.
    --
    -- A bucket is shared by many people, so an affected face invalidates the
    -- whole (hour, zone) cell: the cell is deleted and recomputed from every
    -- pulse in it, not just from the affected person's.
    -- -----------------------------------------------------------------------
    CREATE TEMP TABLE _cells ON COMMIT DROP AS
        SELECT DISTINCT date_trunc('hour', detected_at) AS bucket, zone_id
        FROM _scoped;

    DELETE FROM pulse_hourly h
     USING _cells c
     WHERE h.bucket = c.bucket AND h.zone_id = c.zone_id;

    INSERT INTO pulse_hourly (bucket, zone_id, gender, age_band,
                              detections, faces, happiness_sum, happiness_checks)
    SELECT date_trunc('hour', p.detected_at),
           cam.zone_id,
           pe.gender,
           pe.age_band,
           count(*),
           count(DISTINCT p.face_id),
           COALESCE(sum(CASE p.emotion WHEN 'happy' THEN 100 WHEN 'neutral' THEN 50
                                       WHEN 'sad' THEN 0 END), 0),
           count(*) FILTER (WHERE p.emotion IS NOT NULL)
    FROM pulse p
    JOIN camera cam ON cam.camera_id = p.camera_id
    JOIN person pe  ON pe.face_id    = p.face_id
    JOIN _cells cl  ON cl.bucket = date_trunc('hour', p.detected_at)
                   AND cl.zone_id = cam.zone_id
    GROUP BY 1, 2, 3, 4;

    GET DIAGNOSTICS v_buckets = ROW_COUNT;

    UPDATE rollup_state
       SET last_pulse_at = v_high,
           last_run_at   = now(),
           last_run_ms   = (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int,
           last_faces    = v_faces,
           runs          = runs + 1
     WHERE id;

    PERFORM pg_advisory_unlock(hashtext('refresh_rollups'));

    RETURN QUERY SELECT v_faces, v_visits, v_stops, v_buckets,
                        (EXTRACT(EPOCH FROM (clock_timestamp() - v_started)) * 1000)::int;
END;
$$;

COMMENT ON FUNCTION refresh_rollups(boolean) IS
    'Rebuilds person/visit/visit_stop/pulse_hourly for faces seen since the watermark. Pass true for a full rebuild.';

-- ---------------------------------------------------------------------------
-- Retention: drop raw pulses past the window, in the background.
--
-- Derived tables are NOT touched -- that is the whole point. Statistics for
-- 2025 survive even once the raw detections behind them are gone; what is lost
-- is only the ability to re-derive that period, which is what the retention
-- window is trading away.
--
-- Deletes in bounded batches so a purge can never hold a long transaction
-- against the ingestion path.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION purge_old_pulses(p_retain_days integer DEFAULT 90,
                                            p_batch integer DEFAULT 50000)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff  timestamptz := now() - make_interval(days => p_retain_days);
    v_deleted integer := 0;
    v_batch   integer;
BEGIN
    LOOP
        DELETE FROM pulse
         WHERE ctid IN (SELECT ctid FROM pulse WHERE detected_at < v_cutoff LIMIT p_batch);
        GET DIAGNOSTICS v_batch = ROW_COUNT;
        v_deleted := v_deleted + v_batch;
        EXIT WHEN v_batch = 0;
    END LOOP;
    RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION purge_old_pulses(integer, integer) IS
    'Deletes raw pulses older than the retention window in batches. Derived statistics are left intact.';

COMMIT;
