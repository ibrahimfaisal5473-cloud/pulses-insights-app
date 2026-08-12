# Pulses Insights

A full-stack visitor-intelligence platform built for the Pulses.ai Phase 2
internship assignment.

Cameras detect faces and emit **pulses**. Those raw detections are stored in
PostgreSQL, aggregated into meaningful metrics by a backend query layer, and
served through a REST API to a Next.js dashboard.

```
Camera  ->  Ingestion API  ->  PostgreSQL  ->  Metrics API  ->  Dashboard
```

Nothing in the data path is simulated. Every figure on every screen is computed
from raw rows in the database.

---

## Contents

- [Quick start](#quick-start)
- [Moving to Supabase](#moving-to-supabase)
- [Pre-calculated statistics](#pre-calculated-statistics)
- [System architecture](#system-architecture)
- [Database schema](#database-schema)
- [Derived metrics](#derived-metrics-the-backend-logic)
- [API reference](#api-reference)
- [Performance](#performance)
- [Project structure](#project-structure)
- [Design decisions](#design-decisions)
- [Tech stack](#tech-stack)
- [Features](#features)
- [AI assistance](#ai-assistance)
- [Notes](#notes)

---

## Quick start

### Prerequisites

- **Node.js 20+**
- **PostgreSQL 14+** (runs on Supabase PostgreSQL 17; developed against 18.4 locally)

### 1. Provide a PostgreSQL database

Any PostgreSQL works — the application only ever speaks plain SQL over `pg`,
so a managed database and a local one are interchangeable.

**Supabase (what this project runs against).** Create a project, then take
Project Settings → Database → Connection string. Nothing else about Supabase is
used: no client library, no PostgREST, no auth — just the Postgres endpoint.
Skip to step 2, then use `db/supabase.sh` (see
[Moving to Supabase](#moving-to-supabase)) instead of `db/env.sh`.

**Local.** If you don't have one, `conda` installs it without root:

```bash
conda create -y -n pulses-pg -c conda-forge postgresql
```

Then initialise and start a cluster:

```bash
export PGBIN="$(conda info --base)/envs/pulses-pg/bin"
export PGDATA="$HOME/.pulses-pg/data"

"$PGBIN/initdb" -D "$PGDATA" -U postgres --encoding=UTF8 --auth-local=trust --auth-host=trust
"$PGBIN/pg_ctl" -D "$PGDATA" -l "$HOME/.pulses-pg/server.log" start
"$PGBIN/createdb" -h localhost -U postgres pulses
```

macOS/Homebrew (`brew install postgresql@17 && brew services start postgresql@17`)
and Linux (`sudo apt install postgresql`) work equally well — you only need a
running server and a database named `pulses`.

### 2. Configure environment

```bash
cp .env.example .env.local
```

Then set at minimum:

```bash
# Local:
DATABASE_URL=postgresql://postgres@localhost:5432/pulses
# Supabase:
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres

SESSION_SECRET=<a long random string>
INGEST_API_KEY=<a long random string>
```

TLS is switched on automatically for any host that isn't localhost, so a
Supabase URL needs no extra flags. Set `DATABASE_CA_CERT` to the path of the
Supabase CA certificate to verify the server's identity as well as encrypt.

### 3. Create the schema

```bash
source db/env.sh     # puts psql on PATH and points it at the pulses database
pg-migrate           # applies db/migrations/*.sql in order
```

Or without the helper:

```bash
for f in db/migrations/*.sql; do psql -d pulses -v ON_ERROR_STOP=1 -f "$f"; done
```

### 4. Seed data

Reference data (the office layout — 1 location, 7 zones, 17 cameras):

```bash
psql -d pulses -f db/seed/001_reference.sql
```

Then generate and load pulses. The generator needs to know which camera watches
which zone, so it reads a manifest exported from the database:

```bash
psql -d pulses -c "\copy (SELECT c.camera_id, l.code AS site, z.code AS zone \
  FROM camera c JOIN zone z USING (zone_id) JOIN location l USING (location_id) \
  ORDER BY c.camera_id) TO 'cameras.csv' CSV HEADER"

python3 db/seed/generate_pulses.py cameras.csv pulses.csv 90

psql -d pulses -c "\copy pulse(camera_id, face_id, detected_at, age, gender, emotion) \
  FROM 'pulses.csv' CSV HEADER"
```

That produces roughly **630,000 pulses across 90 days** (~2,600 unique visitors).
The last argument is the number of days — lower it for a faster setup.

### 5. Run the app

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

**Demo login:** `admin` / `password123`

### Verifying the setup

```bash
psql -d pulses -f db/queries/metrics.sql
```

Runs the four required metrics directly against the database and prints the
results — useful for confirming the data loaded before opening the UI.

---

## Moving to Supabase

`db/supabase.sh` moves an existing local database to Supabase. It reads the
target URL from `.env.local` (`SUPABASE_DATABASE_URL`, or `DATABASE_URL` once
that already points at Supabase) so the password never reaches shell history.

```bash
source db/supabase.sh
sb-check      # reachable? what is already there?
sb-migrate    # apply db/migrations/*.sql
sb-load       # copy every row across, then ANALYZE
sb-verify     # compare row counts, local vs Supabase
```

`sb-load` copies **all four tables with their IDs** rather than re-running the
seed. Re-seeding would generate fresh `camera_id`s, and every pulse row points
at the existing ones — the foreign keys would land on the wrong cameras. It
also runs `VACUUM ANALYZE` afterwards: `COPY` leaves the planner with no
statistics, so without it the planner assumes `pulse` is tiny, sequential-scans
it, and metric queries take seconds instead of milliseconds.

For a serverless deployment use the **session pooler** connection string rather
than the direct one — many short-lived instances each opening their own pool
will otherwise exhaust the connection limit.

---

## System architecture

### The write path

A camera detects a face and POSTs a **batch** of detections to
`/api/v1/pulses`. The endpoint validates each row, resolves the camera code to
its id in a single lookup, and inserts the batch with one multi-row `INSERT`.

Batching is the central design decision. At 1,000 detections/sec, one HTTP
request per detection means 1,000 requests/sec of connection handling and JSON
parsing for a trivial amount of database work — the API layer becomes the
bottleneck long before PostgreSQL does. A request carrying 100 detections
reduces that to 10 requests/sec.

Rows that fail validation are reported individually with a reason and an index;
the rest of the batch still commits. The endpoint returns `207` in that case, so
a single malformed reading never costs the other 99.

**Ingestion is idempotent.** A gateway whose request times out cannot know
whether the batch committed, so its only safe move is to resend — and resending
has to be a no-op. A detection is uniquely identified by who was seen, by which
camera, at which instant, so `UNIQUE (face_id, camera_id, detected_at)` plus
`ON CONFLICT DO NOTHING` makes a replayed batch land as zero new rows rather
than silently doubling every count on the dashboard.

The response separates the two outcomes, because both are successes and neither
should alarm a caller:

```json
{ "accepted": 0, "duplicates": 50, "rejected": [] }
```

`accepted` counts rows actually written — the statement uses `RETURNING`, so a
first delivery and a retry are distinguishable instead of both reporting a bland
success.

### The read path

Dashboard widgets each call their own endpoint. Route handlers stay thin: check
the session, parse and validate query parameters, call a service function,
return JSON. All aggregation logic lives in `src/lib/services/live/`, and it
reads the pre-calculated tables rather than raw pulses.

Every widget fetching independently means one slow or failing endpoint degrades
one card rather than the page.

### Pre-calculated statistics

A background job sessionizes raw pulses into four derived tables, on a
one-minute schedule inside the database itself.

| Table | Grain | Rows | Answers |
|---|---|---|---|
| `person` | one per face | 2,562 | resolved gender and age band |
| `visit` | one per session | 18,568 | visits, unique visitors, dwell |
| `visit_stop` | one per zone arrival | 63,552 | journeys, footfall, per-zone sentiment |
| `pulse_hourly` | hour × zone × gender × age | 23,239 | additive detection and emotion totals |

**Two layers, not one — and this is the part worth understanding.** Hourly
buckets alone cannot answer "how many unique visitors". A distinct count is not
additive: somebody seen at 09:00 and again at 14:00 is one visitor but two rows,
and summing the buckets counts them twice. So anything counting *people* reads
the visitor-grain tables, where one row is one real visit and `DISTINCT` stays
exact; only sums and counts come from the hourly layer, where adding hours
together is genuinely correct.

`refresh_rollups()` is incremental **by face, not by time**. A late pulse can
extend a visit that began before the watermark, so processing "rows newer than
X" would leave half-built visits behind. Rebuilding whole people instead is
cheap and always correct, and it makes the job idempotent — safe to re-run, and
safe after a crash.

Scheduling is `pg_cron`, running inside Supabase. No worker process, no external
scheduler. The job costs **0 ms when no pulses have arrived**, and the dashboard
is at most one minute behind live ingestion — the one deliberate trade.

Raw pulses are retained for **90 days** by `purge_old_pulses()`, which ships
**disabled**: derived statistics survive a purge, so what the retention window
trades away is only the ability to re-derive that period.

### Nothing derived is stored *in the core schema*

`pulse` remains the single source of truth. Visitors, visits, journeys,
demographics and the happiness index are still not facts anyone writes — they
are **derived from raw detections**, and the rules that derive them live in one
place.

What changed is *when*. Until the database moved to Supabase, every widget
re-derived them on each request. That was affordable at ~180 ms on a local
machine and stopped being affordable at ~1.4 s per widget on a shared 2-vCPU
instance. So the same computation now runs **once, in a background job**, into
a set of derived tables the dashboard reads instead.

The important part is what did **not** happen: no derived columns were scattered
through `location`, `zone`, `camera` or `pulse`. The core hierarchy is exactly
what it was. The derived tables sit beside it and hold no fact that is not
already implied by `pulse` — drop all of them and one function call rebuilds
them in about twelve seconds. They are a cache with a schema, not new entities,
which is why the ERD is unchanged.

Changing a rule — the session gap, the happiness weights, the age bands — is
therefore still a code change rather than a data migration. It just needs a
rebuild afterwards instead of taking effect on the next page load.

See [Pre-calculated statistics](#pre-calculated-statistics).

### Layered authentication

- `proxy.ts` — optimistic edge check; redirects unauthenticated users before a
  protected page renders.
- `requireApiSession()` — the authoritative check, called by every `/api/v1`
  route handler individually, because the proxy matcher excludes `/api`.
- `POST /api/v1/pulses` uses an **API key** instead. The caller is a camera
  gateway, not a person with a browser.

---

## Database schema

Four tables, matching the project hierarchy exactly:

```
location  1──N  zone  1──N  camera  1──N  pulse
```

Diagrams: [docs/pulses-erd.png](docs/pulses-erd.png) ·
[docs/pulses-dataflow.png](docs/pulses-dataflow.png) ·
[docs/erd.md](docs/erd.md) (Mermaid source)

### The rule that shapes it

**A foreign key lives on the "many" side.** One location has many zones, so
`location_id` is a column on `zone`. There is no list of zones inside a location
row — a column holds one value, so the side pointing at exactly one thing is the
side that holds the reference.

### `location`

One row per physical site.

| Column | Type | Notes |
|---|---|---|
| `location_id` | `integer` | **PK**, `GENERATED ALWAYS AS IDENTITY` |
| `code` | `text` | **UNIQUE** — natural key, e.g. `DXB-HQ` |
| `name` | `text` | `NOT NULL` |
| `city`, `country` | `text` | nullable — `NULL` means unknown |
| `timezone` | `text` | `NOT NULL DEFAULT 'UTC'` — IANA name |
| `created_at` | `timestamptz` | `NOT NULL DEFAULT now()` |

`timezone` is the column most easily forgotten and it causes real bugs. Every
"per day" metric depends on it: if the server runs in UTC and the office is in
Dubai, a day boundary lands at 4am local and every daily figure is quietly
wrong. A day is local to the site, so the timezone belongs to the site.

### `zone`

An area within a location.

| Column | Type | Notes |
|---|---|---|
| `zone_id` | `integer` | **PK** |
| `location_id` | `integer` | **FK** → `location`, `ON DELETE RESTRICT` |
| `code` | `text` | **UNIQUE (location_id, code)** — unique per site, not globally |
| `name` | `text` | `NOT NULL` |
| `capacity` | `integer` | `CHECK (capacity > 0)` — denominator for occupancy |
| `phase` | `text` | `CHECK IN (arrival, registration, waiting, service, activity)` |
| `created_at` | `timestamptz` | |

Zone codes are unique **within** a location. Two offices may each have a zone
coded `CAFE`, which is why the composite unique constraint is on the pair.

### `camera`

A device watching exactly one zone.

| Column | Type | Notes |
|---|---|---|
| `camera_id` | `integer` | **PK** |
| `zone_id` | `integer` | **FK** → `zone`, `ON DELETE RESTRICT` |
| `code` | `text` | **UNIQUE** globally — the identifier ingest payloads carry |
| `name` | `text` | `NOT NULL` |
| `installed_at` | `date` | nullable |
| `created_at` | `timestamptz` | |

This is the relationship doing the most work in the model. A camera does not
record *where* it is — it only records that it saw someone. A detection's
location is recovered by joining `camera → zone → location`.

### `pulse`

The fact table. One row = **one detection of one face by one camera**.

| Column | Type | Notes |
|---|---|---|
| `pulse_id` | `bigint` | **PK** — `bigint`, not `integer` |
| `camera_id` | `integer` | **FK** → `camera` |
| `face_id` | `text` | `NOT NULL` — vision-system identifier, **not** a foreign key |
| `detected_at` | `timestamptz` | when the camera *saw* the face |
| `age` | `smallint` | nullable, `CHECK 0–120` |
| `gender` | `text` | nullable, `CHECK IN (male, female, unknown)` |
| `emotion` | `text` | nullable, `CHECK IN (happy, neutral, sad)` |
| `created_at` | `timestamptz` | when the row was *stored* — the gap is pipeline lag |

Notes on the choices:

- **`bigint` primary key.** An `integer` key stops at ~2.1 billion, which at
  1,000 detections/sec is under a month. Widening it later means rewriting the
  whole table.
- **`face_id` is not a foreign key.** It is assigned by the vision system and
  refers to no table here. It is also the column that makes `COUNT(*)`
  (detections) different from `COUNT(DISTINCT face_id)` (people).
- **Demographics are nullable.** A face can be detected clearly enough to count
  as footfall without being readable. `NULL` means unknown, which differs from
  zero.
- **Emotion is three classes, not seven.** The academic set (angry, disgust,
  fear, surprise) is unreliable in practice, and no required metric
  distinguishes "angry" from "sad" — the happiness index only needs to know
  which direction a face leans.

Indexes: `pulse(camera_id)`, `pulse(detected_at)`, `pulse(face_id)`. PostgreSQL
does not index foreign key columns automatically.

---

## Derived metrics (the backend logic)

All of this is in `src/lib/services/live/`. Two patterns carry almost all of it.

### Gaps and islands

`LAG()` to detect where something changes, then a running `SUM()` of that 0/1
flag to number the groups between changes. Used twice, stacked:

1. A gap in **time** splits one person's detections into separate visits.
2. A change in **place** collapses the run of detections inside one zone into a
   single stop.

What survives is the ordered path each person walked, with a dwell time and a
sentiment per stop. That shared foundation is `live/stops.ts`, and every
journey, dwell and sentiment metric builds on it.

### Resolve, then aggregate

The vision model re-estimates age on **every** detection, so one person yields
dozens of disagreeing guesses. Anything describing a *person* is therefore
collapsed to one value per `face_id` **before** counting — median for age, mode
for gender.

Aggregating raw detections instead answers a different question. It weights by
dwell time, so someone at a desk for six hours counts hundreds of times more
than someone walking through, and misread frames survive as a phantom "unknown"
category that disappears the moment each person's readings vote.

### The four required metrics

| Metric | How it is computed |
|---|---|
| **Visitors** | `COUNT(DISTINCT face_id)` |
| **Visits** | Sessionized: a gap longer than 30 min starts a new visit |
| **Journeys** | Stops per visit, ordered by time, consecutive repeats collapsed |
| **Demographics** | Resolved per `face_id` first, then aggregated |
| **Happiness index** | `happy=100, neutral=50, sad=0`, averaged over the window |

**New vs repeat** is decided *within* the selected range: one visit = new, came
back = repeat. The tempting alternative — "new means their first-ever detection
falls in this range" — breaks a dashboard, because widening the range far enough
makes everyone new and repeat visitors collapse to zero exactly when you have
the most data.

### Tunable constants

These are product decisions, not facts. Each lives in exactly one place.

| Constant | Value | Location | Effect |
|---|---|---|---|
| Session gap | 30 min | `live/scope.ts` | Directly determines the visits-to-visitors ratio |
| Experience threshold | 30 min | `types/index.ts` | Which visits count as "too long" |
| Dissatisfied below | 60 | `live/dissatisfied.ts` | How many people appear on the triage page |
| Low sample checks | 25 | `types/index.ts` | Below this a cell is dimmed as untrustworthy |

Two of these interact and must be changed together.

**The session gap must exceed the expected interval between detections in your
sparsest zone.** If a camera only registers a face every eight minutes, a
thirty-minute threshold will occasionally split one continuous presence into
several "visits".

**The dissatisfied threshold must track the sentiment baseline.** "Dissatisfied"
means below par *for this venue*, not below an absolute constant. The happiness
index currently averages ~76, so a threshold of 60 catches visits that went
materially worse than normal — around 2% of visits per day, which is a workable
triage queue. Recalibrate the sentiment model and this number has to move in the
same change, or the page silently empties and looks like a working feature with
nothing to report.

---

## API reference

All `/api/v1/*` endpoints require an authenticated session cookie except
`POST /api/v1/pulses`, which uses an API key.

### Shared query parameters

Accepted by every `GET` under `/api/v1`:

| Parameter | Format | Default |
|---|---|---|
| `startDate` | ISO 8601 | 30 days ago |
| `endDate` | ISO 8601 | now |
| `zones` | comma-separated zone ids | all zones |
| `genders` | `male,female` | all |
| `ages` | comma-separated bands (`20s,30s`) | all |
| `granularity` | `hour` \| `day` \| `week` | `day` |

Invalid values return `400` with a specific message.

### Ingestion

#### `POST /api/v1/pulses`

Header: `x-api-key: <INGEST_API_KEY>`

```json
{
  "pulses": [
    {
      "camera_code": "DXB-HQ-ENTRANCE-CAM1",
      "face_id": "FACE-000123",
      "detected_at": "2026-08-07T09:15:22+04:00",
      "age": 34,
      "gender": "male",
      "emotion": "neutral"
    }
  ]
}
```

A bare array is also accepted. Maximum 1,000 pulses per request.

| Status | Meaning |
|---|---|
| `201` | All rows accepted |
| `207` | Partial success — `rejected[]` lists each failure with `index` and `reason` |
| `400` | Malformed body |
| `401` | Missing or wrong API key |
| `413` | Batch exceeds 1,000 |

```json
{ "accepted": 99, "rejected": [{ "index": 42, "reason": "unknown camera_code \"CAM-X\"" }], "ms": 18 }
```

### Reference data

| Endpoint | Returns |
|---|---|
| `GET /api/v1/locations` | Full `location → zone → camera` hierarchy |
| `GET /api/v1/zones` | Zones with visitor totals, share and happiness |

### Visitors

| Endpoint | Returns |
|---|---|
| `GET /api/v1/visitors/counts` | Total, new, repeat visitors and footfall |
| `GET /api/v1/visitors/timeseries` | Visitors per bucket, split new vs repeat |
| `GET /api/v1/visitors/gender` | Gender split, resolved per person |
| `GET /api/v1/visitors/gender/timeseries` | Gender split over time |
| `GET /api/v1/visitors/gender/happiness` | Happiness per gender |
| `GET /api/v1/visitors/age` | Age-band distribution |
| `GET /api/v1/visitors/age/timeseries` | Age bands over time |
| `GET /api/v1/visitors/age/happiness` | Happiness per age band |
| `GET /api/v1/visitors/happiness/timeseries` | Happiness index over time |
| `GET /api/v1/visitors/happiness/heatmap` | Happiness by weekday × hour |
| `GET /api/v1/visitors/heatmap` | Visit arrivals by weekday × hour |
| `GET /api/v1/visitors/waiting-time` | Dwell in `waiting`-phase zones |

### Zones

| Endpoint | Returns |
|---|---|
| `GET /api/v1/zones/timeseries` | Visitors per zone over time |
| `GET /api/v1/zones/happiness/timeseries` | Happiness per zone over time, with sample sizes |

### Journeys

| Endpoint | Returns |
|---|---|
| `GET /api/v1/journey/stats` | Avg zones/journey, dwell, reach %, threshold % |
| `GET /api/v1/journey/flow` | Sankey nodes and links |
| `GET /api/v1/journey/common` | Most-walked end-to-end paths |
| `GET /api/v1/journey/dwell` | Average dwell per zone |
| `GET /api/v1/journey/volume` | Transitions and occupancy by hour |
| `GET /api/v1/journey/dwell-sentiment` | Sentiment bucketed by visit length |
| `GET /api/v1/journey/threshold` | Daily share of visits exceeding the threshold |

`journey/flow` also accepts `groupBy=type|zone` and
`timeOfDay=all|morning|afternoon|evening`.

### Dissatisfied visitors

| Endpoint | Returns |
|---|---|
| `GET /api/v1/dissatisfied/summary` | Count and share for the latest day |
| `GET /api/v1/dissatisfied/visitors` | One row per person at their worst visit |
| `GET /api/v1/dissatisfied/journeys` | Paths that repeatedly produce unhappy visits |
| `GET /api/v1/dissatisfied/by-hour` | When dissatisfaction clusters |
| `GET /api/v1/dissatisfied/demographics` | Who the dissatisfied visitors are |
| `GET /api/v1/dissatisfied/repeat-sentiment` | Sentiment trend for returning visitors |

Face ids are biometric identifiers and never leave the server. This page returns
a short hashed tag instead.

### Standalone metrics

A framework-agnostic summary API, independent of the dashboard's widget shapes:
`GET /api/v1/metrics/{summary,demographics,happiness,journeys}`. Accepts
`from`, `to`, `site`, `zone`, `sessionGapMinutes`.

### Auth

| Endpoint | Purpose |
|---|---|
| `POST /api/auth/login` | Sets an httpOnly JWT session cookie |
| `POST /api/auth/logout` | Clears it |
| `POST /api/support` | Pre-auth support request intake |

---

## Performance

Measured end-to-end against the **Supabase** database the app actually runs on
(PostgreSQL 17, 2 vCPU), through a production build, on the seeded dataset.
Benchmark rows were tagged and deleted afterwards.

The single most important number is the one that governs everything else:

> **A round trip to Supabase costs ~165 ms**, measured at 165.1–165.9 ms across
> repeated `SELECT 1`. It is propagation delay, not work. Every query pays it
> once, whatever else it does.

### Ingestion throughput

Sustained rate is the requirement, so it is what was tested — offer a fixed
arrival rate and see whether a backlog forms.

| Offered | Duration | Accepted | Errors | Achieved | Backlog |
|---|---|---|---|---|---|
| 1,200/sec | 30 s | 36,000 | 0 | 1,196/sec | none |
| 5,000/sec | 10 s | 50,000 | 0 | 4,873/sec | none |

Both held, draining 0.36 s after the offer window closed. **Sustained ≥5,000
pulses/sec through the full API, 5× the 1,000/sec target.**

Burst throughput depends entirely on how callers batch:

| Batch size | Concurrent senders | Throughput | p50 |
|---|---|---|---|
| 100 | 1 | **286 pulses/sec** | 351 ms |
| 500 | 1 | 1,229 pulses/sec | 365 ms |
| 500 | 8 | 9,450 pulses/sec | 400 ms |
| 1000 | 8 | **15,336 pulses/sec** | 453 ms |

That first row is the one worth reading twice. Per-request latency is ~350–450
ms regardless of batch size, because it is dominated by the two round trips to
Supabase — so a single sequential sender manages about three requests/sec no
matter how fast the server is. **A lone camera posting 100 detections per
request achieves 286/sec and misses the target**, on a system capable of 15,000.

Throughput here is a property of batching and concurrency, not of server speed.
The target is met provided callers batch at ≥500 with more than one request in
flight. On a local database this precondition did not exist, because there was
no round trip worth amortising.

### Queries

The read path was where the move to a small managed instance was felt, and it is
what the background job was built to fix.

**Before pre-calculation**, one representative query over a 30-day window
(204,960 detections) built up like this:

| Stage | Cumulative |
|---|---|
| Indexed range scan | 196 ms |
| **+ scope** — joins, then one gender and age resolved per face | 659 ms |
| **+ sessionization** — sort, four stacked window functions, grouping | **1,410 ms** |

Two plausible culprits were measured and ruled out before touching the design:
`work_mem` is 2.1 MB against a sort needing 15.5 MB, but raising it to 64 MB
removed the spill and changed the total by nothing (1,454 ms vs 1,426 ms); and
the database is fully cached, `shared_buffers` 224 MB against 117 MB of data.
The cost was CPU, spent re-deriving the same visits on every single request.

**After**, the same work is a scan of pre-built rows:

| | Before | After |
|---|---|---|
| `visitors/waiting-time` | 3.22 s | **0.20 s** |
| `journey/flow` | 2.30 s | **0.44 s** |
| `zones` | 1.56 s | **0.28 s** |
| `visitors/counts` | 0.99 s | **0.21 s** |
| **Overview page, concurrent** | **4.54 s** | **0.47 s** |

Most endpoints now sit at ~0.2 s, which is the 165 ms round trip plus a little.
The remaining slow ones are the standalone `/v1/metrics/*` routes and two
demographic timeseries, which still read raw pulses and are not on the critical
path of any dashboard page.

The gain also holds as the raw table grows: `visit` and `visit_stop` scale with
*visits*, not detections, so ten times more detections per person produces ten
times more readings per stop and no more stops. Read speed stays flat while
`pulse` grows.

### Scaling beyond this

The section above is about read latency at today's volume. This one is about
what breaks if the *write* rate is ever sustained for real: 1,000/sec is 86
million rows/day, and at that size `pulse` wants range-partitioning by day and
BRIN instead of B-tree indexes on the time column.

That work is written and benchmarked but deliberately **not** applied — the
table holds 626,848 rows, so partitioning would obscure the schema and buy
nothing. It is kept in `db/_later/` with its measurements, to be applied when
volume justifies it. Materialising the read path, by contrast, was justified and
has been done; the two are separate decisions with separate triggers.

---

## Project structure

```
db/
├── migrations/           # Schema, applied in order
│   ├── 001_location.sql
│   ├── 002_zone.sql
│   ├── 003_camera.sql
│   ├── 004_pulse.sql
│   ├── 005_zone_phase.sql
│   ├── 006_rollups.sql   # Derived tables for pre-calculated statistics
│   ├── 007_refresh_rollups.sql # The background job + retention purge
│   ├── 008_schedule_jobs.sql   # pg_cron registration
│   └── 009_idempotent_ingestion.sql # Natural key, makes retries safe
├── seed/
│   ├── 001_reference.sql # Office layout
│   └── generate_pulses.py# Visitor movement model
├── queries/metrics.sql   # The four metrics as runnable SQL
├── env.sh                # source it for psql + helper commands
├── supabase.sh           # source it to migrate the database to Supabase
└── _later/               # Partitioning/BRIN work, parked until needed

docs/
├── erd.md                # ERD with Mermaid diagram
├── pulses-erd.png/.pdf   # Entity relationship diagram
├── pulses-dataflow.*     # Camera -> Pulse -> API -> Dashboard
└── database-concepts.md  # Design rationale

src/
├── app/
│   ├── (auth)/           # Login, support
│   ├── (dashboard)/      # Overview, visitors, zones, journeys, dissatisfied
│   └── api/v1/           # Route handlers
├── components/           # UI, charts, widgets
├── hooks/                # TanStack Query hooks
├── lib/
│   ├── api/              # Typed fetchers
│   ├── auth/             # Session, JWT, guards
│   ├── db/               # Connection pool, ingestion, standalone metrics
│   ├── export/           # PDF report generation
│   └── services/live/    # SQL aggregation — reads the pre-calculated tables
│       ├── stops.ts      # Reads pre-calculated visits/stops
│       └── rollup.ts     # Reads the hourly aggregate layer
├── types/                # Shared interfaces and constants
└── proxy.ts              # Edge auth check
```

---

## Design decisions

**Connection pooling.** A PostgreSQL connection is a dedicated server-side
process, so connecting per request exhausts the database long before the queries
do. `src/lib/db/client.ts` holds a pool of 10; requests beyond that queue rather
than fail. The pool is cached on `globalThis` because Next.js re-evaluates
modules on hot reload, and a new pool per reload leaks connections.

**Parameterised queries everywhere.** Values are never interpolated into SQL
strings. The driver sends statement and values separately, so a value can never
be parsed as SQL — a structural guarantee rather than careful escaping. Optional
filters use a `$n IS NULL OR ...` pattern so one query string serves every
combination without building SQL from variables.

**Bigint and numeric arrive as strings.** `node-postgres` returns them as
strings because a PostgreSQL `bigint` can exceed JavaScript's safe integer
range. Every `COUNT(*)` is explicitly converted; silent coercion would lose
precision at scale.

**Dates are formatted in SQL.** `pg` hands `date` columns back as JS `Date`
objects, and stringifying one yields `"Thu Aug 06 2026 ..."`, not an ISO day.
`to_char` in the query removes the ambiguity.

**Time buckets use the site's timezone.** `date_trunc` alone cuts on the
database session's timezone, so a "day" would start at midnight wherever the
server runs. Bucketing goes through `AT TIME ZONE` using `location.timezone`.

**Summary statistics are sample-weighted.** The happiness average weights each
bucket by its number of readings rather than averaging bucket averages, so the
figure does not drift when the user changes chart granularity. Peak and lowest
ignore buckets below a sample floor, so a single-reading hour cannot be reported
as peak happiness.

**Constraints live in the database.** `NOT NULL`, `UNIQUE`, `CHECK` and foreign
keys are enforced by PostgreSQL, so they hold no matter what writes — the API, a
migration, or a console session at 2am. Application validation protects one code
path; a constraint protects all of them. All foreign keys use
`ON DELETE RESTRICT`, so deleting a parent with children is refused rather than
cascading or orphaning.

---

## Tech stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL 17 on Supabase (any PostgreSQL 14+ works) |
| Background jobs | pg_cron, in-database — no worker process |
| Driver | node-postgres (`pg`) with connection pooling |
| Backend | Next.js 16 Route Handlers (Node runtime) |
| Frontend | React 19, TypeScript, Tailwind CSS v4, shadcn/ui |
| Data fetching | TanStack Query v5 |
| Charts | Recharts, plus a hand-built SVG Sankey |
| Auth | `jose` (JWT) in httpOnly cookies |
| Export | html2canvas-pro, jsPDF |

---

## Features

**Authentication** — login, httpOnly JWT session cookie, protected routes,
automatic redirects, logout. A pre-auth support page so a user who cannot sign
in can still report the problem.

**Global URL-driven filters** — date range, zones, gender, age band and
granularity live in the URL, so any filtered view is shareable and bookmarkable.

**Five dashboard modules** — Overview, Visitor Analytics, Zone Analytics,
Visitor Journeys, Dissatisfied Visitors. Every widget fetches from its own
endpoint with isolated loading, error and retry states.

**Reporting** — per-widget PNG/PDF download, plus a full paginated multi-section
PDF of an entire dashboard page.

---

## AI assistance

Claude was used throughout development for planning, schema design,
implementation and debugging. A log of the prompts is in
[PROMPTS.md](PROMPTS.md), as required by the assignment.

---

## Notes

Built for the Pulses.ai internship assessment. The visitor data is synthetic —
generated by a movement model that simulates plausible paths, dwell times,
repeat visits and imperfect vision-model readings — but it is real data in a
real database, queried by real SQL. No part of the application path is mocked.
