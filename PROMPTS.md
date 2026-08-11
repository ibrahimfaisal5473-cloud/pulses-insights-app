# AI Prompts Log

Per the Phase 2 assignment requirements, this file logs the prompts used with AI assistants (Claude, ChatGPT) to write, debug, or structure the code in this repository.



## 2026-07-15 — Architecture design (Milestone 1)

**Prompt:**
> Step one is architecture. Before writing any code, I want us to design the applications architecture. Based on the Emirates Insights dashboard and the project requirements, propose: the folder structure, the routing structure, the component hierarchy, the state management approach, how authentication should work, how the mock backend should be organized, where mock data should live, how charts should fetch data, shared types/interfaces, and any utilities or services we'll need. Explain the reasoning behind each decision. Don't write implementation code yet — I want to agree on the architecture first so the project has a solid foundation.

**Outcome:** Produced a full architecture proposal (folder structure, `(auth)`/`(dashboard)` route groups, component tiers, TanStack Query + URL-based filter state, mock cookie auth with `proxy.ts` + DAL, `app/api/v1/*` mock backend mirroring the Pulses API, seeded mock data, per-widget chart fetching, shared `types/`, and utility/service layers) with reasoning for each. No code written.



## 2026-07-15 — Architecture agreement + per-widget fetching

**Prompt:**
> I agree with the architecture and the recommended 3 choices. One additional requirement: each dashboard widget should fetch its own data through the API layer rather than relying on a single large dashboard endpoint. After this, we'll build incrementally. Also dont implement the whole application at once well complete one milestone at a time and review it before continuing.

**Outcome:** Locked in the stack and the three recommended choices (mock cookie session auth, TanStack Query, mock API mirroring the Pulses endpoints). Adopted the hard rule that every widget owns its data (one endpoint + one hook per widget, independent loading/error states). Confirmed strictly incremental, milestone-by-milestone workflow with review before continuing.



## 2026-07-16 — Project foundation

**Prompt:**
> Let's start implementing the project incrementally.
>
> Set up the project foundation only.
>
> Install and configure the required dependencies, create the agreed folder structure, set up the route groups, providers, and dashboard shell, and create placeholder pages for each dashboard section.
>
> Do not implement authentication, charts, KPI cards, tables, or API routes yet.
>
> When you're finished, summarize what was implemented and wait for my review before continuing.

**Outcome:** Configured the project's foundation by installing and setting up the required dependencies, creating the agreed folder structure, implementing the route groups, dashboard shell, sidebar, top navigation, and placeholder pages. No authentication, API routes, or dashboard functionality was implemented.



## 2026-07-16 — Authentication (Milestone 2)

**Prompt:**
> Build the authentication system only.
>
> Create the login page.
> Add username/password login using dummy credentials.
> Create login and logout API routes.
> Store the session in an httpOnly cookie.
> Protect the dashboard routes and redirect unauthenticated users to `/login`.
> If the user is already logged in, redirect them away from `/login`.
>
> Wait for my review after this and do not continue to the charts or overview.


**Outcome:** Implemented a complete mock authentication system including a login page, login/logout API routes, httpOnly cookie-based session management, protected dashboard routes, authentication redirects, and logout functionality. 

---

## 2026-07-16 — Login page redesign

**Prompt:**
> Using the attached screenshot of the Emirates Insights login page as a visual reference, redesign the login page while creating an original version for **Pulses Insights**.
>
> Do not copy any Emirates branding, logos, text, or assets. Keep the split-screen layout with branding on the left and the login form on the right. Create a unique background pattern, use premium typography, add a short product description, a professional information card below the login form, and a subtle Pulses Insights footer. Maintain the existing authentication functionality and ensure the page is fully responsive.
>
> The goal is to capture the same premium enterprise feel without looking like a direct copy of the Emirates Insights login page.

**Outcome:** Redesigned the authentication interface using the provided Emirates Insights login screenshot as a visual reference while creating an original **Pulses Insights** identity. Implemented a premium split-screen layout, custom branding, unique visual elements, responsive design, and an enterprise-style login experience without copying Emirates branding or assets.

