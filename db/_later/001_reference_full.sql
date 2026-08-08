-- 001_reference.sql
-- Dimension layer: the small, slow-changing tables that give raw detections meaning.
--
-- Hierarchy: location -> zone -> camera
-- These are "dimensions" in warehouse terms: thousands of rows at most, read
-- constantly, written rarely. They can afford natural keys, foreign keys, and
-- as many indexes as clarity demands. The fact table (002) cannot.

BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
    version     text PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Enumerated domains
-- ---------------------------------------------------------------------------
-- Postgres enums keep the fact table narrow and self-documenting. The trade-off
-- vs. a lookup-table FK: an enum value costs 4 bytes and adding a new label
-- requires ALTER TYPE, while a smallint FK costs 2 bytes and is data-driven.
-- At the raw grain we take the enum for readability; the *weighting* of each
-- emotion lives in a table (below) precisely because it needs to be tunable.

CREATE TYPE gender_t AS ENUM ('male', 'female', 'unknown');

-- The standard 7-class FER set most vision models emit.
CREATE TYPE emotion_t AS ENUM (
    'happy', 'surprise', 'neutral', 'sad', 'fear', 'angry', 'disgust'
);

CREATE TYPE zone_kind_t AS ENUM (
    'entrance', 'hall', 'service_desk', 'waiting', 'cafe', 'retail', 'exit', 'other'
);

-- ---------------------------------------------------------------------------
-- location
-- ---------------------------------------------------------------------------
-- The top of the hierarchy and the tenancy boundary: a site/building. Every
-- permission check, every "which venue" filter, and every local-calendar
-- calculation ultimately resolves here.

CREATE TABLE location (
    location_id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code          text        NOT NULL,   -- natural key, e.g. 'DXB-HQ'
    name          text        NOT NULL,
    -- Analytics are reported in the venue's own local calendar. "Visits today"
    -- in Dubai is not the same window as "visits today" in London, so the
    -- timezone must be an attribute of the location, not a server setting.
    timezone      text        NOT NULL DEFAULT 'UTC',
    opened_at     date,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT location_code_key UNIQUE (code),
    -- Fail loudly at write time rather than silently producing wrong buckets.
    CONSTRAINT location_timezone_valid CHECK (now() AT TIME ZONE timezone IS NOT NULL)
);

COMMENT ON TABLE location IS 'A physical site. Top of the hierarchy and the tenancy/permission boundary.';
COMMENT ON COLUMN location.timezone IS 'IANA name. Local-calendar bucketing for all daily metrics.';

-- ---------------------------------------------------------------------------
-- zone
-- ---------------------------------------------------------------------------
-- An area within a location. Existence-dependent on its parent: a "Cafe" with
-- no location is meaningless, which is why location_id is NOT NULL and the
-- natural key is only unique *within* a location (two sites may both have a
-- zone coded 'CAFE').

CREATE TABLE zone (
    zone_id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    location_id   integer     NOT NULL,
    code          text        NOT NULL,
    name          text        NOT NULL,
    kind          zone_kind_t NOT NULL DEFAULT 'other',
    -- Headcount the area is designed for. Occupancy % is meaningless without it.
    capacity      integer,
    -- Ordering hint for journey/funnel visualisations (entrance early, exit late).
    journey_step  smallint,
    is_active     boolean     NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT zone_location_fk FOREIGN KEY (location_id)
        REFERENCES location (location_id) ON DELETE RESTRICT,
    CONSTRAINT zone_code_key UNIQUE (location_id, code),
    CONSTRAINT zone_capacity_positive CHECK (capacity IS NULL OR capacity > 0)
);

CREATE INDEX zone_location_idx ON zone (location_id);

COMMENT ON TABLE zone IS 'An area within a location. Unique by code per location, not globally.';

-- ---------------------------------------------------------------------------
-- camera
-- ---------------------------------------------------------------------------
-- A physical device. One camera watches exactly one zone (your design call),
-- so the FK lives here and the relationship is a plain one-to-many.
--
-- Cameras are still *movable*, though. Rather than version this row over time,
-- the fact table snapshots zone_id and location_id at detection time (see 002).
-- History is then immutable: remounting a camera cannot rewrite last quarter's
-- numbers. This is the cheaper half of a slowly-changing-dimension treatment
-- and it is the right trade when the parent assignment changes rarely.

CREATE TABLE camera (
    camera_id        integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zone_id          integer     NOT NULL,
    -- Hardware serial / vendor identifier. Globally unique, unlike zone codes:
    -- this is how an ingest payload names its source.
    code             text        NOT NULL,
    name             text        NOT NULL,
    installed_at     timestamptz NOT NULL DEFAULT now(),
    decommissioned_at timestamptz,
    is_active        boolean     NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT camera_zone_fk FOREIGN KEY (zone_id)
        REFERENCES zone (zone_id) ON DELETE RESTRICT,
    CONSTRAINT camera_code_key UNIQUE (code),
    CONSTRAINT camera_lifecycle_ordered
        CHECK (decommissioned_at IS NULL OR decommissioned_at >= installed_at)
);

CREATE INDEX camera_zone_idx ON camera (zone_id);

COMMENT ON TABLE camera IS 'A device watching exactly one zone. code is the identifier used by ingest payloads.';

-- ---------------------------------------------------------------------------
-- emotion_weight
-- ---------------------------------------------------------------------------
-- The Happiness Index is a weighted average of emotions, and the weights are a
-- *business* decision that will be argued over and retuned. Keeping them in a
-- table rather than hardcoded in a CASE expression means retuning the index is
-- an UPDATE, not a migration and a redeploy of every query that uses it.

CREATE TABLE emotion_weight (
    emotion   emotion_t PRIMARY KEY,
    -- 0..100, where 100 is maximally positive. Scaled to match the 0-100
    -- happiness index the dashboard already presents.
    weight    numeric(5,2) NOT NULL,
    CONSTRAINT emotion_weight_range CHECK (weight >= 0 AND weight <= 100)
);

INSERT INTO emotion_weight (emotion, weight) VALUES
    ('happy',    100.00),
    ('surprise',  70.00),
    ('neutral',   50.00),
    ('sad',       20.00),
    ('fear',      15.00),
    ('angry',      5.00),
    ('disgust',    5.00);

COMMENT ON TABLE emotion_weight IS 'Tunable emotion -> happiness score mapping. Drives the Happiness Index.';

INSERT INTO schema_migrations (version) VALUES ('001_reference')
    ON CONFLICT (version) DO NOTHING;

COMMIT;
