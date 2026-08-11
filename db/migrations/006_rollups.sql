-- 006_rollups.sql
-- Pre-calculated statistics, refreshed by a background job.
--
-- WHY THIS EXISTS
-- Until now every dashboard widget re-derived visits and journeys from raw
-- pulses on every request: ~1.4s a widget, ~4.5s a page, because each one
-- sessionized 200k+ rows from scratch. The work is identical every time and
-- the inputs rarely change, so it belongs in a background job, not in the
-- request path.
--
-- TWO LAYERS, NOT ONE
-- Hourly buckets alone cannot answer "how many unique visitors". A distinct
-- count is not additive: somebody seen at 09:00 and again at 14:00 is one
-- visitor but appears in two buckets, and summing the buckets counts them
-- twice. Any design that pre-aggregates only to hourly counters quietly
-- inflates its visitor numbers. So:
--
--   person / visit / visit_stop  -- visitor grain. Small (2.5k / 18.5k / 63.5k
--                                   rows against 626k pulses), so counting
--                                   DISTINCT people over any date range stays
--                                   exact AND fast.
--   pulse_hourly                 -- hour x zone x gender x age band. Holds only
--                                   ADDITIVE measures, so rolling hours up into
--                                   days or weeks is a plain SUM.
--
-- The 30-minute session rule and every other business rule are unchanged --
-- the same SQL now runs on a schedule instead of per request.

BEGIN;

-- ---------------------------------------------------------------------------
-- person -- one resolved identity per face.
--
-- The camera re-estimates age and gender on every frame and they disagree, so
-- each face is collapsed to one value before anything counts it.
--
-- BEHAVIOUR CHANGE, DELIBERATE: this resolves over a person's WHOLE history,
-- where the old query resolved within whichever date range was being viewed.
-- A precomputed table cannot depend on the viewer's filter. It is also the
-- better answer -- somebody's age band should not change because you looked at
-- a different week -- but it can shift a demographic count by a person or two
-- against the old behaviour.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS person (
    face_id      text        PRIMARY KEY,
    gender       text        NOT NULL,
    age          smallint,
    age_band     text        NOT NULL,
    first_seen   timestamptz NOT NULL,
    last_seen    timestamptz NOT NULL,
    detections   integer     NOT NULL
);

-- ---------------------------------------------------------------------------
-- visit -- one row per person per session. The 30-minute rule lives here.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit (
    face_id         text        NOT NULL,
    visit_no        integer     NOT NULL,
    location_id     integer     NOT NULL REFERENCES location (location_id),
    started_at      timestamptz NOT NULL,
    ended_at        timestamptz NOT NULL,
    total_minutes   numeric     NOT NULL,
    stop_count      integer     NOT NULL,
    zone_count      integer     NOT NULL,
    reached_service boolean     NOT NULL,
    -- Weighted by sample count so a one-reading stop cannot swing a visit.
    happiness       numeric,
    checks          integer     NOT NULL,
    PRIMARY KEY (face_id, visit_no)
);

CREATE INDEX IF NOT EXISTS visit_started_at_idx ON visit (started_at);

-- ---------------------------------------------------------------------------
-- visit_stop -- one row per zone arrival within a visit. Journeys and dwell.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS visit_stop (
    face_id       text        NOT NULL,
    visit_no      integer     NOT NULL,
    stop_no       integer     NOT NULL,
    zone_id       integer     NOT NULL REFERENCES zone (zone_id),
    entered_at    timestamptz NOT NULL,
    left_at       timestamptz NOT NULL,
    dwell_minutes numeric     NOT NULL,
    detections    integer     NOT NULL,
    happiness     numeric,
    checks        integer     NOT NULL,
    PRIMARY KEY (face_id, visit_no, stop_no),
    FOREIGN KEY (face_id, visit_no) REFERENCES visit (face_id, visit_no) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS visit_stop_entered_at_idx ON visit_stop (entered_at);
CREATE INDEX IF NOT EXISTS visit_stop_zone_idx       ON visit_stop (zone_id);

-- ---------------------------------------------------------------------------
-- pulse_hourly -- the aggregated statistics, at the agreed one-hour minimum.
--
-- Only additive measures. Sums and counts roll up into any coarser bucket with
-- a plain SUM; averages are reconstructed at read time as sum/count, never by
-- averaging averages, which would weight a quiet hour the same as a busy one.
--
-- `bucket` is truncated in UTC. Every site here is a whole-hour offset with no
-- DST, so a UTC hour boundary is also a local hour boundary, and grouping into
-- local days at read time stays correct.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pulse_hourly (
    bucket           timestamptz NOT NULL,
    zone_id          integer     NOT NULL REFERENCES zone (zone_id),
    -- NOT NULL with explicit 'unknown' members: these are primary key columns,
    -- and NULLs there would not deduplicate.
    gender           text        NOT NULL,
    age_band         text        NOT NULL,
    detections       integer     NOT NULL,
    -- Distinct faces IN THIS BUCKET. Useful per-hour, deliberately NOT summed
    -- across buckets -- that is what the visit table is for.
    faces            integer     NOT NULL,
    happiness_sum    numeric     NOT NULL,
    happiness_checks integer     NOT NULL,
    PRIMARY KEY (bucket, zone_id, gender, age_band)
);

CREATE INDEX IF NOT EXISTS pulse_hourly_bucket_idx ON pulse_hourly (bucket);

-- ---------------------------------------------------------------------------
-- rollup_state -- the watermark. One row, enforced.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rollup_state (
    id               boolean     PRIMARY KEY DEFAULT true CHECK (id),
    last_pulse_at    timestamptz,
    last_run_at      timestamptz,
    last_run_ms      integer,
    last_faces       integer,
    runs             bigint      NOT NULL DEFAULT 0
);

INSERT INTO rollup_state (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE person       IS 'One resolved identity per face. Rebuilt by refresh_rollups().';
COMMENT ON TABLE visit        IS 'Sessionized visits, 30-minute gap rule. Rebuilt by refresh_rollups().';
COMMENT ON TABLE visit_stop   IS 'Zone stops within a visit. Basis for journeys and dwell.';
COMMENT ON TABLE pulse_hourly IS 'Additive detection statistics at one-hour granularity.';
COMMENT ON TABLE rollup_state IS 'Watermark and timings for the background rollup job.';

COMMIT;
