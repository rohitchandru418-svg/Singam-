# 09 · Community and Ecosystem Workflow

> **Vibecode brief.** Build the Community module (Version 1). Community is the **lead engine** (startup and investor leads) and the ecosystem where people engage, meet and connect. The Community team manages **all member records**; **mentors and partners have no logins**. **Membership never grants access to deal information.** The source says there is no Community SOP; this follows its proposed module.

## 1. Workflow

| # | Step | Trigger | What they do | Output | Approver | Rule | With |
|---|---|---|---|---|---|---|---|
| 1 | Member records | Person joins or already exists | **One person record with multiple roles** (e.g. founder + mentor + investor); organisation, sector, geography, interests, relationship owner, communication preferences and permissions, groups | Member profile | none | none | SR, IR |
| 2 | Events | Event planned | Purpose, owner, budget, registrations, attendance, feedback, follow-up tasks, outcomes (founder meetups, investor sessions, sector roundtables, partner programmes, mentoring clinics, alumni activities) | Event closed with outcomes | Super admin (budget) | Event date | Marketing |
| 3 | Referrals | Member refers a startup or investor | Track chain: **interaction → referral → application / investor lead → qualified → engaged → funded or other outcome**. Keep **original source** and **later contributors** separately. Link to existing records, **never duplicate** | Referral outcome | none | none | SR, IR |
| 4 | Founder support | Founder raises request | Investor intros, mentoring, customer connections, hiring, follow-on funding; owner, deadline, outcome, founder feedback | Request resolved | none | Request deadline | IR, mentors |

## 2. Dashboard
Participation (active members; repeat attendance) · Partners (partner activity) · Referrals (qualified referrals; funding linked to community) · Support (requests resolved vs open).

## 3. UX requirements
- **Unified person record**: one profile, role chips (Founder, Investor, Mentor, Partner, Alumni), linked startup/investor records, interaction timeline.
- **Duplicate detection** on email/phone/name; merge flow with preview.
- **Event manager**: create → budget (needs super-admin approval) → registration → check-in → feedback → outcomes. Check-in via QR or list.
- **Referral pipeline view** (funnel) with source attribution; clearly show original source vs later contributors.
- **Support request board** (Open / In progress / Resolved) with owner, deadline, outcome, founder feedback score.
- **Segments and groups** for targeted invites; honour communication preferences.
- **Permission guard**: membership role never opens deal data; enforce at API.

## 4. Data model (minimum)
`Person`, `PersonRole`, `Organisation`, `Group`, `CommunicationPreference`, `Event`, `EventRegistration`, `EventAttendance`, `EventFeedback`, `EventOutcome`, `EventBudget`, `Referral` (source, contributors, stage, outcome, linked_record_id), `SupportRequest` (type, owner, deadline, outcome, feedback), `PartnerActivity`.

## 5. Business rules
One person, many roles · never duplicate records · mentors and partners have no logins · community membership never grants deal access · event budget requires super-admin approval.

## 6. Acceptance criteria
- [ ] Adding an existing person adds a role instead of a new record.
- [ ] Referral links to existing application/investor lead and preserves original source.
- [ ] Event budget approval flows to the super-admin inbox.
- [ ] No deal data in any Community API response (automated test).
- [ ] Dashboard metrics match underlying records.

## 7. Open items
No SOP yet: confirm qualification criteria for "qualified referral" and funding-attribution rules.
