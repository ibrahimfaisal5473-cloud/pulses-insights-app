-- 001_location.sql
-- Top of the hierarchy: Location -> Zone -> Camera -> Pulse
--                      ^^^^^^^^
-- One row per physical site (an office building).

CREATE TABLE location (
    -- Surrogate primary key: a meaningless auto-generated number.
    -- Preferred over using `code` as the key because real-world values change,
    -- and anything other tables point at should never have to change.
    location_id  integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Natural key: the short identifier humans actually use.
    -- UNIQUE prevents two sites sharing a code.
    code         text        NOT NULL UNIQUE,

    name         text        NOT NULL,
    city         text,
    country      text,

    -- IANA timezone, e.g. 'Asia/Dubai'. Every "per day" metric depends on it:
    -- a day boundary is local to the site, not to the server.
    timezone     text        NOT NULL DEFAULT 'UTC',

    -- timestamptz, never timestamp. timestamptz records a real moment in time;
    -- timestamp stores an ambiguous wall-clock reading with no zone attached.
    created_at   timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  location          IS 'A physical site. Top of the hierarchy.';
COMMENT ON COLUMN location.code     IS 'Short human-facing identifier, e.g. DXB-HQ.';
COMMENT ON COLUMN location.timezone IS 'IANA name. Defines the local day for daily metrics.';
