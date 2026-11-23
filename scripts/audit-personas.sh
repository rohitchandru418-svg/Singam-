#!/usr/bin/env bash
# Audit every persona: mint a session, open the landing screen and the landing API, and probe a
# screen that belongs to another department. Prints OK/ERR and the record counts the persona sees.
set -uo pipefail
B=http://localhost:12000

mint() { curl -s -X POST $B/api/v1/auth/dev-switch -H 'Content-Type: application/json' -d "{\"userId\":\"$1\"}" \
  | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['token'])"; }

check() { # <token> <path>
  curl -s -o /dev/null -w '%{http_code}' "$B$2" -H "Authorization: Bearer $1"
}

# persona|userId|landing screen|landing api|forbidden screen
rows=(
  "founder|U-F-S01|/|/api/v1/startup-side|/api/v1/upfront_fees"
  "investor|U-I-01|/|/api/v1/investor-side|/api/v1/upfront_fees"
  "startup_relationship|U-SR1|/startups|/api/v1/applications|/api/v1/upfront_fees"
  "investor_relations|U-IR1|/investors|/api/v1/investors|/api/v1/bootcamp_attendance"
  "finance|U-FIN1|/upfront-fees|/api/v1/upfront_fees|/api/v1/screening"
  "production|U-PROD1|/production|/api/v1/production_handovers|/api/v1/screening"
  "legal|U-LEGAL1|/legal|/api/v1/deal_documents|/api/v1/screening"
  "marketing|U-MKT1|/telecast|/api/v1/telecasts|/api/v1/screening"
  "community|U-COMM1|/community|/api/v1/community_members|/api/v1/screening"
  "analyst|U-AN1|/analyst|/api/v1/analyst_evaluations|/api/v1/upfront_fees"
  "super_admin|U-MGMT|/approvals|/api/v1/approval_requests|/api/v1/screening"
)

for row in "${rows[@]}"; do
  IFS='|' read -r name uid screen api forbidden <<< "$row"
  tok=$(mint "$uid")
  sc=$(check "$tok" "$screen")
  ac=$(check "$tok" "$api")
  fc=$(check "$tok" "$forbidden")
  total=$(curl -s "$B$api?limit=1" -H "Authorization: Bearer $tok" | python3 -c "import json,sys
try: print(json.load(sys.stdin)['data'].get('total','?'))
except Exception: print('n/a')")
  verdict="OK"
  [ "$sc" = "200" ] || verdict="SCREEN-$sc"
  # The forbidden screen must not be a 200.
  [ "$fc" = "200" ] && verdict="$verdict LEAK"
  printf '%-22s screen=%s api=%s forbidden=%s total=%s  %s\n' "$name" "$sc" "$ac" "$fc" "$total" "$verdict"
done
