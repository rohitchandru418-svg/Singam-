/**
 * Record view model.
 *
 * Turns one raw record plus its field metadata into the pieces a detail screen needs:
 * a human title, a short summary of the facts that matter, and the fields grouped by what
 * they are (identity, workflow, money, dates, notes). Pure functions, no I/O, so the same
 * logic is easy to reason about and test.
 */

import type { FieldMeta } from "@/lib/client/api";
import type { IconName } from "@/components/icons";
import { BOOLEAN_COLUMNS, MONEY_COLUMNS } from "./fieldLabels";
import { humanise } from "./format";
import { compactINR } from "./money";
import { formatDate } from "./dates";
import { STATUS_REGISTRIES } from "./statuses";

export type SectionKey = "summary" | "identity" | "workflow" | "money" | "dates" | "notes" | "system";

export interface FieldEntry {
  name: string;
  label: string;
  value: unknown;
  kind: FieldMeta["kind"];
  relation?: { entity: string; label: string };
  options?: { value: string; label: string }[];
  system?: boolean;
  empty: boolean;
}

export interface FieldSection {
  key: SectionKey;
  label: string;
  hint?: string;
  fields: FieldEntry[];
}

export interface SummaryFact {
  label: string;
  value: string;
  tone?: "neutral" | "progress" | "success" | "warning" | "danger" | "info";
}

export interface DetailContext {
  entity: string;
  entityLabel: string;
  singular: string;
  icon: IconName;
  statusColumn?: string;
  statusRegistry?: string;
  fields: FieldMeta[];
}

const SECTION_ORDER: SectionKey[] = ["identity", "workflow", "money", "dates", "notes", "system"];

const SECTION_META: Record<SectionKey, { label: string; hint?: string }> = {
  summary: { label: "Summary" },
  identity: { label: "Profile", hint: "Who and what this record is" },
  workflow: { label: "Workflow", hint: "Where it stands and who owns the next step" },
  money: { label: "Money", hint: "Amounts, fees and balances" },
  dates: { label: "Dates and deadlines", hint: "When things happened or are due" },
  notes: { label: "Notes and evidence", hint: "Free text captured along the way" },
  system: { label: "Record details", hint: "Identifiers and timestamps the system keeps" },
};

/** Fields that read as workflow position rather than profile. */
const WORKFLOW_KEYS = new Set([
  "status",
  "outcome",
  "stage_at_application",
  "response",
  "recommendation",
  "decision",
  "grade",
  "reconciled_on",
  "extension_approved",
  "escalated_to_management",
  "selection_approved",
  "payment_cleared",
  "readiness_approved",
]);

export const ENTITY_ICON: Record<string, IconName> = {
  applications: "file-text",
  startups: "sprout",
  founders: "users",
  screenings: "check-square",
  bootcamp_attendance: "graduation-cap",
  analyst_evaluations: "search",
  mous: "scales",
  irr_reports: "file-check",
  investors: "briefcase",
  investor_agreements: "scales",
  investor_grade_assessments: "bar-chart",
  matches: "link",
  virtual_pitches: "mic",
  pitch_days: "ticket",
  pitch_day_slots: "calendar",
  committee_decisions: "check-square",
  commitments: "check",
  pre_shoot_confirmations: "clipboard",
  funding_rounds: "layers",
  deals: "briefcase",
  deal_documents: "file-text",
  tranches: "bank",
  upfront_fees: "receipt",
  success_fees: "currency",
  production_handovers: "clapperboard",
  av_shoots: "film",
  mock_shoots: "clapperboard",
  main_shoots: "clapperboard",
  episodes: "tv",
  telecasts: "tv",
  community_members: "users",
  community_events: "calendar",
  support_requests: "lifebuoy",
  referrals: "link",
  documents: "folder",
  tasks: "check-square",
  audit_events: "clock",
  policies: "shield",
  integrations: "plug",
  handovers: "refresh",
  ledger_entries: "currency",
};

export function iconFor(entity: string): IconName {
  return ENTITY_ICON[entity] ?? "layers";
}

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" || t === "[]" || t === "{}" || t === "null";
  }
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

function isMoneyColumn(name: string): boolean {
  return MONEY_COLUMNS.has(name);
}

function isBooleanColumn(name: string): boolean {
  return BOOLEAN_COLUMNS.has(name);
}

/** Classify a single field into the section it belongs in. */
function sectionFor(field: FieldMeta): SectionKey {
  if (field.name === "id" || field.name === "created_at" || field.name === "updated_at") return "system";
  if (WORKFLOW_KEYS.has(field.name)) return "workflow";
  if (field.kind === "relation" || field.kind === "select") {
    return field.name.endsWith("_id") && !WORKFLOW_KEYS.has(field.name) ? "identity" : "workflow";
  }
  if (isMoneyColumn(field.name) || field.kind === "money") return "money";
  if (field.kind === "date") return "dates";
  if (field.kind === "textarea") return "notes";
  if (isBooleanColumn(field.name)) return "workflow";
  return "identity";
}

