#!/usr/bin/env bash
# Source this to talk to the local Pulses database:  source db/env.sh
#
# Postgres 18.4 lives in a dedicated conda env so nothing was installed
# system-wide and your base environment is untouched.

export PGBIN="/opt/anaconda3/envs/pulses-pg/bin"
export PGDATA="$HOME/.pulses-pg/data"
export PGLOG="$HOME/.pulses-pg/server.log"

export PATH="$PGBIN:$PATH"
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGDATABASE=pulses

pg-start()  { "$PGBIN/pg_ctl" -D "$PGDATA" -l "$PGLOG" -o "-p $PGPORT" start; }
pg-stop()   { "$PGBIN/pg_ctl" -D "$PGDATA" -m fast stop; }
pg-status() { "$PGBIN/pg_ctl" -D "$PGDATA" status; }
pg-log()    { tail -n "${1:-50}" "$PGLOG"; }

# Apply every migration in order. Each file is wrapped in a transaction and
# records itself in schema_migrations, so re-running is safe.
pg-migrate() {
  local root; root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  for f in "$root"/migrations/*.sql; do
    echo "-- applying $(basename "$f")"
    "$PGBIN/psql" -v ON_ERROR_STOP=1 -q -f "$f" || return 1
  done
}

pg-seed() {
  local root; root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  for f in "$root"/seed/*.sql; do
    echo "-- seeding $(basename "$f")"
    "$PGBIN/psql" -v ON_ERROR_STOP=1 -q -f "$f" || return 1
  done
}

echo "pulses db env ready -> $PGUSER@$PGHOST:$PGPORT/$PGDATABASE"
echo "  pg-start | pg-stop | pg-status | pg-log | pg-migrate | pg-seed | psql"
