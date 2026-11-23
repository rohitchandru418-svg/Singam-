import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { SCHEMA_SQL } from "./schema";
import { seedDatabase } from "./seed";
import { POLYMORPHIC, STARTUP_KEYED, VIA_APPLICATION, VIA_DEAL, VIA_MEMBER, VIA_PITCH_DAY } from "./startupTables";

/**
 * Persistence.
 *
 * The whole ERP runs against one SQLite file created from `schema.ts` and filled by
 * `seed.ts` on first boot. The repository layer (`src/lib/server/repo.ts`) is the only
 * code that talks to this module directly.
 */

let instance: DatabaseSync | null = null;

function databasePath(): string {
  return process.env.SINGAM_DB_PATH ?? path.join(process.cwd(), "data", "singam.db");
}

export function getDb(): DatabaseSync {
  if (instance) return instance;

  const file = databasePath();
  if (file !== ":memory:") {
    const dir = path.dirname(file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  const db = new DatabaseSync(file);
  db.exec(SCHEMA_SQL);
  ensureSchema(db);
  // Publish the handle before the cleanup below, which reads and writes through the module
  // helpers rather than the raw handle.
  instance = db;

  const row = db.prepare("SELECT COUNT(*) AS n FROM seasons").get() as { n: number } | undefined;
  if (!row || row.n === 0) {
    seedDatabase(db);
    ensureSchema(db);
  }
  cleanupThrowawayStartups();

  return db;
}

/**
 * In-place upgrades for a database created by an earlier build.
 *
 * `CREATE TABLE IF NOT EXISTS` adds new tables to an existing file but silently skips a
 * table that already exists, so a column added to an existing table needs its own ALTER.
 * Everything here is idempotent and runs on every boot, which keeps an existing data file
 * working without a reset.
 */
export function ensureSchema(db: DatabaseSync): void {
  const columns = (table: string): Set<string> => {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
    return new Set(rows.map((r) => r.name));
  };

  const addColumn = (table: string, column: string, ddl: string) => {
    if (!columns(table).has(column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  };

  // A sign-in identifier can be an email address or a mobile number.
  addColumn("users", "phone", "TEXT NOT NULL DEFAULT ''");
  addColumn("users", "last_login_at", "TEXT");
  // The founder portal shows the meeting link for a scheduled virtual pitch.
  addColumn("virtual_pitches", "meet_link", "TEXT NOT NULL DEFAULT ''");
  // A pitch the founder did not attend, and why it was moved.
  addColumn("virtual_pitches", "missed", "INTEGER NOT NULL DEFAULT 0");
  addColumn("virtual_pitches", "reschedule_reason", "TEXT NOT NULL DEFAULT ''");
  // The founder's own acknowledgement of a bootcamp invitation.
  addColumn("bootcamp_attendance", "acknowledgement", "TEXT NOT NULL DEFAULT ''");
  addColumn("bootcamp_attendance", "acknowledged_on", "TEXT");
  // The session schedule the team fixes after the founder accepts, and the meeting link.
  addColumn("bootcamp_attendance", "session_dates", "TEXT NOT NULL DEFAULT ''");
  addColumn("bootcamp_attendance", "meet_link", "TEXT NOT NULL DEFAULT ''");
  // Pitch Day slots are offered per matched investor; the founder picks one and the team
  // approves or asks for a change before the schedule is final.
  addColumn("pitch_day_options", "investor_id", "TEXT");
  addColumn("pitch_day_options", "slot_time", "TEXT NOT NULL DEFAULT ''");
  addColumn("pitch_day_options", "approval", "TEXT NOT NULL DEFAULT 'pending'");
  addColumn("pitch_day_options", "review_note", "TEXT NOT NULL DEFAULT ''");
  // Telecast promotion: the approved posts and the approved announcement wording the
  // founder may publish, kept separate from the internal remarks.
  addColumn("telecasts", "promo_posts", "TEXT NOT NULL DEFAULT ''");
  addColumn("telecasts", "announcement_wording", "TEXT NOT NULL DEFAULT ''");
  // The investor's own season ceiling per startup, shown beside the season meter
  // (00_Master_Brief §11.3; doc 02 §4 "max per startup").
  addColumn("investors", "max_per_startup", "INTEGER NOT NULL DEFAULT 0");
  // The investor's decided match percentage, carried on the pairing so the portal can show the
  // "match %" ring the brief asks for without exposing the internal score (doc 02 §5).
  addColumn("matches", "match_pct", "INTEGER NOT NULL DEFAULT 0");
  // Whether the investor has confirmed their per-startup ceiling (doc 02 §4).
  addColumn("investors", "season_commitment_confirmed", "INTEGER NOT NULL DEFAULT 0");
  // The typed shoot-day exception logged on set, one of the five in the brief §11.5.
  addColumn("main_shoots", "exception_type", "TEXT NOT NULL DEFAULT ''");
  addColumn("main_shoots", "exception_reason", "TEXT NOT NULL DEFAULT ''");
  // Approval outcome on records that are gated by the super-admin inbox: an investor grade,
  // a revised/withdrawn commitment, and a community event budget (doc 11 §2, §4).
  addColumn("investor_grade_assessments", "approval_status", "TEXT NOT NULL DEFAULT 'pending'");
  addColumn("commitments", "approval_status", "TEXT NOT NULL DEFAULT 'pending'");
  addColumn("community_events", "budget_approved", "INTEGER NOT NULL DEFAULT 0");
  // Each IRR view by an investor is logged: the brief requires views to be recorded while the
  // report stays view-only and cannot be downloaded (00_Master_Brief §9, doc 02 §5).
  db.exec(`CREATE TABLE IF NOT EXISTS irr_views (
    id TEXT PRIMARY KEY, irr_report_id TEXT NOT NULL REFERENCES irr_reports(id),
    startup_id TEXT NOT NULL DEFAULT '', investor_id TEXT NOT NULL DEFAULT '',
    match_id TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
    viewed_at TEXT NOT NULL
  )`);
  db.exec("CREATE INDEX IF NOT EXISTS idx_irr_views_report ON irr_views(irr_report_id)");
  // An external investor-side login is pinned to one investor record, the way a founder
  // login is pinned to one startup.
  addColumn("users", "investor_id", "TEXT");
  // Startup-keyed tables carry the season so a founder who returns in a later season never
  // has an earlier season's decision, shoot or deal resurface in their view.
  for (const table of [
    "committee_decisions", "pre_shoot_confirmations", "commitments", "funding_rounds", "deals",
    "deal_documents", "tranches", "success_fees", "production_handovers", "av_shoots",
    "mock_shoots", "main_shoots", "episodes", "telecasts", "matches", "meetings",
    "payment_proofs", "document_requests", "founder_messages", "pitch_day_options",
    "virtual_pitches", "pitch_days", "ledger_entries",
  ]) {
    addColumn(table, "season_id", "TEXT NOT NULL DEFAULT ''");
  }
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_phone ON users(phone) WHERE phone <> ''");
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_nocase ON users(email COLLATE NOCASE)");

  // Every seeded login gets a number so the account can be signed into by phone as well as by
  // email. Only rows that have none are touched, so a number edited by hand is never lost.
  db.exec(
    `UPDATE users SET phone = '+91 90000 ' || substr('00000' || rowid, -5)
      WHERE (phone IS NULL OR phone = '') AND kind = 'staff'`,
  );
  db.exec(
    `UPDATE users SET phone = '+91 91000 ' || substr('00000' || rowid, -5)
      WHERE (phone IS NULL OR phone = '') AND kind = 'founder'`,
  );
  db.exec(
    `UPDATE users SET phone = '+91 92000 ' || substr('00000' || rowid, -5)
      WHERE (phone IS NULL OR phone = '') AND kind = 'investor'`,
  );

  // Backfill the season on startup-keyed rows written before the column existed, and on rows
  // the seed loads without one. The season is taken from the startup's most recent
  // application, so a historical startup's rows land in its own closed season.
  const latestSeasonForStartup =
    "(SELECT a.season_id FROM applications a WHERE a.startup_id = t.startup_id ORDER BY a.submitted_at DESC LIMIT 1)";
  for (const table of [
    "committee_decisions", "pre_shoot_confirmations", "commitments", "funding_rounds", "deals",
    "success_fees", "production_handovers", "av_shoots", "mock_shoots", "main_shoots",
    "episodes", "telecasts", "matches", "meetings", "payment_proofs", "document_requests",
    "founder_messages", "pitch_day_options", "virtual_pitches", "pitch_days", "ledger_entries",
  ]) {
    db.exec(`UPDATE ${table} AS t SET season_id = ${latestSeasonForStartup} WHERE season_id = ''`);
  }
  db.exec(
    `UPDATE document_requests AS t SET season_id =
       (SELECT a.season_id FROM applications a WHERE a.id = t.application_id)
     WHERE season_id = '' AND application_id IS NOT NULL`,
  );
  db.exec(
    `UPDATE founder_messages AS t SET season_id =
       (SELECT a.season_id FROM applications a WHERE a.id = t.application_id)
     WHERE season_id = '' AND application_id IS NOT NULL`,
  );
  // Deal documents and tranches reach the season through their deal's startup.
  db.exec(
    `UPDATE deal_documents AS t SET season_id =
       (SELECT ${latestSeasonForStartup.replace("t.startup_id", "d.startup_id")} FROM deals d WHERE d.id = t.deal_id)
     WHERE season_id = ''`,
  );
  db.exec(
    `UPDATE tranches AS t SET season_id =
       (SELECT ${latestSeasonForStartup.replace("t.startup_id", "d.startup_id")} FROM deals d WHERE d.id = t.deal_id)
     WHERE season_id = ''`,
  );
}

/**
 * Delete one startup's rows across every table that carries its data, then the startup row
 * itself. Foreign-key enforcement is lifted for the duration because the rows are removed as
 * a complete set — every child is cleared, so no reference is left dangling — and the
 * dependency order across ~40 tables is easier to guarantee this way than by hand.
 */
export function wipeStartupRows(startupId: string): number {
  let deleted = 0;

  const del = (sql: string, ...params: unknown[]): void => {
    try {
      const res = run(sql, ...params);
      deleted += Number(res.changes ?? 0);
    } catch (e) {
      console.error("wipeStartupRows failed on:", sql, e);
      throw e;
    }
  };

  const hasColumn = (table: string, column: string): boolean =>
    all<{ name: string }>(`PRAGMA table_info(${table})`).some((c) => c.name === column);

  run("PRAGMA foreign_keys = OFF");
  try {
    // Detach the founder logins first: `users.startup_id` references the startup row we are
    // about to remove, and the login itself survives a reset.
    del("UPDATE users SET startup_id = NULL WHERE startup_id = ?", startupId);

    // Indirect tables first: their rows reference the rows deleted below.
    for (const table of VIA_DEAL) {
      del(`DELETE FROM ${table} WHERE deal_id IN (SELECT id FROM deals WHERE startup_id = ?)`, startupId);
    }
    for (const table of VIA_PITCH_DAY) {
      del(`DELETE FROM ${table} WHERE pitch_day_id IN (SELECT id FROM pitch_days WHERE startup_id = ?)`, startupId);
    }
    for (const table of VIA_MEMBER) {
      del(`DELETE FROM ${table} WHERE member_id IN (SELECT id FROM community_members WHERE startup_id = ?)`, startupId);
    }
    for (const table of VIA_APPLICATION) {
      del(`DELETE FROM ${table} WHERE application_id IN (SELECT id FROM applications WHERE startup_id = ?)`, startupId);
    }

    // Documents, tasks, handovers and audit rows are polymorphic: keyed by entity_type/entity_id.
    for (const table of POLYMORPHIC) {
      del(`DELETE FROM ${table} WHERE entity_type = 'startup' AND entity_id = ?`, startupId);
    }
    // The audit trail for the startup's own rows lives under each entity key too.
    del("DELETE FROM audit_events WHERE entity_id IN (SELECT id FROM applications WHERE startup_id = ?)", startupId);

    // Direct tables, children before the startup row. Only tables that really carry a
    // `startup_id` are touched, so a schema change can never break the whole reset.
    for (const table of STARTUP_KEYED) {
      if (!hasColumn(table, "startup_id")) continue;
      del(`DELETE FROM ${table} WHERE startup_id = ?`, startupId);
    }

    del("DELETE FROM startups WHERE id = ?", startupId);
  } finally {
    run("PRAGMA foreign_keys = ON");
  }

  return deleted;
}

/**
 * Remove the throwaway startups earlier automated runs left behind, and retire their logins.
 *
 * The e2e harness signs a founder up, registers a startup and runs the whole journey, leaving
 * rows behind each time. Those accounts are named `signup.*`, `lifecycle.*`, `fresh.founder`
 * or `New founder`; a startup is residue when every founder login attached to it is one of
 * those, or when it has no founder login and no application at all. Seeded startups are
 * `S-01`, `S-02`, … and a startup a person registered has a real founder login, so neither is
 * ever touched.
 */
function cleanupThrowawayStartups(): void {
  try {
    cleanupThrowawayStartupsInner();
  } catch (e) {
    // Never let cleanup stop the server from booting; the seeded data is still usable.
    console.error("Throwaway-startup cleanup skipped:", e);
  }
}

function cleanupThrowawayStartupsInner(): void {
  const junkLogin = /^(signup|lifecycle)\./;
  const junkNames = new Set(["fresh.founder", "New founder"]);
  const isJunkName = (name: string): boolean => junkLogin.test(name) || junkNames.has(name);

  // A startup a real founder registered has a login that is not one of those names, so it is
  // never matched. A startup whose founders are all automated-run residue, or that has no
  // login and no application at all, is left over from a test run and is cleared away.
  const candidates = all<{ id: string }>(
    `SELECT s.id FROM startups s
      WHERE s.id NOT GLOB 'S-[0-9]*'
        AND NOT EXISTS (SELECT 1 FROM applications a WHERE a.startup_id = s.id)`,
  );

  for (const { id } of candidates) {
    const logins = all<{ id: string; name: string }>("SELECT id, name FROM users WHERE startup_id = ?", id);
    // A startup with no login at all is residue: every real registration pins the founder's
    // login to the startup it just created.
    if (logins.length === 0) {
      wipeStartupRows(id);
      continue;
    }
    if (!logins.every((l) => isJunkName(String(l.name)))) continue;

    const loginIds = logins.map((l) => String(l.id));
    wipeStartupRows(id);
    // The logins are retired rather than deleted — notification and audit rows point at them —
    // and the wipe has already detached them from the startup.
    for (const loginId of loginIds) run("UPDATE users SET active = 0 WHERE id = ?", loginId);
  }
}

export type SqlValue = string | number | bigint | null | Uint8Array;

/** SQLite rejects `undefined`; normalise it to NULL and booleans to 0/1. */
export function normaliseParams(params: unknown[]): SqlValue[] {
  return params.map((p) => {
    if (p === undefined || p === null) return null;
    if (typeof p === "boolean") return p ? 1 : 0;
    if (typeof p === "number" || typeof p === "string" || typeof p === "bigint") return p;
    if (p instanceof Uint8Array) return p;
    return JSON.stringify(p);
  });
}

export function all<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T[] {
  return getDb().prepare(sql).all(...normaliseParams(params)) as T[];
}

export function get<T = Record<string, unknown>>(sql: string, ...params: unknown[]): T | undefined {
  return getDb().prepare(sql).get(...normaliseParams(params)) as T | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return getDb().prepare(sql).run(...normaliseParams(params));
}

export function exec(sql: string): void {
  getDb().exec(sql);
}

export function newId(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, "0")}`;
}
