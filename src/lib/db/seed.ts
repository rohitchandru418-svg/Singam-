import type { DatabaseSync } from "node:sqlite";
import { POLICY_DEFINITIONS, UPFRONT_FEE_SCHEDULE } from "../domain/policies";
import { DEFAULT_CALENDAR } from "../domain/workingDays";
import * as a from "./seed-data";
import * as b from "./seed-data-b";
import * as c from "./seed-data-c";
import * as d from "./seed-data-d";
import * as e from "./seed-data-e";
import * as f from "./seed-data-f";
import * as g from "./seed-data-g";

/**
 * Loads the seeded season.
 *
 * Rows are plain objects keyed by column name, so the insert helper derives the column
 * list and cannot mis-align a value. `created_at` / `updated_at` are filled in when a
 * table declares them and the row omits them.
 */

type Row = Record<string, unknown>;

const TABLES: [string, Row[]][] = [
  ["seasons", a.SEASONS],
  ["users", a.USERS],
  ["programs", a.PROGRAMS],
  ["startups", a.STARTUPS],
  ["founders", a.FOUNDERS],
  ["applications", a.APPLICATIONS],
  ["screenings", a.SCREENINGS],
  ["bootcamp_attendance", a.BOOTCAMP],
  ["analyst_evaluations", a.ANALYST_EVALUATIONS],
  // Earlier seasons: their own cohort, applications and early-stage records.
  ["startups", e.HISTORICAL_STARTUPS],
  ["founders", e.HISTORICAL_FOUNDERS],
  ["users", e.HISTORICAL_USERS],
  ["applications", e.HISTORICAL_APPLICATIONS],
  ["screenings", e.HISTORICAL_SCREENINGS],
  ["bootcamp_attendance", e.HISTORICAL_BOOTCAMP],
  ["analyst_evaluations", e.HISTORICAL_ANALYST],
  ["mous", a.MOUS],
  ["irr_reports", a.IRR_REPORTS],
  ["investors", b.INVESTORS],
  ["investor_agreements", b.INVESTOR_AGREEMENTS],
  ["investor_grade_assessments", b.INVESTOR_GRADES],
  ["matches", b.MATCHES],
  ["meetings", b.MEETINGS],
  ["virtual_pitches", b.VIRTUAL_PITCHES],
  ["pitch_days", b.PITCH_DAYS],
  ["pitch_day_slots", b.PITCH_DAY_SLOTS],
  ["committee_decisions", b.COMMITTEE_DECISIONS],
  ["pre_shoot_confirmations", b.PRE_SHOOT_CONFIRMATIONS],
  ["commitments", b.COMMITMENTS],
  ["funding_rounds", b.FUNDING_ROUNDS],
  ["deals", b.DEALS],
  ["deal_documents", b.DEAL_DOCUMENTS],
  ["tranches", b.TRANCHES],
  ["upfront_fees", b.UPFRONT_FEES],
  ["success_fees", b.SUCCESS_FEES],
  ["ledger_entries", b.LEDGER],
  ["production_handovers", c.PRODUCTION_HANDOVERS],
  ["av_shoots", c.AV_SHOOTS],
  ["mock_shoots", c.MOCK_SHOOTS],
  ["main_shoots", c.MAIN_SHOOTS],
  ["episodes", c.EPISODES],
  ["telecasts", c.TELECASTS],
  ["community_members", c.COMMUNITY_MEMBERS],
  ["community_member_roles", c.COMMUNITY_MEMBER_ROLES],
  ["community_events", c.COMMUNITY_EVENTS],
  ["event_registrations", c.EVENT_REGISTRATIONS],
  ["referrals", c.REFERRALS],
  ["support_requests", c.SUPPORT_REQUESTS],
  ["tasks", d.TASKS],
  ["handovers", d.HANDOVERS],
  ["documents", d.DOCUMENTS],
  ["audit_events", d.AUDIT_EVENTS],
  ["integrations", d.INTEGRATIONS],
  ["sync_runs", d.SYNC_RUNS],
  ["import_batches", d.IMPORT_BATCHES],
  ["notifications", d.NOTIFICATIONS],
  // Earlier-season finance and community rows last: they reference investors, funding
  // rounds and deals, so they must load after those tables.
  ["committee_decisions", e.HISTORICAL_COMMITTEE],
  ["upfront_fees", e.HISTORICAL_UPFRONT],
  ["funding_rounds", e.HISTORICAL_FUNDING_ROUNDS],
  ["commitments", e.HISTORICAL_COMMITMENTS],
  ["deals", e.HISTORICAL_DEALS],
  ["tranches", e.HISTORICAL_TRANCHES],
  ["success_fees", e.HISTORICAL_SUCCESS_FEES],
  ["referrals", e.HISTORICAL_REFERRALS],
  // Founder-portal rows: the checklist, threads, Pitch Day dates and payment proofs. These
  // reference startups and applications, so they load last.
  ["document_requests", f.DOCUMENT_REQUESTS],
  ["founder_messages", f.FOUNDER_MESSAGES],
  ["pitch_day_options", f.PITCH_DAY_OPTIONS],
  ["payment_proofs", f.PAYMENT_PROOFS],
  // The walkthrough cohort: a single founder at stage 0, loaded last so nothing else depends
  // on it. S-21 / F-13 / U-F-S21 are reserved for it.
  ["startups", g.WALKTHROUGH_STARTUPS],
  ["founders", g.WALKTHROUGH_FOUNDERS],
  ["users", g.WALKTHROUGH_USERS],
  ["applications", g.WALKTHROUGH_APPLICATIONS],
];

