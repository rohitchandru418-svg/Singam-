/**
 * Verification harness: drive every simulated action over HTTP the way Play-through does, with
 * the same pre-fill rules ActionForm uses, and report any non-2xx. Run against a seeded dev
 * server: `npm run dev` in one shell, then `npx tsx scripts/verify-journeys.ts`.
 */
import { DatabaseSync } from "node:sqlite";
import { SIM_JOURNEYS, stepsFor } from "../src/lib/domain/simulation";
import { FORM_SPECS } from "../src/lib/client/forms";
import { relationEntityFor } from "../src/lib/client/relations";
import { STATUS_REGISTRIES } from "../src/lib/domain/statuses";
import { PERSONA_BY_KEY } from "../src/lib/domain/personas";

const BASE = process.env.BASE ?? "http://localhost:12000";

/**
 * The seeded database is created lazily by the first request the dev server serves, so the
 * harness warms the server before it reads any ids. Without this, a run against a freshly
 * reset database sees an empty file and sends blank foreign keys.
 */
async function warmUp(): Promise<void> {
  try {
    await fetch(`${BASE}/api/v1/session`, { headers: { "x-actor": "U-MGMT" } });
  } catch {
    /* the per-action calls report a genuinely unreachable server */
  }
}

let _db: DatabaseSync | null = null;
function db(): DatabaseSync {
  if (!_db) _db = new DatabaseSync("data/singam.db");
  return _db;
}

function firstId(entity: string): string {
  for (const table of [entity, entity.replace(/s$/, "")]) {
    try {
      const row = db().prepare(`SELECT id FROM ${table} LIMIT 1`).get() as { id?: string } | undefined;
      if (row?.id) return String(row.id);
    } catch {
      /* table name does not match the entity key; try the next */
    }
  }
  return "";
}

const today = new Date().toISOString().slice(0, 10);

function pickFeeWithOutstanding(): { id: string; outstanding: number } | null {
  const row = db().prepare("SELECT id, outstanding FROM success_fees WHERE outstanding > 0 ORDER BY outstanding LIMIT 1").get() as { id?: string; outstanding?: number } | undefined;
  return row?.id ? { id: String(row.id), outstanding: Number(row.outstanding ?? 0) } : null;
}

function buildPayload(action: string, actorId: string): Record<string, unknown> {
  const spec = FORM_SPECS[action] ?? [];
  const payload: Record<string, unknown> = {};
  for (const field of spec) {
    const name = field.name;
    if (field.defaultValue !== undefined) payload[name] = field.defaultValue;
    else if (field.type === "user") payload[name] = actorId;
    else if (field.type === "select") {
      if (field.linkTypeFor) payload[name] = firstId(String(payload[field.linkTypeFor] ?? "startups"));
      else if (field.options?.length) payload[name] = field.options[0].value;
    } else if (field.type === "status") {
      const reg = field.statusRegistry ? STATUS_REGISTRIES[field.statusRegistry] : undefined;
      payload[name] = reg ? Object.values(reg)[0]?.value : "pending";
    } else if (field.type === "date") payload[name] = today;
    else if (field.required && relationEntityFor(name)) payload[name] = firstId(relationEntityFor(name)!);
    else if (field.type === "money") payload[name] = 1000000 * 100; // rupees -> paise, as ActionForm does
    else if (field.type === "scale") payload[name] = field.scaleMax ?? 10; // score the slider at full marks, as a reviewer passing a criterion would
    else if (field.type === "number") {
      const max = /\(max\s+(\d+)\)/i.exec(field.label) ?? /\(1-(\d+)\)/.exec(field.label);
      payload[name] = max ? Number(max[1]) : 1;
    } else if (field.type === "checkbox") payload[name] = true;
    else if (field.required) payload[name] = field.placeholder ?? "Demo value";
  }
  if (action === "successfee.collect") {
    const fee = pickFeeWithOutstanding();
    if (fee) {
      payload.success_fee_id = fee.id;
      payload.amount = Math.min(fee.outstanding, 1000 * 100);
    }
  }
  return payload;
}

async function run(action: string, actorId: string) {
  const body = { action, payload: buildPayload(action, actorId), actor: actorId };
  const doFetch = () =>
    fetch(`${BASE}/api/v1/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-actor": actorId },
      body: JSON.stringify(body),
    });

  // A 5xx whose body is not a JSON envelope is the dev server recompiling mid-request, not a
  // handler result — the handler was never reached, so retry once (as `client/api.ts` does).
  let res = await doFetch();
  let text = await res.text();
  if (res.status >= 500 && !text.trimStart().startsWith("{")) {
    await new Promise((r) => setTimeout(r, 700));
    res = await doFetch();
    text = await res.text();
  }
  const detail = res.ok ? "" : text.slice(0, 160).replace(/\s+/g, " ");
  return { status: res.status, detail };
}

async function main() {
await warmUp();
let failures = 0;
for (const journey of SIM_JOURNEYS) {
  console.log(`\n== ${journey.key} (${journey.label}) ==`);
  for (const step of stepsFor(journey.key)) {
    if (!step.action) {
      console.log(`  skip  ${step.id} (no action)`);
      continue;
    }
    const persona = PERSONA_BY_KEY[step.owner];
    const actorId = persona?.userId ?? "U-MGMT";
    const { status, detail } = await run(step.action, actorId);
    const ok = status >= 200 && status < 300;
    if (!ok) failures += 1;
    console.log(`  ${ok ? "ok  " : "FAIL"}  ${step.action.padEnd(28)} ${status}${detail ? "  " + detail : ""}`);
  }
}
console.log(`\n${failures === 0 ? "ALL JOURNEY ACTIONS OK" : failures + " FAILURES"}`);
process.exit(failures === 0 ? 0 : 1);
}

main();
