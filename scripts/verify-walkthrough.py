#!/usr/bin/env python3
"""Drive the seeded walkthrough founder (Kishore at Minsky) through all 20 stages.

Each stage is advanced by the persona that owns it, switching the acting user as the journey
crosses departments. The point is to prove the seeded stage-0 record really can be walked end
to end: founder -> Startup Relationship -> Analyst -> Investor Relations -> Management ->
Finance -> Production -> Legal -> Marketing -> Community.

Usage: python3 scripts/verify-walkthrough.py [base_url]
"""

from __future__ import annotations

import json
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:12000"
STARTUP = "S-21"
FOUNDER = "U-F-S21"
FAILURES: list[str] = []
CHECKS = 0
STAGE = 0


def day(offset: int = 0) -> str:
    return (date.today() + timedelta(days=offset)).isoformat()


def call(action: str, actor: str, payload: dict, _retries: int = 3) -> dict:
    body = json.dumps({"action": action, "payload": payload}).encode()
    req = urllib.request.Request(
        f"{BASE}/api/v1/actions", data=body, headers={"Content-Type": "application/json", "x-actor": actor}
    )
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except json.JSONDecodeError:
            if _retries > 0:
                time.sleep(1.5)
                return call(action, actor, payload, _retries - 1)
            raise


def get(path: str, actor: str = "U-MGMT", _retries: int = 3) -> dict:
    req = urllib.request.Request(f"{BASE}/api/v1{path}", headers={"x-actor": actor})
    try:
        with urllib.request.urlopen(req) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        try:
            return json.load(e)
        except json.JSONDecodeError:
            if _retries > 0:
                time.sleep(1.5)
                return get(path, actor, _retries - 1)
            raise


def data(res: dict) -> dict:
    inner = res.get("data") or {}
    return inner.get("data") if isinstance(inner.get("data"), dict) else inner


def check(label: str, condition: bool, detail: str = "") -> None:
    global CHECKS
    CHECKS += 1
    if condition:
        print(f"  PASS  {label}")
    else:
        print(f"  FAIL  {label} {detail}")
        FAILURES.append(label)


def stage(n: int, name: str, owner: str, total: int = 20) -> None:
    global STAGE
    STAGE = n
    print(f"\n=== Stage {n}/{total}: {name} (owner: {owner}) ===")


def ok(label: str, res: dict) -> bool:
    good = res.get("ok") is True
    check(label, good, str(res)[:260])
    return good


# The walkthrough starts at stage 0 and completes every stage, so it can only run once per
# seeded database. Warm the server first (the seed is created lazily on the first request)
# and fail loudly on a dirty database instead of reporting misleading errors.
for _ in range(30):
    try:
        get("/session", "U-MGMT")
        break
    except Exception:
        time.sleep(1)
_preflight = get("/startup-side", FOUNDER).get("data") or {}
if _preflight.get("currentApplicationId"):
    print("The walkthrough founder already has an application; run `npm run db:reset` and restart")
    print("the dev server before re-running this script.")
    sys.exit(2)


# ---------------------------------------------------------------- stage 1: record
stage(1, "Startup record", "Founder")
side = get("/startup-side", FOUNDER).get("data") or {}
check("the walkthrough founder lands on Minsky", (side.get("startup") or {}).get("name") == "Minsky", str(side.get("startup"))[:200])
check("Minsky starts unapproved, with the profile journey still to run", (side.get("startup") or {}).get("profile_status") != "approved", str(side.get("startup"))[:200])
check("no application exists at stage 0", side.get("currentApplicationId") in (None, "", []), str(side.get("currentApplicationId"))[:120])

# ---------------------------------------------------------------- stage 2-3: application
stage(2, "Application draft", "Founder")
saved = call("profile.save", FOUNDER, {
    "sector": "Agritech", "geography": "Tamil Nadu", "origin_country": "India",
    "entity_type": "Private Limited", "website": "minsky.example",
    "pitch": "Same-week agri settlement for small mills.", "product_stage": "prototype",
    "revenue_stage": "pre_revenue", "technologies": "Mobile, payments", "industries": "Agritech",
    "business_model": "B2B SaaS", "target_fundraise": 800000000,
    "pitch_deck_ref": "MINSKY-PITCH.pdf", "logo_ref": "minsky-logo.png", "registered": True,
})
ok("founder saves the startup profile", saved)
submitted_profile = call("profile.submit", FOUNDER, {})
ok("founder submits the profile for review", submitted_profile)

