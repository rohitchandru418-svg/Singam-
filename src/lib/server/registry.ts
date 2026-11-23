import { MODULES } from "../domain/rbac";
import { HttpError } from "./session";

/**
 * Entity registry.
 *
 * Maps every REST entity to its table, its display label, the module that governs access
 * and the columns that participate in search. The generic repository and the generic API
 * route both read from this table, so adding a field or a table is a one-line change.
 */

export interface EntityDefinition {
  key: string;
  table: string;
  label: string;
  plural: string;
  module: string;
  /** Columns searched by `?search=` and by global search. */
  searchable: string[];
  /** Status column plus the registry that renders its badge. */
  status?: { column: string; registry: string };
  /** Column used to order list responses. */
  orderBy: string;
  /** Foreign keys that link to another entity, used for filters and display. */
  relations?: { column: string; entity: string; label: string }[];
  /** Fields that only Management or Admin may edit. */
  managementOnly?: string[];
}

export const ENTITIES: EntityDefinition[] = [
  { key: "seasons", table: "seasons", label: "Season", plural: "Seasons", module: "admin", searchable: ["code", "name"], orderBy: "code" },
  { key: "users", table: "users", label: "User", plural: "Users", module: "admin", searchable: ["name", "email", "role", "department"], orderBy: "name" },
  { key: "programs", table: "programs", label: "Program", plural: "Programs", module: "applications", searchable: ["title", "slug", "code", "description"], status: { column: "status", registry: "program" }, orderBy: "title", relations: [{ column: "season_id", entity: "seasons", label: "Season" }] },
  { key: "startups", table: "startups", label: "Startup", plural: "Startups", module: "startups", searchable: ["name", "legal_entity", "sector", "geography", "business_model", "cin", "pan", "pitch", "industries"], status: { column: "profile_status", registry: "profile" }, orderBy: "name" },
  { key: "founders", table: "founders", label: "Founder", plural: "Founders", module: "startups", searchable: ["name", "role", "email"], orderBy: "name", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  {
    key: "applications", table: "applications", label: "Application", plural: "Applications", module: "applications",
    searchable: ["reference_no", "source", "referring_partner", "campaign", "notes"],
    status: { column: "status", registry: "application" }, orderBy: "reference_no",
    relations: [
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "season_id", entity: "seasons", label: "Season" },
      { column: "program_id", entity: "programs", label: "Program" },
      { column: "relationship_manager_id", entity: "users", label: "Relationship manager" },
      { column: "duplicate_of", entity: "applications", label: "Earlier application" },
    ],
  },
  { key: "screenings", table: "screenings", label: "Screening", plural: "Screening assessments", module: "screening", searchable: ["comments", "evidence"], status: { column: "outcome", registry: "screening_outcome" }, orderBy: "submitted_at", relations: [{ column: "application_id", entity: "applications", label: "Application" }, { column: "reviewer_id", entity: "users", label: "Reviewer" }] },
  { key: "bootcamp_attendance", table: "bootcamp_attendance", label: "Bootcamp attendance", plural: "Bootcamp attendance", module: "bootcamp", searchable: ["questions", "actions_assigned"], status: { column: "status", registry: "bootcamp" }, orderBy: "invited_on", relations: [{ column: "application_id", entity: "applications", label: "Application" }] },
  { key: "analyst_evaluations", table: "analyst_evaluations", label: "Analyst evaluation", plural: "Analyst evaluations", module: "analyst", searchable: ["decision_reason", "outstanding_concern"], status: { column: "recommendation", registry: "analyst_recommendation" }, orderBy: "evaluated_at", relations: [{ column: "application_id", entity: "applications", label: "Application" }, { column: "analyst_id", entity: "users", label: "Analyst" }] },
  { key: "mous", table: "mous", label: "MoU", plural: "MoUs", module: "mou", searchable: ["commercial_schedule", "approved_exceptions", "founder_email", "discontinued_reason"], status: { column: "status", registry: "mou" }, orderBy: "shared_on", relations: [{ column: "application_id", entity: "applications", label: "Application" }] },
  { key: "irr_reports", table: "irr_reports", label: "IRR report", plural: "Investment Readiness Reports", module: "irr", searchable: ["document_ref", "missing_documents"], status: { column: "status", registry: "irr" }, orderBy: "requested_on", relations: [{ column: "application_id", entity: "applications", label: "Application" }, { column: "approved_by_id", entity: "users", label: "Approved by" }] },
  {
    key: "investors", table: "investors", label: "Investor", plural: "Investors", module: "investors",
    searchable: ["name", "investing_entity", "sector_focus", "geography", "thesis", "decision_maker", "portfolio"],
    status: { column: "status", registry: "investor" }, orderBy: "name",
    relations: [{ column: "relationship_owner_id", entity: "users", label: "Relationship owner" }],
  },
  { key: "investor_agreements", table: "investor_agreements", label: "Investor agreement", plural: "Investor agreements", module: "investors", searchable: ["document_type", "reference", "notes"], status: { column: "status", registry: "document" }, orderBy: "document_type", relations: [{ column: "investor_id", entity: "investors", label: "Investor" }] },
  { key: "investor_grade_assessments", table: "investor_grade_assessments", label: "Grade assessment", plural: "Investor grade assessments", module: "investors", searchable: ["dimension", "evidence", "permitted_engagement", "panel_role", "change_reason"], status: { column: "grade", registry: "investor_grade" }, orderBy: "approved_on", relations: [{ column: "investor_id", entity: "investors", label: "Investor" }, { column: "reviewer_id", entity: "users", label: "Reviewer" }] },
  {
    key: "matches", table: "matches", label: "Match", plural: "Startup-investor matches", module: "matching",
    searchable: ["information_shared", "questions", "documents_requested", "next_action", "pass_reason", "response"],
    status: { column: "status", registry: "match" }, orderBy: "score",
    relations: [
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "investor_id", entity: "investors", label: "Investor" },
      { column: "approved_for_circulation_by_id", entity: "users", label: "Approved by" },
    ],
  },
  { key: "meetings", table: "meetings", label: "Meeting", plural: "Meetings", module: "matching", searchable: ["attendees", "minutes", "meeting_type"], orderBy: "scheduled_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "investor_id", entity: "investors", label: "Investor" }] },
  { key: "virtual_pitches", table: "virtual_pitches", label: "Virtual pitch", plural: "Virtual pitches", module: "pitches", searchable: ["material_shared", "investor_questions", "responses", "terms_confirmed"], status: { column: "response", registry: "pitch_response" }, orderBy: "scheduled_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "investor_id", entity: "investors", label: "Investor" }] },
  { key: "pitch_days", table: "pitch_days", label: "Pitch Day", plural: "Pitch Days", module: "pitchday", searchable: ["episode_no", "golden_pass_evidence", "follow_on_interest"], status: { column: "outcome", registry: "pitch_day_outcome" }, orderBy: "scheduled_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "golden_pass_issuer_investor_id", entity: "investors", label: "Golden Pass issuer" }] },
  { key: "pitch_day_slots", table: "pitch_day_slots", label: "Pitch Day slot", plural: "Pitch Day slots", module: "pitchday", searchable: ["notes"], status: { column: "outcome", registry: "pitch_day_outcome" }, orderBy: "slot_time", relations: [{ column: "pitch_day_id", entity: "pitch_days", label: "Pitch Day" }, { column: "investor_id", entity: "investors", label: "Investor" }] },
  { key: "committee_decisions", table: "committee_decisions", label: "Committee decision", plural: "Committee decisions", module: "committee", searchable: ["pack_summary", "conditions"], status: { column: "outcome", registry: "committee_outcome" }, orderBy: "decided_on", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "approver_id", entity: "users", label: "Approver" }] },
  { key: "pre_shoot_confirmations", table: "pre_shoot_confirmations", label: "Pre-shoot confirmation", plural: "Pre-shoot confirmations", module: "commitments", searchable: ["episode_no", "panel_summary", "valuation_boundaries", "outstanding_issues", "required_documentation"], orderBy: "shoot_date", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "commitments", table: "commitments", label: "Commitment", plural: "Commitments", module: "commitments", searchable: ["valuation", "terms", "evidence", "revision_reason"], status: { column: "status", registry: "commitment" }, orderBy: "created_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "investor_id", entity: "investors", label: "Investor" }] },
  { key: "funding_rounds", table: "funding_rounds", label: "Funding round", plural: "Funding rounds", module: "deals", searchable: ["name"], status: { column: "status", registry: "deal" }, orderBy: "name", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "closure_owner_id", entity: "users", label: "Closure owner" }] },
  {
    key: "deals", table: "deals", label: "Deal", plural: "Deals", module: "deals",
    searchable: ["agreed_terms", "valuation", "open_documents", "open_conditions", "blocker", "next_action", "withdrawal_reason"],
    status: { column: "status", registry: "deal" }, orderBy: "created_at",
    relations: [
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "investor_id", entity: "investors", label: "Investor" },
      { column: "funding_round_id", entity: "funding_rounds", label: "Funding round" },
      { column: "responsible_id", entity: "users", label: "Responsible" },
    ],
  },
  { key: "deal_documents", table: "deal_documents", label: "Deal document", plural: "Deal documents", module: "deals", searchable: ["document_type", "signer", "notes", "purpose"], status: { column: "status", registry: "document" }, orderBy: "purpose", relations: [{ column: "deal_id", entity: "deals", label: "Deal" }] },
  { key: "tranches", table: "tranches", label: "Tranche", plural: "Tranches", module: "deployment", searchable: ["evidence", "reversal_reason"], status: { column: "status", registry: "tranche" }, orderBy: "scheduled_on", relations: [{ column: "deal_id", entity: "deals", label: "Deal" }, { column: "verifier_id", entity: "users", label: "Verifier" }, { column: "reversal_of_id", entity: "tranches", label: "Reversal of" }] },
  {
    key: "upfront_fees", table: "upfront_fees", label: "Upfront fee", plural: "Upfront fees", module: "upfront_fees",
    searchable: ["invoice_no", "payment_reference", "turnover_evidence", "financial_year", "late_payment_reason", "management_decision", "approved_exception"],
    status: { column: "status", registry: "upfront_fee" }, orderBy: "due_date",
    relations: [
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "season_id", entity: "seasons", label: "Season" },
      { column: "committee_decision_id", entity: "committee_decisions", label: "Committee decision" },
      { column: "approved_by_id", entity: "users", label: "Approved by" },
    ],
    managementOnly: ["waiver_amount", "refund_amount", "extension_approved", "approved_exception", "management_decision"],
  },
  {
    key: "success_fees", table: "success_fees", label: "Success fee", plural: "Success fees", module: "success_fees",
    searchable: ["agreement_ref", "invoice_no", "sourcing_arrangement", "dispute_note"],
    status: { column: "status", registry: "success_fee" }, orderBy: "due_date",
    relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "deal_id", entity: "deals", label: "Deal" }],
    managementOnly: ["waiver_amount", "discount", "fee_percent", "fee_structure", "upfront_adjustable"],
  },
  { key: "ledger_entries", table: "ledger_entries", label: "Ledger entry", plural: "Ledger entries", module: "success_fees", searchable: ["reference", "memo", "entry_type"], orderBy: "occurred_on", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "production_handovers", table: "production_handovers", label: "Production handover", plural: "Production handovers", module: "production", searchable: ["pack_summary", "permitted_business_information"], status: { column: "status", registry: "handover" }, orderBy: "handed_over_on", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "accepted_by_id", entity: "users", label: "Accepted by" }] },
  { key: "av_shoots", table: "av_shoots", label: "AV shoot", plural: "AV shoots", module: "production", searchable: ["story_research", "location", "crew", "shot_requirements", "asset_links"], status: { column: "status", registry: "av_shoot" }, orderBy: "schedule_on", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "mock_shoots", table: "mock_shoots", label: "Mock shoot", plural: "Mock shoots", module: "production", searchable: ["costumes_properties", "pitch_revisions", "valuation_information", "open_actions"], status: { column: "status", registry: "mock_shoot" }, orderBy: "scheduled_on", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "main_shoots", table: "main_shoots", label: "Main shoot", plural: "Main shoots", module: "production", searchable: ["episode_no", "live_offers", "accepted_deal_terms", "conditions", "outstanding_actions", "founder_attendance", "investor_attendance"], status: { column: "status", registry: "main_shoot" }, orderBy: "scheduled_on", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "lead_investor_id", entity: "investors", label: "Lead investor" }] },
  { key: "episodes", table: "episodes", label: "Episode", plural: "Episodes", module: "episodes", searchable: ["episode_no", "editing_status", "approvals_status"], status: { column: "status", registry: "episode" }, orderBy: "episode_no", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "telecasts", table: "telecasts", label: "Telecast", plural: "Telecasts", module: "telecast", searchable: ["episode_no", "promo_requirements", "promo_assets_approved", "post_telecast_activity", "founder_feedback", "public_announcement"], status: { column: "status", registry: "telecast" }, orderBy: "telecast_date", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "community_members", table: "community_members", label: "Community member", plural: "Community members", module: "community", searchable: ["name", "organisation", "sector", "geography", "interests", "engagement_summary"], status: { column: "member_type", registry: "member_type" }, orderBy: "name", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "relationship_owner_id", entity: "users", label: "Relationship owner" }] },
  { key: "community_member_roles", table: "community_member_roles", label: "Member role", plural: "Member roles", module: "community", searchable: ["role", "notes"], orderBy: "since", relations: [{ column: "member_id", entity: "community_members", label: "Member" }] },
  { key: "community_events", table: "community_events", label: "Event", plural: "Community events", module: "events", searchable: ["name", "event_type", "purpose", "follow_up_tasks", "outcomes"], status: { column: "status", registry: "event" }, orderBy: "scheduled_on", relations: [{ column: "owner_id", entity: "users", label: "Owner" }] },
  { key: "event_registrations", table: "event_registrations", label: "Registration", plural: "Event registrations", module: "events", searchable: ["feedback"], orderBy: "id", relations: [{ column: "event_id", entity: "community_events", label: "Event" }, { column: "member_id", entity: "community_members", label: "Member" }] },
  { key: "referrals", table: "referrals", label: "Referral", plural: "Referrals", module: "referrals", searchable: ["source_name", "referred_name", "original_contributor", "additional_contributors", "outcome"], status: { column: "status", registry: "referral" }, orderBy: "created_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }, { column: "investor_id", entity: "investors", label: "Investor" }] },
  { key: "support_requests", table: "support_requests", label: "Support request", plural: "Support requests", module: "support", searchable: ["detail", "outcome", "founder_feedback", "request_type"], status: { column: "status", registry: "support_request" }, orderBy: "due_date", relations: [{ column: "member_id", entity: "community_members", label: "Member" }, { column: "startup_id", entity: "startups", label: "Startup" }, { column: "owner_id", entity: "users", label: "Owner" }] },
  { key: "tasks", table: "tasks", label: "Task", plural: "Tasks", module: "tasks", searchable: ["title", "description", "required_output", "evidence", "next_action", "escalation_reason"], status: { column: "status", registry: "task" }, orderBy: "due_date", relations: [{ column: "owner_id", entity: "users", label: "Owner" }, { column: "approver_id", entity: "users", label: "Approver" }] },
  { key: "handovers", table: "handovers", label: "Handover", plural: "Handovers", module: "handovers", searchable: ["summary", "rejected_reason"], status: { column: "status", registry: "handover" }, orderBy: "created_at", relations: [{ column: "accepted_by_id", entity: "users", label: "Accepted by" }] },
  { key: "documents", table: "documents", label: "Document", plural: "Documents", module: "documents", searchable: ["title", "purpose", "category", "file_ref", "notes"], status: { column: "status", registry: "document" }, orderBy: "uploaded_on", relations: [{ column: "uploaded_by_id", entity: "users", label: "Uploaded by" }] },
  { key: "audit_events", table: "audit_events", label: "Audit event", plural: "Audit history", module: "audit", searchable: ["actor_name", "action", "field", "reason", "entity_type"], orderBy: "created_at" },
  { key: "policies", table: "policies", label: "Policy", plural: "Policies", module: "policies", searchable: ["code", "title", "category", "notes"], orderBy: "code", managementOnly: ["value", "status"] },
  { key: "policy_revisions", table: "policy_revisions", label: "Policy revision", plural: "Policy revisions", module: "policies", searchable: ["reason"], orderBy: "changed_on", relations: [{ column: "policy_id", entity: "policies", label: "Policy" }] },
  { key: "fee_slabs", table: "fee_slabs", label: "Fee slab", plural: "Fee slabs", module: "policies", searchable: ["schedule_code"], orderBy: "turnover_min" },
  { key: "calendars", table: "calendars", label: "Calendar", plural: "Working-day calendars", module: "admin", searchable: ["name", "region"], orderBy: "name" },
  { key: "integrations", table: "integrations", label: "Integration", plural: "Integrations", module: "integrations", searchable: ["name", "category", "status", "last_error"], orderBy: "name" },
  { key: "sync_runs", table: "sync_runs", label: "Sync run", plural: "Sync runs", module: "integrations", searchable: ["status", "error"], orderBy: "started_at", relations: [{ column: "integration_id", entity: "integrations", label: "Integration" }] },
  { key: "import_batches", table: "import_batches", label: "Import batch", plural: "Import batches", module: "admin", searchable: ["entity_type", "file_name", "log"], orderBy: "started_at" },
  { key: "notifications", table: "notifications", label: "Notification", plural: "Notifications", module: "dashboard", searchable: ["title", "body"], orderBy: "created_at" },
  // Founder-facing communication and document checklist. Kept in the registry so the internal
  // console can read the same threads and requests the founder sees, and answer them there.
  { key: "founder_messages", table: "founder_messages", label: "Message", plural: "Founder messages", module: "startups", searchable: ["body", "author_name", "stage_key"], orderBy: "created_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "document_requests", table: "document_requests", label: "Document request", plural: "Document requests", module: "documents", searchable: ["title", "instructions", "clarification", "purpose"], orderBy: "created_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "pitch_day_options", table: "pitch_day_options", label: "Pitch Day option", plural: "Pitch Day options", module: "pitchday", searchable: ["slot_note"], orderBy: "option_date", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },
  { key: "payment_proofs", table: "payment_proofs", label: "Payment proof", plural: "Payment proofs", module: "upfront_fees", searchable: ["reference", "note", "review_note"], orderBy: "created_at", relations: [{ column: "startup_id", entity: "startups", label: "Startup" }] },

  // Platform-wide approvals inbox and the modules added for briefs 05-11.
  {
    key: "approval_requests", table: "approval_requests", label: "Approval", plural: "Approvals inbox", module: "tasks",
    searchable: ["title", "impact", "approval_type", "reason"],
    status: { column: "status", registry: "approval" }, orderBy: "due_on",
    relations: [
      { column: "raised_by_id", entity: "users", label: "Raised by" },
      { column: "decided_by_id", entity: "users", label: "Decided by" },
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "investor_id", entity: "investors", label: "Investor" },
    ],
  },
  {
    key: "legal_templates", table: "legal_templates", label: "Legal template", plural: "Legal templates", module: "legal",
    searchable: ["name", "template_type", "summary"],
    status: { column: "status", registry: "template" }, orderBy: "template_type",
    relations: [{ column: "approved_by_id", entity: "users", label: "Approved by" }],
  },
  {
    key: "dd_findings", table: "dd_findings", label: "Due-diligence finding", plural: "Due-diligence findings", module: "legal",
    searchable: ["title", "detail", "resolution_notes"],
    status: { column: "status", registry: "dd_finding" }, orderBy: "raised_on",
    relations: [
      { column: "deal_id", entity: "deals", label: "Deal" },
      { column: "owner_id", entity: "users", label: "Owner" },
    ],
  },
  {
    key: "pre_funding_conditions", table: "pre_funding_conditions", label: "Pre-funding condition", plural: "Pre-funding conditions", module: "legal",
    searchable: ["condition_text", "evidence"],
    status: { column: "status", registry: "condition" }, orderBy: "due_date",
    relations: [
      { column: "deal_id", entity: "deals", label: "Deal" },
      { column: "owner_id", entity: "users", label: "Owner" },
    ],
  },
  {
    key: "shoot_exceptions", table: "shoot_exceptions", label: "Shoot-day exception", plural: "Shoot-day exceptions", module: "production",
    searchable: ["reason", "action_taken"],
    status: { column: "exception_type", registry: "shoot_exception" }, orderBy: "logged_on",
    relations: [
      { column: "main_shoot_id", entity: "main_shoots", label: "Main shoot" },
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "logged_by_id", entity: "users", label: "Logged by" },
    ],
  },
  {
    key: "signing_events", table: "signing_events", label: "Signing event", plural: "Signing events", module: "production",
    searchable: ["event_type", "notes", "document_ref"],
    status: { column: "status", registry: "signing_event" }, orderBy: "created_at",
    relations: [
      { column: "main_shoot_id", entity: "main_shoots", label: "Main shoot" },
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "signed_by_id", entity: "users", label: "Signed by" },
    ],
  },
  {
    key: "announcements", table: "announcements", label: "Announcement", plural: "Announcements", module: "telecast",
    searchable: ["draft_text"],
    status: { column: "status", registry: "announcement" }, orderBy: "created_at",
    relations: [
      { column: "startup_id", entity: "startups", label: "Startup" },
      { column: "deal_id", entity: "deals", label: "Deal" },
      { column: "approved_by_investor_id", entity: "investors", label: "Approved by investor" },
    ],
  },
  {
    key: "tds_entries", table: "tds_entries", label: "TDS entry", plural: "TDS entries", module: "success_fees",
    searchable: ["invoice_ref", "certificate_ref"],
    status: { column: "status", registry: "tds" }, orderBy: "created_at",
    relations: [{ column: "startup_id", entity: "startups", label: "Startup" }],
  },
  {
    key: "credit_notes", table: "credit_notes", label: "Credit note", plural: "Credit notes", module: "success_fees",
    searchable: ["invoice_ref", "reversal_ref", "reason"], orderBy: "issued_on",
    relations: [{ column: "startup_id", entity: "startups", label: "Startup" }],
  },
  {
    key: "reassignments", table: "reassignments", label: "Reassignment", plural: "Reassignments", module: "admin",
    searchable: ["entity_type", "reason"], orderBy: "created_at",
    relations: [
      { column: "from_user_id", entity: "users", label: "From" },
      { column: "to_user_id", entity: "users", label: "To" },
      { column: "reassigned_by_id", entity: "users", label: "Reassigned by" },
    ],
  },
  {
    key: "member_merges", table: "member_merges", label: "Member merge", plural: "Member merges", module: "community",
    searchable: ["reason"], orderBy: "merged_on",
    relations: [
      { column: "surviving_member_id", entity: "community_members", label: "Surviving member" },
      { column: "merged_member_id", entity: "community_members", label: "Merged member" },
    ],
  },
];

export const ENTITY_MAP: Record<string, EntityDefinition> = Object.fromEntries(
  ENTITIES.map((e) => [e.key, e]),
) as Record<string, EntityDefinition>;

export function entityOrThrow(key: string): EntityDefinition {
  const entity = ENTITY_MAP[key];
  if (!entity) throw new HttpError(404, `unknown entity: ${key}`);
  return entity;
}

export function isKnownModule(module: string): boolean {
  return (MODULES as readonly string[]).includes(module);
}
