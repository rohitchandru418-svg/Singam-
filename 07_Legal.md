# 07 · Legal Workflow

> **Vibecode brief.** Build the Legal workspace. Legal is a **support function**: MoU clarification for founders (via SR), MoU redrafts after approved negotiation, templates, and due diligence and agreements **inside IR-owned deals**. In-house team for now; an outside firm would need a restricted login (**deferred**).

## 1. Roles
In-house Legal team. Super admin oversees. IR owns the deal; Legal works as tasks inside it.

## 2. Workflow

| # | Step | Trigger | What Legal does | Output | Approver | Rule | With |
|---|---|---|---|---|---|---|---|
| 1 | MoU clarification (Q&A) | SR shares MoU; founder has questions | Hold Q&A by **working day 4**; record questions and answers | Q&A held and logged | none | Working day 4 | SR, founder |
| 2 | MoU negotiation support | Founder chooses Negotiate | Review requested changes; once **super admin approves** negotiated terms, redraft MoU (v2) | Revised MoU ready for SR (clock restarts) | Super admin | none | SR, super admin |
| 3 | Templates | Season setup | Maintain: founder MoU, participation agreement, NDA, Investment Commitment Letter, Startup Deal Acceptance Letter, term sheet | Approved template versions | Super admin | Before season opens | IR, Production |
| 4 | Due diligence | Deal confirmed (IR opens deal) | Run DD **as tasks inside the IR-owned deal**: request docs from founder, review, log findings **with severity**, track each to resolution | DD complete, findings resolved | **IR (closure owner) confirms** | Milestone dates | IR, founder |
| 5 | Definitive agreements | DD complete | Draft/review SHA, SSA and related agreements; track signatures | Agreements executed | none | Milestone dates | IR, investor, founder |
| 6 | Pre-funding conditions | Agreements executed | Track each condition (e.g. IP assignment, board resolution) to completion | Conditions met → transfer can proceed | IR confirms | Before tranche date | IR, Finance |

## 3. Legal dashboard (one shared view with work queue)
MoU (Q&As due by day 4; negotiations open) · Due diligence (deals in DD; open findings by severity; days in DD) · Agreements (awaiting drafting / signature) · Conditions (pre-funding outstanding; deals blocked by Legal).

## 4. UX requirements
- **Work queue** sorted by due date with MoU, DD, agreement and condition task types.
- **MoU Q&A log**: scheduled session, Q/A pairs, attendees, outcome; visible to SR.
- **Template manager**: versioned, effective-from date, approval status, "active for season" flag; old versions read-only.
- **DD tracker inside the deal room**: document requests, review status, findings table (severity: Low/Med/High/Critical, owner, due, resolution notes, status).
- **Agreement tracker**: draft → review → sent → partially signed → executed, with signatory checklist.
- **Condition checklist** with blocker flag that visibly blocks tranche scheduling.
- Do not expose commercial terms beyond Legal's role to other modules.

## 5. Data model (minimum)
`MoUQA`, `MoUVersion` (v1, v2, clock restart), `NegotiationRequest`, `Template` + `TemplateVersion`, `DDTask`, `DDFinding` (severity, status), `Agreement` (type, status, signatories), `PreFundingCondition`, `LegalApproval`.

## 6. Business rules
Q&A by working day 4 · v2 MoU only after super admin approves terms · DD is a task set inside IR-owned deal; **IR confirms closure** · conditions must clear before the tranche date · outside-firm login deferred (design roles so it can be added).

## 7. Acceptance criteria
- [ ] Q&A due-date alerts at day 4 using the working-day calendar.
- [ ] Negotiation → approval → v2 → SR shares → clock restarts.
- [ ] Findings carry severity and cannot close without resolution notes.
- [ ] A deal with outstanding conditions shows "blocked by Legal" and blocks tranche scheduling.
- [ ] Template versions are immutable once approved.