---

## 2026-07-16 — Overview page layout (Milestone 3)

**Prompt:**
> Now we'll begin building the dashboard itself, starting with the Overview page.
>
> Use the approved Emirates dashboard prototype as the design reference while keeping the Pulses Insights branding and project structure.
>
> For this milestone, build only the UI layout of the Overview page. Create the KPI cards, insight cards, chart containers, distribution cards, and zone ranking section using reusable components.
>
> Do not integrate API routes, charts, filters, or mock data yet. Use placeholder content so we can review the layout, spacing, and responsiveness before connecting the backend.
>
> When you're finished, summarize what you implemented, explain any component architecture decisions,push it to the GitHub repository, and wait for my review.

**Outcome:** Built the initial Overview page structure using reusable components, including placeholder KPI cards, insight cards, chart containers, distribution sections, and zone ranking. Focused on the layout, responsiveness, and component architecture without integrating APIs or real data.


## 2026-07-16 — Mock backend + Overview dashboard (Milestone 4)

**Prompt:**
> Now we'll move on to the backend.
>
> Create the mock backend using Next.js API routes. Do not use a real database.
>
> Generate realistic mock analytics data and create shared TypeScript interfaces. Build a clean API layer so every dashboard widget fetches its own data independently from its own API endpoint.
>
> Then build the Overview dashboard page. Implement KPI cards and the first set of charts, including visitor trends, occupancy, and visitor distribution. Add loading and error states while keeping the implementation modular, reusable, and scalable.
>
> Follow the architecture we agreed on earlier. When finished, summarize what you implemented, explain any architectural decisions, build and lint the project, and then stop and wait for my review.

**Outcome:** Implemented the mock backend using Next.js API routes with realistic analytics data, shared TypeScript interfaces, reusable API layer, and independent data fetching for each dashboard widget. Built the Overview page with KPI cards, visitor trend, occupancy, and visitor distribution charts, along with loading and error states. Verified the project by building and linting successfully before committing and pushing the changes to the repository.


## 2026-07-17 — Complete Dashboard (Milestone 5)

**Prompt:**
> Build the remaining dashboard pages: Visitor Analytics, Zone Analytics, Visitor Journeys, and Dissatisfied Visitors. For each page, implement the required KPI cards, charts, tables, filters, mock API routes, and realistic mock data. Ensure every widget fetches independently from its own API endpoint, add loading and error states, keep all components modular and responsive, and maintain the Emirates Insights design language throughout. When finished, summarize what was implemented, run build and lint and wait for review.
> 
**Outcome:** Completed the remaining dashboard pages with reusable components, charts, tables, filters, independent API endpoints, realistic mock data, loading and error states, and a consistent Emirates-inspired design across the application.


## 2026-07-17 — Emirates branding

**Prompt:**
> Update the application's UI to better match the Emirates Insights dashboard. Apply the Emirates-inspired color palette and branding throughout the application while keeping the existing layout and functionality unchanged.

**Outcome:** Updated the application's color palette and branding to better align with the Emirates Insights design without changing any functionality.

---

## 2026-07-17 — Typography refinement

**Prompt:**
> Update the application's typography to better match the Emirates Insights dashboard. Replace the current font with Inter throughout the app and refine the typography hierarchy by adjusting font sizes, weights, and spacing. Keep the existing layout and functionality unchanged.

**Outcome:** Replaced the application's typography with Inter and refined the font hierarchy across headings, navigation, KPI cards, tables, and body text to improve readability and better match the Emirates-inspired design.

---

## 2026-07-17 — Background refinement

**Prompt:**
> Make the application's background one shade lighter to better match the Emirates Insights dashboard. Keep everything else the same and do not add or remove any features.

**Outcome:** Updated the application's background to a lighter warm off-white while preserving the existing color palette, layout, and functionality.

## 2026-07-17 — Visitor Journeys refinement

**Prompt:**
> Refine the Visitor Journeys page to make it feel more interactive and polished. Add hover interactions throughout the journey visualization so users can explore each step more easily. Improve the visual hierarchy, spacing, animations, and overall user experience while keeping the existing functionality and Emirates Insights design language consistent.

