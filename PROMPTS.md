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

Add a global filter panel similar to the Emirates Insights dashboard. Include date range presets, zone selection, gender, age group, and time granularity filters. Ensure the filters update the relevant dashboard widgets, remain reusable across the application, and match the existing design.

**Outcome:** Implemented a reusable global filtering system with date, zone, gender, age group, and time granularity filters, integrating it across the dashboard while maintaining the existing design and functionality.

---

## 2026-07-17 — Dashboard exports

**Prompt:**

Add export functionality to the dashboard. Add a three-dot menu to the main charts allowing users to download each chart as a PNG image or PDF, and add a top-right Download PDF Report button that exports the dashboard's key charts and statistics in a professional multi-page report.

**Outcome:** Added reusable export controls for the main charts, allowing individual PNG and PDF downloads, and implemented a dashboard-wide PDF report generator for exporting the key charts and statistics.

---

## 2026-07-17 — Login page improvements

**Prompt:**

Refine the login page by improving its layout, spacing, and overall visual polish. Also, make the existing Help & Support link functional by creating a dedicated Help & Support page that matches the application's design while keeping all authentication functionality unchanged.

**Outcome:** Enhanced the login page's overall design and user experience, and added a dedicated Help & Support page linked from the login screen while maintaining the existing authentication flow.
