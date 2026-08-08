-- metrics.sql
-- The four derived metrics the project requires, computed from raw pulses.
--
-- Nothing here is stored. Every figure is calculated on read, which is why
-- changing a rule (the session gap, the happiness weights, the age bands) is a
-- code change and never a data migration.
--
--   psql -f db/queries/metrics.sql
--
-- Two patterns carry almost all the weight below. Learn these two and the rest
-- is bookkeeping:
--
--   GAPS AND ISLANDS -- LAG() to spot where something changes, then a running
--   SUM() of that 0/1 flag to number the groups between changes. Used twice:
--   once to split a person's detections into visits, once to collapse repeated
--   detections in the same zone into a single stop.
--
--   RESOLVE THEN AGGREGATE -- for anything describing a PERSON (age, gender),
--   collapse the many noisy per-detection readings down to one value per
--   face_id BEFORE counting. Aggregating raw detections answers a different
--   question than the one being asked.

\pset pager off
\set gap '''30 minutes'''

\echo '=============================================================='
\echo ' 1. VISITS vs VISITORS vs DETECTIONS'
\echo '=============================================================='
-- Three numbers, three grains. The distinction the spec asks for.
--   detections -- raw rows
--   visits     -- detections grouped into sessions by a gap in time
--   visitors   -- distinct people
WITH ordered AS (
    SELECT face_id, detected_at,
           LAG(detected_at) OVER (PARTITION BY face_id ORDER BY detected_at) AS prev_seen
    FROM pulse
),
marked AS (
    -- A detection starts a new visit if it is this person's first ever, or if
    -- the silence since their last detection exceeded the session gap.
    SELECT face_id,
           CASE WHEN prev_seen IS NULL
                  OR detected_at - prev_seen > interval :gap
                THEN 1 ELSE 0 END AS starts_visit
    FROM ordered
)
SELECT count(*)                AS detections,
       sum(starts_visit)       AS visits,
       count(DISTINCT face_id) AS visitors,
       round(sum(starts_visit)::numeric / count(DISTINCT face_id), 2) AS visits_per_visitor,
       round(count(*)::numeric / sum(starts_visit), 1)                AS detections_per_visit
FROM marked;

\echo ''
\echo '=============================================================='
\echo ' 2. DEMOGRAPHICS -- why resolve-then-aggregate matters'
\echo '=============================================================='
-- The WRONG way: count raw detections. Someone who sat at a desk for six hours
-- contributes hundreds of rows; someone who walked through contributes three.
-- This measures TIME SPENT, not PEOPLE.
\echo '-- wrong: counting detections (weighted by how long each person lingered)'
SELECT gender, count(*) AS detections,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM pulse WHERE gender IS NOT NULL
GROUP BY gender ORDER BY detections DESC;

\echo ''
\echo '-- right: one resolved value per person, then count people'
-- mode() picks the most frequently observed gender for each face, which cancels
-- out the occasional misread. Then every person counts exactly once.
WITH per_person AS (
    SELECT face_id, mode() WITHIN GROUP (ORDER BY gender) AS gender
    FROM pulse WHERE gender IS NOT NULL
    GROUP BY face_id
)
SELECT gender, count(*) AS people,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM per_person GROUP BY gender ORDER BY people DESC;

\echo ''
\echo '-- age distribution, resolved per person first'
-- The camera re-estimates age every frame, so one person yields dozens of
-- different guesses. The median is the robust summary: unlike the mean, a few
-- wild readings cannot drag it.
WITH per_person AS (
    SELECT face_id,
           percentile_cont(0.5) WITHIN GROUP (ORDER BY age)::int AS age
    FROM pulse WHERE age IS NOT NULL
    GROUP BY face_id
)
SELECT CASE WHEN age < 25 THEN '18-24'
            WHEN age < 35 THEN '25-34'
            WHEN age < 45 THEN '35-44'
            WHEN age < 55 THEN '45-54'
            ELSE '55+' END AS age_band,
       count(*) AS people,
       round(100.0 * count(*) / sum(count(*)) OVER (), 1) AS pct
FROM per_person GROUP BY age_band ORDER BY age_band;

\echo ''
\echo '=============================================================='
\echo ' 3. HAPPINESS INDEX'
\echo '=============================================================='
-- happy = 100, neutral = 50, sad = 0. Averaging that scale gives a 0-100 index
-- where 50 means "entirely neutral".
\echo '-- by zone: the number is only useful if zones actually differ'
SELECT l.code AS site, z.name AS zone,
       count(*) AS detections,
       round(avg(CASE p.emotion WHEN 'happy' THEN 100
                                WHEN 'neutral' THEN 50
                                ELSE 0 END), 1) AS happiness