**Outcome:** Enhanced the Visitor Journeys page by adding interactive hover states, improving the journey visualization, refining spacing and animations, and creating a more polished and intuitive user experience while maintaining the existing functionality.

## 2026-07-17 — Dashboard filters

**Prompt:**
> Add a global filter panel similar to the Emirates Insights dashboard. Include date range presets, zone selection, gender, age group, and time granularity filters. Ensure the filters update the relevant dashboard widgets, remain reusable across the application, and match the existing design.

**Outcome:** Implemented a reusable global filtering system with date, zone, gender, age group, and time granularity filters, integrating it across the dashboard while maintaining the existing design and functionality.

---

## 2026-07-17 — Dashboard exports

**Prompt:**
> Add export functionality to the dashboard. Add a three-dot menu to the main charts allowing users to download each chart as a PNG image or PDF, and add a top-right Download PDF Report button that exports the dashboard's key charts and statistics in a professional multi-page report.

**Outcome:** Added reusable export controls for the main charts, allowing individual PNG and PDF downloads, and implemented a dashboard-wide PDF report generator for exporting the key charts and statistics.

---

## 2026-07-17 — Login page improvements

**Prompt:**
> Refine the login page by improving its layout, spacing, and overall visual polish. Also, make the existing Help & Support link functional by creating a dedicated Help & Support page that matches the application's design while keeping all authentication functionality unchanged.

**Outcome:** Enhanced the login page's overall design and user experience, and added a dedicated Help & Support page linked from the login screen while maintaining the existing authentication flow.


## 2026-07-18 — Performance optimization

**Prompt:**
> Optimize the application's performance without changing any functionality, layout, styling, or features. Improve rendering performance, reduce unnecessary React re-renders, optimize chart rendering and animations, cache API requests where appropriate, and make the UI feel smoother overall. In particular, make page navigation, chart loading, bar animations, hover interactions, and tooltips on pages like Visitor Analytics and Zone Analytics much smoother and more responsive while keeping the application's appearance exactly the same.

**Outcome:** Optimized the application's overall performance by reducing unnecessary re-renders, improving chart rendering and animations, optimizing data fetching and caching, and refining page transitions, hover interactions, and tooltips to create a smoother, more responsive user experience while preserving the existing design and functionality.

---

## 2026-08-08 — Database schema design (Milestone 6)

**Prompt:**
> The scope has changed — we now need a real database instead of the mock backend. Before writing any code, design the PostgreSQL schema for the `Location → Zone → Camera → Pulse` hierarchy required by the assignment. A pulse is one detection of one person by one camera and carries a face ID, age, gender, emotion, timestamp and camera ID. Explain your choice of primary keys, which columns should be nullable and why, what constraints belong in the database rather than the API, and which indexes the metric queries will need. Write the migrations as numbered SQL files that can be re-run in order. Don't touch the frontend yet.

**Outcome:** Designed and implemented five numbered migrations (`001_location` through `005_zone_phase`). Used surrogate identity primary keys throughout so natural keys like `code` can change, `bigint` on `pulse` because an integer key would exhaust in months at real detection rates, and `timestamptz` everywhere so a "day" is a real instant rather than an ambiguous wall-clock reading. Kept `face_id` deliberately un-keyed since it originates outside the system, left age/gender/emotion nullable because a face can be detected without being readable, and enforced value ranges with `CHECK` constraints instead of enums. Added indexes on `camera_id`, `detected_at` and `face_id`.

---

## 2026-08-08 — Synthetic pulse generator

**Prompt:**
> We need realistic data to develop against. Write a Python generator that produces pulses for roughly 90 days. It should model people actually moving through the building rather than emitting random rows — plausible paths between zones, realistic dwell times, repeat visitors returning across days, and detection rates that differ per zone. Also model the fact that the vision system re-estimates age and gender on every frame and gets them slightly wrong each time. Output CSV so it can be loaded with `\copy`.

