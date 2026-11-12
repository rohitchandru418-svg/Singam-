# 00 · Startup Singam ERP — Master Build Brief

> **Read this first.** This is the entry point for building the Startup Singam platform. It states the client's scope, the rules that apply everywhere, and how the 11 department documents (01–11) fit together. Each department document holds the detailed workflow; this brief holds what is shared across all of them and what to build first.

---

## 1. What we are building

An ERP-style platform that runs one season of **Startup Singam**, a show where startups pitch to investors, from application to money received and fees collected. It connects two journeys, a startup journey and an investor journey, across internal departments, and keeps their statuses separate.

**Client scope (as supplied):**

| Area | Must cover |
|---|---|
| **Startup journey** | Application, automated eligibility checks and scoring, screening, bootcamp, analyst evaluation, MoU, Investment Readiness Report (IRR), pitches, final selection, shoot readiness |
| **Investor journey** | Sourcing, verification, onboarding, grading, startup matching, meetings, feedback, commitments, deal closure |
| **Production and marketing** | AV shoot, mock shoot, main shoot, documentation, telecast, promotional activities |
| **Funding and finance** | Turnover-based upfront fees (invoicing, collection); post-show term sheets, due diligence, agreements, tranche-wise deployment verification, platform (success) fee calculation and collection |
| **Community** | Founder and investor engagement, events, mentoring, partner activities, referrals, follow-up outcomes |

**Cross-cutting client requirements:**

- The existing SOPs are the process foundation. **Every stage needs an owner, a deadline, an approval, a document record and an escalation path.**
- The management dashboard shows, per startup: progress, pending actions, investor commitments, actual funds deployed, fees collected, outstanding balances.
- **Selection, shoot completion, investment commitment, deployment and fee collection are tracked as separate statuses and never merged.**

> Example of correct output: *"Shoot completed; telecast pending; ₹75 lakh deployed; success fee partly collected."*

---

## 2. Current state of this repository

The repo currently contains **specification files only, with no application code yet**.

| File | Defines |
|---|---|
| `01_Founder_Journey.md` | Founder portal, 20 stages (0–19), parallel Content and Money tracks after the main shoot |
| `02_Investor_Journey.md` | Investor portal, 16 stages (0–15), season meter, deal room, tranche tracker |
| `03_Startup_Relations_SR.md` | SR workspace: application → screening → bootcamp → analyst handoff → MoU → IRR handover, plus follow-ups |
| `04_Investor_Relations_IR.md` | IR workspace: investor sourcing, verification, grading, matching, pitches, Pitch Day, committee pack, pre-shoot confirmation, deal closure |
| `05_Finance.md` | IRR, upfront fee, receipts, deployment verification, success fee, reconciliation, Zoho Books sync |
| `06_Production_Show_Operations.md` | Advance notice, handover pack, AV/mock/main shoot, exceptions, editing |
| `07_Legal.md` | MoU Q&A, negotiation redraft, templates, due diligence, agreements, pre-funding conditions |
| `08_Marketing_Telecast.md` | Telecast schedule, promo assets, founder posting, announcements |
| `09_Community_Ecosystem.md` | Unified person record, events, referrals, founder support |
| `10_Analyst.md` | Analyst queue, evaluation form, recommendation, redaction |
| `11_Super_Admin_Management.md` | Approvals inbox, escalations, policies, season setup, users, platform-wide requirements |
| `Startup Singam(1).xlsx` | Source sheet the docs were derived from. Yellow rows are **Proposed** (need approval): keep a `proposed` flag in config |

**Precedence when documents disagree:** the department document for that area (01–11) wins over this brief for workflow detail; this brief wins for cross-cutting rules; anything unresolved goes to Section 12 and is decided there, not guessed silently.

---

## 3. Non-negotiable rules (apply everywhere)

These recur across the department documents. Treat them as hard constraints and test them automatically.

### 3.1 Keep these concepts separate