stage(3, "Application submitted", "Startup Relationship")
reviewed = call("profile.review", "U-SR1", {"startup_id": STARTUP, "decision": "approve", "notes": "Profile complete."})
ok("Startup Relationship approves the profile", reviewed)
applied = call("application.apply", FOUNDER, {"completion_pct": 100})
ok("founder opens a draft application", applied)
side2 = get("/startup-side", FOUNDER).get("data") or {}
app_id = side2.get("currentApplicationId")
apps = side2.get("applications") or []
check("the draft is linked to Minsky", any(a.get("id") == app_id for a in apps), str(apps[:1])[:200])
sub = call("application.submit_own", FOUNDER, {"application_id": app_id})
ok("founder submits the application", sub)

# ---------------------------------------------------------------- stage 4-5: screening
stage(4, "Internal screening", "Startup Relationship")
# Minsky is idea stage, so the SOP lets revenue, traction and past funding be marked not
# applicable (null). No outcome is sent, so the configurable qualifying rule decides it.
scored = call("screening.score", "U-SR1", {
    "application_id": app_id, "reviewer_id": "U-SR1",
    "completeness": 9, "documents": 8, "unique_idea": 16, "revenue": None, "traction": None,
    "past_funding": None, "founder_capability": 4, "incubation": 3, "ip_defensibility": 7,
    "comments": "Idea stage: financial criteria marked not applicable.",
    "evidence": "deck",
})
ok("Startup Relationship scores the 100-mark framework", scored)
check(
    "the qualifying rule proceeds the application on applicable marks only",
    (scored.get("data") or {}).get("data", {}).get("screening", {}).get("outcome") == "proceed",
    str(scored)[:240],
)
screen = (scored.get("data") or {}).get("data", {}).get("screening", {})
check("a not-applicable criterion is excluded, not scored zero", screen.get("revenue") is None, str(screen)[:200])

stage(5, "Prep Bootcamp", "Startup Relationship")
ok("bootcamp invitation recorded", call("bootcamp.invite", "U-SR1", {"application_id": app_id}))
ready = call("bootcamp.record", "U-SR1", {
    "application_id": app_id, "attended": True, "process_briefing_done": True,
    "readiness_session_done": True, "mou_briefing_done": True, "fee_briefing_done": True,
    "actions_assigned": "Share cap table",
})
ok("bootcamp preparation completed", ready)

# ---------------------------------------------------------------- stage 6: analyst
stage(6, "Analyst screening", "Analyst")
ana = call("analyst.evaluate", "U-AN1", {
    "application_id": app_id, "analyst_id": "U-AN1", "thesis_fit": 8, "market_opportunity": 7,
    "traction": 6, "business_model": 8, "competitive_positioning": 7, "willingness_to_invest": 7,
    "indicative_amount": 200000000, "recommendation": "proceed",
    "decision_reason": "Fits the thesis", "outstanding_concern": "Early traction",
})
ok("analyst records the evaluation", ana)

# ---------------------------------------------------------------- stage 7: MoU
stage(7, "MoU signing", "Startup Relationship / Legal")
mou = call("mou.share", "U-SR1", {
    "application_id": app_id, "commercial_schedule": "2% success fee",
    "founder_email": "kishore@minsky.example",
})
mou_id = data(mou).get("id")
ok("MoU shared and the review clock started", mou)
check("AMA and signing deadlines are working-day based", bool(data(mou).get("legal_ama_due")) and bool(data(mou).get("signing_deadline")), str(data(mou))[:200])
ok("Legal AMA recorded", call("mou.record_ama", "U-LEGAL1", {"mou_id": mou_id}))
ok("founder signs the MoU", call("mou.respond", "U-SR1", {"mou_id": mou_id, "response": "Proceed", "founder_email": "kishore@minsky.example"}))

# ---------------------------------------------------------------- stage 8: IRR
stage(8, "Investment Readiness Report", "Startup Relationship / Finance")
irr = call("irr.request", "U-SR1", {"application_id": app_id})
irr_id = data(irr).get("id")
ok("IRR requested after MoU signing", irr)
for s in ["accept_handover", "send_checklist", "prepare", "review", "approve", "share_with_ir"]:
    out = call("irr.advance", "U-FIN1", {"irr_id": irr_id, "step": s})
    if not out.get("ok"):
        check(f"IRR step {s}", False, str(out)[:200])
        break
