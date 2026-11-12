# 01 · Founder Journey (Startup Portal)

> **Vibecode brief.** Build or fix the founder-facing portal for **Startup Singam**. Read this file fully, then implement. Anything marked **[DECISION]** is an open question: pick the safest default, note it in code comments, and move on.

## 1. Goal
One login per startup. The founder sees a simple, linear **stage tracker** (20 stages, 0–19). Internal SOP stages are hidden behind founder-friendly names. After the main shoot, two tracks run **in parallel**: **Telecast** and **Deals → Funds → Success fee**.

## 2. Persona and access
- **Founder** (one registered founder per startup). Sees only their own startup.
- Never shown: analyst scores, investor willingness, indicative amounts, internal grades, screening score.

## 3. Stage map (source of truth)

| # | Founder sees | Internal stage | What we show | Founder action | Deadline shown | Track | Coordinates with |
|---|---|---|---|---|---|---|---|
| 0 | Profile | Startup record | Company, founders, sector, stage, financials, documents. Reused every season | Register, complete profile, update between seasons | none | Sequential | SR |
| 1 | Application – draft | Application | % complete and what is missing (e.g. pitch deck). Idea stage skips financials | Fill in, save and resume | "Applications close in X days" | Sequential | SR |
| 2 | Application – submitted | Formal submission | 100% complete, acknowledgement, RM assigned. **Application locked** | none | none | Sequential | SR |
| 3 | Internal review | Internal screening (100 marks) | **Verdict only, no score**: Proceed / Information required (exact items) / On hold / Not selected | Respond to information required | Reply-by date (7 days, else auto-Hold) | Sequential | SR |
| 4 | Pre-bootcamp | Prep Bootcamp | Invitation, briefing, sessions, action items, preparation complete | Accept invite, attend, complete action items | Session dates | Sequential | SR |
| 5 | Investment fit check | Analyst screening | "In progress" then "Fit check done". **No scores, willingness or amount** | none | none | Sequential | SR |
| 6 | MoU | Startup MoU | MoU download, Legal Q&A on working day 4, signing deadline on working day 7 | Sign and upload / Want to negotiate (reason) / Not proceeding (reason) | Day-7 countdown | Sequential | SR, Legal |
| 7 | Document scrutiny | IRR | Checklist with team queries **word for word** | Upload requested documents | Per-query due date | Sequential | SR, Finance/IRR |
| 8 | Investor matching and virtual pitch | Matching + virtual pitch | "Matched with N investors", slots, then verdict per investor: Ready to invest / Next stage / Information requested / On hold / Pass / No response | Pick slots, attend, answer information requests | Slot dates | Sequential | IR |
| 9 | Pitch Day | Pitch Day + Golden Pass | 1:1 slots, outcome per investor: Golden Pass / Written commitment / No response / Pass | Pick slots, attend | Pitch Day date | Sequential | IR |
| 10 | Final selection | Final Shortlisting Committee | Proceed / On hold / Not selected | none | none | Sequential | Management |
| 11 | Upfront fee | Upfront fee workflow | Fee amount, turnover + financial year basis, invoice, bank details. Status: Proof uploaded – verifying / Paid / Part paid / Overdue / Extension approved | Upload payment proof; request extension with reason | **15-day countdown** | Sequential | Finance |
| 12 | AV shoot | AV shoot | Date, location, what to prepare | Confirm availability | Shoot date | Sequential | Production |
| 13 | Mock shoot | Mock shoot | Readiness checklist (pitch, demo, props) | Complete checklist items | Shoot date | Sequential | Production |
| 14 | Main shoot | Main shoot | Offers accepted, lead and co-investors, conditions, documents signed/outstanding | Sign **Startup Deal Acceptance Letter** | Signing deadline | Sequential | Production, IR |
| 15 | Telecast and promotion | Marketing | Episode, air date, approved posts, approved announcement wording | Post content, mark done, give feedback | Air date | Parallel – content | Marketing |
| 16 | Deal closure (**one card per investor**) | Post-shoot closure | Term sheet, DD requests, agreements, conditions, expected date per milestone, withdrawal reason or replacement investor | Upload DD documents, sign agreements | Milestone dates | Parallel – money | IR, Legal |
| 17 | Funds received | Deployment tracking | Per investor: committed / received / pending, tranche by tranche | Confirm receipt, upload bank statement | Tranche dates | Parallel – money | IR, Finance |
| 18 | Success fee | Post-funding collections | Fee on **money actually received only**: base, rate, invoice | Upload payment proof | Invoice due date | Parallel – money | Finance |
| 19 | Community | Community | Alumni, mentors, events, support requests | Join events, request support | none | Ongoing | Community |