| Never merge | Why |
|---|---|
| **Interest** (analyst willingness, indicative amount, "Ready to invest" verdict, Golden Pass) vs **Commitment** (written, e.g. Investment Commitment Letter) vs **Deployed** (bank-verified money received) | Public claims and fees depend on the difference |
| **Advance notice** to Production (at Committee Proceed) vs **AV handover pack** (only after full upfront fee verified) | Two milestones, two lists, never mixed |
| **Investor-reported** transfer vs **Startup-confirmed** receipt vs **Finance-verified** | Three-way tranche status |
| Payment **screenshot** vs **verified receipt** | A screenshot never marks anything paid |
| Selection, Production, Investment, Content, Finance, Community statuses | Each has its own status field and dashboard |
| Document **title** vs **signing event** | The signing event and its purpose decide which document is required, not the file name |
| Telecast timing vs deal closure | Closure starts after deal confirmation on set; telecast runs independently |

### 3.2 Five fee numbers, always shown separately

**Forecast fee** (expected on anticipated funding) · **Fee due** (determined on verified money) · **Invoiced** · **Collected** (verified receipts, TDS recorded) · **Outstanding** (unsettled balance after approved adjustments).

### 3.3 Money rules

- Success fee is calculated **only on verified received money**; one invoice per verified tranche.
- Returned money is a **reversal linked to the original transaction** (reduces deployed amount and fee base; credit note if already invoiced). Never edit history away.
- AV handover only after the **full** upfront fee is verified.
- An extension **keeps the original due date** and adds a new one; ageing counts from the original.
- Do **not** hard-code an automatic upfront-fee deduction from the success fee; apply it only if the signed agreement allows.
- Reconciliation closes only when the startup account balances **and** TDS certificates (Form 16A) are in. Sending an invoice is not closure.
- Investors pay no fees.
- Example: ₹2 crore committed, ₹75 lakh verified → show ₹75 lakh deployed, ₹1.25 crore outstanding.

### 3.4 Process rules

- Screening starts only after **formal submission**; the application then locks (only the RM can unlock).
- A repeat applicant links to the existing startup record and keeps earlier history. Duplicate detection runs on every intake (application, community, referral).
- **SR cannot override an analyst Reject.**
- Analysts never contact founders; questions go through SR.
- Every task has: **Owner → Due date → Required output → Evidence → Approver → Next action.**
- Every approval, score, term, amount and status change is written to an **append-only audit log**.
- Policies (pass mark, fee schedule, calendar, eligibility rules) are **versioned with effective dates**; live versions are never edited, only superseded.

---

## 4. Who uses the system

| Persona | Login | Primary document | Notes |
|---|---|---|---|
| Founder | Yes (one per startup) | 01 | Sees only own startup |
| Investor | Yes (one per investing entity) | 02 | Never sees own grade or other investors |
| Relationship Manager (SR) | Yes | 03 | Auto-assigned, scores applications |
| Analyst | Yes (single queue) | 10 | Sees permitted business info only |
| Investor Relations (IR) | Yes | 04 | Owns investment process from due diligence onward; deal closure owner |
| Finance team and Finance lead | Yes | 05 | Finance lead approves standard fees and extensions up to 7 days |
| Legal (in-house) | Yes | 07 | Support function; works as tasks inside IR-owned deals |
| Production head and coordinators | Yes | 06 | Permitted business info only |
| Marketing | Yes | 08 | Approved publication info only |
| Community team | Yes | 09 | Manages all member records |
| Super admin (CEO, directors, managing partners) | Yes | 11 | Any one can approve; the system records who |
| Mentors, partners | **No login** | 09 | Records only |
| Outside law firm | Deferred | 07 | Design roles so a restricted login can be added later |

---

## 5. End-to-end flow

**Startup journey**
Application draft → Completed submission → Internal screening (100 marks) → Prep Bootcamp → Analyst screening → MoU signing → IRR → Virtual pitch → Investor interest → Pitch Day → Golden Pass → Detailed investor discussions → Final Shortlisting Committee → Upfront fee → AV shoot → Mock shoot → Pre-shoot documentation → Main shoot → Post-shoot documentation.