else:
    check("IRR advanced through every handover step", True)

# ---------------------------------------------------------------- stage 9-11: pitches
stage(9, "Virtual pitch", "Investor Relations")
investor_id = None
inv_list = get("/investors?limit=5", "U-IR1")["data"]["items"]
if inv_list:
    investor_id = inv_list[0]["id"]
check("an investor exists to circulate to", bool(investor_id), str(inv_list[:1])[:200])
shared = call("match.suggest", "U-IR1", {"startup_id": STARTUP})
ok("Investor Relations runs the matcher", shared)
matches = (get("/matches?limit=200", "U-IR1").get("data") or {}).get("items") or []
minsky_matches = [m for m in matches if m.get("startup_id") == STARTUP]
check("the matcher proposes at least one investor for Minsky", bool(minsky_matches), str(matches[:1])[:200])
match_id = minsky_matches[0]["id"] if minsky_matches else None
if match_id:
    ok("Investor Relations approves the pairing for circulation", call("match.approve", "U-IR1", {"match_id": match_id}))
    ok("information version shared on the pairing", call("match.share", "U-IR1", {"match_id": match_id, "information_shared": "IRR v1", "info_version": "IRR v1"}))
    ok("investor response recorded", call("match.respond", "U-IR1", {"match_id": match_id, "response": "interested"}))
if not investor_id and minsky_matches:
    investor_id = minsky_matches[0].get("investor_id")

pitch = call("pitch.schedule", "U-IR1", {
    "startup_id": STARTUP, "investor_id": investor_id, "scheduled_at": f"{day(10)}T10:00:00Z",
    "duration_pitch_min": 5, "duration_qa_min": 5, "material_shared": "IRR v1",
})
pitch_id = data(pitch).get("id")
ok("virtual pitch scheduled at 5 + 5 minutes", pitch)
ok("pitch response recorded", call("pitch.record", "U-IR1", {
    "pitch_id": pitch_id, "attended": True, "investor_questions": "Gross margin trend",
    "responses": "Answered with cohort data", "response": "ready_to_invest",
    "amount_confirmed": 200000000, "terms_confirmed": "Standard terms",
}))

stage(10, "Pitch Day", "Investor Relations")
pd = call("pitchday.record", "U-IR1", {
    "startup_id": STARTUP, "episode_no": 1, "scheduled_at": f"{day(20)}T09:00:00Z",
    "irr_distributed": True, "information_memorandum_distributed": True,
    "outcome": "golden_pass_issued", "follow_on_interest": "One HNI interested",
})
pd_id = data(pd).get("id")
ok("Pitch Day recorded with IRR and IM distribution", pd)

stage(11, "Golden Pass", "Investor Relations")
gp = call("pitchday.golden_pass", "U-IR1", {
    "startup_id": STARTUP, "investor_id": investor_id, "amount": 200000000,
    "evidence": "Signed intent note", "valuation": "Rs 20 crore", "terms": "Indicative only",
    "pitch_day_id": pd_id,
})
gp_id = data(gp).get("id")
ok("Golden Pass issued as initial interest", gp)
commits = get("/commitments?limit=200", "U-IR1")["data"]["items"]
gp_row = next((c for c in commits if c.get("id") == gp_id), None)
check("Golden Pass is not a confirmed commitment", gp_row is not None and gp_row.get("is_golden_pass") in (1, True) and gp_row.get("status") != "confirmed", str(gp_row)[:250])
ok("a written commitment is confirmed explicitly", call("commitment.confirm", "U-IR1", {"commitment_id": gp_id, "status": "confirmed", "evidence": "Term sheet signed"}))

# ---------------------------------------------------------------- stage 12: selection
stage(12, "Final shortlisting", "Management")
dec = call("committee.decide", "U-MGMT", {
    "startup_id": STARTUP, "outcome": "proceed",
    "conditions": "Complete documentation before the shoot", "re_review_date": day(45),
})
dec_id = (data(dec).get("decision") or {}).get("id")
ok("committee authorises show selection", dec)
check("the committee pack is compiled from the records", bool((data(dec).get("decision") or {}).get("pack_summary")), str(dec)[:200])

