# 11 · Super Admin / Management Workflow

> **Vibecode brief.** Build the Super Admin console. Super admins are the **CEO, directors and managing partners**; **any one can approve and the system records who did**. They oversee SR, IR, Finance (with Finance lead), Production (with Production head), Legal, Marketing and Community; approve exceptions; **own policies and season setup**.

## 1. Workflow

| # | Step | Trigger | What they do | Output | Rule | With |
|---|---|---|---|---|---|---|
| 1 | Approvals inbox | Any item needing approval | **One inbox for all approvals**, sorted by due date | Approved / rejected **with reason** | **2 working days per approval; overdue shown on dashboard** | All |
| 2 | Escalations | Missed deadlines, MoU negotiation, shoot-day exceptions | Review and decide; decision recorded on the record | Escalation closed | none | All |
| 3 | Reassignment | Workload imbalance | Reassign startups / investors between RMs, IRMs, coordinators | Reassigned | none | SR, IR, Production |
| 4 | Policies | As needed | Set and **version** policies with effective dates: screening pass mark, eligibility rules, fee schedule, working-day calendar | Policy version live | Effective date | Finance, SR, IR |
| 5 | Season setup | New season | Application window, fee schedule version, episodes, committee members (expert panel), legal templates | Season open | Before window opens | All |
| 6 | Users and roles | Staff changes | Add users, assign roles and departments | Access granted | none | none |

## 2. Approval types (from decisions so far)
| # | Approval | Raised by |
|---|---|---|
| 1 | Investor grade | IR |
| 2 | Revised or withdrawn investment commitment | IR |
| 3 | MoU negotiation outcome | SR |
| 4 | IRR final approval | Finance |
| 5 | Upfront fee exceptions and discounts | Finance |
| 6 | Extensions over 7 days, waivers, refunds, disputes (Finance lead approves extensions up to 7 days) | Finance |
| 7 | Mock shoot final readiness | Production |
| 8 | Episode edit | Production |

Also routed here from other sheets: event budget (Community), promo assets (CEO, Marketing), negotiated MoU redraft terms (Legal), Legal templates, shoot-day signature refusal escalations.

## 3. UX requirements
- **Approvals inbox**: unified list with type, requester, startup/investor, amount/impact, due date, overdue flag. Row opens a **decision drawer** with full context, history, attachments; Approve / Reject (reason required); keyboard shortcuts; bulk approve for low-risk types.
- **Overdue approvals** badge in nav and on dashboard (2 working-day SLA via working-day calendar).
- **Escalations view** linking to the source record; decision logged on that record.
- **Reassignment tool**: workload view per RM/IRM/coordinator, drag or bulk assign, reason, audit trail.
- **Policy manager**: versioned policies with effective dates, preview of impact, "future-dated" state. No edits to live versions, only new versions.
- **Season setup wizard**: window dates → fee schedule version → episodes → expert panel → legal templates → review → open. Blocks opening until each step is complete.
- **User and role admin**: department, role, active/inactive, last login.
- **Executive dashboard**: cross-department health (pipeline by stage, approvals pending/overdue, bottlenecks, fee collection, deployment, deals at risk).
- **Audit log** (who approved what, when, reason). Append-only.

## 4. Data model (minimum)
`ApprovalRequest` (type, raised_by, record_ref, due_at, status, decided_by, decided_at, reason), `Escalation`, `Reassignment`, `Policy` + `PolicyVersion` (effective_from), `WorkingDayCalendar`, `Season` (window, fee_schedule_version, episodes, committee_members, templates), `User`, `Role`, `Department`, `AuditLog`.

## 5. Business rules
Any one super admin can approve; system records which · every approval has a 2-working-day deadline · policies are versioned with effective dates · season cannot open until setup is complete · super admin is the only role that reassigns startups/investors and approves grades.

## 6. Cross-cutting platform requirements (apply to every module)
1. **RBAC + field-level redaction** enforced server-side (Analyst, Production, Marketing, Community, Founder, Investor).
2. **Working-day calendar** service used by every deadline (day 4, day 7, 2 working days, 5 working days).
3. **Automation engine** for triggers: Committee Proceed (fee request, advance notice, SR notice), fee verified (AV handover pack), tranche verified (success-fee task), 7-day auto-Hold, 2-week IRR alert, 48 h thread alert.
4. **Notification service**: in-app, email, WhatsApp; deep links; delivery log.
5. **Audit trail** on every status change and approval.
6. **Document service**: versioning, view-only mode for IRR, redacted exports.
7. **Integrations**: Zoho Books (Finance).
8. **Design system**: one component library, consistent status chips, countdown chips, empty/loading/error states, mobile-first, WCAG AA.

## 7. Acceptance criteria
- [ ] One inbox lists every approval type above with SLA and overdue state.
- [ ] Approval records the individual super admin and reason.
- [ ] Policy versions take effect on their effective date and old versions stay readable.
- [ ] Season cannot open with incomplete setup.
- [ ] Reassignment updates ownership everywhere and is audited.

## 8. Open items
Screening pass mark and fee schedule still to be supplied. Confirm whether bulk approval is acceptable for any type.
