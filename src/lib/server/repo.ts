import { all, get, run } from "../db/client";
import { nowISO, today } from "../domain/dates";
import { DEFAULT_CALENDAR, addWorkingDays, type CalendarLike } from "../domain/workingDays";
import { ENTITY_MAP, entityOrThrow, type EntityDefinition } from "./registry";
import { seasonScopeSql } from "./season";
import { HttpError } from "./session";

/**
 * Generic repository.
 *
 * Every entity is read and written through this module. It applies the module's search
 * columns, resolves foreign keys for display, writes an audit row for every field change
 * and never allows a column that is not declared in the schema.
 */

export type Row = Record<string, unknown>;

export interface Actor {
  id: string;
  name: string;
  role: string;
  department: string;
  /** 'staff' (internal console), 'founder' (startup side) or 'investor' (investor side). */
  kind?: string;
  /** For a founder, the one startup they may see. */
  startupId?: string | null;
  /** For an investor-side login, the one investor record they may see. */
  investorId?: string | null;
  /** The season the acting user is working in; new rows are stamped with it. */
  seasonId?: string | null;
}

export interface ListOptions {
  search?: string;
  filters?: Record<string, string | undefined>;
  limit?: number;
  offset?: number;
  sort?: string;
  direction?: "asc" | "desc";
  /** Restrict the result to one season; tables with no season link ignore it. */
  seasonId?: string;
}

export interface ListResult {
  items: Row[];
  total: number;
  limit: number;
  offset: number;
}

const ID_PREFIX: Record<string, string> = {
  seasons: "SEA", users: "U", programs: "PG", startups: "ST", founders: "F", applications: "APP",
  screenings: "SCR", bootcamp_attendance: "BC", analyst_evaluations: "AE", mous: "MOU",
  irr_reports: "IRR", investors: "INV", investor_agreements: "IA",
  investor_grade_assessments: "IG", matches: "MAT", meetings: "MT", virtual_pitches: "VP",
  pitch_days: "PD", pitch_day_slots: "PS", committee_decisions: "CD",
  pre_shoot_confirmations: "PSC", commitments: "COM", funding_rounds: "FR", deals: "D",
  deal_documents: "DD", tranches: "TR", upfront_fees: "UF", success_fees: "SF",
  ledger_entries: "LED", production_handovers: "PH", av_shoots: "AV", mock_shoots: "MS",
  main_shoots: "MSH", episodes: "EP", telecasts: "TC", community_members: "CM",
  community_member_roles: "CMR", community_events: "EV", event_registrations: "ER",
  referrals: "REF", support_requests: "SR", tasks: "TK", handovers: "H", documents: "DOC",
  audit_events: "AU", policies: "POL", policy_revisions: "PR", fee_slabs: "FS",
  calendars: "CAL", integrations: "INT", sync_runs: "SY", import_batches: "IB",
  notifications: "NT",
  approval_requests: "APR", legal_templates: "TPL", dd_findings: "DDF",
  pre_funding_conditions: "PFC", shoot_exceptions: "SEX", announcements: "ANN", signing_events: "SGE",
  tds_entries: "TDS", credit_notes: "CN", reassignments: "REA", member_merges: "MM",
};

export function columnsOf(table: string): Set<string> {
  const rows = all<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(rows.map((r) => r.name));
}

/** The working-day calendar in force, used by every deadline this module computes. */
function calendarFromDb(): CalendarLike {
  const row = get<{ holidays: string; working_days: string }>("SELECT * FROM calendars LIMIT 1");
  if (!row) return DEFAULT_CALENDAR;
  try {
    return {
      holidays: JSON.parse(row.holidays) as string[],
      workingDays: row.working_days.split(",").map(Number),
    };
  } catch {
    return DEFAULT_CALENDAR;
  }
}

