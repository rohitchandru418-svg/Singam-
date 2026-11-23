#!/usr/bin/env bash
# Continue the founder journey: save draft -> submit -> then internal personas act.
set -uo pipefail
B=http://localhost:12000
T=$(cat /tmp/ftoken)

act() { # action payload
  curl -s -X POST $B/api/v1/actions -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
    -d "{\"action\":\"$1\",\"payload\":$2}" | python3 -c "import json,sys;d=json.load(sys.stdin);print(('OK' if d.get('ok') else 'ERR'), d.get('error') or (d.get('data') or {}).get('message',''))"
}

echo "=== save draft (founder) ==="
act founder_side.save_draft '{"stage":"early_revenue","pitch":"AI underwriting for small business lending.","monthly_revenue":250000,"customer_count":12,"traction":"12 paying customers, 40% MoM.","target_fundraise":5000000,"business_model":"SaaS subscription"}'

echo "=== submit application (founder) ==="
act application.submit_own '{}'

echo "=== startup-side after submit ==="
curl -s $B/api/v1/startup-side -H "Authorization: Bearer $T" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
print('currentApplicationId:', d.get('currentApplicationId'))
app=[a for a in d['applications']]
print('applications:', [(a['id'],a['reference_no'],a['status'],a['completion_pct']) for a in app])
print('journey currentKey:', d['journey']['currentKey'])
for s in d['journey']['stages']:
    if s['status']!='upcoming': print('  ',s['key'],s['status'],'needsYou' if s['needsYou'] else '')
"
