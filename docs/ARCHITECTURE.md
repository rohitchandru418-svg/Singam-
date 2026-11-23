# Architecture

`00_Master_Brief.md` §13 asks for a stack proposal that satisfies five constraints: server-side
RBAC with field-level redaction, mobile-first web, event-driven automation, Zoho Books
integration, and email/in-app/WhatsApp notifications. This document records the stack the
application already uses and how each constraint is met. It is a description of what is built,
not a proposal for something new.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Interface | **Next.js 15.5 (App Router) + React 19** | One codebase serves the internal console, the founder portal and the investor portal. Server components keep the visibility rules on the server. |
| Language | **TypeScript**, `strict` | The domain layer is typed, so a stage, status or fee measure cannot be misspelled at a call site. |
| Persistence | **`node:sqlite`** (Node's built-in driver, Node 22.5+) | No database server, no Docker, no external service. The whole season runs from one file, which keeps the prototype portable and the demo reproducible. |
| Styling | **Tailwind v4** with the design tokens in `src/app/globals.css` | One token set (brand red, navy, gold, semantic tones) shared by every surface, so the founder and investor portals and the console look like one product. |
| Server | Next.js route handlers under `src/app/api/v1/*` | Every read and write passes one session check, so redaction and RBAC are enforced at the API boundary, never only in the UI (brief §9). |

No other runtime dependency is required. `npm install` then `npm run dev` is the whole setup.

## How each brief constraint is met

### 1. Server-side RBAC with field-level redaction

- `src/lib/domain/rbac.ts` declares every role and the modules it may open. A role is the unit of
  access; the API refuses a request that names a module the role cannot see.
- `src/lib/server/redact.ts` is the field-level layer. It strips founder and co-founder names and
  contacts for the analyst role in **screens, exports, PDFs, notifications and shared links** — the
  brief's §9 requirement that redaction is enforced by the system, not the screen.
- The founder portal (`/api/v1/startup-side`) and investor portal (`/api/v1/investor-side`) are
  separate endpoints that build their own projections, so a field a persona must not see is simply
  never selected. There is no shared "full record" response that a portal could leak.

### 2. Mobile-first web

Every screen is laid out at a mobile width first and widened with Tailwind breakpoints. The
console rail collapses to a drawer, tables become stacked cards, and the founder and investor
portals use a single-column timeline. WCAG AA contrast is met by the token set.

### 3. Event-driven automation

`src/lib/server/actions*.ts` holds the write handlers. A handler that changes a state the brief
lists in §8 performs the follow-on effects in the same transaction:

- Committee Proceed → create the upfront-fee request, send the Production advance notice, notify SR.
- Full fee verification → assemble the AV handover pack.
- Tranche verification → create the success-fee task and copy SR.
- Formal submission → assign the RM, acknowledge, run the duplicate check, lock the application.

Each effect is a plain function call inside the handler, so there is no queue to run and no job
that can silently stop. `audit_events` records every one.

### 4. Zoho Books integration

`integrations` and `sync_runs` model an accounting connector named **Zoho Books** (the brief and
doc 05 name it). The sync panel shows the last sync, the failure count and the error text, and a
failed sync raises a visible alert rather than failing silently (brief §8, §10.9).

### 5. Notifications

`notifications` stores in-app notifications with a `entity_type` / `entity_id` deep link, so an
alert opens the exact record. `domain/types.ts` keeps a channel field so email and an optional
WhatsApp channel sit behind one interface (brief §12 decision 14).

## The record spine

The shared records the brief lists in §10 live in `src/lib/db/schema.ts` as single tables reused
by every module: `startups`, `investors`, `applications`, `analyst_evaluations`, `mous`,
`irr_reports`, `matches`, `commitments`, `committee_decisions`, `episodes`, `main_shoots`,
`deals`, `tranches`, `upfront_fees`, `success_fees`, `ledger_entries`, `referrals`,
`community_events`, `audit_events`. A department screen reads the spine rather than keeping a
copy, which is what keeps the separate status tracks (brief §6) honest.

## The live simulation

The brief asks for a walkthrough that lets a reader *see the workflow run* rather than read about
it. The simulation is a **live run over the real application**, not a mock: there is no overlay,
no redrawn screen and no static page.

- The script is `src/lib/domain/simulation.ts`. It lists **48 steps across six journeys** — the
  startup journey, the investor journey, and the content, investment, finance and community
  workstreams that continue after the shoot. Each step names the **real route it opens**, the
  **real action it runs** from the action catalogue, the persona that owns it, and one line on
  what to look at on that screen.
- The runner is `src/components/SimulationDock.tsx`, a slim bar pinned to the bottom of the real
  app. It **navigates the real router** to each step's route and, when a step does work, opens
  the real `ActionForm` and fires the real action through the real API. The records and the
  screens therefore move for real while the run proceeds. It is reachable from anywhere by
  dispatching `ss:open-simulation`, or with `?simulate=1`.
- Because a run does real work, a step owned by a different persona shows on its real screen and
  offers **"Run as <persona>"**, which re-authenticates for that step — the same "sign out, sign
  in as another persona" rule the product follows.
- The invariants it exercises (committed ≠ deployed, forecast ≠ due ≠ invoiced ≠ collected ≠
  outstanding, a Golden Pass ≠ a commitment, a screenshot ≠ a settled invoice, a signing event
  decides which document is required) live in the actions themselves and are asserted by the
  end-to-end suite.

### Sign-in personas

Sign-in is split into two systems. **External** is the founder portal and the investor portal.
**Internal** is the team: Startup Relationship, Investor Relations, Finance, Production, Legal,
Marketing, Community, Analyst and the Super Admin. The eleven personas are declared in
`src/lib/domain/personas.ts` and offered as a dropdown on the sign-in screen. There is no Master
Brief persona.

In the review build (`authDevMode()`, never production) the acting persona can also be changed
from inside the running app: `src/components/PersonaSwitcher.tsx` sits in the header of all three
shells and re-issues the session through `POST /api/v1/auth/dev-switch`, so the rails, gates,
dashboards and forms re-read as the chosen role. A production sign-in is unchanged — the account
is the one the person signed in with, and changing it means signing out and signing in again.

### The record workflow panel

A record screen opens with a `WorkflowPanel` (`src/components/WorkflowPanel.tsx`) that places the
record on its journey with a stage stepper and states the stage's owner, deadline, required
output, evidence, approver and escalation, then puts the record's real next-step actions in
front of the reader. It reads the same `JOURNEYS` definitions the Journey map uses, matching the
record's status registry and value to a stage, so a record screen and the journey map cannot
disagree. `npm run check:simulation` asserts the simulation and persona invariants.

## Brief §9 — the grade-visibility correction

The brief's §9 corrects a contradiction between the IR SOP (which grades investors L1–L4) and the
founder-facing material: the internal grade must not reach the investor. The application resolves
it by keeping the grade in the console only:

- `investor_grade_assessments` is read by the Investor Relations screens and is **stripped from
  every payload the investor portal receives** (`/api/v1/investor-side` builds its own
  projection and never selects `grade`).
- The investor sees a **season meter** instead — allocation, committed, available, maximum per
  startup and verified-deployed — plus their verification status and permitted engagement. The
  grade still sets the permitted engagement and panel role; the investor is told the effect, not
  the label.

## Where to start reading

- Domain rules: `src/lib/domain/` — `workflows.ts` (stages and SOP deadlines),
  `founderJourney.ts` (the 20 founder stages), `policies.ts` (versioned policies),
  `workingDays.ts` (the shared working-day calendar), `statuses.ts` (every status registry).
- Server rules: `src/lib/server/` — `session.ts` (who is acting), `redact.ts` (visibility),
  `metrics.ts` (dashboard figures), `actions*.ts` (writes and automation).
- Surfaces: `src/components/AppShell.tsx` (console), `founder/` (founder portal),
  `InvestorPortal.tsx` (investor portal).
