# 03 · Startup Relations (SR) Workflow

> **Vibecode brief.** Build the internal SR workspace. SR **owns steps 1–7**; for steps 8–11 SR is **view and follow-up only**.

## 1. Roles
- **Super admin**: oversees SR (team view, reassignment).
- **Relationship Manager (RM)**: auto-assigned; scores own applications.
- **Analyst**: separate persona from a pool (see doc 10).

## 2. Workflow

| # | Step | Trigger | What SR does | Output / gate | SR role | Deadline / rule | Hands to |
|---|---|---|---|---|---|---|---|
| 1 | New application | Founder submits | Alert; RM **auto-assigned**; acknowledgement sent automatically; **duplicate check** links repeat applicants; RM reviews completeness and documents | Application in RM queue | Owns | Screening only after formal submission | none |
| 2 | Internal screening | RM picks up | Score **100-mark card** (score, comment, evidence per criterion). Verdict with reason: Proceed / Information required (specific items) / Hold / Reject | Verdict (founder sees verdict only) | Owns | Info required: founder has **7 days**, else auto-Hold. No pass mark yet: RM decides, score guides | none |
| 3 | Pre-bootcamp | Proceed | Invite to batch bootcamp; mark attendance; record process briefing, readiness sessions, MoU and upfront fee briefing, founder Q&A; assign action items | **Preparation complete** (not just attended) | Owns | Bootcamp dates | none |
| 4 | Send to analyst | Prep complete | Send to analyst pool; **system hides founder names and contacts automatically** | Analyst assigned | Owns | none | Analyst |
| 5 | Review analyst decision | Analyst submits | Read recommendation; continue to MoU if Proceed. **SR cannot override an analyst Reject** | Go to MoU or stop | Owns | none | none |
| 6 | MoU | Analyst Proceed | Share MoU (clock starts); Legal Q&A day 4; signing deadline day 7. Record: **Signed** (upload copy, commercial schedule, exceptions, signature date) / **Negotiate** (escalate to Management; revised MoU shared, clock restarts) / **Discontinue** (record founder email and reason) | Signed MoU | Owns | Working day 4 and 7 | Management, Legal |
| 7 | IRR handover | MoU signed | Raise IRR request; Finance/IRR accepts; IRR team posts document queries to founder with SR in the loop; report prepared, reviewed, approved | Approved IRR handed to IR (IR accepts) | Owns request; follows queries | IRR with investors **2 weeks before shoot** | Finance/IRR, IR |
| 8 | Upfront fee follow-up | Committee Proceed | Chase founder with Finance; record late reason; pass extension requests to Management | Fee paid | View + follow up | 15 days from committee decision | Finance |
| 9 | Deal follow-up | After main shoot | Chase founder for term sheet, DD documents, signatures | Founder part complete | View + follow up | Milestone dates | IR, Legal |
| 10 | Promotion follow-up | Telecast | Check founder posted approved content; collect feedback | Promotion and feedback done | View + follow up | Air date | Marketing |
| 11 | Success fee follow-up | Fee invoiced | Chase founder for payment with Finance | Fee collected | View + follow up | Invoice due date | Finance |

**Analyst "Conditional proceed"** (doc 10) moves to MoU, but the condition becomes an **SR task** that must clear **before the IRR is handed to IR**. Build this task type.

## 3. Automation: Production handover (no manual prep)
When Finance verifies the upfront fee, the system assembles the pack from existing records (profile, founder contacts, selection decision, payment clearance, permitted business info) and Production accepts. Production gets an **advance notice** earlier, at committee Proceed.

## 4. Lifecycle view (read-only tracks SR watches)
Selection (matches, pitches, Golden Passes, committee), Production (shoot status, blockers, accepted terms), Investment (term sheet, DD, agreements, committed vs deployed), Finance (fees paid or overdue), Marketing (posted, feedback). All: **View, notes, follow-up**.

## 5. Dashboards
1. **My startups** (RM default landing): action queue by due date and overdue, my startups by stage, my follow-ups, my metrics.
2. **Team view** (super admin default; RMs read-only): same metrics team-wide, per-RM column (workload, overdue, conversion), stage ageing, bottlenecks, **reassign** (super admin only).

### Metrics (both views)
Intake (new, acknowledgements pending, awaiting RM) · Screening (screened, waiting, Proceed/Info/Hold/Reject, auto-held after 7 days) · Bootcamp (invites not sent, briefings not done, prep complete) · Analyst (sent, waiting, Proceed/Hold/Reject) · MoU (shared, Q&A done, signed, negotiating, discontinued, past day 7) · IRR (requested, in progress, docs missing, approved, handed to IR, at risk of 2-week rule) · Pitches · Committee · Upfront fee (% collected, not collected, overdue) · Shoots · Success fee · Promotion · Workload (overdue per RM).

## 6. UX requirements
- **"Today" queue** first: overdue in red, due today in amber, grouped by startup.
- **Screening card UI**: criteria rows with score slider, comment, evidence attachment; running total out of 100; verdict panel with required reason; "Information required" must list specific checklist items (generates founder-visible items).
- **Startup 360 drawer**: stage timeline, documents, notes, follow-ups, all tracks.
- One-click chase templates (email/WhatsApp) with logging.
- Bulk actions for bootcamp attendance and invites.
- Duplicate-applicant banner with merge/link.

## 7. Business rules
Auto-assignment (round-robin or load-based, **[DECISION]**) · 7-day auto-Hold · no analyst-Reject override · redaction on analyst send · working-day calendar for day 4/7 · super admin only reassigns.

## 8. Acceptance criteria
- [ ] Submission triggers RM assignment, acknowledgement, duplicate check.
- [ ] Scoring card totals 100 marks; founder never sees score.
- [ ] Info-required auto-Holds after 7 days.
- [ ] Analyst send strips names and contacts everywhere (UI, export, docs).
- [ ] MoU clocks and Negotiate loop work; Discontinue records reason.
- [ ] Dashboards show every metric above with correct per-RM split.

## 9. Open items
Pass mark for screening is not defined (policy set by super admin, doc 11). Assignment algorithm to confirm.
