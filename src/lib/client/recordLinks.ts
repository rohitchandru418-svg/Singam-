"use client";

/**
 * Maps the singular entity type stored on a task or audit row to the entity key used by the
 * record routes, so a task can link straight to the record it concerns. Unknown types return
 * null and the caller renders plain text instead of a dead link.
 */
const ENTITY_ALIAS: Record<string, string> = {
  application: "applications",
  commitment: "commitments",
  committee_decision: "committee_decisions",
  deal: "deals",
  funding_round: "funding_rounds",
  investor: "investors",
  investor_agreement: "investor_agreements",
  mou: "mous",
  irr_report: "irr_reports",
  match: "matches",
  meeting: "meetings",
  pre_shoot_confirmation: "pre_shoot_confirmations",
  production_handover: "production_handovers",
  support_request: "support_requests",
  telecast: "telecasts",
  tranche: "tranches",
  upfront_fee: "upfront_fees",
  success_fee: "success_fees",
  screening: "screenings",
  analyst_evaluation: "analyst_evaluations",
  startup: "startups",
  founder: "founders",
  referral: "referrals",
  community_member: "community_members",
  community_event: "community_events",
  document: "documents",
  handover: "handovers",
  policy: "policies",
  virtual_pitch: "virtual_pitches",
  pitch_day: "pitch_days",
  episode: "episodes",
  av_shoot: "av_shoots",
  mock_shoot: "mock_shoots",
  main_shoot: "main_shoots",
};

export function recordHref(entityType: unknown, entityId: unknown): string | null {
  if (!entityType || !entityId) return null;
  const key = String(entityType);
  const plural = ENTITY_ALIAS[key] ?? (key.endsWith("s") ? key : `${key}s`);
  return `/records/${plural}/${String(entityId)}`;
}

/**
 * Entities whose list and record screens are admin-only. A relation to one of these must be
 * shown as a plain value, not a link: a link would send a non-admin to a 403.
 */
export const NON_LINKABLE_ENTITIES = new Set(["seasons"]);

export function isLinkableEntity(entity: unknown): boolean {
  return !!entity && !NON_LINKABLE_ENTITIES.has(String(entity));
}

/** The list screen for an entity key, when one exists. Used for the "back" breadcrumb. */
const LIST_ROUTE: Record<string, string> = {
  applications: "/applications",
  startups: "/startups",
  screenings: "/screening",
  bootcamp_attendance: "/bootcamp",
  analyst_evaluations: "/analyst",
  mous: "/mou",
  irr_reports: "/irr",
  investors: "/investors",
  investor_agreements: "/investors",
  investor_grade_assessments: "/investors",
  matches: "/matching",
  virtual_pitches: "/pitches",
  pitch_days: "/pitchday",
  pitch_day_slots: "/pitchday",
  committee_decisions: "/committee",
  pre_shoot_confirmations: "/commitments",
  commitments: "/commitments",
  funding_rounds: "/deals",
  deals: "/deals",
  deal_documents: "/deals",
  tranches: "/deployment",
  upfront_fees: "/upfront-fees",
  success_fees: "/success-fees",
  production_handovers: "/production",
  av_shoots: "/production",
  mock_shoots: "/production",
  main_shoots: "/production",
  episodes: "/episodes",
  telecasts: "/telecast",
  community_members: "/community",
  community_member_roles: "/community",
  community_events: "/events",
  event_registrations: "/events",
  referrals: "/referrals",
  support_requests: "/support",
  tasks: "/tasks",
  handovers: "/handovers",
  documents: "/documents",
  policies: "/policies",
  policy_revisions: "/policies",
  audit_events: "/audit",
  integrations: "/integrations",
  sync_runs: "/integrations",
};

export function listRoute(entity: string): string | null {
  return LIST_ROUTE[entity] ?? null;
}

/**
 * Foreign-key column name to the entity it points at. Lets a generic table (a mini table, or
 * the related-records panel on a record) turn any `<x>_id` column into a link to that record
 * without each screen repeating the mapping.
 */
export const REF_ENTITY: Record<string, string> = {
  startup_id: "startups",
  season_id: "seasons",
  program_id: "programs",
  investor_id: "investors",
  lead_investor_id: "investors",
  application_id: "applications",
  screening_id: "screenings",
  deal_id: "deals",
  funding_round_id: "funding_rounds",
  pitch_day_id: "pitch_days",
  member_id: "community_members",
  event_id: "community_events",
  owner_id: "users",
  reviewer_id: "users",
  verifier_id: "users",
  analyst_id: "users",
  approved_by_id: "users",
  approved_for_circulation_by_id: "users",
  integration_id: "integrations",
  accepted_by_id: "users",
  uploaded_by_id: "users",
  approver_id: "users",
  relationship_owner_id: "users",
  relationship_manager_id: "users",
  closure_owner_id: "users",
  responsible_id: "users",
  committee_decision_id: "committee_decisions",
  golden_pass_issuer_investor_id: "investors",
  revised_from_id: "commitments",
  reversal_of_id: "tranches",
  duplicate_of: "applications",
  policy_id: "policies",
  changed_by_id: "users",
  commitment_id: "commitments",
  replacement_investor_id: "investors",
};