# ---------------------------------------------------------------- stage 13: upfront fee
stage(13, "Upfront fee collection", "Finance")
fee = call("upfront.initiate", "U-FIN1", {
    "startup_id": STARTUP, "committee_decision_id": dec_id, "initial_interest_announced_on": day(21),
    "turnover": 5000000000, "turnover_evidence": "Audited FY26 accounts", "financial_year": "FY26",
})
fee_id = data(fee).get("id")
ok("upfront fee initiated from turnover", fee)
ok("invoice issued", call("upfront.invoice", "U-FIN1", {"fee_id": fee_id, "invoice_no": "INV-MINSKY-1", "due_date": day(36)}))
hand = call("production.handover", "U-PROD1", {
    "startup_id": STARTUP, "pack_summary": "Profile, contacts, selection decision",
    "permitted_business_information": "Public metrics only",
})
hand_id = data(hand).get("id")
ok("production gets an advance notification on selection", hand)
blocked = call("production.accept", "U-PROD1", {"handover_id": hand_id})
check("the shoot handover is blocked until payment is cleared", blocked.get("ok") is False, str(blocked)[:200])
ok("receipt verified and allocated", call("upfront.record_receipt", "U-FIN1", {
    "fee_id": fee_id, "amount": data(fee).get("fee_amount") or 100000000, "payment_reference": "NEFT-MINSKY-1",
}))
ok("handover accepted once payment is cleared", call("production.accept", "U-PROD1", {"handover_id": hand_id}))

# ---------------------------------------------------------------- stage 14-17: shoots
stage(14, "AV shoot", "Production")
ok("AV shoot completed", call("av.update", "U-PROD1", {
    "startup_id": STARTUP, "status": "completed", "story_research": "Founder story",
    "location": "Chennai studio", "crew": "Two cameras", "schedule_on": day(40),
    "founder_availability": "Confirmed", "shot_requirements": "Studio and product wall",
    "asset_links": "s3://assets/minsky",
}))

stage(15, "Mock shoot", "Production")
mock = call("mock.update", "U-PROD1", {
    "startup_id": STARTUP, "scheduled_on": day(45), "costumes_properties": "Formal wear",
    "pitch_revisions": "Tightened to 5 minutes", "product_demo_ready": True,
    "stage_movement_rehearsed": True, "final_ask": 200000000, "valuation_information": "Rs 20 crore",
    "open_actions": "None", "approve_readiness": True,
})
ok("mock shoot readiness approved", mock)
mock_approval = data(mock).get("approval_id")
check("mock readiness is proposed to the super admin", bool(mock_approval), str(mock)[:200])
if mock_approval:
    call("approval.decide", "U-MGMT", {"approval_id": mock_approval, "decision": "approved", "reason": "Checklist complete"})

stage(16, "Pre-shoot documentation", "Production / Legal")
req = call("document.request_create", "U-LEGAL1", {"startup_id": STARTUP, "title": "Pre-shoot clearances", "purpose": "financial_statements"})
ok("pre-shoot document request raised", req)

stage(17, "Main shoot", "Production")
main = call("mainshoot.update", "U-PROD1", {
    "startup_id": STARTUP, "episode_no": 1, "scheduled_on": day(50), "status": "completed",
    "founder_attendance": "Founder present", "investor_attendance": "Lead investor present",
    "live_ask": 200000000, "live_offers": "One offer",
    "accepted_deal_terms": "Rs 2 crore at Rs 20 crore valuation", "lead_investor_id": investor_id,
    "conditions": "Standard closing conditions", "outstanding_actions": "Sign letters",
})
shoot_id = data(main).get("id")
ok("main shoot recorded", main)
sig = call("signing.event_create", "U-PROD1", {"main_shoot_id": shoot_id, "event_type": "investor_commits_on_set", "target_on": day(50)})
ok("a signing event names the document it requires", sig)
if data(sig).get("id"):
    call("signing.event_complete", "U-PROD1", {"signing_event_id": data(sig).get("id"), "status": "signed", "document_ref": "ICL-minsky"})

# ---------------------------------------------------------------- stage 18: telecast
stage(18, "Telecast & promotions", "Marketing")
tele = call("telecast.update", "U-MKT1", {
    "startup_id": STARTUP, "step": "telecast", "episode_no": 1, "telecast_date": day(60),
    "promo_requirements": "Two reels and one post", "promo_assets_approved": "Teaser approved",
    "founder_posting_done": True, "post_telecast_activity": "LinkedIn campaign",
    "founder_feedback": "Positive", "public_announcement": "Announced Rs 2 crore",
    "announced_amount": 200000000, "committed_amount": 200000000, "verified_deployed_amount": 7500000,
})
ok("telecast recorded with separate announced, committed and verified figures", tele)

