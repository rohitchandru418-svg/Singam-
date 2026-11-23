/**
 * Turning a raw id box into a picker of names.
 *
 * Workflow forms historically asked for a value such as `A-0001`. Most of those fields are
 * foreign keys, so the form can offer the matching records by name instead. This module maps
 * a field name to the entity it points at and a short, plain-English name for the picker.
 */

const EXPLICIT: Record<string, string> = {
  // Money and process records
  fee_id: "upfront_fees",
  success_fee_id: "success_fees",
  tranche_id: "tranches",
  deal_id: "deals",
  match_id: "matches",
  commitment_id: "commitments",
  mou_id: "mous",
  irr_id: "irr_reports",
  pitch_id: "virtual_pitches",
  pitch_day_id: "pitch_days",
  committee_decision_id: "committee_decisions",
  application_id: "applications",
  startup_id: "startups",
  member_id: "community_members",
  event_id: "community_events",
  referral_id: "referrals",
  request_id: "support_requests",
  task_id: "tasks",
  handover_id: "handovers",
  document_id: "documents",
  notification_id: "notifications",
  integration_id: "integrations",
  investor_id: "investors",
  lead_investor_id: "investors",
  replacement_investor_id: "investors",
  funding_round_id: "funding_rounds",
  template_id: "legal_templates",
  finding_id: "dd_findings",
  condition_id: "pre_funding_conditions",
  tds_entry_id: "tds_entries",
  approval_id: "approval_requests",
  proof_id: "payment_proofs",
  code: "policies",

  // People
  owner_id: "users",
  reviewer_id: "users",
  approver_id: "users",
  analyst_id: "users",
  closure_owner_id: "users",
  relationship_owner_id: "users",
  relationship_manager_id: "users",
  verifier_id: "users",
  accepted_by_id: "users",
  responsible_id: "users",
  uploaded_by_id: "users",
  changed_by_id: "users",
  approved_by_id: "users",
};

/** Short, plain names for the picker label. */
const ENTITY_NAME: Record<string, string> = {
  upfront_fees: "Upfront fee",
  success_fees: "Success fee",
  tranches: "Tranche",
  deals: "Deal",
  matches: "Startup\u2013investor match",
  commitments: "Commitment",
  mous: "MoU",
  irr_reports: "Investment Readiness Report",
  virtual_pitches: "Virtual pitch",
  pitch_days: "Pitch Day",
  committee_decisions: "Committee decision",
  applications: "Application",
  startups: "Startup",
  community_members: "Community member",
  community_events: "Event",
  referrals: "Referral",
  support_requests: "Support request",
  tasks: "Task",
  handovers: "Handover",
  documents: "Document",
  notifications: "Notification",
  integrations: "Integration",
  investors: "Investor",
  funding_rounds: "Funding round",
  legal_templates: "Legal template",
  dd_findings: "Due-diligence finding",
  pre_funding_conditions: "Pre-funding condition",
  tds_entries: "TDS entry",
  approval_requests: "Approval",
  payment_proofs: "Payment proof",
  policies: "Policy",
  users: "Person",
};

/**
 * The entity a form field points at, or `null` when the value is free text. `entity_type`
 * and `source_type` are deliberately excluded: the target depends on a sibling field.
 */
export function relationEntityFor(fieldName: string): string | null {
  return EXPLICIT[fieldName] ?? null;
}

/** A plain-English label for the picker. */
export function relationLabelFor(entity: string): string {
  return ENTITY_NAME[entity] ?? entity;
}

/* ------------------------------------------------------------------ */
/* Polymorphic links                                                   */
/* ------------------------------------------------------------------ */

/**
 * Some forms name a related record as a pair: a `*_type` column plus a `*_id` column whose
 * meaning depends on the type. An id box alone cannot be completed without knowing the id, so
 * the type is offered as a picker of record kinds and the id as a picker of that kind's
 * records. This maps the id column to the type column it pairs with.
 */
export const POLYMORPHIC_PAIRS: Record<string, string> = {
  entity_id: "entity_type",
  source_id: "source_type",
};

/** The type column a polymorphic id column pairs with, or `null`. */
export function polymorphicTypeFieldFor(idField: string): string | null {
  return POLYMORPHIC_PAIRS[idField] ?? null;
}

/**
 * The record kinds a link can point at, keyed by the short value stored in the `*_type`
 * column. Only kinds with a screen and an id worth picking are listed; anything else keeps
 * the plain text box so the form stays completable.
 */
export const LINK_TYPES: { value: string; label: string; entity: string }[] = [
  { value: "startup", label: "Startup", entity: "startups" },
  { value: "application", label: "Application", entity: "applications" },
  { value: "investor", label: "Investor", entity: "investors" },
  { value: "match", label: "Startup\u2013investor match", entity: "matches" },
  { value: "mou", label: "MoU", entity: "mous" },
  { value: "irr_report", label: "Investment Readiness Report", entity: "irr_reports" },
  { value: "commitment", label: "Commitment", entity: "commitments" },
  { value: "deal", label: "Deal", entity: "deals" },
  { value: "funding_round", label: "Funding round", entity: "funding_rounds" },
  { value: "tranche", label: "Tranche", entity: "tranches" },
  { value: "upfront_fee", label: "Upfront fee", entity: "upfront_fees" },
  { value: "success_fee", label: "Success fee", entity: "success_fees" },
  { value: "committee_decision", label: "Committee decision", entity: "committee_decisions" },
  { value: "pre_shoot_confirmation", label: "Pre-shoot confirmation", entity: "pre_shoot_confirmations" },
  { value: "community_member", label: "Community member", entity: "community_members" },
  { value: "event", label: "Event", entity: "community_events" },
  { value: "referral", label: "Referral", entity: "referrals" },
  { value: "support_request", label: "Support request", entity: "support_requests" },
  { value: "task", label: "Task", entity: "tasks" },
  { value: "document", label: "Document", entity: "documents" },
  { value: "user", label: "Person", entity: "users" },
];

/** The record kinds a type picker offers. */
export function linkTypeOptions(): { value: string; label: string }[] {
  return LINK_TYPES.map((t) => ({ value: t.value, label: t.label }));
}

/** The `*_type` value a link should carry to point at this entity, or `null` when it cannot. */
export function linkTypeForEntity(entity: string): string | null {
  return LINK_TYPES.find((t) => t.entity === entity)?.value ?? null;
}

/** A stored `*_type` value that differs from the picker's own key. */
const LINK_TYPE_ALIASES: Record<string, string> = {
  employee: "user",
};

/** The entity a stored `*_type` value points at, or `null` when it is not a pickable kind. */
export function entityForLinkType(typeValue: string): string | null {
  const raw = String(typeValue ?? "").trim().toLowerCase();
  const key = LINK_TYPE_ALIASES[raw] ?? raw;
  return LINK_TYPES.find((t) => t.value === key)?.entity ?? null;
}

/** A plain-English label for a stored `*_type` value. */
export function linkTypeLabel(typeValue: string): string {
  const raw = String(typeValue ?? "").trim().toLowerCase();
  const key = LINK_TYPE_ALIASES[raw] ?? raw;
  return LINK_TYPES.find((t) => t.value === key)?.label ?? raw.replace(/_/g, " ");
}
