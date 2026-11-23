/**
 * Entity types shared by the data layer, the REST API and the UI.
 *
 * These mirror the SQLite tables one-for-one. `src/lib/db/schema.ts` is the
 * authoritative DDL; keep the two in step when adding a field.
 */

export type ID = string;

export interface Season {
  id: ID;
  code: string;
  name: string;
  status: "planning" | "live" | "closed";
  starts_on: string;
  ends_on: string;
}

export interface User {
  id: ID;
  name: string;
  email: string;
  role: string; // see domain/rbac.ts Role
  department: string; // see domain/departments.ts Department
  active: 0 | 1;
}

/* --------------------------- Startup journey --------------------------- */

export interface Startup {
  id: ID;
  name: string;
  legal_entity: string;
  entity_type: string;
  sector: string;
  stage: string; // idea | pre_revenue | early_revenue | growth
  geography: string;
  business_model: string;
  website: string;
  cin: string;
  gstin: string;
  pan: string;
  incorporated_on: string;
  created_at: string;
}

export interface Founder {
  id: ID;
  startup_id: ID;
  name: string;
  role: string; // Founder / Co-founder
  email: string;
  phone: string;
  linkedin: string;
  is_primary: 0 | 1;
  /** Founder/co-founder personal + contact details are hidden from analyst views. */
  restricted_to_analyst: 0 | 1;
}