/** Build the ordered field sections for a record, splitting the value off its metadata. */
export function buildSections(
  fields: FieldMeta[],
  record: Record<string, unknown>,
): FieldSection[] {
  const bySection = new Map<SectionKey, FieldEntry[]>();

  for (const field of fields) {
    if (field.name.endsWith("_label")) continue;
    const value = record[field.name];
    const entry: FieldEntry = {
      name: field.name,
      // A relation reads better as "Startup" than "Startup ID".
      label: field.relation && field.label.endsWith(" ID") ? field.label.slice(0, -3) : field.label,
      value,
      kind: field.kind,
      relation: field.relation,
      options: field.options,
      system: field.system,
      empty: isBlank(value),
    };
    const section = sectionFor(field);
    if (!bySection.has(section)) bySection.set(section, []);
    bySection.get(section)!.push(entry);
  }

  return SECTION_ORDER.filter((key) => (bySection.get(key)?.length ?? 0) > 0).map((key) => ({
    key,
    label: SECTION_META[key].label,
    hint: SECTION_META[key].hint,
    fields: bySection.get(key) ?? [],
  }));
}

function relationLabel(field: FieldEntry, record: Record<string, unknown>): string | null {
  const resolved = record[`${field.name}_label`];
  if (resolved !== undefined && resolved !== null && String(resolved) !== "") return String(resolved);
  return null;
}

/** The facts worth showing at the top of a record, in priority order. */
export function buildSummary(context: DetailContext, record: Record<string, unknown>): SummaryFact[] {
  const facts: SummaryFact[] = [];
  const pick = (name: string) => context.fields.find((f) => f.name === name);

  if (context.statusColumn) {
    const status = String(record[context.statusColumn] ?? "");
    if (status) {
      const label = STATUS_REGISTRIES[context.statusRegistry ?? ""]?.[status]?.label ?? humanise(status);
      facts.push({ label: "Status", value: label, tone: statusTone(context, record) });
    }
  }

  const moneyNames = ["amount", "committed_amount", "fee_amount", "fee_due", "outstanding", "verified_amount", "target_amount", "turnover"];
  for (const name of moneyNames) {
    const field = pick(name);
    if (!field) continue;
    const value = Number(record[name] ?? 0);
    if (Number.isFinite(value) && value !== 0) {
      facts.push({ label: field.label, value: compactINR(value), tone: name === "outstanding" ? "warning" : "neutral" });
    }
  }

  const dateNames = ["due_date", "next_action_due", "signing_deadline", "shoot_date", "telecast_date", "scheduled_on"];
  for (const name of dateNames) {
    const field = pick(name);
    if (!field) continue;
    const value = record[name];
    if (value) facts.push({ label: field.label, value: formatDate(String(value).split("T")[0]) });
  }

  for (const name of ["investor_id", "startup_id", "application_id"]) {
    const field = context.fields.find((f) => f.name === name);
    if (!field) continue;
    const entry: FieldEntry = { ...field, value: record[name], empty: isBlank(record[name]) };
    const label = relationLabel(entry, record);
    if (label) facts.push({ label: field.label.replace(/ ID$/, ""), value: label });
  }

  return facts.slice(0, 6);
}

function statusTone(context: DetailContext, record: Record<string, unknown>): SummaryFact["tone"] {
  const value = String(record[context.statusColumn ?? ""] ?? "").toLowerCase();
  if (/reject|overdue|disput|withdraw|fail|breach/.test(value)) return "danger";
  if (/hold|pending|extension|not triggered|awaiting/.test(value)) return "warning";
  if (/paid|signed|completed|collected|verified|proceed|confirmed|cleared/.test(value)) return "success";
  return "info";
}

/** A short human title for the record, using its own name where it has one. */
export function entityTitle(record: Record<string, unknown>, fallbackEntity: string): string {
  const candidate = record.name ?? record.title ?? record.reference_no ?? record.invoice_no ?? record.code;
  if (candidate !== undefined && candidate !== null && String(candidate) !== "") return String(candidate);
  const related = Object.entries(record)
    .filter(([key, value]) => key.endsWith("_label") && value !== null && value !== undefined && value !== "")
    .map(([, value]) => String(value));
  if (related.length > 0) return related.slice(0, 2).join(" · ");
  return humanise(fallbackEntity.replace(/s$/, ""));
}

export { SECTION_META };
