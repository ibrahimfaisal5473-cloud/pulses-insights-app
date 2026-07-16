# AI Prompts Log

Per the Phase 2 assignment requirements, this file logs the prompts used with AI assistants (Claude, ChatGPT) to write, debug, or structure the code in this repository.



## 2026-07-15 — Architecture design

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
>
> Also start pushing everything we're building to the GitHub repository now that development has started.

**Outcome:** Implemented a complete mock authentication system including a login page, login/logout API routes, httpOnly cookie-based session management, protected dashboard routes, authentication redirects, and logout functionality. Verified the authentication flow before committing and pushing the milestone to the GitHub repository.


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
> When you're finished, summarize what you implemented, explain any component architecture decisions, create a commit, push it to the GitHub repository, and wait for my review.

**Outcome:** Built the initial Overview page structure using reusable components, including placeholder KPI cards, insight cards, chart containers, distribution sections, and zone ranking. Focused on the layout, responsiveness, and component architecture without integrating APIs or real data.
