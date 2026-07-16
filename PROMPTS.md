# AI Prompts Log

Per the Phase 2 assignment requirements, this file logs the prompts used with AI assistants (Claude, ChatGPT) to write, debug, or structure the code in this repository.

---

## 2026-07-15 — Architecture design

**Prompt:**
> Step one is architecture. Before writing any code, I want us to design the application's architecture. Based on the Emirates Insights dashboard and the project requirements, propose: the folder structure, the routing structure, the component hierarchy, the state management approach, how authentication should work, how the mock backend should be organized, where mock data should live, how charts should fetch data, shared types/interfaces, and any utilities or services we'll need. Explain the reasoning behind each decision. Don't write implementation code yet — I want to agree on the architecture first so the project has a solid foundation.

**Outcome:** Produced a full architecture proposal (folder structure, `(auth)`/`(dashboard)` route groups, component tiers, TanStack Query + URL-based filter state, mock cookie auth with `proxy.ts` + DAL, `app/api/v1/*` mock backend mirroring the Pulses API, seeded mock data, per-widget chart fetching, shared `types/`, and utility/service layers) with reasoning for each. No code written.

---

## 2026-07-15 — Architecture agreement + per-widget fetching

**Prompt:**
> I agree with the architecture and the recommended 3 choices. One additional requirement: each dashboard widget should fetch its own data through the API layer rather than relying on a single large dashboard endpoint. After this, we'll build incrementally. Also dont implement the whole application at once well complete one milestone at a time and review it before continuing.

**Outcome:** Locked in the stack and the three recommended choices (mock cookie session auth, TanStack Query, mock API mirroring the Pulses endpoints). Adopted the hard rule that every widget owns its data (one endpoint + one hook per widget, independent loading/error states). Confirmed strictly incremental, milestone-by-milestone workflow with review before continuing.

---

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

---

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
>
> Also start pushing everything we're building to the GitHub repository now that development has started.

**Outcome:** Implemented a complete mock authentication system including a login page, login/logout API routes, httpOnly cookie-based session management, protected dashboard routes, authentication redirects, and logout functionality. Verified the authentication flow before committing and pushing the milestone to the GitHub repository.