export function nextId(entity: EntityDefinition): string {
  const prefix = ID_PREFIX[entity.key] ?? entity.key.slice(0, 3).toUpperCase();
  // Seed rows use zero-padded two-digit ids, so ordering by id lexicographically would pick
  // the wrong "latest". Scan every id with the prefix and take the numeric maximum.
  const rows = all<{ id: string }>(`SELECT id FROM ${entity.table} WHERE id LIKE ?`, `${prefix}-%`);
  let max = 0;
  for (const r of rows) {
    const match = /-(\d+)$/.exec(r.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

function primaryKeyColumn(): string {
  return "id";
}

export function list(entityKey: string, options: ListOptions = {}): ListResult {
  const entity = entityOrThrow(entityKey);
  const columns = columnsOf(entity.table);
  const where: string[] = [];
  const params: unknown[] = [];

  const scope = options.seasonId ? seasonScopeSql(entity.table, options.seasonId) : null;
  if (scope) {
    where.push(scope.sql);
    params.push(...scope.params);
  }

  if (options.search && options.search.trim() && entity.searchable.length) {
    const terms = entity.searchable.filter((c) => columns.has(c));
    if (terms.length) {
      where.push(`(${terms.map((c) => `lower(${c}) LIKE ?`).join(" OR ")})`);
      for (let i = 0; i < terms.length; i += 1) params.push(`%${options.search.trim().toLowerCase()}%`);
    }
  }

  for (const [column, value] of Object.entries(options.filters ?? {})) {
    if (value === undefined || value === "" || !columns.has(column)) continue;
    if (value === "__null__") {
      where.push(`${column} IS NULL`);
      continue;
    }
    where.push(`${column} = ?`);
    params.push(value);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = get<{ n: number }>(`SELECT COUNT(*) AS n FROM ${entity.table} ${whereSql}`, ...params)?.n ?? 0;

  const sortColumn =
    options.sort && columns.has(options.sort) ? options.sort : entity.orderBy;
  const direction = options.direction === "asc" ? "ASC" : options.direction === "desc" ? "DESC" : "";
  const orderSql = columns.has(sortColumn)
    ? `ORDER BY ${sortColumn} ${direction || "DESC"}`
    : "";
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
  const offset = Math.max(options.offset ?? 0, 0);

  const items = all<Row>(
    `SELECT * FROM ${entity.table} ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    ...params,
    limit,
    offset,
  );

  return { items, total, limit, offset };
}

export function getOne(entityKey: string, id: string): Row | undefined {
  const entity = entityOrThrow(entityKey);
  return get<Row>(`SELECT * FROM ${entity.table} WHERE ${primaryKeyColumn()} = ?`, id);
}

export function listByIds(entityKey: string, ids: string[]): Row[] {
  const entity = entityOrThrow(entityKey);
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => "?").join(", ");
  return all<Row>(`SELECT * FROM ${entity.table} WHERE id IN (${placeholders})`, ...ids);
}

/** The column that best names a record of this entity, used for relation display labels. */
export function labelColumn(entityKey: string): string | null {
  const entity = ENTITY_MAP[entityKey];
  if (!entity) return null;
  const columns = columnsOf(entity.table);
  for (const candidate of ["name", "title", "reference_no", "code", "label", "document_ref"]) {
    if (columns.has(candidate)) return candidate;
  }
  if (columns.has("seq")) return "seq";
  return null;
}

/**
 * Labels for a related entity: `<id> -> label`. A record with no human column of its own is
 * named after its startup (for example "AgriNova - D-01"), so a bare system id never appears
 * where a person could read a name instead.
 */
function relationLabels(entityKey: string, ids: string[]): Map<string, string> {
  const entity = ENTITY_MAP[entityKey];
  if (!entity || ids.length === 0) return new Map();
  const column = labelColumn(entityKey);
  const rows = listByIds(entityKey, ids);
  if (column) {
    const prefix = entity.label ?? "Record";
    return new Map(
      rows.map((r) => [String(r.id), column === "seq" ? `${prefix} ${String(r.seq ?? r.id)}` : String(r[column] ?? r.id)]),
    );
  }
  const startupRelation = entity.relations?.find((rel) => rel.entity === "startups");
  if (!startupRelation) return new Map();
  const startupIds = [...new Set(rows.map((r) => r[startupRelation.column]).filter((v): v is string => typeof v === "string" && v !== ""))];
  const names = relationLabels("startups", startupIds);
  return new Map(
    rows.map((r) => {
      const name = names.get(String(r[startupRelation.column]));
      return [String(r.id), name ? `${name} - ${String(r.id)}` : String(r.id)];
    }),
  );
}

/**
 * Attach a human label to each declared foreign key so list screens show "AgriNova" and
 * "Arjun Patel" instead of "S-01" and "U-SR1". The label lands on `<column>_label` and is
 * resolved in one query per related entity, so a page of rows costs a handful of lookups
 * rather than one per cell. A relation with no better column falls back to the raw id.
 */
export function withRelationLabels(entityKey: string, rows: Row[]): Row[] {
  const entity = ENTITY_MAP[entityKey];
  if (!entity?.relations?.length || rows.length === 0) return rows;

  for (const relation of entity.relations) {
    const ids = [...new Set(rows.map((r) => r[relation.column]).filter((v): v is string => typeof v === "string" && v !== ""))];
    if (ids.length === 0) continue;
    const labels = relationLabels(relation.entity, ids);
    if (labels.size === 0) continue;
    for (const row of rows) {
      const id = row[relation.column];
      if (typeof id === "string" && id !== "") row[`${relation.column}_label`] = labels.get(id) ?? id;
    }
  }
  return rows;
}

export function listWhere(entityKey: string, column: string, value: unknown, orderBy?: string): Row[] {
  const entity = entityOrThrow(entityKey);
  const columns = columnsOf(entity.table);
  if (!columns.has(column)) return [];
  const order = orderBy && columns.has(orderBy) ? `ORDER BY ${orderBy}` : "";
  return all<Row>(`SELECT * FROM ${entity.table} WHERE ${column} = ? ${order}`, value);
}

export function countWhere(entityKey: string, column: string, value: unknown): number {
  const entity = entityOrThrow(entityKey);
  const columns = columnsOf(entity.table);
  if (!columns.has(column)) return 0;
  return get<{ n: number }>(
    `SELECT COUNT(*) AS n FROM ${entity.table} WHERE ${column} = ?`,
    value,
  )?.n ?? 0;
}

function sanitise(
  entity: EntityDefinition,
  data: Row,
  actor: Actor,
  mode: "create" | "update",
  before?: Row,
): Row {
  const columns = columnsOf(entity.table);
  const out: Row = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === "id") continue;
    if (!columns.has(key)) continue;
    if (
      mode === "update" &&
      entity.managementOnly?.includes(key) &&
      actor.role !== "management" &&
      actor.role !== "admin" &&
      // A recalculation that lands on the same value is not a management decision; only an
      // actual change to a reserved field needs Management or Administrator.
      String(before?.[key] ?? "") !== String(value ?? "")
    ) {
      throw new HttpError(403, `field ${key} requires Management or Administrator approval`);
    }
    if (value === "") {
      out[key] = "";
      continue;
    }
    if (value === undefined || value === null) {
      out[key] = null;
      continue;
    }
    if (typeof value === "boolean") {
      out[key] = value ? 1 : 0;
      continue;
    }
    if (typeof value === "object") {
      out[key] = JSON.stringify(value);
      continue;
    }
    out[key] = value as string | number;
  }
  return out;
}

export function create(entityKey: string, data: Row, actor: Actor): Row {
  const entity = entityOrThrow(entityKey);
  const columns = columnsOf(entity.table);
  const clean = sanitise(entity, data, actor, "create");
  if (!clean.id) clean.id = (data.id as string) || nextId(entity);
  // A table that carries a season is stamped with the season the user is working in, so a
  // founder re-applying in Season 3 never has a Season 1 record resurface in their view.
  if (columns.has("season_id") && !clean.season_id && actor.seasonId) clean.season_id = actor.seasonId;
  if (columns.has("created_at") && !clean.created_at) clean.created_at = nowISO();
  if (columns.has("updated_at")) clean.updated_at = nowISO();

  const keys = Object.keys(clean);
  const placeholders = keys.map(() => "?").join(", ");
  run(
    `INSERT INTO ${entity.table} (${keys.join(", ")}) VALUES (${placeholders})`,
    ...keys.map((k) => clean[k] as never),
  );

  audit(actor, entity.key, String(clean.id), "create", "", "", JSON.stringify(clean), "Record created");
  return getOne(entityKey, String(clean.id)) ?? clean;
}

export function update(entityKey: string, id: string, patch: Row, actor: Actor, reason = ""): Row {
  const entity = entityOrThrow(entityKey);
  const before = getOne(entityKey, id);
  if (!before) throw new Error(`${entity.label} ${id} not found`);
  const columns = columnsOf(entity.table);
  const clean = sanitise(entity, patch, actor, "update", before);
  if (columns.has("updated_at")) clean.updated_at = nowISO();
  const keys = Object.keys(clean).filter((k) => k !== "updated_at");
  if (keys.length === 0 && !columns.has("updated_at")) return before;

  const sets = [...keys.map((k) => `${k} = ?`)];
  if (columns.has("updated_at")) sets.push("updated_at = ?");
  const params: unknown[] = keys.map((k) => clean[k] as never);
  if (columns.has("updated_at")) params.push(clean.updated_at as never);

  run(`UPDATE ${entity.table} SET ${sets.join(", ")} WHERE id = ?`, ...params, id);

  for (const key of keys) {
    const beforeValue = before[key];
    const afterValue = clean[key];
    if (String(beforeValue ?? "") !== String(afterValue ?? "")) {
      audit(actor, entity.key, id, "update", key, String(beforeValue ?? ""), String(afterValue ?? ""), reason);
    }
  }
  return getOne(entityKey, id) ?? before;
}

export function remove(entityKey: string, id: string, actor: Actor): boolean {
  const entity = entityOrThrow(entityKey);
  const before = getOne(entityKey, id);
  if (!before) return false;
  run(`DELETE FROM ${entity.table} WHERE id = ?`, id);
  audit(actor, entity.key, id, "delete", "", JSON.stringify(before), "", "Record deleted");
  return true;
}

export function audit(
  actor: Actor,
  entityType: string,
  entityId: string,
  action: string,
  field: string,
  beforeValue: string,
  afterValue: string,
  reason: string,
): void {
  run(
    `INSERT INTO audit_events (id, actor_id, actor_name, action, entity_type, entity_id, field,
      before_value, after_value, reason, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    nextId(entityOrThrow("audit_events")),
    actor.id,
    actor.name,
    action,
    entityType,
    entityId,
    field,
    beforeValue,
    afterValue,
    reason,
    nowISO(),
  );
}

export function notify(
  recipientRole: string,
  title: string,
  body: string,
  entityType: string,
  entityId: string,
  recipientId?: string,
): void {
  run(
    `INSERT INTO notifications (id, recipient_id, recipient_role, title, body, entity_type,
      entity_id, created_at) VALUES (?,?,?,?,?,?,?,?)`,
    nextId(entityOrThrow("notifications")),
    recipientId ?? null,
    recipientRole,
    title,
    body,
    entityType,
    entityId,
    nowISO(),
  );
}

/**
 * Tell the founder something about their own startup.
 *
 * Internal decisions — a screening outcome, a committee decision, a shoot date — reach the
 * founder through the same notice tray the rest of the portal uses. The recipient is the
 * founder login pinned to the startup, so the message is scoped to one startup and never
 * broadcasts a decision to the wrong founder.
 */
export function notifyFounder(startupId: string, title: string, body: string, entityType: string, entityId: string): void {
  const founder = get<{ id: string }>(
    "SELECT id FROM users WHERE startup_id = ? AND kind = 'founder' AND active = 1 ORDER BY id LIMIT 1",
    startupId,
  );
  if (!founder) return;
  notify("external", title, body, entityType, entityId, founder.id);
}

/**
 * Raise an approval into the one inbox (doc 11 §1.1).
 *
 * Every approval carries a two-working-day SLA computed on the shared working-day calendar and
 * is written against the individual who raised it, so the decision can name who decided and why.
 */
export function raiseApproval(
  a: Actor,
  input: {
    approvalType: string;
    title: string;
    recordEntity: string;
    recordId: string;
    startupId?: string | null;
    investorId?: string | null;
    impact?: string;
    amount?: number;
    lowRisk?: boolean;
  },
): Row {
  const raised = today();
  const due = addWorkingDays(raised, 2, calendarFromDb());
  const record = create(
    "approval_requests",
    {
      approval_type: input.approvalType,
      raised_by_id: a.id,
      startup_id: input.startupId ?? null,
      investor_id: input.investorId ?? null,
      record_entity: input.recordEntity,
      record_id: input.recordId,
      title: input.title,
      impact: input.impact ?? "",
      amount: input.amount ?? 0,
      status: "pending",
      low_risk: input.lowRisk ? 1 : 0,
      raised_on: raised,
      due_on: due,
    },
    a,
  );
  notify(
    "management",
    `Approval needed: ${input.title}`,
    "Two working days per approval; overdue approvals appear on the dashboard.",
    "approval_request",
    String(record.id),
  );
  return record;
}