export function seedDatabase(db: DatabaseSync): void {
  db.exec("BEGIN");
  try {
    seedReference(db);
    for (const [table, rows] of TABLES) insertRows(db, table, rows);
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

function columnsOf(db: DatabaseSync, table: string): Set<string> {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return new Set(rows.map((r) => r.name));
}

function insertRows(db: DatabaseSync, table: string, rows: Row[]): void {
  if (!rows || rows.length === 0) return;
  const columns = columnsOf(db, table);
  const stamp = a.NOW;
  for (const row of rows) {
    const filled: Row = { ...row };
    if (columns.has("created_at") && filled.created_at === undefined) filled.created_at = stamp;
    if (columns.has("updated_at") && filled.updated_at === undefined) filled.updated_at = stamp;
    const keys = Object.keys(filled);
    for (const key of keys) {
      if (!columns.has(key)) throw new Error(`seed: table ${table} has no column ${key}`);
    }
    const placeholders = keys.map(() => "?").join(", ");
    db.prepare(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`).run(
      ...keys.map((k) => normalise(filled[k])),
    );
  }
}

function normalise(value: unknown): string | number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string") return value;
  return JSON.stringify(value);
}

function seedReference(db: DatabaseSync): void {
  db.prepare(
    "INSERT INTO calendars (id, name, region, holidays, working_days) VALUES (?,?,?,?,?)",
  ).run(
    "CAL-IN",
    "India - standard working week",
    "IN",
    JSON.stringify(DEFAULT_CALENDAR.holidays),
    DEFAULT_CALENDAR.workingDays.join(","),
  );

  const stamp = a.NOW;
  const effective = a.d(-120);
  const approved = a.d(-119);

  for (const def of POLICY_DEFINITIONS) {
    // `code` already carries the POL- prefix, so the row id is the code itself.
    const id = def.code;
    db.prepare(
      `INSERT INTO policies (id, code, title, category, value, status, effective_from,
        approved_by_id, approved_on, superseded_by_id, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      id,
      def.code,
      def.title,
      def.category,
      JSON.stringify(def.defaultValue),
      "approved",
      effective,
      "U-MGMT",
      approved,
      null,
      def.question,
      stamp,
    );
    db.prepare(
      `INSERT INTO policy_revisions (id, policy_id, version, value, changed_by_id, changed_on, reason)
       VALUES (?,?,?,?,?,?,?)`,
    ).run(
      `PR-${def.code}-1`,
      id,
      1,
      JSON.stringify(def.defaultValue),
      "U-MGMT",
      effective,
      "Initial approval for Season 2026.",
    );
  }

  for (const [code, schedule] of Object.entries(UPFRONT_FEE_SCHEDULE)) {
    schedule.slabs.forEach((slab, index) => {
      db.prepare(
        `INSERT INTO fee_slabs (id, schedule_code, schedule_version, turnover_min, turnover_max,
          fee_amount, effective_from) VALUES (?,?,?,?,?,?,?)`,
      ).run(
        `FS-${code}-${index + 1}`,
        code,
        schedule.version,
        slab.turnoverMinPaise,
        slab.turnoverMaxPaise,
        slab.feePaise,
        schedule.effectiveFrom,
      );
    });
  }
}