export interface Application {
  id: ID;
  season_id: ID;
  startup_id: ID;
  reference_no: string;
  source: string;
  referring_partner: string;
  campaign: string;
  relationship_manager_id: ID | null;
  stage_at_application: string;
  status: string; // APPLICATION_STATUS
  completion_pct: number;
  submitted_at: string | null;
  acknowledged_at: string | null;
  duplicate_of: ID | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Screening {
  id: ID;
  application_id: ID;
  reviewer_id: ID | null;
  completeness: number; // 10
  documents: number; // 10
  unique_idea: number; // 20
  revenue: number; // 10
  traction: number; // 10
  past_funding: number; // 20
  founder_capability: number; // 5
  incubation: number; // 5
  ip_defensibility: number; // 10
  total: number; // derived
  outcome: string; // SCREENING_OUTCOME
  comments: string;
  evidence: string;
  submitted_at: string | null;
  created_at: string;
}

export interface BootcampAttendance {
  id: ID;
  application_id: ID;
  invited_on: string;
  registered: 0 | 1;
  attended_on: string | null;
  process_briefing_done: 0 | 1;
  readiness_session_done: 0 | 1;
  mou_briefing_done: 0 | 1;
  fee_briefing_done: 0 | 1;
  questions: string;
  actions_assigned: string;
  preparation_completed: 0 | 1;
  status: string; // BOOTCAMP_STATUS
  updated_at: string;
}

export interface AnalystEvaluation {
  id: ID;
  application_id: ID;
  analyst_id: ID | null;
  thesis_fit: number; // 1-5
  market_opportunity: number;
  traction: number;
  business_model: number;
  competitive_positioning: number;
  willingness_to_invest: number; // 1-5, INDICATIVE ONLY
  indicative_amount: number; // paise
  recommendation: string; // ANALYST_RECOMMENDATION
  decision_reason: string;
  outstanding_concern: string;
  evaluated_at: string | null;
  created_at: string;
}

export interface Mou {
  id: ID;
  application_id: ID;
  shared_on: string;
  legal_ama_due: string;
  legal_ama_on: string | null;
  signing_deadline: string;
  signed_on: string | null;
  status: string; // MOU_STATUS
  commercial_schedule: string;
  approved_exceptions: string;
  response: string; // Proceed / Negotiate / Discontinue
  discontinued_reason: string;
  founder_email: string;
  escalated_to_management: 0 | 1;
  updated_at: string;
}

export interface IrrReport {
  id: ID;
  application_id: ID;
  version: number;
  status: string; // IRR_STATUS
  requested_on: string;
  handover_accepted_on: string | null;
  checklist_sent_on: string | null;
  prepared_on: string | null;
  reviewed_by_id: ID | null;
  approved_on: string | null;
  approved_by_id: ID | null;
  shared_with_ir_on: string | null;
  document_ref: string;
  missing_documents: string;
  created_at: string;
}

/* -------------------------- Investor journey --------------------------- */

export interface Investor {
  id: ID;
  name: string;
  category: string; // HNI | Family office | VC | Angel network | Corporate | Syndicate
  investing_entity: string;
  source: string;
  referral_relationship: string;
  decision_maker: string;
  authorised_representative: string;
  sector_focus: string;
  stage_focus: string;
  geography: string;
  thesis: string;
  ticket_min: number; // paise
  ticket_max: number; // paise
  proposed_season_allocation: number; // paise
  portfolio: string;
  reference_checks: string;
  verification_evidence: string;
  availability: string;
  expected_decision_timeline: string;
  relationship_owner_id: ID | null;
  status: string; // INVESTOR_STATUS
  grade: string | null; // INVESTOR_GRADE
  created_at: string;
}

export interface InvestorAgreement {
  id: ID;
  investor_id: ID;
  document_type: string; // IPA | NDA | MoU | Exit | Other
  status: string; // DOCUMENT_STATUS
  signed_on: string | null;
  reference: string;
  notes: string;
}

export interface InvestorGradeAssessment {
  id: ID;
  investor_id: ID;
  grade: string; // INVESTOR_GRADE
  dimension: string;
  score: number; // 1-5
  evidence: string;
  reviewer_id: ID | null;
  approved_on: string | null;
  permitted_engagement: string;
  panel_role: string;
  review_date: string;
  change_reason: string;
  created_at: string;
}

export interface Match {
  id: ID;
  startup_id: ID;
  investor_id: ID;
  score: number;
  score_reasons: string; // JSON string
  status: string; // MATCH_STATUS
  approved_for_circulation_by_id: ID | null;
  information_shared: string;
  info_version: string;
  shared_on: string | null;
  response: string;
  questions: string;
  documents_requested: string;
  indicative_amount: number; // paise
  next_action: string;
  next_action_due: string;
  pass_reason: string;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: ID;
  match_id: ID | null;
  startup_id: ID | null;
  investor_id: ID | null;
  meeting_type: string; // Exploratory | Virtual pitch | Pitch day 1:1 | Follow-on
  scheduled_at: string;
  held_at: string | null;
  attendees: string;
  /** Searchable minutes - free text so the whole record can be searched. */
  minutes: string;
  minutes_acknowledged: 0 | 1;
  created_at: string;
}

export interface VirtualPitch {
  id: ID;
  startup_id: ID;
  match_id: ID | null;
  investor_id: ID | null;
  scheduled_at: string;
  duration_pitch_min: number; // SOP: 5
  duration_qa_min: number; // SOP: 5
  attended: 0 | 1;
  material_shared: string;
  investor_questions: string;
  responses: string;
  response: string; // PITCH_RESPONSE
  /** "Ready to Invest" confirms amount/terms; it is NOT deployed capital. */
  amount_confirmed: number; // paise
  terms_confirmed: string;
  created_at: string;
}

export interface PitchDay {
  id: ID;
  startup_id: ID;
  episode_no: string;
  scheduled_at: string;
  irr_distributed: 0 | 1;
  information_memorandum_distributed: 0 | 1;
  outcome: string;
  golden_pass_issuer_investor_id: ID | null;
  golden_pass_evidence: string;
  follow_on_interest: string;
  further_discussion_deadline: string;
  created_at: string;
}

export interface PitchDaySlot {
  id: ID;
  pitch_day_id: ID;
  investor_id: ID;
  slot_time: string;
  held: 0 | 1;
  outcome: string; // PITCH_DAY_OUTCOME
  notes: string;
}

export interface CommitteeDecision {
  id: ID;
  startup_id: ID;
  pack_summary: string;
  outcome: string; // COMMITTEE_OUTCOME
  conditions: string;
  approver_id: ID | null;
  decided_on: string | null;
  re_review_date: string;
  created_at: string;
}

export interface PreShootConfirmation {
  id: ID;
  startup_id: ID;
  episode_no: string;
  panel_summary: string;
  written_commitment_ref: string;
  valuation_boundaries: string;
  decision_parameters: string;
  production_briefing_done: 0 | 1;
  outstanding_issues: string;
  required_documentation: string;
  irr_shared_on: string | null;
  shoot_date: string | null;
  created_at: string;
}

/* --------------------------- Investment -------------------------------- */

export interface Commitment {
  id: ID;
  startup_id: ID;
  investor_id: ID;
  status: string; // COMMITMENT_STATUS
  amount: number; // paise
  valuation: string;
  terms: string;
  evidence: string;
  is_golden_pass: 0 | 1;
  written_on: string | null;
  confirmed_on: string | null;
  revised_from_id: ID | null;
  revision_reason: string;
  created_at: string;
}

export interface FundingRound {
  id: ID;
  startup_id: ID;
  name: string;
  target_amount: number; // paise
  status: string; // DEAL_STATUS
  closure_owner_id: ID | null;
  expected_close_on: string;
  created_at: string;
}

export interface Deal {
  id: ID;
  funding_round_id: ID;
  startup_id: ID;
  investor_id: ID;
  commitment_id: ID | null;
  status: string; // DEAL_STATUS
  committed_amount: number; // paise
  agreed_terms: string;
  valuation: string;
  communication_thread_opened_at: string | null; // SOP: within 48h
  communication_thread_due: string;
  milestone_dates: string; // JSON
  open_documents: string;
  open_conditions: string;
  blocker: string;
  responsible_id: ID | null;
  next_action: string;
  withdrawal_reason: string;
  replacement_investor_id: ID | null;
  closed_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface DealDocument {
  id: ID;
  deal_id: ID;
  /** Purpose drives requirement, not the document title (SOP 11: shoot-day signatures). */
  purpose: string;
  document_type: string;
  status: string; // DOCUMENT_STATUS
  version: number;
  received_on: string | null;
  signed_on: string | null;
  signer: string;
  notes: string;
}

export interface Tranche {
  id: ID;
  deal_id: ID;
  seq: number;
  scheduled_amount: number; // paise
  scheduled_on: string;
  reported_on: string | null;
  reported_amount: number; // paise
  startup_confirmed_on: string | null;
  evidence: string;
  verified_amount: number; // paise
  verified_on: string | null;
  verifier_id: ID | null;
  status: string; // TRANCHE_STATUS
  /** Set when funds were returned; links the reversal to the original tranche. */
  reversal_of_id: ID | null;
  reversal_reason: string;
  created_at: string;
}

/* ----------------------------- Finance --------------------------------- */

export interface UpfrontFee {
  id: ID;
  startup_id: ID;
  season_id: ID;
  committee_decision_id: ID | null;
  initial_interest_announced_on: string;
  financial_year: string;
  turnover: number; // paise
  turnover_evidence: string;
  fee_schedule_code: string;
  fee_schedule_version: string;
  fee_amount: number; // paise
  approved_exception: string;
  approved_by_id: ID | null;
  invoice_no: string;
  invoice_date: string | null;
  due_date: string | null;
  payment_reference: string;
  paid_amount: number; // paise
  outstanding: number; // paise (derived, stored for reporting)
  status: string; // UPFRONT_FEE_STATUS
  extension_approved: 0 | 1;
  original_due_date: string | null; // preserved when an extension is approved
  waiver_amount: number; // paise
  refund_amount: number; // paise
  credit_note_ref: string;
  late_payment_reason: string;
  management_decision: string;
  created_at: string;
  updated_at: string;
}

export interface SuccessFee {
  id: ID;
  startup_id: ID;
  deal_id: ID | null;
  funding_round_id: ID | null;
  agreement_ref: string;
  eligible_funding: number; // paise
  excluded_funding: number; // paise
  fee_structure: string; // percentage | fixed | slab
  fee_percent: number; // e.g. 2.0
  slab_definition: string; // JSON
  fee_cap: number; // paise
  sourcing_arrangement: string;
  upfront_adjustable: 0 | 1; // agreement decides; never auto-deducted
  upfront_adjustment: number; // paise
  forecast_fee: number; // paise
  fee_due: number; // paise
  invoiced_amount: number; // paise
  collected_amount: number; // paise
  outstanding: number; // paise (derived, stored)
  discount: number; // paise
  waiver_amount: number; // paise
  partner_settlement: number; // paise
  tax_amount: number; // paise
  withholding_amount: number; // paise
  invoice_no: string;
  invoice_date: string | null;
  due_date: string | null;
  status: string; // SUCCESS_FEE_STATUS
  triggered_on: string | null;
  reconciled_on: string | null;
  dispute_note: string;
  created_at: string;
  updated_at: string;
}

export interface LedgerEntry {
  id: ID;
  startup_id: ID;
  entry_type: string; // upfront_charge | success_fee | receipt | tax | withholding | credit | refund | partner_settlement | adjustment
  reference: string;
  amount: number; // paise, signed
  currency: string;
  occurred_on: string;
  source_type: string; // upfront_fee | success_fee | manual
  source_id: ID | null;
  memo: string;
  created_by_id: ID | null;
  created_at: string;
}

/* ---------------------------- Production -------------------------------- */

export interface ProductionHandover {
  id: ID;
  startup_id: ID;
  status: string; // HANDOVER_STATUS
  selection_approved: 0 | 1;
  payment_cleared: 0 | 1; // AV shoot handover follows COMPLETED payment
  advance_notified: 0 | 1; // production may be notified at selection/fee initiation
  pack_summary: string;
  permitted_business_information: string;
  handed_over_on: string | null;
  accepted_on: string | null;
  accepted_by_id: ID | null;
  created_at: string;
}

export interface AvShoot {
  id: ID;
  startup_id: ID;
  status: string; // AV_SHOOT_STATUS
  story_research: string;
  location: string;
  crew: string;
  schedule_on: string | null;
  founder_availability: string;
  shot_requirements: string;
  completed_on: string | null;
  asset_links: string;
  created_at: string;
}

export interface MockShoot {
  id: ID;
  startup_id: ID;
  status: string; // MOCK_SHOOT_STATUS
  scheduled_on: string | null;
  costumes_properties: string;
  pitch_revisions: string;
  product_demo_ready: 0 | 1;
  stage_movement_rehearsed: 0 | 1;
  final_ask: number; // paise
  valuation_information: string;
  open_actions: string;
  final_readiness_approved_on: string | null;
  final_readiness_by_id: ID | null;
  created_at: string;
}

export interface MainShoot {
  id: ID;
  startup_id: ID;
  episode_no: string;
  status: string; // MAIN_SHOOT_STATUS
  scheduled_on: string | null;
  completed_on: string | null;
  founder_attendance: string;
  investor_attendance: string;
  live_ask: number; // paise
  live_offers: string;
  accepted_deal_terms: string;
  lead_investor_id: ID | null;
  co_investor_allocations: string; // JSON
  conditions: string;
  investment_commitment_letter_ref: string;
  startup_deal_acceptance_letter_ref: string;
  signature_completed_on: string | null;
  outstanding_actions: string;
  created_at: string;
}

export interface Episode {
  id: ID;
  startup_id: ID;
  episode_no: string;
  shoot_completed_on: string | null;
  editing_status: string;
  approvals_status: string;
  status: string; // EPISODE_STATUS
  created_at: string;
}

export interface Telecast {
  id: ID;
  startup_id: ID;
  episode_no: string;
  telecast_date: string | null;
  status: string; // TELECAST_STATUS
  founder_notified_on: string | null;
  promo_requirements: string;
  promo_assets_approved: string;
  founder_posting_done: 0 | 1;
  post_telecast_activity: string;
  founder_feedback: string;
  public_announcement: string;
  announced_amount: number; // paise - publicly announced
  committed_amount: number; // paise - contractually committed
  verified_deployed_amount: number; // paise - verified as received
  created_at: string;
}

/* ----------------------------- Community -------------------------------- */

export interface CommunityMember {
  id: ID;
  /** A founder who is also a mentor/investor keeps ONE person record with several roles. */
  person_id: ID | null;
  name: string;
  email: string;
  phone: string;
  member_type: string; // MEMBER_TYPE
  organisation: string;
  sector: string;
  geography: string;
  interests: string;
  relationship_owner_id: ID | null;
  communication_preferences: string;
  consent_marketing: 0 | 1;
  consent_contact: 0 | 1;
  /** Membership never grants access to confidential deal information. */
  confidential_access: 0 | 1;
  startup_id: ID | null;
  engagement_summary: string;
  created_at: string;
}

export interface CommunityMemberRole {
  id: ID;
  member_id: ID;
  role: string; // MEMBER_TYPE
  since: string;
  notes: string;
}

export interface CommunityEvent {
  id: ID;
  name: string;
  event_type: string; // Founder meetup | Investor session | Sector roundtable | Partner programme | Mentoring clinic | Alumni
  purpose: string;
  owner_id: ID | null;
  budget: number; // paise
  scheduled_on: string;
  status: string; // EVENT_STATUS
  registrations: number;
  attendance: number;
  feedback_score: number;
  follow_up_tasks: string;
  outcomes: string;
  created_at: string;
}

export interface EventRegistration {
  id: ID;
  event_id: ID;
  member_id: ID;
  registered: 0 | 1;
  attended: 0 | 1;
  feedback: string;
}

export interface Referral {
  id: ID;
  source_type: string; // community_member | event | partner | investor | employee
  source_id: ID | null;
  source_name: string;
  referred_name: string;
  referred_type: string; // startup_application | investor_lead
  startup_id: ID | null;
  investor_id: ID | null;
  status: string; // REFERRAL_STATUS
  /** Original source and later contributors are stored separately. */
  original_contributor: string;
  additional_contributors: string;
  outcome: string;
  outcome_amount: number; // paise
  created_at: string;
  updated_at: string;
}

export interface SupportRequest {
  id: ID;
  member_id: ID;
  startup_id: ID | null;
  request_type: string; // investor_introduction | mentoring | customer_connection | hiring | follow_on_funding
  detail: string;
  owner_id: ID | null;
  due_date: string;
  status: string; // SUPPORT_REQUEST_STATUS
  outcome: string;
  founder_feedback: string;
  created_at: string;
}

/* ------------------------ ERP-wide / platform --------------------------- */

export interface Task {
  id: ID;
  title: string;
  description: string;
  department: string;
  module: string;
  entity_type: string | null;
  entity_id: ID | null;
  owner_id: ID | null;
  due_date: string;
  /** Owner -> due date -> required output -> evidence -> approver -> next action */
  required_output: string;
  evidence: string;
  approver_id: ID | null;
  next_action: string;
  status: string; // TASK_STATUS
  priority: string; // TASK_PRIORITY
  escalation_status: string; // ESCALATION_STATUS
  escalated_on: string | null;
  escalation_reason: string;
  completed_on: string | null;
  created_at: string;
  updated_at: string;
}

export interface Handover {
  id: ID;
  from_department: string;
  to_department: string;
  entity_type: string;
  entity_id: ID;
  summary: string;
  status: string; // HANDOVER_STATUS
  accepted_by_id: ID | null;
  accepted_on: string | null;
  rejected_reason: string;
  created_at: string;
}

export interface DocumentRecord {
  id: ID;
  entity_type: string;
  entity_id: ID;
  title: string;
  purpose: string;
  category: string;
  version: number;
  status: string; // DOCUMENT_STATUS
  file_ref: string;
  uploaded_by_id: ID | null;
  uploaded_on: string;
  notes: string;
}

export interface AuditEvent {
  id: ID;
  actor_id: ID | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: ID;
  field: string;
  before_value: string;
  after_value: string;
  reason: string;
  created_at: string;
}

export interface Policy {
  id: ID;
  code: string;
  title: string;
  category: string;
  value: string; // JSON
  status: string; // draft | approved | superseded
  effective_from: string;
  approved_by_id: ID | null;
  approved_on: string | null;
  superseded_by_id: ID | null;
  notes: string;
  created_at: string;
}

export interface PolicyRevision {
  id: ID;
  policy_id: ID;
  version: number;
  value: string;
  changed_by_id: ID | null;
  changed_on: string;
  reason: string;
}

export interface FeeSlab {
  id: ID;
  schedule_code: string;
  schedule_version: string;
  turnover_min: number; // paise
  turnover_max: number | null; // paise, null = unbounded
  fee_amount: number; // paise (fixed) - percentage handled by policy
  effective_from: string;
}

export interface WorkingDayCalendar {
  id: ID;
  name: string;
  region: string;
  holidays: string; // JSON array of ISO dates
  working_days: string; // e.g. "1,2,3,4,5"
}

export interface Integration {
  id: ID;
  name: string;
  category: string; // sanchi_connect | accounting | communication
  status: string; // connected | degraded | disconnected | not_configured
  last_sync_at: string | null;
  last_sync_status: string;
  records_synced: number;
  failed_sync_alerts: number;
  last_error: string;
  config: string;
}

export interface SyncRun {
  id: ID;
  integration_id: ID;
  started_at: string;
  finished_at: string | null;
  status: string; // success | failed | partial
  records: number;
  error: string;
}

export interface ImportBatch {
  id: ID;
  entity_type: string;
  file_name: string;
  rows: number;
  imported: number;
  skipped: number;
  duplicates: number;
  status: string;
  started_at: string;
  finished_at: string | null;
  log: string;
}

export interface NotificationRecord {
  id: ID;
  recipient_id: ID | null;
  recipient_role: string;
  title: string;
  body: string;
  entity_type: string;
  entity_id: ID;
  created_at: string;
  read_at: string | null;
}
