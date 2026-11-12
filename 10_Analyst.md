# 10 · Analyst Workflow

> **Vibecode brief.** Build the Analyst workspace. Analysts are **internal staff with a single queue**. They see **permitted business information only**: founder and co-founder names and contacts are hidden in screens, **exports and shared documents**. Analysts **never contact founders directly**; questions go through SR.

## 1. Workflow

| # | Step | Trigger | What they do | Output | Approver | Rule | With |
|---|---|---|---|---|---|---|---|
| 1 | Receive application | SR sends after bootcamp prep complete | Assigned from analyst pool; appears in queue | In queue | none | **Evaluation due in 5 working days; overdue → escalated** | SR |
| 2 | Evaluate | Picked up | Score thesis fit, market opportunity, traction, business model and scalability, competitive positioning; record **willingness to invest** and **indicative amount**. Questions for founder routed through SR, who gets the documents | Evaluation drafted | none | none | none |
| 3 | Recommend and submit | Evaluation complete | Recommendation: **Proceed / Conditional proceed / Hold / Reject** with decision reason and outstanding concern; submit. **Conditional proceed** moves to MoU; condition becomes an **SR task** and must be cleared **before the IRR is handed to IR** | SR notified; founder sees "Fit check done" | none | none | SR |

## 2. Rules
| # | Rule | Detail |
|---|---|---|
| 1 | Interest is not money | Willingness and indicative amount **never** count as an investor commitment |
| 2 | No override | SR cannot override an analyst Reject |
| 3 | Redaction | Enforced by the system, **including exports** |

## 3. UX requirements
- **Single queue** sorted by due date; overdue and "due tomorrow" highlighted; SLA countdown (5 working days).
- **Evaluation form**: five scored criteria with comment and evidence fields, willingness-to-invest toggle, indicative amount field with an "internal, not a commitment" label.
- **Question to founder** button creates a request to SR (never a direct message). Thread shows SR's response and documents.
- **Recommendation panel**: four options, mandatory reason and outstanding concern; Conditional proceed requires the condition text (creates SR task).
- **Redaction everywhere**: show "Founder (hidden)" placeholders; strip names/contacts from PDFs, CSV exports, email notifications and shared links. Include a redaction test suite.
- Autosave drafts; clear submit confirmation.

## 4. Data model (minimum)
`AnalystAssignment` (due_at, escalated), `Evaluation` (criterion scores, comments, evidence), `InvestmentInterest` (willingness, indicative_amount; internal flag), `Recommendation` (type, reason, outstanding_concern), `ConditionTask` (owner=SR, must_clear_before=IRR_handover), `FounderQuestion` (via SR), `RedactionPolicy`.

## 5. Business rules
5-working-day SLA with escalation · no direct founder contact · analyst Reject is final for SR · Conditional proceed creates a blocking SR task at IRR handover · interest ≠ commitment.

## 6. Acceptance criteria
- [ ] Analyst API/UI/export never contains founder name or contact (automated scan).
- [ ] Overdue evaluation escalates automatically.
- [ ] Conditional proceed creates SR task and blocks IRR handover until cleared.
- [ ] SR cannot change an analyst Reject.
- [ ] Founder portal shows only "In progress" then "Fit check done".

## 7. Open items
Scoring weights per criterion and escalation recipient (super admin vs SR lead). Note: SR dashboard lists analyst outcomes as Proceed/Hold/Reject; add **Conditional proceed** to those counts.