**Investor journey**
Sourcing → Exploratory discussion → Verification and agreement signing → Grading (L1–L4, internal) → Thesis and preference mapping → Matching → Virtual pitch → Pitch Day → Golden Pass and follow-on interest → Selection coordination → Pre-shoot panel and commitment confirmation → Shoot-day deal confirmation.

**After the shoot, two parallel workstreams**

- **Content (Marketing):** Editing → Approvals → Telecast → Promotions → Founder feedback.
- **Money (IR, Legal, Finance):** Deal confirmation → Communication thread (≤48 h) → Term sheet → Due diligence → Agreements → Pre-funding conditions → Tranche transfer → Deployment verification → Success fee invoice → Collection → Reconciliation → Portfolio engagement.

**Community** runs alongside everything as the lead engine (startup and investor leads) and as the alumni and ecosystem layer.

---

## 6. Separate status tracks per startup

Each track has its own status field. The management dashboard shows all of them side by side.

| Track | Owner | Milestones |
|---|---|---|
| **Selection** | SR → Management | Applied → Screened → Bootcamp complete → Analyst decision → MoU signed → IRR approved → Pitched → Pitch Day → Committee (Proceed / On hold / Rejected) |
| **Production** | Production | Planning (advance notice) → Ready to book (handover accepted) → AV done → Episode allocated → Mock readiness approved → Main shoot done → Shoot file complete → Edited → Approved |
| **Investment** | IR | Interest (indicative) → Golden Pass / written commitment → Confirmed on set → Term sheet → DD → Agreements → Conditions cleared → Tranches → Verified deployed |
| **Content** | Marketing | Air date set → Assets approved → Founder notified → Founder posted → Aired → Feedback |
| **Finance** | Finance | Upfront: Not initiated / Under calculation / Invoiced / Part paid / Paid / Overdue / Extension approved / Disputed / Waived / Refunded. Success fee: the five measures in 3.2 |
| **Community** | Community | Member engagement, referrals, support requests |

---

## 7. Deadlines and SLAs

All "working day" deadlines use one shared **working-day calendar service**.

| Rule | Deadline | Consequence |
|---|---|---|
| Founder replies to "Information required" | 7 days | Auto-set to Hold |
| MoU: Legal Q&A | Working day 4 after MoU shared | Alert; logged Q&A |
| MoU: signing | Working day 7 | Unsigned → founder chooses Proceed / Negotiate / Discontinue |
| MoU negotiate | Super admin approves terms → Legal redrafts v2 | Clock restarts on v2 |
| Analyst evaluation | 5 working days | Escalate (recipient to confirm) |
| Any super-admin approval | 2 working days | Shown as overdue on dashboard |
| Upfront fee payment | 15 days (trigger: see Section 12) | Late reason and Management decision recorded |
| Fee extension | ≤7 days Finance lead; >7 days super admin | Original due date preserved |
| IRR reaches investors | ≥2 weeks before shoot | Alert IR and SR if at risk |
| Communication thread after deal confirmation | 48 hours | Tracked task with countdown |
| Post-shoot signatures | Same day or 24 h (to confirm) | Exception escalation |
| Virtual pitch format | 5 min pitch + 5 min Q&A | n/a |
| Overdue fee ageing buckets | 0–15 / 15–30 / 30+ days from original due date | Dashboard chips |

---

## 8. Automation triggers (build these as an event-driven engine)

| Event | System does |
|---|---|
| Founder formally submits application | Assign RM, send acknowledgement, run duplicate check, lock application |
| "Information required" issued | Start 7-day clock; auto-Hold on expiry |
| Prep complete | Send to analyst pool with founder identity redacted; start 5-working-day SLA |
| MoU shared | Start day-4 and day-7 clocks |
| MoU signed | Create IRR request for Finance; Finance accepts handover |
| Analyst "Conditional proceed" | Create blocking SR task that must clear before IRR handover to IR |
| **Committee Proceed** | Create upfront-fee request (clock starts); send advance notice to Production; notify SR |
| **Upfront fee fully verified** | Auto-assemble AV handover pack; IR approves; Production accepts |
| Shoot scheduled | Monitor the 2-week IRR rule |
| Deal confirmed on set | Open deal room; start 48 h thread task |
| **Tranche verified** | Create success-fee calculation task for Finance; copy SR |
| Ledger event, status change, approval | Write to audit log |
| Any integration sync fails (e.g. Zoho Books) | Visible failure alert with retry; never fail silently |

