-- 002_pulses.sql
-- The fact table: one row per detection of one face by one camera.
--
-- Everything about this table is shaped by two numbers:
--   1,000 pulses/sec  ->   86,400,000 rows/day
--                     ->  ~2.6 billion rows/month
--   at ~100 bytes/row ->     ~8.6 GB/day of raw heap
--
-- At that volume the usual instincts invert. Foreign keys, rich indexes and
-- per-row round trips are all affordable on a dimension table and ruinous
-- here. Each decision below says what it costs and why it was made.

BEGIN;

-- ---------------------------------------------------------------------------
-- pulse
-- ---------------------------------------------------------------------------
-- Append-only and immutable. A detection is a historical event: it is never
-- updated and never individually deleted, only aged out by dropping whole
-- partitions. That immutability is what lets every derived metric be recomputed
-- from scratch if the logic changes.

CREATE TABLE pulse (
    -- Column order is deliberate: 8-byte types, then 4-byte, then 2-byte, then
    -- variable-length last. Postgres aligns fixed-width columns, so declaring
    -- them widest-first avoids padding bytes. On 2.6B rows, a few wasted bytes
    -- per row is gigabytes of dead weight.
    detected_at   timestamptz NOT NULL,          -- when the camera saw the face
    ingested_at   timestamptz NOT NULL DEFAULT now(),  -- when we stored it; the gap is pipeline lag
    pulse_id      bigint GENERATED ALWAYS AS IDENTITY,

    camera_id     integer     NOT NULL,
    -- zone_id and location_id are DENORMALISED on purpose, and the reason is
    -- correctness before it is speed. They record where the detection was
    -- attributed *at the moment it happened*. If a camera is later remounted in
    -- another zone, history stays true instead of silently re-attributing.
    -- The speed argument is real too: no 3-table join on the hottest read path.
    zone_id       integer     NOT NULL,
    location_id   integer     NOT NULL,

    gender        gender_t,
    emotion       emotion_t,
    -- The vision model's per-frame estimate. Deliberately nullable: a detection
    -- with an unreadable face is still a valid detection for footfall.
    age           smallint,

    -- The external identifier emitted by the vision system. Kept as text at the
    -- raw grain so ingest never has to look anything up or reject a payload
    -- whose format changed. Resolution to an internal visitor_id happens later,
    -- in the derived layer, off the write path.
    face_id       text        NOT NULL,

    CONSTRAINT pulse_age_sane CHECK (age IS NULL OR (age >= 0 AND age <= 120))
) PARTITION BY RANGE (detected_at);

-- NOTE ON WHAT IS *NOT* HERE:
--
-- No PRIMARY KEY. pulse_id is an identity column, so every row still gets a
-- unique traceable value, but there is no unique B-tree enforcing it. A unique
-- index on a partitioned table must contain the partition key, making it
-- (detected_at, pulse_id) -- an index maintained on all 1,000 inserts/sec for
-- no analytical benefit. Deduplication belongs in the ingest layer, where an
-- idempotency key can reject a replayed batch far more cheaply.
--
-- No FOREIGN KEYS to camera/zone/location. Each FK is an index lookup plus a
-- row lock on the parent on *every insert*. Referential integrity is instead
-- enforced where the data enters: ingest resolves a camera code to its ids and
-- rejects unknown cameras once per batch, not once per row.
--
-- These are the two decisions most worth being able to defend out loud.

COMMENT ON TABLE pulse IS 'Immutable fact table. One row = one detection. Partitioned daily by detected_at.';
COMMENT ON COLUMN pulse.zone_id IS 'Snapshot at detection time so remounting a camera cannot rewrite history.';
COMMENT ON COLUMN pulse.face_id IS 'External vision-system id. Resolved to visitor_id in the derived layer.';