**[DECISION]** The sheet header says "Steps 0–14 sequential, 15 and 16–18 parallel", but the table runs to 19 (Community, ongoing). Treat 19 as an always-available area, not a gated stage.

## 4. UX requirements (the "better experience" part)
1. **Home = "What do I need to do now?"** One hero card: the single most urgent action, its deadline countdown, and who to contact. Below it, the full stage timeline.
2. **Horizontal stepper on desktop, vertical on mobile.** States: Done, Current, Upcoming (locked), Needs action (accent), Overdue (red).
3. **Parallel tracks** drawn as a fork after stage 14: Content lane (15) and Money lane (16, 17, 18) side by side.
4. **Every action stage** shows: what is needed, deadline, whom to contact (name, email, phone). Never a dead end.
5. **Autosave drafts** for the application. Progress bar with a "what's missing" checklist that deep-links to the missing field.
6. **Countdown chips** (days left, turns amber at 3 days, red when overdue) for: info-required reply, MoU day 7, upfront fee 15 days, signing deadlines.
7. **Verdict screens** use plain, kind language and show the exact items requested. No scores anywhere.
8. **Per-investor cards** in stages 8, 9, 16, 17 (one card each). Status chip + next action.
9. **Document centre**: every upload tied to the request that asked for it, with status (Requested / Uploaded / Accepted / Re-upload needed).
10. **Notifications**: in-app bell + email (+ WhatsApp optional). Each notification deep-links to the exact stage.
11. Mobile-first, accessible (WCAG AA), loading and empty states everywhere, no jargon.

## 5. Data model (minimum)
`Startup`, `FounderUser`, `Season`, `Application` (status, completeness, locked_at), `StageState` (startup_id, season_id, stage_no, status, entered_at, due_at), `ActionItem` (owner, due_at, status), `Document` (type, request_id, status, version), `Notification`, plus read-only projections from other modules: `Verdict`, `MoU`, `IRRQuery`, `InvestorPairing`, `Fee`, `Invoice`, `Shoot`, `Deal`, `Tranche`.

## 6. Business rules
- One founder registration per startup. Profile is reused across seasons.
- Application locks on submit; only RM can unlock.
- Info-required: **7 days**, then system auto-sets **Hold**.
- MoU: Legal Q&A by **working day 4**, signing by **working day 7**. Negotiate restarts the clock with MoU v2.
- Upfront fee: **15 days** from committee Proceed. Extension keeps the original due date and adds a new one.
- A payment screenshot **never** marks fee paid. Only Finance verification does.
- Success fee is calculated only on **verified received** funds.
- Redaction: founder never sees investor grade, internal remarks, or other founders' data.

## 7. Acceptance criteria
- [ ] Founder can register, fill, save, resume and submit; application locks.
- [ ] Each of stages 0–19 renders with correct status from backend state.
- [ ] Verdict screen never leaks a score (test with API response inspection).
- [ ] Countdowns are correct against the working-day calendar.
- [ ] Parallel tracks render after stage 14 and update independently.
- [ ] Every action shows deadline and contact person.
- [ ] Upload flows validate type/size and show status transitions.

## 8. Open items
Fee schedule is not supplied yet (see doc 05). Confirm WhatsApp as a founder channel. Confirm exact label "Not selected" vs "Reject" (founder sees "Not selected").
