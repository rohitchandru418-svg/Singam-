#!/usr/bin/env bash
# Drive a brand-new founder through signup + onboarding via the real API, printing results.
set -uo pipefail
B=http://localhost:12000

j() { python3 -c "import json,sys;d=json.load(sys.stdin);print(json.dumps(d)[:600])"; }

echo "=== 1. request-otp (new founder) ==="
OTP=$(curl -s -X POST $B/api/v1/auth/request-otp -H 'Content-Type: application/json' -d '{"identifier":"newfounder@example.com"}')
echo "$OTP"
CODE=$(echo "$OTP" | python3 -c "import json,sys;print(json.load(sys.stdin)['data'].get('devCode',''))")

echo "=== 2. verify ==="
VER=$(curl -s -X POST $B/api/v1/auth/verify -H 'Content-Type: application/json' -d "{\"identifier\":\"newfounder@example.com\",\"code\":\"$CODE\"}")
echo "$VER" | j
TOKEN=$(echo "$VER" | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['token'])")
echo "$TOKEN" > /tmp/ftoken

echo "=== 3. session as new founder ==="
curl -s $B/api/v1/session -H "Authorization: Bearer $TOKEN" | j

echo "=== 4. startup-side BEFORE onboarding (should be empty workspace) ==="
curl -s $B/api/v1/startup-side -H "Authorization: Bearer $TOKEN" | j

echo "=== 5. startup.create ==="
curl -s -X POST $B/api/v1/actions -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"action":"startup.create","payload":{"name":"FreshDemo Labs","legal_entity":"FreshDemo Labs Pvt Ltd","sector":"Fintech","geography":"Chennai","founder_name":"New Founder","founder_email":"newfounder@example.com"}}' | j

echo "=== 6. startup-side AFTER onboarding ==="
curl -s $B/api/v1/startup-side -H "Authorization: Bearer $TOKEN" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if not d.get('ok'): print('ERROR', d); sys.exit()
d=d['data']
print('startup:', (d.get('startup') or {}).get('name'))
print('currentApplicationId:', d.get('currentApplicationId'))
print('profile:', d.get('profile',{}).get('percent'),'%')
print('journey currentKey:', d['journey']['currentKey'])
print('journey stages:', [(s['key'],s['status'],s['needsYou']) for s in d['journey']['stages']])
print('programs:', [(p['title'],p['status'],p['applied']) for p in d.get('programs',[])])
"
