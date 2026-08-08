-- 001_dimensions.sql
-- Reference data for the demo venue. Idempotent: safe to re-run.
--
-- Dimension seeding is separate from schema migration on purpose. The schema is
-- structure and belongs to every environment; this is *content* and differs
-- between dev, demo and production.

BEGIN;

INSERT INTO location (code, name, timezone, opened_at) VALUES
    ('DXB-HQ', 'Dubai Head Office', 'Asia/Dubai', DATE '2024-01-15')
ON CONFLICT (code) DO NOTHING;

INSERT INTO zone (location_id, code, name, kind, capacity, journey_step)
SELECT l.location_id, z.code, z.name, z.kind::zone_kind_t, z.capacity, z.journey_step
FROM location l
CROSS JOIN (VALUES
    ('ENTRANCE', 'Entrance',     'entrance',      120, 1),
    ('HALL',     'Main Hall',    'hall',          400, 2),
    ('WAITING',  'Waiting Area', 'waiting',       150, 3),
    ('SERVICE',  'Service Desk', 'service_desk',   60, 4),
    ('HELPDESK', 'Help Desk',    'service_desk',   40, 4),
    ('CAFE',     'Cafe',         'cafe',          110, 5)
) AS z(code, name, kind, capacity, journey_step)
WHERE l.code = 'DXB-HQ'
ON CONFLICT (location_id, code) DO NOTHING;

-- Two cameras per zone, named <ZONE>-CAM-<n>. The code is what an ingest
-- payload carries; everything else about the hierarchy is resolved from it.
INSERT INTO camera (zone_id, code, name)
SELECT z.zone_id,
       z.code || '-CAM-' || n,
       z.name || ' Camera ' || n
FROM zone z
JOIN location l ON l.location_id = z.location_id
CROSS JOIN generate_series(1, 2) AS n
WHERE l.code = 'DXB-HQ'
ON CONFLICT (code) DO NOTHING;

COMMIT;
