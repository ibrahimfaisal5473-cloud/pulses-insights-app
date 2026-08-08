-- 001_location.sql
-- The top of the hierarchy: one row per physical site.
--
--   Location -> Zone -> Camera -> Pulse
--   ^^^^^^^^

CREATE TABLE location (
    -- Surrogate primary key. GENERATED ALWAYS AS IDENTITY is the modern SQL
    -- standard way to auto-number rows; you may see the older `serial` in
    -- tutorials, but identity is what new Postgres code should use.
    -- "ALWAYS" means the database refuses an INSERT that tries to supply its
    -- own id, which keeps the sequence authoritative.
    location_id  integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Natural key: a short code humans actually use ('DXB-HQ').
    -- UNIQUE stops two sites sharing a code. It is not the PRIMARY KEY because
    -- codes can be renamed, and anything other tables point at should never
    -- need to change.
    code         text        NOT NULL UNIQUE,

    -- Display name. NOT NULL: a site without a name is meaningless, and the
    -- database enforces that regardless of which app is writing.
    name         text        NOT NULL,

    -- Nullable on purpose. NULL here means "we don't know yet", which is a
    -- different fact from an empty string meaning "known to be blank".
    address      text,
    city         text,
    country      text,

    -- IANA timezone name, e.g. 'Asia/Dubai'.
    -- Every "per day" metric depends on this. A day boundary is local to the
    -- site, so the timezone belongs to the site -- not to the server, and not
    -- to whoever happens to be looking at the dashboard.
    timezone     text        NOT NULL DEFAULT 'UTC',

    -- Audit column. timestamptz, never timestamp: timestamptz records an
    -- actual moment in time, while timestamp stores an ambiguous wall-clock
    -- reading with no timezone attached.
    created_at   timestamptz NOT NULL DEFAULT now()
);

-- Comments are stored in the database itself, so they show up in pgAdmin and
-- in \d+ output. Good habit: they document the schema where it lives.
COMMENT ON TABLE  location            IS 'A physical site. Top of the hierarchy.';
COMMENT ON COLUMN location.code       IS 'Short human-facing identifier, e.g. DXB-HQ.';
COMMENT ON COLUMN location.timezone   IS 'IANA name. Defines the local day for all daily metrics.';
