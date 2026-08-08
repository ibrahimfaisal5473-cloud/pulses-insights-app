-- 001_reference.sql
-- Reference data: the physical layout of the offices.
--
-- Separate from schema migrations on purpose. Migrations define STRUCTURE and
-- belong in every environment; this is CONTENT and differs between dev, demo
-- and production.
--
-- Idempotent: ON CONFLICT DO NOTHING makes re-running harmless.

BEGIN;

-- ---------------------------------------------------------------------------
-- Location: a single office.
--
-- The table still exists as the top of the hierarchy even with one row. It
-- carries the timezone that defines the local day for every daily metric, and
-- it is the seam a second site would slot into without any schema change.
-- ---------------------------------------------------------------------------
INSERT INTO location (code, name, city, country, timezone) VALUES
    ('DXB-HQ', 'Dubai Head Office', 'Dubai', 'United Arab Emirates', 'Asia/Dubai')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Zones: the areas a person actually moves through during a visit.
-- Capacity is the designed headcount, which is what makes an occupancy
-- percentage possible -- a count with no denominator is not a percentage.
-- ---------------------------------------------------------------------------
INSERT INTO zone (location_id, code, name, capacity, phase)
SELECT l.location_id, z.code, z.name, z.capacity, z.phase
FROM location l
JOIN (VALUES
    ('DXB-HQ', 'ENTRANCE',  'Main Entrance',    150, 'arrival'),
    ('DXB-HQ', 'RECEPTION', 'Reception',         40, 'registration'),
    ('DXB-HQ', 'WAITING',   'Waiting Lounge',    60, 'waiting'),
    ('DXB-HQ', 'MEETING',   'Meeting Rooms',     80, 'service'),
    ('DXB-HQ', 'WORKSPACE', 'Open Workspace',   220, 'activity'),
    ('DXB-HQ', 'CAFE',      'Cafe',              90, 'activity'),
    ('DXB-HQ', 'HELPDESK',  'IT Help Desk',      25, 'service')
) AS z(loc_code, code, name, capacity, phase) ON z.loc_code = l.code
ON CONFLICT (location_id, code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Cameras: more of them in bigger areas, which is how real coverage works.
-- The code is globally unique because it is the identifier an incoming
-- detection payload carries to name its source.
-- ---------------------------------------------------------------------------
INSERT INTO camera (zone_id, code, name, installed_at)
SELECT z.zone_id,
       l.code || '-' || z.code || '-CAM' || n,
       z.name || ' camera ' || n,
       DATE '2025-11-01'
FROM zone z
JOIN location l ON l.location_id = z.location_id
JOIN (VALUES
    ('DXB-HQ', 'ENTRANCE',  3),
    ('DXB-HQ', 'RECEPTION', 2),
    ('DXB-HQ', 'WAITING',   2),
    ('DXB-HQ', 'MEETING',   3),
    ('DXB-HQ', 'WORKSPACE', 4),
    ('DXB-HQ', 'CAFE',      2),
    ('DXB-HQ', 'HELPDESK',  1)
) AS spec(loc_code, zone_code, cameras)
  ON spec.loc_code = l.code AND spec.zone_code = z.code
CROSS JOIN LATERAL generate_series(1, spec.cameras) AS n
ON CONFLICT (code) DO NOTHING;

COMMIT;
