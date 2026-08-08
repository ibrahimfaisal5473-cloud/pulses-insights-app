-- explore.sql — a cheat sheet for looking around the database.
--
--   source db/env.sh
--   psql -f db/explore.sql      # run the whole tour
--   psql                        # or go interactive and paste bits
--
-- Inside psql, the backslash commands are the fastest way to look around:
--
--   \dt              list tables            \d pulse       describe a table
--   \dt+             ... with sizes         \d+ pulse      ... incl. partitions
--   \dn              list schemas           \df            list functions
--   \dT+             list custom types      \di            list indexes
--   \l               list databases         \x             toggle wide output
--   \pset pager off  stop paging output     \timing on     time every query
--   \q               quit                   \?             all backslash commands
--
-- \x is the one people miss: for a wide row, it flips the output from columns
-- to a vertical key/value list. Essential when reading a single pulse.

\pset pager off

\echo '=============================================================='
\echo ' 1. THE HIERARCHY  — location -> zone -> camera'
\echo '=============================================================='
SELECT l.name AS location,
       l.timezone,
       z.name  AS zone,
       z.kind,
       z.capacity,
       z.journey_step AS step,
       count(c.camera_id) AS cameras
FROM location l
JOIN zone z   USING (location_id)
LEFT JOIN camera c USING (zone_id)
GROUP BY l.name, l.timezone, z.name, z.kind, z.capacity, z.journey_step
ORDER BY z.journey_step, z.name;

\echo ''
\echo '=============================================================='
\echo ' 2. HOW BIG IS EVERYTHING'
\echo '=============================================================='
SELECT c.relname AS table_name,
       to_char(c.reltuples, 'FM999,999,999') AS est_rows,
       pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
  AND pg_total_relation_size(c.oid) > 0
ORDER BY pg_total_relation_size(c.oid) DESC
LIMIT 12;

\echo ''
\echo '=============================================================='
\echo ' 3. PARTITIONS — where the pulses actually landed'
\echo '=============================================================='
-- pulse_default should always be EMPTY. Rows appearing there mean a camera
-- sent a timestamp outside every known partition range: clock skew, or a
-- partition that was never created ahead of time. Treat it as an alarm.
SELECT c.relname AS partition,
       pg_size_pretty(pg_relation_size(c.oid)) AS heap,
       pg_size_pretty(pg_indexes_size(c.oid))  AS indexes
FROM pg_inherits i
JOIN pg_class c ON c.oid = i.inhrelid
JOIN pg_class p ON p.oid = i.inhparent
WHERE p.relname = 'pulse'
  AND pg_relation_size(c.oid) > 0
ORDER BY c.relname;

\echo ''
\echo '=============================================================='
\echo ' 4. RAW PULSES — a peek at the fact table'
\echo '=============================================================='
SELECT p.detected_at, p.face_id, p.age, p.gender, p.emotion,
       z.name AS zone, c.code AS camera
FROM pulse p
JOIN zone   z USING (zone_id)
JOIN camera c USING (camera_id)
ORDER BY p.detected_at
LIMIT 10;

\echo ''
\echo '=============================================================='
\echo ' 5. SHAPE OF THE DATA'
\echo '=============================================================='
SELECT count(*)                        AS total_pulses,
       count(DISTINCT face_id)         AS distinct_faces,
       min(detected_at)                AS first_seen,
       max(detected_at)                AS last_seen,
       round(avg(age), 1)              AS avg_age
FROM pulse;

\echo ''
\echo '-- emotion mix, and the weights that will drive the Happiness Index --'
SELECT p.emotion,
       w.weight,
       count(*) AS pulses,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM pulse p
JOIN emotion_weight w USING (emotion)
GROUP BY p.emotion, w.weight
ORDER BY w.weight DESC;

\echo ''
\echo '=============================================================='
\echo ' 6. PROVE PARTITION PRUNING IS WORKING'
\echo '=============================================================='
-- Look for "Subplans Removed: N" in the output. That is Postgres discarding
-- partitions it never has to open. A one-day query over a year of data should
-- remove hundreds of them. If N is 0, your WHERE clause is not prunable --
-- usually because detected_at got wrapped in a function.
EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF)
SELECT zone_id, count(*)
FROM pulse
WHERE detected_at >= (current_date - 3)
  AND detected_at <  (current_date - 2)
GROUP BY zone_id;
