# Startup Singam ERP

Operations and investment control for the Startup Singam startup-show lifecycle. One
application covers the startup journey, the investor journey, production, funding and finance,
community and marketing, and keeps selection, production, investment, community and finance
statuses separate at every stage.

The application is self-contained: Next.js for the interface, `node:sqlite` for persistence, and
a seeded dataset for the current season. No external services are required.

It serves three surfaces from one codebase: the internal staff console for the six departments,
a founder portal scoped to the founder's own startup, and an investor portal scoped to the
investor's own record. Each external login sees only its own deals, agreements and commitments.

## Running it

### What you need

- **Node.js 22.5 or newer** (`node --version`). The app stores data with Node's built-in
  `node:sqlite` module, which arrived in 22.5. Node 24 is recommended. No database server, no
  Docker and no other service is required.
- `npm` (ships with Node).

### From the zip

```bash
unzip startup-singam-erp.zip
cd startup-singam-erp

npm install        # installs Next.js, React and Tailwind (one time, needs internet)
npm run dev        # start the app on http://localhost:12000
```

Open <http://localhost:12000>. The SQLite database is created at `data/singam.db` from
`src/lib/db/schema.ts` and filled with the current season's data by `src/lib/db/seed.ts` on the
first request, so the first page load takes a moment and every later one is instant.

To serve an optimised build instead of the dev server (faster, and what the public URL uses):

```bash
npm run build      # production build
npm run start      # production server on http://localhost:12000
```

> After a code change, re-run `npm run build` for `npm run start` to pick it up — or use
> `npm run dev` while editing, which reloads automatically.

### Other commands

```bash
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm run db:reset   # drop the database; it reseeds on the next request
npm run package    # rebuild the distributable zip
```

### Ports and troubleshooting

- The app listens on **port 12000**. To use a different port, change the `-p 12000` flag in the
  `dev` and `start` scripts in `package.json`.
- `Error: Cannot find module 'node:sqlite'` means Node is older than 22.5. Upgrade Node.
- The seeded data is a fixture, not live records. Delete `data/singam.db` (or run
  `npm run db:reset`) to get back to a clean dataset at any time.

## Seasons

The show runs in numbered seasons and a startup can apply in more than one. The whole application
is scoped to one season at a time, chosen from the switcher under the logo in the sidebar:

- **Season 3 (S03)** is live; **Season 2 (S02)** and **Season 1 (S01)** are closed and kept for
  history.
- Every list, the dashboard, the board and search follow the selected season. A startup's deal
  from Season 1 stays in Season 1 even though the deal record carries no season of its own.
- New records are written into the season the user is working in, and reference numbers use that
  season's code (`S01`, `S02`, `S03`).

## Walking the whole lifecycle

`scripts/e2e_scenario.py` drives every department workflow through the real HTTP API, acting as
each department's user, and asserts the separations the operating model insists on. It needs the
dev server running.

```bash
python3 scripts/e2e_scenario.py          # defaults to http://localhost:12000
```

It walks application to telecast to fund deployment, including the edge cases:

- The founder portal is scoped to the founder's own startup; the investor portal is scoped to the
  investor's own record, and neither can run the other's actions.
- Only the frontier journey step is marked current, so one part moving ahead never hides another.
- An idea-stage application skips the financial sections; a repeat application links to the
  existing startup record.
- Bootcamp attendance alone does not mark preparation complete.
- The analyst view redacts founder and co-founder contact details; Management keeps them.
- A Golden Pass stays initial interest and never becomes a written commitment on its own.
- A revised commitment creates a new row and preserves the original.
- Production gets an advance notification on selection; the shoot handover stays blocked until
  payment clears.
- An investor-reported transfer is not verified deployment until Finance verifies it.
- Verified deployment triggers the success fee calculation with no email sent by hand.
- An approved extension preserves the original due date for ageing.
- A payment screenshot alone does not mark an invoice paid.
- An allocation beyond the invoice is rejected; the account reconciles at zero.
- A failed integration sync raises an alert instead of stopping work silently.

## Layout

```
src/
  app/                 pages: dashboard, one page per module, /records/[entity]/[id], /my-work
  app/api/v1/          REST API: session, meta, actions, one list route per entity, dashboard
  components/          AppShell, EntityBrowser, ModuleActions, MiniTable, ui primitives
  lib/domain/          entities, statuses, journeys, stages, rbac, policies, fee schedules,
                       scoring, matching, documents, working-day calendar
  lib/server/          repo, registry, action registry and handlers, metrics, redaction, session,
                       season scoping
  lib/db/              schema and seed data
  lib/client/          API client and action-form specs
```

## How the design answers the operating model

- **Two parallel journeys, one record.** `src/lib/domain/workflows.ts` defines the startup and
  investor journeys and their stages; every stage carries an owner, deadline, approval, document
  record and escalation path.
- **Separate statuses.** A startup can read "shoot completed; telecast pending; funds deployed;
  success fee partly collected" because selection, production, investment, community and finance
  are tracked on their own records and rolled up only on the dashboard.
- **Money in paise, kept apart.** Forecast fee, fee due, invoiced, collected and outstanding are
  distinct columns; the upfront deduction applies only when the agreement says it is adjustable.
- **One person, several roles.** A community member record holds multiple roles (founder, mentor,
  investor) without duplicating the person.
- **Documents by purpose, not title.** `src/lib/domain/documents.ts` maps a document purpose to
  its workflow requirement, so the signing event drives the requirement.
- **Everything audited.** `repo.ts` writes an audit row for every field change with before and
  after values, which the record page and the audit register surface.

## What each department gets

| Department | Screens | Owns |
| --- | --- | --- |
| Startup Relationship | Applications, Internal screening, Prep Bootcamp, Analyst screening, MoU, IRR | The founder journey, readiness and cross-department coordination |
| Investor Relations | Investors, Matching, Virtual pitches, Pitch Day & Golden Pass, Committee, Commitments | Onboarding, engagement and investment progression |
| Finance | Upfront fee collection, Deployment tracking, Success fees | Turnover-based upfront fees and post-funding success fees |
| Production | AV/mock/main shoot, Episodes | Shoot readiness, documentation and show handover |
| Community | Members, Events, Referrals, Founder support | Engagement, events, referrals and support outcomes |
| Marketing | Telecast & promotions | Episode telecast, promotions and public announcements |

Every screen reads from the same startup and investor records, and every action carries an owner,
due date, required output, evidence, approver and next action. Handovers between teams are
explicit records that the receiving team accepts, so nothing passes silently.

## Points still to be configured

The operating model lists decisions to lock before the rules are automated. They are modelled as
configurable policies in `src/lib/domain/policies.ts` with an effective date and approval
history, and can be changed from **Policies & configuration** without losing earlier records:
qualifying screening score, non-applicable criteria treatment, complete upfront fee slabs and
adjustment rules, the mandatory investor document set per category, shoot-day signature target
and deadline, investment closure timing, and the community workflows.

## Verification status

- `npm run typecheck` and `npm run lint` pass.
- `npm run build` produces a clean production build with no errors in the server log.
- `scripts/e2e_scenario.py` passes 263/263 checks against a freshly seeded database and
  exercises every one of the 118 catalog actions, including season scoping and the investor-side
  and founder-side portals.
- All module pages and record-detail routes return HTTP 200 for their permitted roles; a role
  that cannot open a module sees a clear notice instead of empty tables or a raw error.
