# Founder-persona revamp — repository audit

This is the Phase 1 deliverable: what the repository already contains, how the founder
experience maps onto it, where the gaps are, and the plan the later phases follow. It is
written against the code as it stands, not against an intention.

---

## 1. Architecture

One Next.js 15.5 application, three surfaces, one SQLite file.

| Layer | Where | What it does |
|---|---|---|
| Interface | `src/app/**/page.tsx`, `src/components/**` | Internal console (six departments), founder portal, investor portal, sign-in. |
| HTTP | `src/app/api/v1/**` | `actions` (the action registry), `startup-side`, `investor-side`, `auth/*`, `session`, `founder-upload`, `dashboard`, `[entity]`, `search`, `fields`, `meta`. |
| Domain (pure) | `src/lib/domain/*` | Stage lists, status registries, scoring, RBAC, the founder journey mapping, the application field model, working-day calendars, money. No I/O. |
| Server | `src/lib/server/*` | `action-registry` + `actions*.ts` (all business actions), `repo` (CRUD + audit), `session`/`auth` (OTP + bearer sessions), `season`, `metrics`. |
| Persistence | `src/lib/db/*` | `schema.ts` (DDL + idempotent in-place upgrades), `seed*.ts`, `client.ts` (`node:sqlite`). |

**How a write happens.** The browser POSTs `{action, payload}` to `/api/v1/actions`. The route
resolves the session, looks the action up in `action-registry.ts`, checks the role allow-list in
`ACTION_CATALOG`, and calls the handler. A handler reads/writes through `repo.ts`, which records
an `audit_events` row for every mutation. There is no second path: the founder portal and the
investor portal call the same handlers the console does.

**How the founder is scoped.** A founder login carries `users.startup_id`. `actorFromRequest`
builds a session with that id; `startup-side` and every `founder_side.*` handler read with it.
A founder can never name another startup.

---

## 2. Workflow mapping — founder journey

`src/lib/domain/founderJourney.ts` maps the internal SOP stages onto the twenty founder-facing
stages of the founder journey sheet. It is a **presentation mapping over the same records the
console reads** — it never renames or deletes an internal status and never becomes an independent
workflow, so the two views cannot disagree.

Each stage carries a **track**: the sequential steps 0–14 run one at a time, the telecast
(`parallel_content`) and the money stages (`parallel_money`) run in parallel after the main shoot,
and community (`ongoing`) runs throughout.

| # | Founder stage | Track | Derived from | Internal SOP stage | Owner |
|---|---|---|---|---|---|
| 00 | Profile | sequential | `startups.profile_status` | `startup_record` | Startup Relationships |
| 01 | Application – draft | sequential | `applications.status`, completeness | `application_draft` | Startup Relationships |
| 02 | Application – submitted | sequential | `applications.submitted_at` | `application_submitted` | Startup Relationships |
| 03 | Internal review | sequential | `screenings.outcome`, `applications.status` | `internal_screening` | Startup Relationships |
| 04 | Pre-bootcamp | sequential | `bootcamp_attendance.*` | `prep_bootcamp` | Startup Relationships |
| 05 | Investment fit check | sequential | `analyst_evaluations.recommendation` | `analyst_screening` | Analyst |
| 06 | MoU | sequential | `mous.status` | `mou_signing` | Legal & Startup Relationships |
| 07 | Document scrutiny | sequential | `document_requests.*`, `irr_reports.status` | `irr_handover` | Finance / IRR |
| 08 | Investor matching & virtual pitch | sequential | `virtual_pitches.*`, match count | `matching`, `virtual_pitch` | Investor Relations |
| 09 | Pitch Day (+ Golden Pass) | sequential | `pitch_days.*`, `pitch_day_options.*` | `pitch_day`, `golden_pass` | Investor Relations |
| 10 | Final selection | sequential | `committee_decisions.outcome` | `final_selection` | Management |
| 11 | Upfront fee | sequential | `upfront_fees.status`, `payment_proofs` | `upfront_fee` | Finance |
| 12 | AV shoot | sequential | `av_shoots.*` | `av_shoot` | Production |
| 13 | Mock shoot | sequential | `mock_shoots.*` | `mock_shoot` | Production |
| 14 | Main shoot | sequential | `main_shoots.*`, `episodes.*`, deal acceptance | `pre/main/post_shoot_documentation` | Production & Investor Relations |
| 15 | Telecast & promotion | parallel – content | `telecasts.*` | `editing` … `founder_feedback` | Marketing |
| 16 | Deal closure | parallel – money | `deals.*` | `deal_confirmation` … `pre_funding_conditions` | Investor Relations & Legal |
| 17 | Funds received | parallel – money | `tranches.*`, verified receipts | `fund_transfer` … `allotment` | Investor Relations & Finance |
| 18 | Success fee | parallel – money | `success_fees.status` | `success_fee` | Finance |
| 19 | Community | ongoing | `community_members.*`, events, referrals | `member_onboarding` … `founder_support` | Community |