-- ---------------------------------------------------------------------------
-- Partitioning
-- ---------------------------------------------------------------------------
-- Daily range partitions. At target load each holds ~86M rows / ~8.6 GB, which
-- is a sane unit to vacuum, index, detach and drop. Monthly would mean 2.6B-row
-- partitions and defeat the purpose; hourly would multiply planning overhead.
--
-- The three things partitioning buys us:
--   * pruning     - a 7-day dashboard query touches 7 partitions, not the heap
--   * retention   - DROP an old partition is instant; DELETE of 86M rows is not
--   * maintenance - vacuum/analyze work on one day at a time

-- A default partition means a pulse with an unexpected timestamp (clock skew on
-- a camera, a delayed replay) is stored rather than rejected -- the requirement
-- says "without data loss". The cost: attaching a new partition must scan the
-- default to prove no rows belong in the new range, so it should be kept empty
-- and monitored as an alarm rather than used as a landing zone.
CREATE TABLE pulse_default PARTITION OF pulse DEFAULT;

-- Create partitions ahead of time. Ingest must never be the thing that
-- discovers a partition is missing, so this runs on a schedule with a lead of
-- several days.
CREATE OR REPLACE FUNCTION ensure_pulse_partitions(
    from_day date,
    to_day   date
) RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
    d       date := from_day;
    made    integer := 0;
    part    text;
BEGIN
    WHILE d <= to_day LOOP
        part := format('pulse_%s', to_char(d, 'YYYYMMDD'));

        IF to_regclass(part) IS NULL THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF pulse FOR VALUES FROM (%L) TO (%L)',
                part, d::timestamptz, (d + 1)::timestamptz
            );

            -- BRIN, not B-tree, on the time column.
            --
            -- Rows arrive in roughly timestamp order, so physical position on
            -- disk correlates with detected_at. BRIN stores only min/max per
            -- block range: a few KB per partition instead of gigabytes, and
            -- almost nothing to maintain on insert. A B-tree here would be
            -- larger than the data it indexes and would tax every write.
            EXECUTE format(
                'CREATE INDEX %I ON %I USING brin (detected_at) WITH (pages_per_range = 32)',
                part || '_detected_brin', part
            );

            -- Zone is the near-universal dashboard filter and has very low
            -- cardinality, so BRIN suits it too *provided* ingest keeps rows
            -- time-clustered. Revisit with real numbers before adding B-trees.
            EXECUTE format(
                'CREATE INDEX %I ON %I USING brin (zone_id) WITH (pages_per_range = 32)',
                part || '_zone_brin', part
            );

            made := made + 1;
        END IF;

        d := d + 1;
    END LOOP;

    RETURN made;
END;
$$;

COMMENT ON FUNCTION ensure_pulse_partitions IS 'Idempotently create daily pulse partitions with their BRIN indexes.';

-- Retention: drop whole partitions older than a cutoff. Face ids are biometric
-- identifiers, so how long raw detections live is a privacy decision as much as
-- a storage one -- derived aggregates outlive the raw rows they came from.
CREATE OR REPLACE FUNCTION drop_pulse_partitions_before(cutoff date)
RETURNS TABLE (dropped text)
LANGUAGE plpgsql
AS $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT c.relname
        FROM pg_class c
        JOIN pg_inherits i ON i.inhrelid = c.oid
        JOIN pg_class p ON p.oid = i.inhparent
        WHERE p.relname = 'pulse'
          AND c.relname ~ '^pulse_[0-9]{8}$'
          AND to_date(right(c.relname, 8), 'YYYYMMDD') < cutoff
    LOOP
        EXECUTE format('DROP TABLE %I', r.relname);
        dropped := r.relname;
        RETURN NEXT;
    END LOOP;
END;
$$;

COMMENT ON FUNCTION drop_pulse_partitions_before IS 'Instant retention enforcement by dropping aged partitions.';

INSERT INTO schema_migrations (version) VALUES ('002_pulses')
    ON CONFLICT (version) DO NOTHING;

COMMIT;
