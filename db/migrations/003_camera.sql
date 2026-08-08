-- 003_camera.sql
-- Location -> Zone -> Camera -> Pulse
--                     ^^^^^^
-- A physical device watching exactly one zone.

CREATE TABLE camera (
    camera_id     integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    -- Second link in the chain. One zone has many cameras (a large hall needs
    -- several for coverage), and each camera watches exactly one zone -- so
    -- the foreign key lives here, on the "many" side.
    --
    -- This is the column that gives a raw detection its PLACE. A camera does
    -- not record where it is; it only records that it saw someone. Location is
    -- recovered by joining camera -> zone -> location.
    zone_id       integer     NOT NULL
                              REFERENCES zone (zone_id)
                              ON DELETE RESTRICT,

    -- Hardware identifier, globally unique unlike zone codes. This is the
    -- value an incoming detection payload carries to name its source.
    code          text        NOT NULL UNIQUE,

    name          text        NOT NULL,

    -- Nullable: we may not know when an inherited camera was fitted.
    installed_at  date,

    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX camera_zone_id_idx ON camera (zone_id);

COMMENT ON TABLE  camera      IS 'A device watching exactly one zone.';
COMMENT ON COLUMN camera.code IS 'Hardware identifier carried by incoming detection payloads.';
