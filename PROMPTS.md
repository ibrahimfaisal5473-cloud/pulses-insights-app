# AI Prompts Log

Per the Phase 2 assignment requirements, this file logs the prompts used with AI assistants (Claude,ChatGPT) to write, debug, or structure the code in this repository.

---

## 2026-07-15 — Architecture design

**Prompt:**
> Step one is architecture. Before writing any code, I want us to design the application's architecture. Based on the Emirates Insights dashboard and the project requirements, propose: the folder structure, the routing structure, the component hierarchy, the state management approach, how authentication should work, how the mock backend should be organized, where mock data should live, how charts should fetch data, shared types/interfaces, and any utilities or services we'll need. Explain the reasoning behind each decision. Don't write implementation code yet — I want to agree on the architecture first so the project has a solid foundation.

**Outcome:** Produced a full architecture proposal (folder structure, `(auth)`/`(dashboard)` route groups, component tiers, TanStack Query + URL-based filter state, mock cookie auth with `proxy.ts` + DAL, `app/api/v1/*` mock backend mirroring the Pulses API, seeded mock data, per-widget chart fetching, shared `types/`, and utility/service layers) with reasoning for each. No code written.

## 2026-07-15 — Architecture agreement + per-widget fetching

**Prompt:**
> I agree with the architecture and the recommended 3 choices. One additional requirement: each dashboard widget should fetch its own data through the API layer rather than relying on a single large dashboard endpoint. After this, we'll build incrementally — don't implement the whole application at once; we'll complete one milestone at a time and review it before continuing.

**Outcome:** Locked in the stack and the three recommended choices (mock cookie session auth, TanStack Query, mock API mirroring the Pulses endpoints). Adopted the hard rule that every widget owns its data (one endpoint + one hook per widget, independent loading/error states). Confirmed strictly incremental, milestone-by-milestone workflow with review before continuing.
