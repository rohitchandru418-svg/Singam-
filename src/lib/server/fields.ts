import { all } from "../db/client";
import { ENTITY_MAP, type EntityDefinition } from "./registry";
import { STATUS_REGISTRIES } from "../domain/statuses";
import { MODULE_ROUTE, ROLES, MODULES, type ModuleKey } from "../domain/rbac";
import { DEPARTMENTS } from "../domain/departments";
import { FIELD_LABELS, MONEY_COLUMNS, BOOLEAN_COLUMNS } from "../domain/fieldLabels";
import { humanise } from "../domain/format";

/**
 * Field metadata.
 *
 * Builds the field list a screen needs for an entity from the database schema, the entity
 * registry and the status registries. One source feeds the create and edit forms, so a new
 * column shows up in the right control without a second declaration.
 */

export type FieldKind = "text" | "textarea" | "number" | "money" | "date" | "boolean" | "select" | "relation";

export interface FieldMeta {
  name: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  options?: { value: string; label: string }[];
  /** For `relation` fields: the entity the value points at, and its display label. */
  relation?: { entity: string; label: string };
  hint?: string;
  /** Set for columns the server owns and a form must not send. */
  system?: boolean;
}

interface ColumnInfo {
  name: string;
  type: string;
  notnull: number;
  dflt: string | null;
  pk: number;
}

const SYSTEM_COLUMNS = new Set(["id", "created_at", "updated_at"]);

const DATE_EXTRAS = new Set([
  "due_date",
  "telecast_date",
  "shoot_date",
  "review_date",
  "re_review_date",
  "signing_deadline",
  "effective_from",
  "further_discussion_deadline",
  "invoice_date",
]);

const TEXTAREA_COLUMNS = new Set([
  "notes",
  "comments",
  "evidence",
  "thesis",
  "portfolio",
  "reference_checks",
  "verification_evidence",
  "commercial_schedule",
  "approved_exceptions",
  "discontinued_reason",
  "decision_reason",
  "outstanding_concern",
  "outstanding_actions",
  "open_actions",
  "outcomes",
  "follow_up_tasks",
  "minutes",
  "detail",
  "description",
  "outcome",
  "interests",
  "engagement_summary",
  "pack_summary",
  "permitted_business_information",
  "story_research",
  "crew",
  "shot_requirements",
  "asset_links",
  "costumes_properties",
  "pitch_revisions",
  "valuation_information",
  "live_offers",
  "accepted_deal_terms",
  "co_investor_allocations",
  "conditions",
  "agreed_terms",
  "milestone_dates",
  "open_documents",
  "open_conditions",
  "blocker",
  "withdrawal_reason",
  "slab_definition",
  "dispute_note",
  "late_payment_reason",
  "management_decision",
  "promo_requirements",
  "post_telecast_activity",
  "founder_feedback",
  "public_announcement",
  "communication_preferences",
  "follow_on_interest",
  "valuation_boundaries",
  "decision_parameters",
  "outstanding_issues",
  "required_documentation",
  "panel_summary",
  "questions",
  "actions_assigned",
  "investor_questions",
  "responses",
  "material_shared",
  "information_shared",
  "documents_requested",
  "pass_reason",
  "score_reasons",
  "change_reason",
  "response",
  "missing_documents",
  "escalation_reason",
  "rejected_reason",
  "summary",
  "required_output",
  "next_action",
  "memo",
  "log",
  "config",
  "holidays",
  "value",
  "body",
  "outcome_amount",
  "feedback",
  "purpose",
  "goals",
]);

const JSON_COLUMNS = new Set(["config", "log", "milestones", "slab_definition", "holidays"]);

function columnInfo(table: string): ColumnInfo[] {
  return all<ColumnInfo>(`PRAGMA table_info(${table})`);
}

function optionsFor(column: string, entity: EntityDefinition): { value: string; label: string }[] | undefined {
  if (entity.status && entity.status.column === column) {
    const registry = STATUS_REGISTRIES[entity.status.registry];
    if (registry) return Object.values(registry).map((s) => ({ value: s.value, label: s.label }));
  }
  if (column === "role") return ROLES.map((r) => ({ value: r.key, label: r.label }));
  if (column === "department") return DEPARTMENTS.map((d) => ({ value: d.key, label: d.label }));
  if (column === "module") return MODULES.map((m) => ({ value: m, label: humanise(m) }));
  if (column === "category" && entity.key === "policies") {
    return ["selection", "finance", "legal", "investor", "community", "operations"].map((c) => ({ value: c, label: humanise(c) }));
  }
  if (column === "member_type") {
    return ["applicant", "selected_startup", "alumni", "investor", "mentor", "incubator", "college", "ecosystem_partner"].map((c) => ({
      value: c,
      label: humanise(c),
    }));
  }
  return undefined;
}

function relationFor(column: string, entity: EntityDefinition): { entity: string; label: string } | undefined {
  const declared = entity.relations?.find((r) => r.column === column);
  if (declared) return { entity: declared.entity, label: declared.label };
  if (!column.endsWith("_id")) return undefined;
  const guess = column.slice(0, -3);
  const target = ENTITY_MAP[guess] ?? ENTITY_MAP[`${guess}s`] ?? ENTITY_MAP[`${guess}es`];
  if (target) return { entity: target.key, label: target.label };
  return undefined;
}

export function fieldsFor(entity: EntityDefinition): FieldMeta[] {
  const out: FieldMeta[] = [];
  for (const col of columnInfo(entity.table)) {
    if (col.pk) continue;
    const name = col.name;
    const system = SYSTEM_COLUMNS.has(name);
    const label = FIELD_LABELS[name] ?? humanise(name);

    if (system) {
      out.push({ name, label, kind: "date", required: false, system: true });
      continue;
    }

    const relation = relationFor(name, entity);
    const options = optionsFor(name, entity);
    const notnull = col.notnull === 1 && col.dflt === null;

    let kind: FieldKind = "text";
    if (relation) kind = "relation";
    else if (options) kind = "select";
    else if (BOOLEAN_COLUMNS.has(name)) kind = "boolean";
    else if (MONEY_COLUMNS.has(name)) kind = "money";
    else if (name.endsWith("_on") || name.endsWith("_at") || name.endsWith("_date") || name.endsWith("_due") || DATE_EXTRAS.has(name)) kind = "date";
    else if (JSON_COLUMNS.has(name)) kind = "textarea";
    else if (TEXTAREA_COLUMNS.has(name)) kind = "textarea";
    else if (/INT|REAL|NUM|DEC/.test(col.type.toUpperCase())) kind = "number";

    // A required flag only helps the form when the value is not derived from a relation the
    // server can resolve; keep it simple and mark every NOT NULL column with no default.
    const required = notnull && !relation && kind !== "boolean";

    out.push({ name, label, kind, required, options, relation });
  }
  return out;
}

/** A stage key's own screen, so a record can offer the next workflow step. */
export function routeForModule(module: string): string | null {
  return MODULE_ROUTE[module as ModuleKey] ?? null;
}
