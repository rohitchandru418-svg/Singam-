#!/usr/bin/env bash
# End-to-end loop test: new founder -> profile -> SR approve -> apply -> draft -> submit.
set -uo pipefail
B=http://localhost:12000
EMAIL="loop$(date +%s)@example.com"

say() { printf '\n== %s ==\n' "$1"; }
# POST an action as a bearer token; print ok/error
act() { curl -s -X POST $B/api/v1/actions -H "Authorization: Bearer $1" -H 'Content-Type: application/json' \
  -d "{\"action\":\"$2\",\"payload\":$3}" | python3 -c "import json,sys;d=json.load(sys.stdin);print(('OK ' if d.get('ok') else 'ERR'), (d.get('error') or (d.get('data') or {}).get('message','')))"; }

say "1. founder signs up"
OTP=$(curl -s -X POST $B/api/v1/auth/request-otp -H 'Content-Type: application/json' -d "{\"identifier\":\"$EMAIL\"}")
CODE=$(echo "$OTP" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['devCode'])")
VER=$(curl -s -X POST $B/api/v1/auth/verify -H 'Content-Type: application/json' -d "{\"identifier\":\"$EMAIL\",\"code\":\"$CODE\"}")
FT=$(echo "$VER" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['token'])")
echo "$FT" > /tmp/looptoken

say "2. register startup"
act "$FT" startup.create '{"name":"LoopTest Co","sector":"SaaS","geography":"Chennai","founder_name":"Loop Founder","founder_email":"'$EMAIL'"}'

say "3. save full profile"
act "$FT" founder_side.save_draft '{"stage":"early_revenue","revenue_stage":"early_revenue","pitch":"Test pitch","business_model":"SaaS","monthly_revenue":100000,"customer_count":5,"traction":"5 customers","target_fundraise":3000000,"technologies":"Node","industries":"SaaS","website":"https://x.example.com","entity_type":"Private Limited","origin_country":"India","registered":1,"cin":"U12345","pan":"ABCDE1234F","incorporated_on":"2024-01-01","product_stage":"launched"}'

say "4. submit profile"
act "$FT" profile.submit '{}'

say "5. SR sees the startup pending profile review"
curl -s "$B/api/v1/startups?limit=3&sort=created_at&direction=desc" -H "x-actor: U-SR1" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
for i in d['items'][:3]: print('  ', i['id'], i.get('name'), '->', i.get('profile_status'))
"

say "6. SR approves the profile (profile.review)"
SID=$(curl -s "$B/api/v1/startups?limit=1&sort=created_at&direction=desc" -H "x-actor: U-SR1" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['items'][0]['id'])")
act "$FT" x 2>/dev/null || true
curl -s -X POST $B/api/v1/actions -H "x-actor: U-SR1" -H 'Content-Type: application/json' \
  -d "{\"action\":\"profile.review\",\"payload\":{\"startup_id\":\"$SID\",\"decision\":\"approve\"}}" | python3 -c "import json,sys;d=json.load(sys.stdin);print(('OK ' if d.get('ok') else 'ERR'), d.get('error') or (d.get('data') or {}).get('message',''))"

say "7. founder applies to the season"
act "$FT" application.apply '{}'

say "8. founder startup-side state"
curl -s $B/api/v1/startup-side -H "Authorization: Bearer $FT" | python3 -c "
import json,sys
d=json.load(sys.stdin)['data']
print('  profile_status:', (d.get('startup') or {}).get('profile_status'))
print('  currentApplicationId:', d.get('currentApplicationId'))
print('  journey currentKey:', d['journey']['currentKey'])
print('  stages (non-upcoming):', [(s['key'],s['status']) for s in d['journey']['stages'] if s['status']!='upcoming'])
"
