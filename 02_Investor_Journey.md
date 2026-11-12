# 02 · Investor Journey (Investor Portal)

> **Vibecode brief.** Build or fix the investor-facing portal. Read fully, then implement. **[DECISION]** marks open questions: choose a safe default and note it.

## 1. Goal
One login per investor. A clean 16-stage journey (0–15) from expressing interest to community. **Investors pay no fees.** Every screen carries a **season meter**.

## 2. Persona and access
- **Investor** (one login per investor/entity).
- **Never shown:** internal grade L1–L4, other investors' data, founder confidential data beyond the IRR.
- Communication thread runs on email/WhatsApp; the system only records when it was opened.

## 3. Global component: Season meter (on every screen)
`Season allocation · Committed · Deployed · Available`. Sticky header, tappable for the breakdown by startup. Available = allocation − committed.

## 4. Stage map

| # | Investor sees | Internal stage | What we show | Investor action | Deadline | Coordinates |
|---|---|---|---|---|---|---|
| 0 | Express interest | Sourcing | Short interest form, "referred by" (optional) | Register, log in | none | IR |
| 1 | Investor profile | Sourcing record | Category and investing entity, decision-maker, authorised representative, sectors, stages, geography, thesis, ticket size, portfolio, availability, expected decision timeline | Complete profile | none | IR |
| 2 | Agreements | Participation + confidentiality | Participation agreement and NDA (**no MoU**) with status | Sign and upload both | Sign-by date | IR, Legal |
| 3 | Verification | Verification and eligibility | In progress / More information needed (exact items) / Verified. **Grade NOT shown** | Answer queries, upload evidence | Reply-by date | IR |
| 4 | Season commitment | Proposed season allocation | Season amount and max per startup + season meter | Confirm season amount and per-startup max | none | IR |
| 5 | Your matches | Matching | 5–6 matched startups with **match %** (sector, stage, ticket, geography) | Review IRR, accept or decline each | Respond-by date | IR |
| 6 | Investment Readiness Reports | IRR shared | IRR per match, **view-only in system (no download)**, version and date shared | Read, ask questions, request documents, give indicative amount | none | IR |
| 7 | Virtual pitches | Virtual pitch | Team-proposed slot per startup (5 min pitch + 5 min Q&A) | Approve slot, attend, acknowledge minutes, **give verdict**: Ready to invest / Next stage / Information requested / Pass / No response. "Ready to invest" opens form: amount, valuation range, instrument, conditions (**marked indicative**) | Verdict due date | IR |
| 8 | Pitch Day | Pitch Day + Golden Pass | Team-proposed 1:1 slots (investor approves, then founder books), information memorandum. Golden Pass / written commitment recorded by team after issue | Approve slots, attend, acknowledge minutes, follow-on interest | Pitch Day date | IR |
| 9 | Committee results | Final Shortlisting Committee | Per startup of interest: Proceed / On hold / Rejected | none | none | Management |
| 10 | Pre-shoot confirmation | Pre-shoot panel | Episode and shoot date, IRR received (2-week rule), written proposed commitment, valuation boundaries, decision parameters, production briefing, documents needed | Confirm commitment in writing, acknowledge briefing | **2 weeks before shoot** | IR, Production |
| 11 | Main shoot | Main shoot | Offers, accepted deal, lead/co-investor split, conditions, Investment Commitment Letter given, founder Acceptance Letter received | Sign Investment Commitment Letter | Signing deadline | Production, IR |
| 12 | Deal room (**one per startup**) | Post-shoot closure | Thread opened (**48 h countdown**), term sheet, DD progress (IR, Finance, Legal, external advisors), findings resolved, agreements, pre-funding conditions, date per milestone. Revisions and withdrawals need a reason | Share term sheet, respond to DD queries, sign agreements | 48 h, then milestone dates | IR, Legal, Finance, advisors |
| 13 | Fund transfers | Deployment tracking | Per tranche: scheduled amount + date, "you reported ₹X", "startup confirmed receipt", verified, remaining to deploy | Mark tranche sent with **UTR + proof** | Tranche dates | IR, Finance |
| 14 | Public announcement | Marketing | Proposed wording (announced vs committed vs deployed) | Approve wording | Before publication | Marketing |
| 15 | Community | Community | Investor sessions, events, next-season deal flow | Join events, refer investors | none | Community |

## 5. UX requirements
1. **Dashboard = "My pipeline"**: Kanban-style columns (Matched → Pitched → Committed → In deal room → Funded) plus season meter on top.
2. **Match cards** with match % ring, tags for the four match factors, "View IRR", Accept / Decline (decline needs a reason).
3. **IRR viewer**: in-system only. Disable download, print and text-selection where feasible; apply a visible **watermark** with investor name + timestamp. Show version and date shared. Q&A and "request document" inside the viewer.
4. **Verdict form** is one tap per option. "Ready to invest" expands the indicative form with a clear "Indicative, non-binding" label.
5. **Slot approval**: calendar view, accept or propose alternative, timezone-aware.
6. **Deal room** is a timeline of milestones with expected dates, owner, blocker. 48-hour thread countdown pill. Withdraw/revise opens a reason modal and routes to super admin approval.
7. **Tranche tracker** per deal: scheduled / sent / startup confirmed / verified, with UTR and proof upload. Show the three-way status clearly (you reported, startup confirmed, verified).
8. **Announcement approval** shows the three labels side by side so claims are never overstated.
9. Email/WhatsApp deep links; in-app bell; mobile-first; accessible.

## 6. Data model (minimum)
`Investor`, `InvestingEntity`, `Agreement` (type, status), `Verification` (status, items), `Grade` (hidden), `SeasonAllocation` (total, max_per_startup), `Match` (investor, startup, match_pct, response), `IRRShare` (version, shared_at, view_log), `PitchSlot`, `Verdict`, `IndicativeOffer`, `GoldenPass`, `CommitteeResult`, `PreShootConfirmation`, `Deal`, `DealMilestone`, `Tranche` (scheduled, reported, confirmed, verified, utr), `Announcement`.

## 7. Business rules
- Season meter: `available = allocation − committed`; deployed counts **verified** tranches only.
- Interest is **not** a commitment; indicative amounts are labelled indicative.
- IRR must reach investors **2 weeks before shoot** (alert to IR if not).
- Thread must open within **48 h** of deal confirmation.
- No fees charged to investors.
- Grade is internal; strip from every API response used by this portal.

## 8. Acceptance criteria
- [ ] Season meter appears on every investor screen with correct maths.
- [ ] IRR cannot be downloaded; views are logged.
- [ ] Verdict and indicative form work; data lands in IR pairing record.
- [ ] Grade absent from all responses (automated test).
- [ ] Tranche 3-way status reflects investor, startup and Finance inputs.
- [ ] Withdrawal/revision requires a reason and creates a super-admin approval.

## 9. Open items
Sheet labels the phase as "Version 1" for every stage; keep a `phase` field for future versions. **[DECISION]** WhatsApp integration scope.