**Outcome:** Built `db/seed/generate_pulses.py`, producing ~630,000 pulses across 90 days for ~2,600 unique visitors. Modelled per-zone detection rates (2.0/minute at the Entrance down to 0.12/minute in the Workspace, reflecting that a thoroughfare catches a face constantly while someone at a desk is turned away), journey templates per visitor type, per-zone emotional tone, and deliberately noisy per-detection age and gender readings so the backend has to resolve them.

---

## 2026-08-08 — Pulse ingestion endpoint

**Prompt:**
> Build the ingestion endpoint that cameras will POST to. The assignment requires handling 1,000+ pulses per second without data loss or bottlenecks, so design for that explicitly and explain the reasoning in comments. Authenticate it with a shared API key rather than a user session, since the caller is a camera gateway and not a person with a browser. Invalid rows must not be silently dropped, and one bad reading must not cost the rest of the batch.

**Outcome:** Implemented `POST /api/v1/pulses` accepting a batch of detections. Batching is the core decision: at one request per detection, 1,000/sec means 1,000 requests/sec of HTTP and pool overhead for trivial database work, whereas 100 detections per request reduces that to 10 requests/sec. Every camera code in a batch is resolved in one lookup, and the batch is written with a single multi-row `INSERT` — one statement, one round trip, one transaction, one disk flush. Rejected rows are returned individually with an index and a reason, the valid rows still commit, and the response is `207` rather than a blanket failure.

---

## 2026-08-08 — Derived metrics query layer

**Prompt:**
> Now write the backend logic that turns raw pulses into the metrics the assignment asks for: visits vs. visitors, visitor journeys, demographics, and the happiness index. Nothing derived should be stored — compute everything on read from the raw rows. Keep the shared filtering in one place so every widget queries the same slice of data, and explain the SQL patterns you use.

**Outcome:** Built `src/lib/services/live/` with 28 metric functions over two shared SQL fragments. **Gaps-and-islands** is applied twice — `LAG()` plus a running `SUM()` of a change flag, once over time to split a person's detections into visits at a 30-minute silence, and once over place to collapse a run of detections in one zone into a single stop. **Resolve-then-aggregate** collapses each face's many conflicting age and gender readings into one value (`mode()` and median) *before* counting, since counting raw detections measures who lingered longest rather than who visited. The happiness index maps happy/neutral/sad to 100/50/0 and is weighted by sample count so a single-reading stop cannot swing a visit.

---

## 2026-08-08 — Replacing the mock backend with live queries

**Prompt:**
> Wire the dashboard to the real database. Every existing API route should now query PostgreSQL instead of returning mock data, but the response shapes must stay identical so the frontend doesn't change. Delete the mock data layer rather than leaving it beside the real one. Keep the route handlers thin — session check, parse and validate parameters, call a service, return JSON.

**Outcome:** Repointed all existing `/api/v1` routes at the live service layer and added routes for locations, standalone metrics and ingestion. Deleted `src/lib/mock/` and the old mock services outright rather than leaving two implementations to drift apart. Added a pooled `node-postgres` client with parameterised queries throughout, and kept aggregation entirely out of the route handlers.

---

## 2026-08-08 — Migrating the database to Supabase

**Prompt:**
> Switch the database from the local PostgreSQL setup to Supabase PostgreSQL. Keep the existing schema, tables, seed data, SQL queries and API routes unchanged. First inspect the current setup, then migrate the data across and update the backend connection. Don't change the architecture or the frontend.

**Outcome:** Applied the same migrations to Supabase, then copied all four tables **with their existing IDs** rather than re-running the seed — re-seeding would mint fresh `camera_id` values and every one of the 626,848 pulse rows would then reference the wrong camera. Added `db/supabase.sh` to script the move and enabled TLS automatically for any non-localhost host so the same code still runs locally. Verified row counts and the full `detected_at` range matched exactly on both databases, and confirmed the app served real data with the local server stopped.

---

## 2026-08-08 — Empty date range crash

**Prompt:**
> Filtering the dashboard to "Today" throws a runtime error: `Cannot read properties of undefined (reading 'happiness')`. Work out why and fix it.