---

## 9. Access control and redaction (enforce server-side, at API level)

| Who | Must NOT see |
|---|---|
| **Founder** | Analyst scores, investor willingness, indicative amounts, internal grades, screening score (verdict only), other founders' data, internal remarks |
| **Investor** | Own L1–L4 grade, other investors' data, founder confidential data beyond the IRR. IRR is **view-only, no download, watermarked** with investor name and timestamp, views logged |
| **Analyst** | Founder and co-founder names and contacts, in screens, **exports, PDFs, email notifications and shared links** |
| **Production** | Confidential investor remarks, deal documents |
| **Marketing** | Investor remarks, deal documents (approved publication information only) |
| **Community** | Any deal data; membership never grants deal access |
| **Legal module data** | Commercial terms beyond Legal's role are not exposed to other modules |

Finance does **not** perform due diligence; Legal does, as tasks inside the IR-owned deal, and **IR confirms closure**.

---

## 10. Shared platform services (build first)

1. **RBAC with field-level redaction**, server-side, for all personas above.
2. **Working-day calendar** service (policy-versioned).
3. **Automation / event engine** (Section 8).
4. **Notification service:** in-app, email, WhatsApp (scope to confirm); deep links to the exact stage; delivery log.
5. **Approvals engine:** one inbox, 2-working-day SLA, reason required, decision recorded against the individual super admin.
6. **Audit trail** on every status change and approval (append-only).
7. **Document service:** versioning (every IRR version kept, and the version each investor received), view-only mode, redacted exports.
8. **Policy and season configuration:** versioned policies with effective dates; a season cannot open until setup is complete.
9. **Integration:** Zoho Books (Finance), with a sync panel showing last sync and failures.
10. **Design system:** shared component library, status chips, countdown chips (amber at 3 days, red when overdue), empty/loading/error states, mobile-first, WCAG AA.

### Shared record spine (one record per thing, used by every module)

`Person` (multiple roles) · `Startup` · `Season` · `Investor` / `InvestingEntity` · `Application` · `Evaluation` · `MoUVersion` · `IRR` / `IRRVersion` · `Match` / `Pairing` (one per startup–investor pair) · `Verdict` · `GoldenPass` · `CommitteeResult` · `Episode` / `Shoot` · `SigningEvent` · `Deal` (one funding round, separate investor allocations) · `Tranche` · `Reversal` · `FeeSchedule` (versioned) · `UpfrontFee` · `SuccessFee` · `Invoice` · `Receipt` / `Allocation` · `TDSEntry` · `Referral` · `Event` · `ApprovalRequest` · `AuditLog`. Each department document lists its own minimum data model; reuse these records rather than duplicating them.

---

## 11. Business reference data

### 11.1 Internal screening: 100-mark framework

Each criterion needs a reviewer, score, comment and evidence. The founder sees the **verdict only**, never the score.

| Criterion | Marks |
|---|---:|
| Application completeness | 10 |
| Document submission and verification | 10 |
| Unique idea | 20 |
| Revenue and financial performance | 10 |
| Traction | 10 |
| Past funding details | 20 |
| Founder capability | 5 |
| Incubated / not incubated | 5 |
| IP / defensibility | 10 |
| **Total** | **100** |

**Verdicts:** Proceed / Information required (specific checklist items) / Hold / Reject (founder sees "Not selected").
Idea-stage startups skip the financial and traction sections, so mandatory fields change with stage, and **non-applicable criteria handling is undefined** (Section 12). **No pass mark exists yet:** the RM decides and the score only guides until super admin sets a policy.

