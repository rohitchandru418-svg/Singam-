#!/usr/bin/env python3
"""Persona access matrix.

For every persona, request every entity and compare what the API allows with what the
persona's role is declared to allow. Reports:
  LEAK  - an entity whose module the role may NOT open answered 200 (over-permissive)
  DENY  - an entity whose module the role MAY open answered 403 (over-restrictive)
  ERR   - a non-200/403 response (a real error, not a policy decision)
"""
import json
import subprocess
import urllib.request

B = "http://localhost:12000"


def get(path, actor):
    req = urllib.request.Request(B + path, headers={"x-actor": actor})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.load(r)
    except urllib.error.HTTPError as e:
        return e.code, None
    except Exception:
        return -1, None


meta = get("/api/v1/meta", "U-MGMT")[1]["data"]
entities = [(e["key"], e["module"]) for e in meta["entities"]]
roles = {r["key"]: r["modules"] for r in meta["roles"]}

personas = [
    ("founder", "U-F-S01"), ("investor", "U-I-01"),
    ("startup_relationship", "U-SR1"), ("investor_relations", "U-IR1"),
    ("finance", "U-FIN1"), ("production", "U-PROD1"), ("legal", "U-LEGAL1"),
    ("marketing", "U-MKT1"), ("community", "U-COMM1"), ("analyst", "U-AN1"),
    ("super_admin", "U-MGMT"),
]

for name, uid in personas:
    session = get("/api/v1/session", uid)[1]
    role = session["data"]["actor"]["role"]
    allowed_modules = roles.get(role, [])
    star = "*" in allowed_modules
    leaks, denies, errs = [], [], []
    for key, module in entities:
        may = star or module in allowed_modules
        status, _ = get(f"/api/v1/{key}?limit=1", uid)
        if status == 200 and not may:
            leaks.append(key)
        elif status == 403 and may:
            denies.append(key)
        elif status not in (200, 403):
            errs.append(f"{key}:{status}")
    print(f"\n{name}  role={role}  modules={len(allowed_modules)}{' (all)' if star else ''}")
    print(f"  leaks={len(leaks)} {leaks[:12]}")
    print(f"  denies={len(denies)} {denies[:12]}")
    print(f"  errors={len(errs)} {errs[:12]}")
