#!/usr/bin/env bash
# Source this to move the Pulses database to Supabase:  source db/supabase.sh
#
# Reads SUPABASE_DATABASE_URL from .env.local so the password never has to be
# typed on a command line (where it would land in shell history).
#
#   source db/supabase.sh
#   sb-check      # can we reach it, and what is already there?
#   sb-migrate    # apply db/migrations/*.sql
#   sb-load       # copy every row from the local database
#   sb-verify     # compare row counts local vs Supabase
#
# The local server must be running for sb-load (source db/env.sh; pg-start).

export PGBIN="/opt/anaconda3/envs/pulses-pg/bin"
export PATH="$PGBIN:$PATH"

# Local source database, addressed explicitly so this works whether or not
# db/env.sh has been sourced.
export LOCAL_URL="postgresql://postgres@localhost:5432/pulses"

# Locate the project root by walking up from the current directory. Not
# derived from ${BASH_SOURCE[0]} because zsh — the shell this is sourced from —
# does not set that variable, and the lookup would silently resolve to $HOME.
sb-root() {
  local d="$PWD"
  while [ "$d" != "/" ]; do
    if [ -f "$d/.env.local" ] && [ -d "$d/db/migrations" ]; then
      printf '%s' "$d"; return 0
    fi
    d="$(dirname "$d")"
  done
  echo "project root not found: run this from inside the repo" >&2
  return 1
}

sb-url() {
  local root; root="$(sb-root)" || return 1
  local url
  # Prefer an explicit SUPABASE_DATABASE_URL; fall back to DATABASE_URL once
  # the app itself has been pointed at Supabase.
  url="$(grep -E '^SUPABASE_DATABASE_URL=' "$root/.env.local" | head -1 | cut -d= -f2-)"
  if [ -z "$url" ]; then
    url="$(grep -E '^DATABASE_URL=' "$root/.env.local" | head -1 | cut -d= -f2-)"
    case "$url" in
      *localhost*|*127.0.0.1*)
        echo "DATABASE_URL still points at localhost, and SUPABASE_DATABASE_URL is unset" >&2
        return 1;;
    esac
  fi
  # Tolerate a value written with surrounding quotes.
  url="${url%\"}"; url="${url#\"}"; url="${url%\'}"; url="${url#\'}"
  if [ -z "$url" ]; then
    echo "SUPABASE_DATABASE_URL is not set in .env.local" >&2
    return 1
  fi
  printf '%s' "$url"
}

# psql against Supabase. TLS is required; sslmode=require encrypts without
# demanding the Supabase CA be installed locally.
sb-psql() {
  local url; url="$(sb-url)" || return 1
  PGSSLMODE=require "$PGBIN/psql" -v ON_ERROR_STOP=1 "$url" "$@"
}

sb-check() {
  echo "-- server version"
  sb-psql -tAc "select version();" || return 1
  echo "-- existing tables in public"
  sb-psql -c "\dt public.*"
}

# Structure only. The same migration files that built the local database, in
# the same order, so the two schemas cannot drift.
sb-migrate() {
  local root; root="$(sb-root)/db" || return 1
  for f in "$root"/migrations/*.sql; do
    echo "-- applying $(basename "$f")"
    sb-psql -q -f "$f" || return 1
  done
}

# Data only, all four tables, IDs preserved.
#
# WHY NOT JUST RE-RUN THE SEED: pulse.camera_id points at camera rows by their
# generated IDs. Re-seeding would generate a fresh set of IDs, and every one of
# the 600k+ pulse rows would then point at the wrong camera -- or at nothing.
# Copying the reference tables verbatim keeps the foreign keys meaningful.
sb-load() {
  local url; url="$(sb-url)" || return 1

  echo "-- copying location, zone, camera, pulse (this takes a few minutes)"
  "$PGBIN/pg_dump" "$LOCAL_URL" \
    --data-only --no-owner --no-privileges \
    --table=location --table=zone --table=camera --table=pulse \
    | PGSSLMODE=require "$PGBIN/psql" -v ON_ERROR_STOP=1 -q "$url" || return 1

  # The identity sequences were never advanced by COPY, so the next INSERT
  # would collide with an existing ID. Fast-forward each one past its table.
  echo "-- resetting identity sequences"
  sb-psql -q -c "
    SELECT setval(pg_get_serial_sequence('location', 'location_id'),
                  COALESCE((SELECT max(location_id) FROM location), 1));
    SELECT setval(pg_get_serial_sequence('zone', 'zone_id'),
                  COALESCE((SELECT max(zone_id) FROM zone), 1));
    SELECT setval(pg_get_serial_sequence('camera', 'camera_id'),
                  COALESCE((SELECT max(camera_id) FROM camera), 1));
    SELECT setval(pg_get_serial_sequence('pulse', 'pulse_id'),
                  COALESCE((SELECT max(pulse_id) FROM pulse), 1));
  " || return 1

  # COPY does not update planner statistics. Without this the planner believes
  # pulse is tiny, picks sequential scans over the indexes, and every metric
  # query takes seconds instead of milliseconds. VACUUM cannot run inside a
  # transaction block, hence one -c per statement.
  echo "-- analyzing (planner statistics)"
  sb-psql -q -c "VACUUM ANALYZE location" -c "VACUUM ANALYZE zone" \
               -c "VACUUM ANALYZE camera"  -c "VACUUM ANALYZE pulse"
}

sb-verify() {
  local counts="
    SELECT 'location' AS table, count(*) FROM location
    UNION ALL SELECT 'zone',     count(*) FROM zone
    UNION ALL SELECT 'camera',   count(*) FROM camera
    UNION ALL SELECT 'pulse',    count(*) FROM pulse
    UNION ALL SELECT 'pulse_min', extract(epoch FROM min(detected_at))::bigint FROM pulse
    UNION ALL SELECT 'pulse_max', extract(epoch FROM max(detected_at))::bigint FROM pulse
    ORDER BY 1;"
  echo "-- local"
  "$PGBIN/psql" -tA "$LOCAL_URL" -c "$counts"
  echo "-- supabase"
  sb-psql -tA -c "$counts"
}

echo "supabase migration helpers ready"
echo "  sb-check | sb-migrate | sb-load | sb-verify | sb-psql"
