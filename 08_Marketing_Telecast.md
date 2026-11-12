# 08 · Marketing and Telecast Workflow

> **Vibecode brief.** Build the Marketing workspace. Marketing takes the **approved episode** from Production and owns telecast, promotions, founder posting, and public announcements. Marketing sees **approved publication information only**; investor remarks and deal documents stay hidden. In the source sheet, yellow rows are **Proposed** (need approval): keep a "Proposed" flag in config.

## 1. Workflow

| # | Step | Trigger | What Marketing does | Output | Approver | Rule | With |
|---|---|---|---|---|---|---|---|
| 1 | Telecast schedule | Episode approved | Record episode and telecast date (set with broadcaster) | Air date fixed | none | none | Production |
| 2 | Founder notification | Air date fixed | Notify founder of air date and promotion requirements | Founder notified | none | Before air date | SR |
| 3 | Promo assets | Air date fixed | Create AVs, videos, posts; send for approval | Approved assets | **Super admin (CEO)** | Before air date | Production |
| 4 | Founder posting | Assets approved | Share approved assets and posting brief; founder posts and **submits post link**; status **Posted / Not posted** (no reach or view metrics) | Posting complete | none | Air date | Founder, SR |
| 5 | Post-telecast activity | Telecast | Run post-telecast posts and activity | Activity logged | none | none | none |
| 6 | Founder feedback | Telecast | Collect founder feedback; route content feedback to Production | Feedback logged | none | none | Production |
| 7 | Public investment announcement | Deal milestone | Draft wording from **system figures**, labelled **announced / committed / verified deployed**; publish once **investor approves** (founder approval not needed) | Announcement published | **Investor** | none | IR |

## 2. Marketing dashboard
Episodes (scheduled, aired, upcoming air dates) · Founders (notified vs pending) · Assets (awaiting approval, approved) · Posting (founder completion %) · Feedback (received, average rating, routed to Production) · Announcements (drafts awaiting investor approval; **claims flagged where announced ≠ deployed**).

## 3. UX requirements
- **Content calendar**: episodes by air date with status chips (scheduled, assets pending, assets approved, aired).
- **Asset board**: Draft → In approval → Approved; preview inline; approver and timestamp.
- **Founder posting tracker**: per founder, link field, validation of URL, Posted/Not posted; reminder button (email/WhatsApp) before air date. No reach/view metrics.
- **Announcement composer**: pulls figures automatically; shows three labelled numbers (announced, committed, verified deployed) and **warns** if wording claims more than the verified figure; sends to investor for approval; cannot publish until approved.
- **Feedback inbox**: rating plus comment, tag content-related items and one-click "route to Production".
- Redaction: no investor remarks or deal documents in Marketing views.

## 4. Data model (minimum)
`Episode` (air_date, broadcaster), `FounderNotification`, `PromoAsset` (status, approver), `PostingBrief`, `FounderPost` (link, status), `PostTelecastActivity`, `Feedback` (rating, routed_to), `Announcement` (draft_text, figures{announced, committed, deployed}, labels, investor_approval, published_at).

## 5. Business rules
Founder approval not needed for announcements, **investor approval is mandatory** · wording must use the right label per figure · Posted/Not posted only · CEO approves promo assets.

## 6. Acceptance criteria
- [ ] Air date entry triggers founder notification and promo tasks.
- [ ] Assets cannot be shared with founder until approved.
- [ ] Announcement cannot publish without investor approval.
- [ ] Mismatch flag appears when announced > verified deployed.
- [ ] Feedback routing creates a visible item for Production.