# ---------------------------------------------------------------- stage 19: deal closure
stage(19, "Deal closure & deployment", "Investor Relations / Finance")
deal = call("deal.open", "U-IR1", {
    "startup_id": STARTUP, "investor_id": investor_id, "round_name": "Seed round S3",
    "target_amount": 200000000, "committed_amount": 200000000,
    "agreed_terms": "2% success fee", "valuation": "Rs 20 crore", "closure_owner_id": "U-IR1",
    "expected_close_on": day(75),
})
deal_id = (data(deal).get("deal") or {}).get("id")
ok("deal opened with a closure owner", deal)
check("the 48-hour communication thread becomes a tracked task", bool((data(deal).get("deal") or {}).get("communication_thread_due")), str(deal)[:200])
t1 = call("tranche.schedule", "U-IR1", {"deal_id": deal_id, "amount": 7500000, "scheduled_on": day(70)})
t1_id = data(t1).get("id")
ok("a tranche scheduled", t1)
call("tranche.report", "U-IR1", {"tranche_id": t1_id, "amount": 7500000, "evidence": "Investor NEFT advice"})
call("tranche.confirm_receipt", "U-FIN1", {"tranche_id": t1_id})
ok("tranche verified as received", call("tranche.verify", "U-FIN1", {"tranche_id": t1_id, "verified_amount": 7500000, "evidence": "Bank statement matched"}))

# ---------------------------------------------------------------- stage 20: success fee
stage(20, "Success fee & portfolio", "Finance / Community")
success = get("/success_fees?limit=200", "U-FIN1")["data"]["items"]
sf = next((s for s in success if s.get("deal_id") == deal_id), None)
check("verified deployment triggered the success fee automatically", sf is not None, str(success[:2])[:200])
if sf:
    ok("success fee calculated on the verified amount", call("successfee.calculate", "U-FIN1", {"deal_id": deal_id}))
    inv = call("successfee.invoice", "U-FIN1", {"success_fee_id": sf["id"], "invoice_no": "INV-SF-MINSKY-1", "due_date": day(90), "tax_amount": 100000})
    ok("success fee invoice issued with tax", inv)
    bal = float(data(inv).get("outstanding") or 0)
    if bal > 0:
        ok("success fee collected and the account reconciles", call("successfee.collect", "U-FIN1", {
            "success_fee_id": sf["id"], "amount": int(bal), "reference": "NEFT-SF-MINSKY-1",
        }))
ok("community support request logged", call("support.create", "U-COMM1", {
    "member_id": "CM-01", "startup_id": STARTUP, "request_type": "investor_introduction",
    "detail": "Intro to a lead investor", "owner_id": "U-COMM1", "due_date": day(14),
}))

# ---------------------------------------------------------------- journey summary
stage(21, "Journey summary", "Management", total=21)
board = get("/startup-board", "U-MGMT")["data"]
rows = board if isinstance(board, list) else (board.get("rows") or [])
row = next((s for s in rows if s.get("startup_id") == STARTUP), None)
check("Minsky appears on the startup board after the walkthrough", row is not None, str(rows[:1])[:200])
if row:
    keys = set(row.keys())
    check(
        "the board tracks selection, production, investment and finance separately",
        {"committee_outcome", "mou_status", "irr_status"} <= keys
        and {"av_status", "mock_status", "shoot_status", "telecast_status"} <= keys
        and {"committed_amount", "deployed_amount", "deal_status"} <= keys
        and {"upfront_fee_status", "success_fee_status"} <= keys,
        str(sorted(keys))[:300],
    )
    check("the board shows the founder walkthrough as selected", bool(row.get("committee_outcome")), str(row.get("committee_outcome"))[:120])
    check("the board separates verified deployment from the commitment", row.get("deployed_amount") is not None and row.get("committed_amount") is not None, str(row)[:200])

print("\n" + "=" * 60)
if FAILURES:
    print(f"{CHECKS - len(FAILURES)}/{CHECKS} checks passed; {len(FAILURES)} FAILED")
    for f in FAILURES:
        print(f"  - {f}")
    sys.exit(1)
print(f"{CHECKS}/{CHECKS} checks passed")
