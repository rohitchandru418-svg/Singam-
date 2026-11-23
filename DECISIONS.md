# Decisions

Every point in `00_Master_Brief.md` §12 that the source documents left undefined is recorded
here. Each entry names the default the application implements, where it lives in code, and the
policy or setting that supersedes it. Nothing in this list is invented business logic: each is
the safe default the brief itself specifies.

A decision marked **[configurable]** is a policy or config field, so a future season can change
it without a code change and without losing earlier records.

| # | Point | Default implemented | Where | Configurable |
|---|---|---|---|---|
| 1 | Upfront-fee clock trigger | 15 days from **Committee Proceed** | `POL-UPFRONT-FEE` (`domain/policies.ts`); clock set in `server/actions-c.ts` when the committee decision is recorded | Yes — policy `trigger` |
| 2 | Screening pass mark | None. The RM decides; the score guides only | `POL-SCREEN-QUALIFY` is present with `passMark: null`; `domain/scoring.ts` never auto-progresses | Yes — policy `passMark` |
| 3 | Non-applicable screening criteria | Excluded from the total; score shown against applicable marks. Idea-stage applications skip financials and traction (`applicationForm.ts` `stageSections`) | `domain/scoring.ts`, `domain/applicationForm.ts` | Partly — section list per stage |
| 4 | Fee schedule (slabs, caps, adjustments) | Versioned config with a placeholder schedule; no hard-coded numbers | `fee_slabs` table, `POL-UPFRONT-FEE` / `POL-SUCCESS-FEE`, `domain/policies.ts` | Yes — versioned fee schedule |
| 5 | Analyst criterion weights; overdue escalation recipient | Equal weights; overdue escalations go to **super admin** | `domain/types.ts` (1–5 per criterion), `domain/workflows.ts` stage `analyst_screening` escalation | Yes — weights |
| 6 | Analyst outcomes in SR dashboard | **Conditional proceed** is counted everywhere alongside Proceed/Hold/Reject | `domain/statuses.ts` (`recommendation` registry), SR dashboard counts | No (correctness fix) |
| 7 | Investor agreements | Participation agreement + NDA (no MoU), configurable per category | `POL-INVESTOR-DOCS`; `investor_agreements` rows | Yes — policy `mandatorySet` |
| 8 | Golden Pass | Stored as its own record, distinct from a written commitment; evidence requirement configurable | `POL-GOLDEN-PASS`; `pitch_day_slots` / `commitments` are separate tables | Yes — policy `evidenceRequired` |
| 9 | Pre-shoot vs post-shoot documents | Driven by `SigningEvent`, not file name | `domain/documents.ts`, `main_shoots` signing-event fields, `POL-SHOOT-SIGNATURES` | Yes |
| 10 | Shoot-day signatures | Target (same day) and final deadline (24 h) stored separately | `POL-SHOOT-SIGNATURES`; `main_shoots.signature_completed_on` vs `signing_deadline` | Yes |
| 11 | Founder stage numbering | Stage 19 (Community) is an always-available area, not a gated stage | `domain/founderJourney.ts` — stage 19 `track: "ongoing"`, never blocks | No (interpretation) |
| 12 | Episode final approver | **Super admin** | `domain/workflows.ts` stage `approvals` (`approverRole: "management"`) | Yes |
| 13 | RM assignment algorithm | **Load-based** (fewest open startups first) | `server/actions*.ts` assignment; `POL` assignment setting | Yes — policy |
| 14 | WhatsApp scope | Built behind a channel interface; WhatsApp optional | `domain/types.ts` `NotificationChannel`; `integrations` seed row | Yes — channel config |
| 15 | Bulk approval | Allowed only for types explicitly marked low-risk; off by default | `domain/statuses.ts` approval metadata; approvals inbox | Yes |
| 16 | Community "qualified referral" / attribution | Configurable criteria; original source and later contributors stored separately | `POL-COMMUNITY`; `referrals` table (`source` vs `contributors`) | Yes — policy |
| 17 | Partner share in fee settlement | Field kept, **hidden by default** | `POL-SUCCESS-FEE` `partnerShare: false`; `success_fees.partner_share` | Yes — policy |
| 18 | Phase labels | A `phase` field is kept so a later version can be tracked | `domain/types.ts` `phase`; status registries | Yes |

## Corrections from the brief

### §9 — the investor grade must not reach the investor

The IR SOP grades an investor L1–L4; the brief's §9 corrects this so the grade never leaves the
console. The application keeps the grade internal and shows the investor its *effect* instead:

| Point | What the SOP says | How the ERP treats it |
|---|---|---|
| Investor grade visibility | Grade an investor L1–L4 and use it for engagement | The grade stays in `investor_grade_assessments` for the console only; `/api/v1/investor-side` never selects it. The investor sees the season meter (allocation, committed, available, max per startup, verified deployed) and their permitted engagement, not the label. |

## How a decision is surfaced in code

Each default above is marked in the source with a `[DECISION]` comment naming the brief section,
so a reader can trace a rule back to this file without searching the conversation history.
