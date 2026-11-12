# 06 · Production and Show Operations Workflow

> **Vibecode brief.** Build the Production workspace. Production sees **permitted business information only**; confidential investor remarks and deal documents stay hidden. **Advance notice** and **AV handover** are two separate milestones.

## 1. Roles
- **Production head** (supervised by super admin).
- **Production coordinators**, assigned per startup, coordinating founders, investors, crew.

## 2. Workflow

| # | Step | Trigger | What Production does | Output | Approver | Rule | With |
|---|---|---|---|---|---|---|---|
| 1 | Advance notice | Committee Proceed (auto) | Start planning: likely episode, rough schedule. **No shoot booked** | Startup in planning list | none | none | IR, Finance |
| 2 | Handover pack | Finance verifies **full** upfront fee (auto assembly) | System assembles pack (profile, founder contacts, selection decision, payment clearance, permitted business info); IR approves; Production accepts | AV shoot can be booked | IR approves | AV handover only after completed payment | IR, Finance |
| 3 | AV shoot | Handover accepted | Coordinator: story research, location, crew, schedule, founder availability, shot requirements; mark complete; save asset links | AV done, assets saved | none | Shoot date | Founder |
| 4 | Episode allocation | AV done | Production + IR: startup to episode and shoot date; IR builds panel | Episode and date fixed | Production head | IRR with investors 2 weeks before shoot | IR |
| 5 | Pre-shoot documentation | Episode fixed | Prepare shoot-day docs **per signing event (not by file name)** | Documents ready | none | Before mock shoot | IR, Legal |
| 6 | Mock shoot | Docs ready | Track costumes/props, pitch revisions, product demo readiness, stage movement and rehearsal, final ask and valuation, open actions | Final readiness approved | **Super admin** | Before main shoot | Founder |
| 7 | Main shoot | Readiness approved | Record on set: founder and investor attendance, live ask and offers, accepted terms, lead/co-investor allocation, conditions, Investment Commitment Letter, Startup Deal Acceptance Letter, signatures done/outstanding; log exceptions | Deal confirmed → IR takes over closure | none | Signing deadline | IR, founder, investors |
| 8 | Post-shoot documentation | Main shoot done | Collect outstanding signatures (signed on paper, uploaded) | Shoot file complete | none | Same day / 24 h **(to confirm)** | IR |
| 9 | Editing and approvals | Shoot file complete | Edit episode; Production head reviews; final approval (**proposed: super admin**) | Approved episode → Marketing | Super admin (proposed) | Air date | Marketing |
| 10 | Founder feedback loop | After telecast | Founder feedback routed back (and to Marketing) to improve later episodes | Feedback reviewed, actions logged | Production head | none | Marketing, founder |

## 3. Shoot-day exceptions (logged on set)
| # | Exception | What happens |
|---|---|---|
| 1 | Founder no-show | Reschedule; **SR informed** |
| 2 | Investor absent | Panel adjusted; **IR informed** |
| 3 | Deal withdrawn on set | Record reason; **IR starts replacement-investor search** |
| 4 | Signature refused | Record; **escalate to IR and super admin** |
| 5 | Technical failure | **Reshoot scheduled** |

## 4. Document rule
Document titles do **not** drive the workflow. Each **signing event** (investor commits on set, founder accepts deal) defines which document is needed and when. Shoot-day docs are signed on paper and uploaded.

## 5. Dashboards
1. **My shoots** (coordinator): startups by shoot stage, shoot calendar, founder availability pending, signatures outstanding.
2. **Production view** (head + super admin): all metrics, per-coordinator workload, readiness approvals waiting.

### Metrics
Paid startups awaiting AV · advance notices received, fee not paid (planning) · packs awaiting IR approval / Production acceptance · AV completion, assets uploaded vs pending · mock readiness, approvals waiting · missing documents, signatures past deadline · episode allocation, shoot calendar · exceptions by type · founder availability confirmations pending · episodes in editing / awaiting approval, founder feedback received and actioned.

## 6. UX requirements
- **Two lists, never mixed**: "Planning (advance notice)" and "Ready to book (handover accepted)".
- **Shoot calendar** (month/week) with episode, startup, crew, location, status colours.
- **On-set mode**: large-tap, offline-tolerant checklist for attendance, offers, accepted terms, lead/co-invest split, conditions, signature checklist, exception logger (5 types, one tap each with reason).
- **Signing-event checklist** driven by event type, not file name.
- **Mock readiness board**: checklist cards (costume, props, pitch, demo, movement, ask/valuation) with owner and status.
- **Asset links** saved with type and validation.
- **Redaction**: hide confidential investor remarks and deal documents at API level.

## 7. Data model (minimum)
`PlanningItem`, `HandoverPack` (status: assembled / IR-approved / accepted), `Shoot` (type: AV/mock/main), `Episode`, `ShootChecklistItem`, `SigningEvent`, `SigningDocument`, `OnSetRecord` (attendance, offers, terms, allocation, conditions), `ShootException`, `Asset`, `EditVersion`, `Approval`, `FounderFeedback`.

## 8. Business rules
Advance notice ≠ handover · AV only after full payment · mock readiness needs super-admin approval · exceptions trigger notifications to SR/IR/super admin · permitted information only.

## 9. Acceptance criteria
- [ ] Planning list populates automatically at Committee Proceed.
- [ ] Handover pack auto-assembles on full fee verification; IR approve, then Production accepts.
- [ ] Booking an AV shoot is blocked until handover accepted.
- [ ] Each of five exception types triggers the right notification.
- [ ] Confidential investor/deal data is absent from Production API responses.

## 10. Open items
Post-shoot document deadline (same day vs 24 h). Episode final approver (proposed super admin).
