# 05 · Finance Workflow

> **Vibecode brief.** Build the Finance workspace: IRR, upfront fee, deployment verification, success fee, reconciliation. Accounting runs in **Zoho Books** (sync required). **Legal does due diligence; Finance does not.**

## 1. Roles
- **Finance team**: same people do IRR, fees, verification, reconciliation.
- **Finance lead**: reviews and oversees; approves standard fees and extensions up to 7 days.
- **Super admin**: final approval on IRRs, fee exceptions, discounts, waivers, refunds, disputes, extensions over 7 days.
- One **shared dashboard** with a work queue.

## 2. Workflow

### A. Investment Readiness Report (IRR)
| # | Step | Trigger | What Finance does | Output | Approver | Rule | With |
|---|---|---|---|---|---|---|---|
| 1 | Accept IRR request | MoU signed; SR raises (auto alert) | Accept handover | IRR in progress | none | none | SR |
| 2 | Gather information | Accepted | Send founder checklist; post queries for missing docs/clarifications (SR in loop); track each to resolution | All docs in | none | Per-query due dates | Founder, SR |
| 3 | Prepare, review, approve | Docs complete | Prepare report; Finance lead reviews; **keep every version** | Approved IRR handed to IR | Super admin (final) | IRR with investors **2 weeks before shoot** | IR |

### B. Upfront fee
| # | Step | Trigger | What Finance does | Output | Approver | Rule | With |
|---|---|---|---|---|---|---|---|
| 4 | Fee request | Committee Proceed (auto) | Request created for startup + season | 15-day clock starts | none | 15 days from decision | IR, SR |
| 5 | Verify turnover | Request created | Record financial year, turnover, evidence | Turnover basis verified | none | none | none |
| 6 | Calculate and approve fee | Turnover verified | Apply **fee schedule + its version**; record exceptions (split payment, discount) | Fee approved | Finance lead (standard); super admin (exceptions, discounts) | **Fee schedule still to be supplied** | none |
| 7 | Invoice | Fee approved | Issue invoice with due date; notify founder; **sync to Zoho Books** | Invoiced | none | Due date | Founder |
| 8 | Follow up | Invoiced | Chase with SR; record late reason and Management decision; extension adds new due date and **keeps the original** | none | Super admin (extensions, waivers, refunds, disputes) | Ageing from **original** due date | SR |
| 9 | Verify and allocate receipt | Founder uploads proof | Check against bank; allocate receipt to invoice. **A screenshot never marks it paid** | Paid → **AV handover pack to Production (auto)** | none | none | Production |

### C. Deployment verification
| # | Step | Trigger | What Finance does | Output | Rule | With |
|---|---|---|---|---|---|---|
| 10 | Verify tranche | Investor reports; founder confirms | Check bank/approved evidence; record verified amount, date, verifier, remaining commitment. **Returned money = reversal linked to original** (reduces deployed and fee base) | Verified → **success-fee task (auto)** | Tranche dates | IR |

### D. Success fee and reconciliation
| # | Step | Trigger | What Finance does | Output | Approver | With |
|---|---|---|---|---|---|---|
| 11 | Calculate fee | Tranche verified (auto) | Check MoU and eligible funding; apply structure: **percentage / fixed / slab**, cap, eligible vs excluded funding, upfront adjustment only if agreement allows, discounts, waivers. Partner-share field kept but **off by default** | Fee calculated | none | none |
| 12 | Review and invoice | Calculated | Finance lead reviews; **one invoice per verified tranche**; sync to Zoho | Invoiced | Finance lead | Founder |
| 13 | Collect and allocate | Invoiced | Follow up; founder pays net and enters **TDS deducted**; allocate cash + TDS | Paid (TDS certificate pending) | none | SR |
| 14 | Reconcile | Payments in | Balance startup account: upfront charges, success fees, receipts, GST, TDS, credits, (partner settlements if on). Founder uploads **Form 16A**; reminders until then. **Credit note** if reversal follows an invoice | Closed only when account balances and TDS certificates are in | Finance lead | none |

## 3. Five fee numbers, always separate
Forecast fee (expected on anticipated funding) · **Fee due** (determined on verified money) · **Invoiced** · **Collected** (verified receipts incl. TDS recorded) · **Outstanding** (unsettled balance after approved adjustments). Never merge these in UI or reports.

## 4. Notifications to Production (one per event, system-sent)
1. Committee Proceed → **Advance notice** (start planning).
2. Full upfront fee verified → **AV shoot handover pack** (shoot can be booked).

## 5. Finance dashboard (one shared view)
Work queue (by due date, overdue) · IRR (requested, accepted, docs missing, in review, awaiting super admin, approved, at risk of 2-week rule) · Upfront fee (determined vs collected vs outstanding; overdue by age **0–15 / 15–30 / 30+ days** from original due date; extensions; disputes; waivers) · Receipts to check · Deployment (committed vs investor-reported vs verified; tranches awaiting verification; reversals) · Success fee (forecast, due, invoiced, collected, outstanding; overdue; due but not invoiced) · Reconciliation (unbalanced accounts, TDS certificates pending, GST entries) · System (Zoho sync failures).

## 6. UX requirements
- **Work queue** with filters (type, startup, age) and one-click "open item".
- **Receipt verification screen**: proof image beside bank-statement match panel; actions Verify / Part-pay / Reject with reason.
- **Fee calculator** shows inputs, schedule version, result, exceptions, and approver trail.
- **Startup account ledger**: single page showing upfront, success fees, receipts, GST, TDS, credits, balance.
- **Ageing chips** (0–15, 15–30, 30+) colour-coded; extension history visible.
- **Zoho sync panel**: last sync, failures with retry and error text.
- IRR version history with diff-friendly labels.

## 7. Data model (minimum)
`IRR`, `IRRVersion`, `IRRQuery`, `FeeSchedule` (versioned), `UpfrontFee`, `TurnoverBasis`, `FeeException`, `Invoice` (type, due_date, original_due_date, zoho_id), `Receipt` (proof, status), `Allocation`, `Extension`, `Tranche`, `Reversal`, `SuccessFee`, `TDSEntry`, `Form16A`, `CreditNote`, `LedgerEntry`, `ApprovalRequest`.

## 8. Business rules
Screenshot ≠ paid · AV handover only after **full** upfront fee · extension keeps original due date · success fee only on verified money · reversal reduces deployed and fee base · one invoice per verified tranche · reconciliation closes only when balanced and TDS certificates received · extension ≤7 days Finance lead, >7 days super admin.

## 9. Acceptance criteria
- [ ] Committee Proceed auto-creates fee request with 15-day clock.
- [ ] Full verification auto-assembles AV pack and notifies Production.
- [ ] Tranche verification auto-creates success-fee task.
- [ ] Five fee measures stored and displayed separately.
- [ ] Zoho sync works with visible failure handling.
- [ ] Reversal updates deployed amount, fee base, and creates credit note if invoiced.

## 10. Open items
**Fee schedule not supplied** (build versioned config UI + placeholder). Slab/cap parameters to confirm. Partner-share stays hidden by default.
