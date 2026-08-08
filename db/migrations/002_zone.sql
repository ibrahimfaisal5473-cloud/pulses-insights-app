-- 002_zone.sql
-- Location -> Zone -> Camera -> Pulse
--             ^^^^
-- An area inside a site: Entrance, Main Hall, Cafe, Service Desk.

CREATE TABLE zone (
    zone_id      integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- THE FOREIGN KEY. This is the whole relationship.
    -- A zone belongs to exactly one location, so the child stores the parent's
    -- key. There is no list of zones inside a location row -- that is simply
    -- not how relational databases represent "one to many".
    --
    -- NOT NULL makes it mandatory: a zone with no location cannot exist.
    -- ON DELETE RESTRICT refuses to delete a location that still has zones,
    -- rather than silently destroying them or leaving them orphaned.
    location_id  integer     NOT NULL
                             REFERENCES location (location_id)
                             ON DELETE RESTRICT,

    code         text        NOT NULL,
    name         text        NOT NULL,

    -- Headcount the area is designed for. Occupancy percentages need it.
    -- Nullable: NULL means "not measured", which differs from zero.
    capacity     integer,

    created_at   timestamptz NOT NULL DEFAULT now(),

    -- Zone codes are unique WITHIN a location, not globally: two different
    -- offices may each have a zone coded 'CAFE'. This is a composite unique
    -- constraint -- the pair must be unique, not either column alone.
    UNIQUE (location_id, code),

    -- A capacity of zero or less is nonsense; reject it at the database.
    CHECK (capacity IS NULL OR capacity > 0)
);

-- Postgres does NOT automatically index foreign key columns. Without this,
-- "all zones in location 3" scans the whole table. Cheap to add, and it also
-- speeds up the integrity check when a location row is deleted.
CREATE INDEX zone_location_id_idx ON zone (location_id);

COMMENT ON TABLE  zone          IS 'An area within a location.';
COMMENT ON COLUMN zone.capacity IS 'Designed headcount. Basis for occupancy percentages.';