### 11.2 Analyst evaluation

Criteria: investment thesis fit, market opportunity, traction, business model and scalability, competitive positioning. Also records willingness to invest and an indicative amount (internal, **not a commitment**). Outcomes: **Proceed / Conditional proceed / Hold / Reject**, each with a reason and outstanding concern. Founder sees only "In progress" then "Fit check done".

### 11.3 Investor grading and verdicts

Internal grades **L1–L4** (hidden from investors) with assessment per dimension, evidence, reviewer, approval date, review date and reasons for change. Super admin approves grades. Pitch verdicts: Ready to invest / Next stage / Information requested / Pass / No response. "Ready to invest" opens an **indicative, non-binding** form (amount, valuation range, instrument, conditions).

### 11.4 Committee outcomes

Proceed / On hold / Rejected, with conditions, approver, decision date and re-review date. This is the authorisation point for fee request, advance notice and show selection.

### 11.5 Shoot-day exceptions (logged on set, one tap each)

| Exception | Action |
|---|---|
| Founder no-show | Reschedule; inform SR |
| Investor absent | Adjust panel; inform IR |
| Deal withdrawn on set | Record reason; IR starts replacement-investor search |
| Signature refused | Record; escalate to IR and super admin |
| Technical failure | Schedule reshoot |

---

## 12. Open decisions and conflicts (resolve before locking rules)

Where a safe default exists it is given. **Implement the default behind a configurable policy, mark it with `[DECISION]` in code comments, and list it in `DECISIONS.md`.**

| # | Point | What the documents say | Default to implement |
|---|---|---|---|
| 1 | **Upfront-fee clock trigger** | Docs 01, 03, 05: 15 days from **committee Proceed**. Original application SOP: 15 days from announcement of **initial investor interest** | Committee Proceed; make the trigger a configurable policy |
| 2 | Screening pass mark | Not defined | RM decides; score guides; super-admin policy later |
| 3 | Non-applicable screening criteria | Not defined | Exclude from total and show score against applicable marks; confirm before automating |
| 4 | Fee schedule (turnover slabs, caps, adjustments) | Not supplied | Versioned fee-schedule config UI plus placeholder; no hard-coded numbers |
| 5 | Analyst criterion weights; escalation recipient for overdue evaluations | Not defined | Equal weights; escalate to super admin |
| 6 | Analyst outcomes in SR dashboard | Doc 03 lists Proceed/Hold/Reject; doc 10 adds Conditional proceed | Add Conditional proceed to all counts |
| 7 | Investor agreements | Doc 02: participation agreement + NDA (**no MoU**); earlier SOP mentioned "IPA or NDA or MoU" | Mandatory set per investor category, configurable; default participation agreement + NDA |
| 8 | Golden Pass | Initial interest in application SOP; IR SOP wants minimum commitment evidence before issue | Store as its own record, distinct from written commitment; evidence requirement configurable |
| 9 | Pre-shoot vs post-shoot documents | SOPs describe signing at different points | Driven by `SigningEvent`, not file name |
| 10 | Shoot-day signatures | "Immediate" execution and a 24 h control | Store target and final deadline separately; default same day / 24 h |
| 11 | Founder stage numbering | Doc 01 header says steps 0–14 sequential, 15 and 16–18 parallel, but table runs to 19 | Stage 19 (Community) is an always-available area, not a gated stage |
| 12 | Episode final approver | Proposed super admin | Super admin |
| 13 | Assignment algorithm for RMs | Round-robin vs load-based | Load-based |
| 14 | WhatsApp scope | Email + in-app confirmed; WhatsApp optional | Build behind a channel interface; WhatsApp optional |
| 15 | Bulk approval | Unclear which types allow it | Allow only for types explicitly marked low-risk; default off |
| 16 | Community: "qualified referral" and funding attribution | No SOP | Configurable criteria; preserve original source and later contributors separately |
| 17 | Partner-share in fee settlement | Field kept, off by default | Hidden by default |
| 18 | Phase labels | Source sheet says "Version 1" for every stage | Keep a `phase` field for future versions |

