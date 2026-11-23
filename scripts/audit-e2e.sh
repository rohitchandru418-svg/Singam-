#!/usr/bin/env bash
# Walk the whole season for one startup across every persona, printing OK/ERR at each step.
# Usage: bash scripts/audit-e2e.sh
set -uo pipefail
B=http://localhost:12000
FT=$(cat /tmp/looptoken)

fail=0
# act <actorHeader|BEARER> <action> <payload>
act() {
  local who="$1" action="$2" payload="$3" out
  if [ "$who" = "FOUNDER" ]; then
    out=$(curl -s -X POST $B/api/v1/actions -H "Authorization: Bearer $FT" -H 'Content-Type: application/json' -d "{\"action\":\"$action\",\"payload\":$payload}")
  else
    out=$(curl -s -X POST $B/api/v1/actions -H "x-actor: $who" -H 'Content-Type: application/json' -d "{\"action\":\"$action\",\"payload\":$payload}")
  fi
  echo "$out" | python3 -c "
import json,sys
try: d=json.load(sys.stdin)
except Exception: print('  ?? $action -> non-JSON'); sys.exit(3)
ok=d.get('ok'); msg=d.get('error') or (d.get('data') or {}).get('message','')
print(('  OK ' if ok else '  ERR'), '$action', '->', msg[:120])
sys.exit(0 if ok else 1)
" || { echo "     ^ FAILED"; fail=1; }
}