**Reach and branching.** The sequential steps advance together: a later record proves every
earlier step was reached, so a step is `upcoming` only when nothing at or beyond it exists yet —
this keeps the timeline honest when an older item (a document clarification) is still outstanding
while the shoot has already happened. The parallel and ongoing stages stand on their own record,
so community membership cannot imply the sequential steps were cleared. `not_selected`
(rejection) and `on_hold` are terminal: they stop the journey there, and the current-stage pointer
prefers the first adverse outcome over the first in-progress stage, so a rejected founder sees the
rejection, not a later stage. `action_required` marks a stage the founder must act on.

---

## 3. What already works (verified)

- **Sign-in / sign-up** — one form, email or mobile, six-digit OTP, hashed at rest, rate-limited,
  single-use. A new identifier becomes a founder account on first verification
  (`auth.ts`, `LoginScreen.tsx`).
- **Registration** — a founder with no startup gets the onboarding screen and creates a real
  `startups` row via `startup.create`, which pins the login to it (`Onboarding.tsx`).
- **Application** — sectioned form, stage-appropriate mandatory fields (`applicationForm.ts`),
  real save (`founder_side.save_draft`), real submit (`application.submit_own`), completeness
  computed from the same field model the dashboard uses (`ApplicationForm.tsx`).
- **Journey tracker** — vertical timeline + detail panel that answers *what this means / latest
  update / your next step* and offers the stage action (`JourneyTracker.tsx`, `StageDetail.tsx`).
- **Documents** — team drives a checklist (`document.request_create`), founder uploads a real
  multipart file (`founder-upload` POST) which moves the item to *under verification*, team
  verifies or clarifies (`document.request_verify`), founder answers (`founder_side.document_respond`).
- **Agreement** — signing clock (shared → Legal AMA day 4 → sign by day 7), sign action records a
  signed copy, question opens a thread (`founder_side.mou_sign`, `founder_side.mou_clarify`).
- **Pitch Day** — team offers dates (`pitchday.option_offer`), founder confirms availability
  (`founder_side.pitch_day_confirm`); the team still fixes the slot.
- **Programme fee** — founder shares a proof (`founder_side.fee_proof_submit`); the invoice is
  **not** marked paid by it — only `upfront.record_receipt` settles it. Verified end to end.
- **Investment view** — committed and verified-deployed shown separately, investor identities and
  terms never exposed.
- **Download** — `/api/v1/founder-upload?ref=…` serves seeded references as real placeholder PDFs,
  with role/entity access control (staff any, founder/investor own entity only, else 403).

---

## 4. Gaps found (the work of Phases 2–7)

