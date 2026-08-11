-- 008_schedule_jobs.sql
-- Registers the background jobs with pg_cron.
--
-- The scheduler runs INSIDE Supabase. No extra process, no external cron, no
-- serverless timer to keep alive -- which is what keeps this a Next.js +
-- Supabase system rather than a Next.js + Supabase + worker system.
--
-- pg_cron's finest granularity is one minute, which is also the agreed refresh
-- interval, so the dashboard is at most 60 seconds behind live ingestion.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- cron.schedule() replaces a job of the same name, so re-running this file is
-- safe and will not accumulate duplicate schedules.
SELECT cron.schedule(
    'refresh-rollups',
    '* * * * *',
    $$SELECT refresh_rollups()$$
);

-- Retention, INSTALLED BUT NOT ACTIVE.
--
-- Deleting raw pulses is the one irreversible thing in this migration, so it
-- ships switched off. Review what the window would remove, then enable with:
--
--   SELECT cron.alter_job((SELECT jobid FROM cron.job
--                           WHERE jobname = 'purge-old-pulses'), active := true);
--
-- cron.alter_job() rather than UPDATE cron.job: on Supabase the postgres role
-- may read that table and call pg_cron's management functions, but has no
-- write privilege on the table itself.
--
-- Runs at 03:15 daily rather than on the hour, to stay clear of the busiest
-- refresh moments and of anything else scheduled on a round number.
SELECT cron.schedule(
    'purge-old-pulses',
    '15 3 * * *',
    $$SELECT purge_old_pulses(90)$$
);

SELECT cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'purge-old-pulses'),
    active := false
);

COMMIT;
