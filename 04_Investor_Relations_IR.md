# 04 · Investor Relations (IR) Workflow

> **Vibecode brief.** Build the internal IR workspace. IR **owns investors end to end** and **owns each deal through closure** (one accountable IRM per deal). Finance owns receipt verification and fees; IR watches and follows up.

## 1. Roles
- **Super admin**: oversees IR, **approves every investor grade**, approves revised or withdrawn commitments.
- **IR manager (IRM)**: auto-assigned.

## 2. Workflow

| # | Step | Trigger | What IR does | Output / gate | IR role | Deadline / rule | Works with |
|---|---|---|---|---|---|---|---|
| 1 | New investor | Registers or referred | Alert; IRM auto-assigned; review interest | In IRM queue | Owns | none | none |
| 2 | Record + verification | IRM picks up | Complete record (category/entity, source/referral, decision-maker, authorised rep, sector/stage/geography/thesis, ticket, portfolio and reference checks, availability, timeline). Collect evidence; run **configurable eligibility rules**. Get participation agreement and NDA signed | Verified investor | Owns | Eligibility rules are policies | Legal |
| 3 | Grading | Verified | Score each grading dimension with evidence; propose **L1–L4** (sets engagement and panel role); record review date; changes need a reason | Grade approved by super admin (**internal only**) | Owns; super admin approves | Grade review date | Super admin |
| 4 | Season allocation | Graded | Record season allocation and **max per startup**, separate from commitments to startups | Allocation set | Owns | none | none |
| 5 | Receive IRRs | SR hands over approved IRR | Accept handover | Startups ready to match | Owns | none | SR, Finance/IRR |
| 6 | Matching | IRR accepted | System suggests investors (sector, stage, cheque, geography, thesis, grade, unused allocation); IRM approves circulation. **Each pairing is its own record**: version shared, date, response, meetings + acknowledged minutes, questions/docs requested, indicative amount, next action + deadline, pass/withdrawal reason | IRRs shared (view-only) | Owns | none | none |
| 7 | Virtual pitch | Investor accepts match | Schedule (5+5 min); track attendance, material, Q&A; validate verdicts (investor submits, or IRM records e.g. from a call). "Ready to invest" → confirm amount, valuation range, instrument, conditions (indicative) | Verdict per pairing | Owns | Verdict due date | none |
| 8 | Pitch Day | Next stage / ready to invest | Map startups to investors; propose slots (investor approves, founder books); distribute IRR and information memorandum; track outcomes; record **Golden Passes** + issuer (no minimum commitment); record HNI follow-on interest with deadlines | Golden Passes and written commitments recorded | Owns | Pitch Day date | Founder |
| 9 | Committee pack + decision | Pitch Day done | Compile pack (evaluation, IRR, investor feedback, Golden Passes, open questions, proposed participation, production readiness, commercial status); record decision with conditions, approver, date, re-review date | Proceed / On hold / Rejected | Owns pack; records decision | none | Committee, Management |
| 10 | **Auto triggers on Proceed** | Proceed recorded | **No manual step**: system creates Finance upfront-fee request (15-day clock), sends Production advance notice, informs SR | Fee request, advance notice | Watches | 15 days | Finance, Production, SR |
| 11 | Pre-shoot confirmation | Proceed | Build episode panel (grade + sector fit); written proposed commitment, valuation boundaries, decision parameters; production briefing; clear issues and docs | Panel confirmed | Owns | **Alert if IRR not with investors 2 weeks before shoot** | Production |
| 12 | Main shoot | Shoot day | Oversee offers, terms, lead/co-investor allocation, conditions, ICL and Acceptance Letter signatures | Deal confirmed | Oversees (Production captures) | Signing deadline | Production |
| 13 | Deal closure | Deal confirmed | One accountable IRM: open thread (email/WhatsApp) and record it; term sheet; coordinate DD (IR, Finance, Legal, advisors); findings resolution; definitive agreements; pre-funding conditions; date per milestone; blocker, owner, next action. Record revised commitments and withdrawals with reasons (super admin approves) and replacement-investor activity | Signed deal, conditions met | Owns | Thread within **48 h**; milestone dates | Legal, Finance |
| 14 | Fund follow-up | Tranche scheduled | Chase investor to transfer (investor marks sent, or IRM records) and founder to confirm; Finance verifies | Tranche verified by Finance | Follows up | Tranche dates | Finance, SR |
| 15 | Success fee + announcements | Tranche verified / telecast | Watch success fee; coordinate investor approval of public wording | none | View + follow up | none | Finance, Marketing |

## 3. What IR watches
1. **Per investor**: season meter, all pairings by stage, deals and tranches, announcements awaiting approval.
2. **Per paired startup (Startup 360)**: selection, production, investment, finance, marketing. View, notes, follow-up.
3. **Other teams' steps**: upfront fee, shoots, receipt verification, success fee.

## 4. Dashboards
1. **My investors** (IRM default): action queue, my investors with season meters, my pairings by stage, my deals by closure stage.
2. **Team view** (super admin default; IRMs read-only): all metrics, per-IRM column, grade approvals waiting, commitment changes waiting, reassignment (super admin only).

### Metrics
Investors (verified, agreements pending, pipeline sourced → verified → graded → active) · Grades (L1–L4 distribution, approvals waiting, reviews due) · Capital (unallocated; per investor allocated vs committed vs deployed) · Matching (coverage; startups with <3 matches; accept/decline rate) · Pitches (unanswered; verdict mix per round; avg response time) · Interest conversion (Golden Pass → written commitment → signed → deployed) · Compliance (IRR 2 weeks before shoot; thread within 48 h) · Deals (outstanding commitments, at risk, by closure stage with days stuck, revised, withdrawals awaiting replacement) · Workload (overdue per IRM).

## 5. UX requirements
- **Pairing board**: Kanban of pairings (Matched → IRR shared → Pitched → Verdict → Pitch Day → Committee), drag to move where permitted, each card shows next action and deadline.
- **Match suggestion screen**: ranked investors with transparent score breakdown; bulk "approve circulation".
- **Investor 360** with the season meter pinned.
- **Deal room (internal)**: milestone timeline, blocker/owner/next action, DD tasks from Legal, tranche tracker, thread log with 48 h timer.
- **Grade proposal form**: per-dimension score + evidence; shows pending super-admin approval; immutable history with reason on change.
- Inline "record on behalf of investor" with source (call/email) logged.
- Compliance banners for 2-week and 48 h rules.

## 6. Data model (minimum)
`Investor`, `Verification`, `EligibilityRule`, `Grade` + `GradeHistory`, `SeasonAllocation`, `Pairing` (versioned), `Meeting`, `Verdict`, `GoldenPass`, `CommitteePack`, `CommitteeDecision`, `PanelMember`, `Deal`, `DealMilestone`, `Blocker`, `CommitmentChange` (revision/withdrawal + approval), `Tranche`, `Announcement`.

## 7. Business rules
Grade is internal-only and needs super-admin approval · allocation is separate from startup commitments · interest is not money · IRR view-only · Proceed auto-triggers fee, advance notice, SR notice · one accountable IRM per deal · revisions/withdrawals need reason + super-admin approval.

## 8. Acceptance criteria
- [ ] Each pairing is its own versioned record with all listed fields.
- [ ] Committee Proceed auto-creates fee request and notices (no manual step).
- [ ] 2-week IRR and 48 h thread alerts fire correctly.
- [ ] Grade changes require reason and approval; investors never see grade.
- [ ] All dashboard metrics render with per-IRM split.