---

## 13. Suggested build order

No technology stack is mandated in the documents. **Before writing code, propose a stack in `docs/ARCHITECTURE.md`** that satisfies these constraints: server-side RBAC with field-level redaction, mobile-first web, event-driven automation, Zoho Books integration, email/in-app/WhatsApp notifications.

| Phase | Build | Docs |
|---|---|---|
| **0 · Foundation** | Auth, roles, redaction layer, audit log, working-day calendar, policy versioning, approvals inbox, automation engine, notifications, document service, season setup | 11 |
| **1 · Startup intake to MoU** | Founder portal (stages 0–6), SR workspace, analyst workspace, MoU clocks, Legal Q&A and negotiation | 01, 03, 10, 07 |
| **2 · IRR and investor side** | IRR workflow and versions, investor portal, IR workspace (sourcing, verification, grading, matching, pitches, Pitch Day, committee) | 05 (IRR), 02, 04 |
| **3 · Fees and production** | Upfront fee workflow, receipt verification, advance notice, handover pack, AV/mock/main shoot, exceptions | 05, 06 |
| **4 · Deal closure and success fee** | Deal room, term sheet, DD, agreements, conditions, tranche verification, reversals, success fee, reconciliation, Zoho Books sync | 02, 04, 05, 07 |
| **5 · Content, community, management view** | Marketing workspace, announcements, community module, executive dashboard | 08, 09, 11 |

Within each phase: build the data model and rules first, then the workflow, then the dashboard, then the UI polish.

---

## 14. Management dashboard (client requirement)

Per startup and season-wide, drawn from the separate tracks in Section 6:

- Per startup: current stage in every track, pending actions with owner and due date, investor commitments, funds deployed, fees due / invoiced / collected / outstanding.
- Application-to-selection conversion; stage-wise backlog and ageing.
- Investor engagement and conversion; unallocated season capital; deals at risk.
- Upfront fees due, collected, overdue (by ageing bucket); success fees due, invoiced, collected, overdue.
- Shoot and telecast readiness; commitments vs signed deals vs **verified deployment**.
- Community activity and outcomes linked to it.
- Department-wise overdue actions, approvals overdue, material exceptions, integration failures.

---

## 15. Definition of done and required automated tests

A module is done only when its acceptance criteria (in its own document) pass **and** these platform tests pass:

- [ ] No founder name or contact appears in any analyst API response, export, PDF, email or shared link (automated scan).
- [ ] Founder-facing responses contain no screening score, analyst data, investor willingness or grade.
- [ ] Investor-facing responses contain no grade or other investors' data; IRR cannot be downloaded and views are logged.
- [ ] No deal data appears in any Community, Marketing or Production response.
- [ ] A payment screenshot never changes an invoice to Paid; only Finance verification does.
- [ ] A reversal reduces deployed amount and fee base and creates a credit note when already invoiced.
- [ ] Extensions preserve the original due date; ageing uses the original.
- [ ] Committee Proceed creates the fee request, advance notice and SR notice; full fee verification creates the AV handover pack; AV booking is blocked until handover is accepted.
- [ ] Tranche verification creates the success-fee task automatically.
- [ ] Every working-day deadline uses the shared calendar.
- [ ] Policy versions take effect on their effective date and old versions stay readable.
- [ ] Every approval records who decided, when and why.
- [ ] Failed integrations surface visibly with retry.

---

## 16. Working agreement for the build agent

1. Read this brief, then the department document for the area you are building, then its acceptance criteria.
2. Do not invent business rules. If something is undefined, take the default in Section 12, flag it with `[DECISION]`, and record it in `DECISIONS.md`.
3. Do not merge any pair of concepts listed in Section 3.1.
4. Enforce visibility rules on the server, never only in the UI.
5. Keep changes small and tied to one department document; note which file and acceptance criteria each change satisfies.
