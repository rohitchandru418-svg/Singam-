import { FORM_SPECS } from "./forms";

/**
 * The workflow steps that make sense for a record.
 *
 * Every action form names the record it acts on as its first field (`application_id`,
 * `deal_id` and so on). This maps an entity to that field, so a record screen can offer the
 * actions for that record and pre-fill its id, instead of making someone find the right
 * screen and retype the reference.
 */
const SUBJECT_FIELD: Record<string, string> = {
  startups: "startup_id",
  applications: "application_id",
  investors: "investor_id",
  matches: "match_id",
  mous: "mou_id",
  irr_reports: "irr_id",
  upfront_fees: "fee_id",
  success_fees: "success_fee_id",
  deals: "deal_id",
  tranches: "tranche_id",
  commitments: "commitment_id",
  funding_rounds: "funding_round_id",
  virtual_pitches: "pitch_id",
  pitch_days: "pitch_day_id",
  committee_decisions: "committee_decision_id",
  analyst_evaluations: "application_id",
  community_members: "member_id",
  community_events: "event_id",
  referrals: "referral_id",
  support_requests: "request_id",
  tasks: "task_id",
  handovers: "handover_id",
  documents: "document_id",
  integrations: "integration_id",
  notifications: "notification_id",
  av_shoots: "startup_id",
  mock_shoots: "startup_id",
  main_shoots: "startup_id",
  episodes: "startup_id",
  telecasts: "startup_id",
};

/** Actions whose form acts on this entity, and the field that carries its id. */
export function actionsForEntity(entity: string): { action: string; idField: string }[] {
  const field = SUBJECT_FIELD[entity];
  if (!field) return [];
  return Object.keys(FORM_SPECS)
    .filter((action) => FORM_SPECS[action].some((f) => f.name === field))
    .map((action) => ({ action, idField: field }));
}

/**
 * The value a form's subject field should be prefilled with. Almost always the record's own id;
 * an analyst evaluation is written against the application it reviews, so its subject field
 * carries the parent application's id rather than the evaluation's own.
 */
export function subjectDefaultFor(entity: string, idField: string, record: Record<string, unknown>): string {
  if (entity === "analyst_evaluations" && idField === "application_id") return String(record.application_id ?? "");
  return String(record.id ?? "");
}