sid=$(curl -s "$B/api/v1/startups?limit=1&sort=created_at&direction=desc" -H "x-actor: U-SR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
aid=$(curl -s "$B/api/v1/applications?limit=1&sort=created_at&direction=desc" -H "x-actor: U-SR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
echo "startup=$sid application=$aid"

echo "== founder submits the draft =="
act FOUNDER application.submit_own "{\"application_id\":\"$aid\"}"

echo "== SR scores screening =="
act U-SR1 screening.score "{\"application_id\":\"$aid\",\"completeness\":9,\"documents\":8,\"unique_idea\":18,\"revenue\":7,\"traction\":7,\"past_funding\":16,\"founder_capability\":5,\"incubation\":4,\"ip_defensibility\":8,\"outcome\":\"proceed\"}"

echo "== SR bootcamp =="
act U-SR1 bootcamp.invite "{\"application_id\":\"$aid\"}"
act U-SR1 bootcamp.schedule "{\"application_id\":\"$aid\",\"session_dates\":\"2027-01-05 10:00 IST\",\"meet_link\":\"https://meet.startupsingam.example/bootcamp\"}"
act FOUNDER founder_side.bootcamp_respond '{"decision":"accept"}'
act U-SR1 bootcamp.record "{\"application_id\":\"$aid\",\"attended\":true,\"process_briefing_done\":true,\"readiness_session_done\":true,\"mou_briefing_done\":true,\"fee_briefing_done\":true}"

echo "== Analyst evaluates =="
act U-AN1 analyst.evaluate "{\"application_id\":\"$aid\",\"thesis_fit\":5,\"market_opportunity\":4,\"traction\":4,\"business_model\":4,\"competitive_positioning\":3,\"recommendation\":\"proceed\",\"indicative_amount\":2000000}"

echo "== MoU =="
act U-SR1 mou.share "{\"application_id\":\"$aid\"}"
mou=$(curl -s "$B/api/v1/mous?limit=1&sort=created_at&direction=desc" -H "x-actor: U-SR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
echo "  mou=$mou"
act U-LEGAL1 mou.record_ama "{\"mou_id\":\"$mou\"}"

echo "== IRR =="
act U-SR1 irr.request "{\"application_id\":\"$aid\"}"

echo "== IR: investor + match + pitch =="
act U-IR1 investor.create '{"name":"Test Capital","category":"VC"}'
inv=$(curl -s "$B/api/v1/investors?limit=1&sort=created_at&direction=desc" -H "x-actor: U-IR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
echo "  investor=$inv"
act U-IR1 investor.verify "{\"investor_id\":\"$inv\",\"verification_evidence\":\"SEBI registration and PAN verified\",\"reference_checks\":\"Two portfolio references confirmed\"}"
act U-IR1 investor.grade "{\"investor_id\":\"$inv\",\"grade\":\"L2\"}"
act U-IR1 investor.agreement "{\"investor_id\":\"$inv\",\"document_type\":\"NDA\"}"
act U-IR1 match.suggest "{\"startup_id\":\"$sid\"}"
mid=$(curl -s "$B/api/v1/matches?limit=1&sort=created_at&direction=desc" -H "x-actor: U-IR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
echo "  match=$mid"
act U-IR1 match.approve "{\"match_id\":\"$mid\"}"
act U-IR1 match.share "{\"match_id\":\"$mid\"}"
act U-IR1 pitch.schedule "{\"startup_id\":\"$sid\"}"

echo "== Pitch Day + Golden Pass =="
act U-IR1 pitchday.record "{\"startup_id\":\"$sid\"}"
act U-IR1 pitchday.golden_pass "{\"startup_id\":\"$sid\",\"investor_id\":\"$inv\",\"amount\":50000000,\"evidence\":\"Golden pass signed at pitch day\"}"

echo "== Committee =="
act U-MGMT committee.decide "{\"startup_id\":\"$sid\",\"outcome\":\"proceed\"}"

echo "== Upfront fee =="
act U-FIN1 upfront.initiate "{\"startup_id\":\"$sid\",\"turnover\":50000000}"
fee=$(curl -s "$B/api/v1/upfront_fees?limit=1&sort=created_at&direction=desc" -H "x-actor: U-FIN1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
echo "  fee=$fee"
act U-MGMT upfront.approve "{\"fee_id\":\"$fee\"}"
act U-FIN1 upfront.invoice "{\"fee_id\":\"$fee\"}"
amt=$(curl -s "$B/api/v1/upfront_fees/$fee" -H "x-actor: U-FIN1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['record']['fee_amount'])")
act U-FIN1 upfront.record_receipt "{\"fee_id\":\"$fee\",\"amount\":$amt,\"payment_reference\":\"NEFT-UP-1\"}"

echo "== Production =="
act U-PROD1 production.handover "{\"startup_id\":\"$sid\"}"
hand=$(curl -s "$B/api/v1/production_handovers?limit=1&sort=created_at&direction=desc" -H "x-actor: U-PROD1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])" 2>/dev/null || echo "")
echo "  handover=$hand"
act U-PROD1 production.accept "{\"handover_id\":\"$hand\"}"
act U-PROD1 av.update "{\"startup_id\":\"$sid\",\"status\":\"completed\"}"
act U-PROD1 mock.update "{\"startup_id\":\"$sid\",\"status\":\"readiness_approved\"}"
act U-PROD1 mainshoot.update "{\"startup_id\":\"$sid\",\"status\":\"completed\"}"

echo "== Deal closure + funding =="
act U-IR1 deal.open "{\"startup_id\":\"$sid\",\"investor_id\":\"$inv\",\"committed_amount\":2000000}"
deal=$(curl -s "$B/api/v1/deals?limit=1&sort=created_at&direction=desc" -H "x-actor: U-IR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
echo "  deal=$deal"
act U-IR1 tranche.schedule "{\"deal_id\":\"$deal\",\"amount\":2000000}"
tr=$(curl -s "$B/api/v1/tranches?limit=1&sort=created_at&direction=desc" -H "x-actor: U-IR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
echo "  tranche=$tr"
act U-FIN1 tranche.confirm_receipt "{\"tranche_id\":\"$tr\"}"
act U-FIN1 tranche.verify "{\"tranche_id\":\"$tr\",\"verified_amount\":750000}"

echo "== Success fee =="
act U-FIN1 successfee.calculate "{\"deal_id\":\"$deal\"}"

echo
echo "RESULT: $([ $fail -eq 0 ] && echo ALL-OK || echo HAS-FAILURES)"