| # | Gap | Evidence | Phase |
|---|---|---|---|
| G1 | **Founders are not notified of internal decisions.** Screening outcome, bootcamp invitation, analyst outcome, committee decision, pitch scheduling, deal confirmation all `notify` an internal role only. | `notify(...)` calls in `actions.ts`/`actions-b..e.ts` name internal roles; none call `founderUserOf` | 6 |
| G2 | **No founder login exists for a Season 1 or Season 2 startup.** Every `kind:"founder"` user is pinned to an S-01…S-10 startup; S-11…S-20 (S01/S02 participants) have none, so "returning founder" cannot be walked. | `seed-data*.ts` | 2 |
| G3 | **Rejected / held / info-required founders get no message.** The journey shows the status, but no notice is written and no next-step guidance reaches the founder. | `reviewMessage` has copy; no `notify` | 6 |
| G4 | **Virtual pitch cannot be rescheduled and a missed pitch is not surfaced.** `pitch.schedule` always creates a new row; there is no reschedule action and no "you missed it" state. | `actions.ts` `pitchSchedule` | 6 |
| G5 | **Bootcamp invitation is not acknowledged by the founder.** The founder sees the invitation but has no action to accept or flag that they will miss an activity. | no `founder_side.*` bootcamp action | 6 |
| G6 | **Shoot date changes are not communicated.** `av.update`/`mainshoot.update` change dates silently. | `actions-c.ts` | 6 |
| G7 | **Partial payment / failed verification paths are untested end to end.** The handlers exist (`upfront.record_receipt` with a shortfall, `payment_proof.review` reject) but no scenario asserts them. | `e2e_scenario.py` | 7 |
| G8 | **Multiple Golden Passes and "no Golden Pass" are untested.** The pitch-day copy handles both; no scenario drives them. | `e2e_scenario.py` | 7 |
| G9 | **Founder dashboard has no explicit "what happened" history.** The journey gives latest-update per stage but there is no consolidated timeline of decisions the founder can read. | `FounderHeader.tsx` | 3 |
| G10 | **Partial disbursement is verified in the tranche flow but not surfaced as a founder-facing state.** A tranche at `part_verified` is counted; the founder's Investment panel does not name it. | `startup-side` route | 6 |
| G11 | **Duplicate-application linking is recorded but not shown to the founder.** A repeat applicant sees one application; the link to the earlier season is invisible. | `application.submit_own` sets `duplicate_of` | 4 |
| G12 | **No founder-facing "history" for earlier seasons.** A returning founder sees their current-season journey but not the closed-season outcome. | `startup-side` route | 4 |

---

## 5. Plan for Phases 2–7

**Phase 2 — Authentication and registration.**
Seed founder logins for a Season 1 and a Season 2 startup so a returning founder is a real,
signable account (G2). Confirm the OTP flow already covers sign-up (it does) and add the
returning-founder case to the sign-in scenario.

**Phase 3 — Dashboard.**
Add a compact "what has happened so far" history to the founder header, built from the same
stage records, so the founder can read their decisions in one place (G9). Keep the progress ring
and the single next step; remove nothing that works.

**Phase 4 — Application.**
Show the earlier-season link on the Application tab when `duplicate_of` is set, and list the
founder's closed-season applications read-only so a returning founder sees their history (G11, G12).

**Phase 5 — Journey tracker.**
The tracker is in place. Extend the stage detail so a rejected, held or info-required founder gets
an explicit next step and, where the SOP allows, a route back (resubmission, clarification reply).

**Phase 6 — Stage-specific interactions.**
Notify the founder on every internal decision that concerns them (G1, G3): screening outcome,
bootcamp invitation, analyst outcome, committee decision, pitch scheduling/reschedule, shoot date
change, deal confirmation. Add bootcamp acknowledgement (G5), virtual-pitch reschedule and
missed-pitch handling (G4), shoot-date-change notices (G6), and name the partial-deployment state
on the Investment panel (G10).

**Phase 7 — Testing.**
Add a scenario per edge case in the brief's §12 list, including partial payment, failed payment
verification, multiple Golden Passes, no Golden Pass, rescheduled and missed pitches, shoot date
change and partial disbursement (G7, G8). Every check runs against the real HTTP API on the real
database.

**Non-negotiables observed.** No rebuild, no stack change, no fake responses, no hardcoded
statuses, no internal data exposed to founders, no duplicate APIs, no simulated uploads or
payments, no stage marked complete without a real authorised event.