**Outcome:** Traced it to the Overview insight cards, which build three "the zone that is most X" callouts by sorting the zones and taking the first — `undefined` when no zone recorded a visit. The seeded dataset ends before the current day, so "Today" is reliably empty and reliably fatal. Confirmed the same crash predated the Supabase move. Added an empty state, and fixed a second symptom of the same empty range where the Dissatisfied banner rendered "On Invalid Date" by formatting an empty date string.

---

## 2026-08-08 — README rewrite for the full-stack scope

**Prompt:**
> The README still describes the mock backend. Rewrite it for the real system: schema design and the reasoning behind it, system architecture covering both the read and write paths, the full API reference, and setup instructions for both a local database and Supabase.

**Outcome:** Restructured the README around the live backend — table-by-table schema rationale, write path and read path, the derived-metric logic, 32 documented endpoints, and setup instructions for either database. An architecture diagram was added and then removed after review, since it rendered either two screens tall or too small to read and the surrounding prose already covered the same relationships.

---

## 2026-08-10 — Ingestion load benchmark against Supabase

**Prompt:**
> The 1,000 pulses/sec figures in the README were measured against the old local database. Re-measure the requirement properly against the real Supabase database, through a production build rather than the dev server. Use tagged rows so the benchmark data can be deleted afterwards, and don't leave anything behind.

**Outcome:** Measured sustained throughput rather than burst, since sustained is what the requirement asks for: **1,200/sec held for 30s and 5,000/sec held for 10s, both with zero errors and no backlog** — comfortably past the target. Burst peaked at 15,336 pulses/sec. The important finding was that a round trip to Supabase costs ~165 ms, so throughput now depends on batching: a single sequential sender at 100 rows per request manages only **286/sec and misses the target**, a precondition that did not exist against a local database. All 168,051 benchmark rows were deleted afterwards and the row count verified back at 626,848.

---

## 2026-08-10 — Dashboard latency diagnosis

**Prompt:**
> The dashboard feels slow since moving to Supabase. Measure the response time of every dashboard endpoint, work out which SQL is responsible, and report the bottleneck and what you'd recommend. Don't change any code yet — just measure and explain.

**Outcome:** Measured every endpoint and decomposed one representative query: 196 ms for the indexed range scan, 659 ms adding the shared scope, 1,410 ms once sessionization ran. The bottleneck is CPU, not network — every widget independently recomputes the same sessionization from 205,000 raw rows, and the 2-vCPU instance cannot run them in parallel, so five concurrent widgets take 4.5 s against 6.1 s sequential. Two plausible culprits were tested and ruled out: raising `work_mem` removed a disk spill but changed nothing, and the database is fully cached in `shared_buffers`. Recommended materialising the sessionization as the main fix.

---

## 2026-08-10 — Waiting-time endpoint doing double work

**Prompt:**
> Fix the waiting-time endpoint identified in the performance report.

**Outcome:** The function ran the entire sessionization pipeline twice — once for the per-bucket timeseries and once for the overall average — making it the slowest endpoint on the dashboard at 3.2 s. Replaced both with a single `GROUPING SETS` query that returns the buckets and the grand total in one pass, taking it to **1.6 s**. The total is still computed in SQL rather than by averaging the buckets in JavaScript, since a day with three waits and one with three hundred would otherwise count equally. Verified equivalent against the old queries with identical parameters: same bucket count, zero differing rows, same average.

---

## 2026-08-10 — Happiness average reporting the wrong figure

**Prompt:**
> The "Happiness by Age" donut shows 38 in the centre but every age band in its own legend reads about 76. Is the calculation wrong? Fix it.

**Outcome:** The centre divided the summed band scores by the number of age bands, which is always ten, while only five bands held visitors — the five empty bands counted as scores of zero and halved the figure. Replaced it with a **population-weighted mean**, which is what the widget's own subtitle already promised and what the two other happiness widgets independently agreed on. Weighting fixes the cause rather than the symptom: empty bands carry no weight and drop out on their own, so a populated band genuinely scoring zero is still counted. Fixed the same latent defect in the gender widget, where a fixed divisor of two would have halved the figure if either gender had no visitors.