FROM pulse p
JOIN camera   c USING (camera_id)
JOIN zone     z USING (zone_id)
JOIN location l USING (location_id)
WHERE p.emotion IS NOT NULL
GROUP BY 1, 2 ORDER BY happiness DESC;

\echo ''
\echo '-- daily trend, last 10 days'
SELECT detected_at::date AS day,
       count(*) AS detections,
       round(avg(CASE emotion WHEN 'happy' THEN 100
                              WHEN 'neutral' THEN 50
                              ELSE 0 END), 1) AS happiness
FROM pulse
WHERE emotion IS NOT NULL AND detected_at >= current_date - 9
GROUP BY 1 ORDER BY 1;

\echo ''
\echo '=============================================================='
\echo ' 4. VISITOR JOURNEYS'
\echo '=============================================================='
-- Two applications of gaps-and-islands stacked on top of each other:
--   first  -- split each person's detections into visits (a gap in TIME)
--   second -- collapse runs of detections in the same zone into one stop
--             (a change in PLACE)
-- What survives is the ordered path a person actually walked.
WITH ordered AS (
    SELECT p.face_id, p.detected_at, z.zone_id, z.name AS zone_name,
           LAG(p.detected_at) OVER (PARTITION BY p.face_id ORDER BY p.detected_at) AS prev_seen
    FROM pulse p
    JOIN camera c USING (camera_id)
    JOIN zone   z USING (zone_id)
    WHERE p.detected_at >= current_date - 7
),
visits AS (
    SELECT *, SUM(CASE WHEN prev_seen IS NULL
                         OR detected_at - prev_seen > interval :gap
                       THEN 1 ELSE 0 END)
              OVER (PARTITION BY face_id ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS visit_no
    FROM ordered
),
zone_changes AS (
    SELECT *, LAG(zone_id) OVER (PARTITION BY face_id, visit_no ORDER BY detected_at) AS prev_zone
    FROM visits
),
stops AS (
    -- IS DISTINCT FROM, not <>, so the first row of a visit (prev_zone NULL)
    -- also counts as a change. Plain <> would return NULL there and the flag
    -- would be lost.
    SELECT *, SUM(CASE WHEN prev_zone IS DISTINCT FROM zone_id THEN 1 ELSE 0 END)
              OVER (PARTITION BY face_id, visit_no ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS stop_no
    FROM zone_changes
),
collapsed AS (
    SELECT face_id, visit_no, stop_no, zone_name,
           min(detected_at) AS entered_at,
           max(detected_at) AS last_seen_at,
           count(*)         AS detections
    FROM stops GROUP BY 1,2,3,4
),
transitions AS (
    SELECT zone_name AS from_zone,
           LEAD(zone_name) OVER (PARTITION BY face_id, visit_no ORDER BY stop_no) AS to_zone
    FROM collapsed
)
SELECT from_zone, to_zone, count(*) AS journeys
FROM transitions WHERE to_zone IS NOT NULL
GROUP BY 1,2 ORDER BY journeys DESC LIMIT 12;

\echo ''
\echo '-- a single visitor: the actual path walked through the building'
WITH ordered AS (
    SELECT p.face_id, p.detected_at, z.zone_id, z.name AS zone_name,
           LAG(p.detected_at) OVER (PARTITION BY p.face_id ORDER BY p.detected_at) AS prev_seen
    FROM pulse p
    JOIN camera c USING (camera_id)
    JOIN zone   z USING (zone_id)
    WHERE p.face_id = 'FACE-DXB-00001'
),
visits AS (
    SELECT *, SUM(CASE WHEN prev_seen IS NULL
                         OR detected_at - prev_seen > interval :gap
                       THEN 1 ELSE 0 END)
              OVER (ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS visit_no
    FROM ordered
),
zone_changes AS (
    SELECT *, LAG(zone_id) OVER (PARTITION BY visit_no ORDER BY detected_at) AS prev_zone
    FROM visits
),
stops AS (
    SELECT *, SUM(CASE WHEN prev_zone IS DISTINCT FROM zone_id THEN 1 ELSE 0 END)
              OVER (PARTITION BY visit_no ORDER BY detected_at ROWS UNBOUNDED PRECEDING) AS stop_no
    FROM zone_changes
)
SELECT visit_no, stop_no, zone_name,
       min(detected_at)::time(0) AS entered,
       max(detected_at)::time(0) AS last_seen,
       count(*) AS detections
FROM stops
WHERE visit_no <= 2
GROUP BY 1,2,3 ORDER BY visit_no, stop_no;
