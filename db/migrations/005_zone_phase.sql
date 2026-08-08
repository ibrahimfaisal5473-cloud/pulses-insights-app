-- 005_zone_phase.sql
-- Add the journey phase a zone belongs to.
--
-- This is your first ALTER on a table that already holds data, which is a
-- different problem from CREATE TABLE: the rows already exist, so any new
-- NOT NULL column needs a value for every one of them. The sequence is
-- always the same three steps.

BEGIN;

-- 1. Add the column NULLABLE. Adding a NOT NULL column with no default to a
--    populated table is rejected outright -- existing rows would violate it
--    the instant it was created.
ALTER TABLE zone ADD COLUMN IF NOT EXISTS phase text;

-- 2. Backfill every existing row.
UPDATE zone SET phase = CASE code
    WHEN 'ENTRANCE'  THEN 'arrival'
    WHEN 'RECEPTION' THEN 'registration'
    WHEN 'WAITING'   THEN 'waiting'
    WHEN 'MEETING'   THEN 'service'
    WHEN 'HELPDESK'  THEN 'service'
    WHEN 'WORKSPACE' THEN 'activity'
    WHEN 'CAFE'      THEN 'activity'
    ELSE 'activity'
END
WHERE phase IS NULL;

-- 3. Only now can the constraints be applied, because every row satisfies them.
ALTER TABLE zone ALTER COLUMN phase SET NOT NULL;
ALTER TABLE zone ALTER COLUMN phase SET DEFAULT 'activity';

ALTER TABLE zone DROP CONSTRAINT IF EXISTS zone_phase_valid;
ALTER TABLE zone ADD CONSTRAINT zone_phase_valid
    CHECK (phase IN ('arrival', 'registration', 'waiting', 'service', 'activity'));

COMMENT ON COLUMN zone.phase IS 'Stage of a typical visit this zone belongs to. Groups zones in the UI.';

COMMIT;