---

## 2026-08-10 — README performance section and demo query

**Prompt:**
> Update the README performance section with the real Supabase numbers instead of the old local benchmark. Also check the runnable metrics SQL still works end to end, since we'll be demonstrating the derived metrics from it.

**Outcome:** Replaced the local figures with the measured Supabase results, including the ~165 ms round trip that governs everything else and the batching precondition attached to the throughput claim. Corrected two statements elsewhere in the README that the new numbers contradicted — the "compute on read" rationale had cited the old ~180 ms sessionization to argue materialising was not yet warranted, which has now flipped. Also fixed `db/queries/metrics.sql`, where the single-visitor journey example matched a hardcoded `face_id` that no longer existed and silently returned zero rows; it now selects a visitor at runtime so it cannot go stale again.

---

## 2026-08-11 — Seed detection rates

**Prompt:**
> Inspect the pulse generator and increase the detection rates so each person generates pulses more frequently. Keep the rates realistic and preserve the existing zone differences. Don't change the database or backend logic — only update the seed generation rates.

**Outcome:** The Entrance was emitting about **two** detections for an entire walk-through, because a 0.5–1.5 minute pass at 2.0 detections/minute rounds to two — a camera that notices someone twice and loses interest. Scaled all seven zone rates by 10, which preserves the relative weighting exactly while moving the absolute cadence into a plausible range: roughly every 3s at the Entrance, every 50s at a desk. Verified with a controlled run over the same three days: 11,235 → 105,637 pulses, a 9.4× increase. Also corrected the code comments after measuring — the quoted figures are *average* intervals, and because offsets are scattered at uniform random points across each dwell the observed medians run about a third shorter.

---

## 2026-08-11 — Pre-calculated statistics and a background job

**Prompt:**
> The dashboard should read pre-calculated values rather than recomputing everything from raw pulses on every request. Aggregate at a minimum granularity of one hour, calculate the statistics in a background job, and keep raw pulses for a reasonable retention period before purging them. Keep the current Next.js + Supabase architecture and the existing business logic. Update the database, the background processing, the API queries and the frontend connections as needed.

**Outcome:** Added four derived tables and a background job, without touching the `location → zone → camera → pulse` hierarchy. The design point worth recording is that **one hour of granularity is not sufficient on its own**: a distinct count is not additive, so somebody seen at 09:00 and again at 14:00 would be counted twice if unique visitors came from hourly buckets. So people are counted from visitor-grain tables (`person`, `visit`, `visit_stop` — 2.5k/18.5k/63.5k rows) where `DISTINCT` stays exact, and only additive sums come from `pulse_hourly` at the agreed one-hour grain. `refresh_rollups()` is incremental **by face rather than by time**, because a late pulse can extend a visit that began before the watermark; rebuilding whole people is cheap and leaves no half-built visits, and makes the job idempotent. Scheduling uses `pg_cron` inside Supabase, so no worker process was introduced. Retention (`purge_old_pulses(90)`) ships **disabled**, since deleting raw pulses is the only irreversible step.

---

## 2026-08-11 — Reading the dashboard from the rollups

**Prompt:**
> Repoint the API queries at the pre-calculated tables so the dashboard stops recalculating from raw pulses, and make the Overview page fast too. Keep the business logic and the response shapes exactly as they are.

**Outcome:** The shared `STOPS` fragment kept exposing relations named `stops` and `visits` with identical columns, so 15 of the query functions needed no edit at all; the Overview widgets were converted individually. **Overview went from 4.54 s to 0.47 s concurrent**, and most endpoints now sit near the 165 ms network floor. Two findings came out of verifying rather than assuming: a visitor count that appeared to have regressed turned out to be the rolling 30-day window sliding forward, confirmed by querying three definitions directly and getting the same answer; and footfall rose from 14,422 to 18,739 because the **old** query lagged `zone_id` partitioned by `face_id` alone, so an arrival was missed whenever somebody's last zone yesterday matched their first zone today — footfall had been under-reported by about 23%, and the new figure is the correct one.
