/**
 * SQLite DDL for the application.
 *
 * Money columns hold paise (integers). JSON-shaped fields (allocations, milestone dates,
 * slab definitions) are stored as TEXT and parsed in the repository layer.
 */

export const SCHEMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS seasons (
  id TEXT PRIMARY KEY, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'live', starts_on TEXT NOT NULL, ends_on TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL, department TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
  -- 'staff' is an internal console user; 'founder' is an external startup-side login
  -- pinned to one startup via startup_id; 'investor' is an external investor-side login
  -- pinned to one investor record via investor_id.
  kind TEXT NOT NULL DEFAULT 'staff', startup_id TEXT, investor_id TEXT
);

CREATE TABLE IF NOT EXISTS startups (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, legal_entity TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL DEFAULT 'Private Limited', sector TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'early_revenue', geography TEXT NOT NULL DEFAULT '',
  business_model TEXT NOT NULL DEFAULT '', website TEXT NOT NULL DEFAULT '',
  cin TEXT NOT NULL DEFAULT '', gstin TEXT NOT NULL DEFAULT '', pan TEXT NOT NULL DEFAULT '',
  incorporated_on TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
  -- Startup-side (founder) profile. The applicant maintains this; staff read it.
  category TEXT NOT NULL DEFAULT 'startup',        -- startup | sme
  pitch TEXT NOT NULL DEFAULT '',                  -- elevator pitch
  logo_ref TEXT NOT NULL DEFAULT '',
  product_stage TEXT NOT NULL DEFAULT '',          -- idea | prototype | launched | scaling
  revenue_stage TEXT NOT NULL DEFAULT '',          -- pre_revenue | early_revenue | growth
  target_fundraise INTEGER NOT NULL DEFAULT 0,     -- paise
  technologies TEXT NOT NULL DEFAULT '',
  industries TEXT NOT NULL DEFAULT '',
  monthly_revenue INTEGER NOT NULL DEFAULT 0,      -- paise
  customer_count INTEGER NOT NULL DEFAULT 0,
  traction TEXT NOT NULL DEFAULT '',
  funding_raised INTEGER NOT NULL DEFAULT 0,       -- paise
  pitch_deck_ref TEXT NOT NULL DEFAULT '',
  video_pitch_ref TEXT NOT NULL DEFAULT '',
  profile_status TEXT NOT NULL DEFAULT 'incomplete', -- incomplete | submitted | approved | rejected
  profile_submitted_at TEXT, profile_reviewed_at TEXT, profile_review_notes TEXT NOT NULL DEFAULT '',
  origin_country TEXT NOT NULL DEFAULT 'India',
  registered INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS founders (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'Founder', email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', linkedin TEXT NOT NULL DEFAULT '',
  is_primary INTEGER NOT NULL DEFAULT 0, restricted_to_analyst INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_founders_startup ON founders(startup_id);

CREATE TABLE IF NOT EXISTS programs (
  id TEXT PRIMARY KEY, season_id TEXT NOT NULL REFERENCES seasons(id),
  slug TEXT NOT NULL, title TEXT NOT NULL, code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open',            -- draft | open | closed
  opens_on TEXT NOT NULL DEFAULT '', closes_on TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '', eligibility TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_programs_season ON programs(season_id);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY, season_id TEXT NOT NULL REFERENCES seasons(id),
  startup_id TEXT NOT NULL REFERENCES startups(id), reference_no TEXT NOT NULL UNIQUE,
  program_id TEXT,
  source TEXT NOT NULL DEFAULT '', referring_partner TEXT NOT NULL DEFAULT '',
  campaign TEXT NOT NULL DEFAULT '', relationship_manager_id TEXT,
  stage_at_application TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'draft',
  completion_pct INTEGER NOT NULL DEFAULT 0, submitted_at TEXT, acknowledged_at TEXT,
  duplicate_of TEXT, notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_applications_startup ON applications(startup_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

CREATE TABLE IF NOT EXISTS screenings (
  id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id),
  reviewer_id TEXT, completeness INTEGER, documents INTEGER,
  unique_idea INTEGER, revenue INTEGER, traction INTEGER, past_funding INTEGER,
  founder_capability INTEGER, incubation INTEGER,
  ip_defensibility INTEGER, total INTEGER NOT NULL DEFAULT 0, outcome TEXT NOT NULL DEFAULT 'pending',
  comments TEXT NOT NULL DEFAULT '', evidence TEXT NOT NULL DEFAULT '',
  submitted_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_screenings_application ON screenings(application_id);

CREATE TABLE IF NOT EXISTS bootcamp_attendance (
  id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id),
  invited_on TEXT NOT NULL DEFAULT '', registered INTEGER NOT NULL DEFAULT 0, attended_on TEXT,
  process_briefing_done INTEGER NOT NULL DEFAULT 0, readiness_session_done INTEGER NOT NULL DEFAULT 0,
  mou_briefing_done INTEGER NOT NULL DEFAULT 0, fee_briefing_done INTEGER NOT NULL DEFAULT 0,
  questions TEXT NOT NULL DEFAULT '', actions_assigned TEXT NOT NULL DEFAULT '',
  acknowledgement TEXT NOT NULL DEFAULT '', acknowledged_on TEXT,
  preparation_completed INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_invited',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS analyst_evaluations (
  id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id),
  analyst_id TEXT, thesis_fit INTEGER NOT NULL DEFAULT 0, market_opportunity INTEGER NOT NULL DEFAULT 0,
  traction INTEGER NOT NULL DEFAULT 0, business_model INTEGER NOT NULL DEFAULT 0,
  competitive_positioning INTEGER NOT NULL DEFAULT 0, willingness_to_invest INTEGER NOT NULL DEFAULT 0,
  indicative_amount INTEGER NOT NULL DEFAULT 0, recommendation TEXT NOT NULL DEFAULT 'pending',
  decision_reason TEXT NOT NULL DEFAULT '', outstanding_concern TEXT NOT NULL DEFAULT '',
  evaluated_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analyst_application ON analyst_evaluations(application_id);

CREATE TABLE IF NOT EXISTS mous (
  id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id),
  shared_on TEXT NOT NULL DEFAULT '', legal_ama_due TEXT NOT NULL DEFAULT '', legal_ama_on TEXT,
  signing_deadline TEXT NOT NULL DEFAULT '', signed_on TEXT, status TEXT NOT NULL DEFAULT 'not_started',
  commercial_schedule TEXT NOT NULL DEFAULT '', approved_exceptions TEXT NOT NULL DEFAULT '',
  response TEXT NOT NULL DEFAULT '', discontinued_reason TEXT NOT NULL DEFAULT '',
  founder_email TEXT NOT NULL DEFAULT '', escalated_to_management INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS irr_reports (
  id TEXT PRIMARY KEY, application_id TEXT NOT NULL REFERENCES applications(id),
  version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'not_requested',
  requested_on TEXT NOT NULL DEFAULT '', handover_accepted_on TEXT, checklist_sent_on TEXT,
  prepared_on TEXT, reviewed_by_id TEXT, approved_on TEXT, approved_by_id TEXT,
  shared_with_ir_on TEXT, document_ref TEXT NOT NULL DEFAULT '',
  missing_documents TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

-- Each investor view of an IRR. The report is view-only and cannot be downloaded
-- (00_Master_Brief §9), so this log is the durable record that the investor saw it.
CREATE TABLE IF NOT EXISTS irr_views (
  id TEXT PRIMARY KEY, irr_report_id TEXT NOT NULL REFERENCES irr_reports(id),
  startup_id TEXT NOT NULL DEFAULT '', investor_id TEXT NOT NULL DEFAULT '',
  match_id TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1,
  viewed_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_irr_views_report ON irr_views(irr_report_id);

CREATE TABLE IF NOT EXISTS investors (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'HNI',
  investing_entity TEXT NOT NULL DEFAULT '', source TEXT NOT NULL DEFAULT '',
  referral_relationship TEXT NOT NULL DEFAULT '', decision_maker TEXT NOT NULL DEFAULT '',
  authorised_representative TEXT NOT NULL DEFAULT '', sector_focus TEXT NOT NULL DEFAULT '',
  stage_focus TEXT NOT NULL DEFAULT '', geography TEXT NOT NULL DEFAULT '',
  thesis TEXT NOT NULL DEFAULT '', ticket_min INTEGER NOT NULL DEFAULT 0,
  ticket_max INTEGER NOT NULL DEFAULT 0, proposed_season_allocation INTEGER NOT NULL DEFAULT 0,
  max_per_startup INTEGER NOT NULL DEFAULT 0,
  portfolio TEXT NOT NULL DEFAULT '', reference_checks TEXT NOT NULL DEFAULT '',
  verification_evidence TEXT NOT NULL DEFAULT '', availability TEXT NOT NULL DEFAULT '',
  expected_decision_timeline TEXT NOT NULL DEFAULT '', relationship_owner_id TEXT,
  status TEXT NOT NULL DEFAULT 'sourced', grade TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS investor_agreements (
  id TEXT PRIMARY KEY, investor_id TEXT NOT NULL REFERENCES investors(id),
  document_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'requested', signed_on TEXT,
  reference TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS investor_grade_assessments (
  id TEXT PRIMARY KEY, investor_id TEXT NOT NULL REFERENCES investors(id),
  grade TEXT NOT NULL, dimension TEXT NOT NULL DEFAULT '', score INTEGER NOT NULL DEFAULT 0,
  evidence TEXT NOT NULL DEFAULT '', reviewer_id TEXT, approved_on TEXT,
  permitted_engagement TEXT NOT NULL DEFAULT '', panel_role TEXT NOT NULL DEFAULT '',
  review_date TEXT NOT NULL DEFAULT '', change_reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  investor_id TEXT NOT NULL REFERENCES investors(id), score INTEGER NOT NULL DEFAULT 0,
  score_reasons TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'suggested',
  approved_for_circulation_by_id TEXT, information_shared TEXT NOT NULL DEFAULT '',
  info_version TEXT NOT NULL DEFAULT '', shared_on TEXT, response TEXT NOT NULL DEFAULT '',
  questions TEXT NOT NULL DEFAULT '', documents_requested TEXT NOT NULL DEFAULT '',
  indicative_amount INTEGER NOT NULL DEFAULT 0, next_action TEXT NOT NULL DEFAULT '',
  next_action_due TEXT NOT NULL DEFAULT '', pass_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_matches_startup ON matches(startup_id);
CREATE INDEX IF NOT EXISTS idx_matches_investor ON matches(investor_id);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY, match_id TEXT, startup_id TEXT, investor_id TEXT,
  season_id TEXT NOT NULL DEFAULT '',
  meeting_type TEXT NOT NULL DEFAULT 'Exploratory', scheduled_at TEXT NOT NULL DEFAULT '',
  held_at TEXT, attendees TEXT NOT NULL DEFAULT '', minutes TEXT NOT NULL DEFAULT '',
  minutes_acknowledged INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS virtual_pitches (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id), match_id TEXT,
  season_id TEXT NOT NULL DEFAULT '',
  investor_id TEXT, scheduled_at TEXT NOT NULL DEFAULT '', duration_pitch_min INTEGER NOT NULL DEFAULT 5,
  duration_qa_min INTEGER NOT NULL DEFAULT 5, attended INTEGER NOT NULL DEFAULT 0,
  material_shared TEXT NOT NULL DEFAULT '', investor_questions TEXT NOT NULL DEFAULT '',
  responses TEXT NOT NULL DEFAULT '', response TEXT NOT NULL DEFAULT 'no_response',
  amount_confirmed INTEGER NOT NULL DEFAULT 0, terms_confirmed TEXT NOT NULL DEFAULT '',
  meet_link TEXT NOT NULL DEFAULT '', missed INTEGER NOT NULL DEFAULT 0,
  reschedule_reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pitch_days (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  episode_no TEXT NOT NULL DEFAULT '', scheduled_at TEXT NOT NULL DEFAULT '',
  irr_distributed INTEGER NOT NULL DEFAULT 0, information_memorandum_distributed INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'one_to_one_held', golden_pass_issuer_investor_id TEXT,
  golden_pass_evidence TEXT NOT NULL DEFAULT '', follow_on_interest TEXT NOT NULL DEFAULT '',
  further_discussion_deadline TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pitch_day_slots (
  id TEXT PRIMARY KEY, pitch_day_id TEXT NOT NULL REFERENCES pitch_days(id),
  investor_id TEXT NOT NULL, slot_time TEXT NOT NULL DEFAULT '', held INTEGER NOT NULL DEFAULT 0,
  outcome TEXT NOT NULL DEFAULT 'one_to_one_held', notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS committee_decisions (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  pack_summary TEXT NOT NULL DEFAULT '', outcome TEXT NOT NULL DEFAULT 'pending',
  conditions TEXT NOT NULL DEFAULT '', approver_id TEXT, decided_on TEXT,
  re_review_date TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pre_shoot_confirmations (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  episode_no TEXT NOT NULL DEFAULT '', panel_summary TEXT NOT NULL DEFAULT '',
  written_commitment_ref TEXT NOT NULL DEFAULT '', valuation_boundaries TEXT NOT NULL DEFAULT '',
  decision_parameters TEXT NOT NULL DEFAULT '', production_briefing_done INTEGER NOT NULL DEFAULT 0,
  outstanding_issues TEXT NOT NULL DEFAULT '', required_documentation TEXT NOT NULL DEFAULT '',
  irr_shared_on TEXT, shoot_date TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS commitments (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  investor_id TEXT NOT NULL REFERENCES investors(id), status TEXT NOT NULL DEFAULT 'indicative',
  amount INTEGER NOT NULL DEFAULT 0, valuation TEXT NOT NULL DEFAULT '',
  terms TEXT NOT NULL DEFAULT '', evidence TEXT NOT NULL DEFAULT '',
  is_golden_pass INTEGER NOT NULL DEFAULT 0, written_on TEXT, confirmed_on TEXT,
  revised_from_id TEXT, revision_reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_commitments_startup ON commitments(startup_id);

CREATE TABLE IF NOT EXISTS funding_rounds (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL, target_amount INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'not_started', closure_owner_id TEXT,
  expected_close_on TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS deals (
  id TEXT PRIMARY KEY, funding_round_id TEXT NOT NULL REFERENCES funding_rounds(id),
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id), investor_id TEXT NOT NULL REFERENCES investors(id),
  commitment_id TEXT, status TEXT NOT NULL DEFAULT 'not_started',
  committed_amount INTEGER NOT NULL DEFAULT 0, agreed_terms TEXT NOT NULL DEFAULT '',
  valuation TEXT NOT NULL DEFAULT '', communication_thread_opened_at TEXT,
  communication_thread_due TEXT NOT NULL DEFAULT '', milestone_dates TEXT NOT NULL DEFAULT '{}',
  open_documents TEXT NOT NULL DEFAULT '', open_conditions TEXT NOT NULL DEFAULT '',
  blocker TEXT NOT NULL DEFAULT '', responsible_id TEXT, next_action TEXT NOT NULL DEFAULT '',
  withdrawal_reason TEXT NOT NULL DEFAULT '', replacement_investor_id TEXT, closed_on TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_deals_startup ON deals(startup_id);
CREATE INDEX IF NOT EXISTS idx_deals_investor ON deals(investor_id);

CREATE TABLE IF NOT EXISTS deal_documents (
  id TEXT PRIMARY KEY, deal_id TEXT NOT NULL REFERENCES deals(id),
  season_id TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL DEFAULT '', document_type TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'requested', version INTEGER NOT NULL DEFAULT 1,
  received_on TEXT, signed_on TEXT, signer TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS tranches (
  id TEXT PRIMARY KEY, deal_id TEXT NOT NULL REFERENCES deals(id), seq INTEGER NOT NULL DEFAULT 1,
  season_id TEXT NOT NULL DEFAULT '',
  scheduled_amount INTEGER NOT NULL DEFAULT 0, scheduled_on TEXT NOT NULL DEFAULT '',
  reported_on TEXT, reported_amount INTEGER NOT NULL DEFAULT 0, startup_confirmed_on TEXT,
  evidence TEXT NOT NULL DEFAULT '', verified_amount INTEGER NOT NULL DEFAULT 0,
  verified_on TEXT, verifier_id TEXT, status TEXT NOT NULL DEFAULT 'scheduled',
  reversal_of_id TEXT, reversal_reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tranches_deal ON tranches(deal_id);

CREATE TABLE IF NOT EXISTS upfront_fees (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL REFERENCES seasons(id), committee_decision_id TEXT,
  initial_interest_announced_on TEXT NOT NULL DEFAULT '', financial_year TEXT NOT NULL DEFAULT '',
  turnover INTEGER NOT NULL DEFAULT 0, turnover_evidence TEXT NOT NULL DEFAULT '',
  fee_schedule_code TEXT NOT NULL DEFAULT '', fee_schedule_version TEXT NOT NULL DEFAULT '',
  fee_amount INTEGER NOT NULL DEFAULT 0, approved_exception TEXT NOT NULL DEFAULT '',
  approved_by_id TEXT, invoice_no TEXT NOT NULL DEFAULT '', invoice_date TEXT, due_date TEXT,
  payment_reference TEXT NOT NULL DEFAULT '', paid_amount INTEGER NOT NULL DEFAULT 0,
  outstanding INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'not_initiated',
  extension_approved INTEGER NOT NULL DEFAULT 0, original_due_date TEXT,
  waiver_amount INTEGER NOT NULL DEFAULT 0, refund_amount INTEGER NOT NULL DEFAULT 0,
  credit_note_ref TEXT NOT NULL DEFAULT '', late_payment_reason TEXT NOT NULL DEFAULT '',
  dispute_note TEXT NOT NULL DEFAULT '',
  management_decision TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_upfront_startup ON upfront_fees(startup_id);

CREATE TABLE IF NOT EXISTS success_fees (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id), deal_id TEXT,
  season_id TEXT NOT NULL DEFAULT '',
  funding_round_id TEXT, agreement_ref TEXT NOT NULL DEFAULT '',
  eligible_funding INTEGER NOT NULL DEFAULT 0, excluded_funding INTEGER NOT NULL DEFAULT 0,
  fee_structure TEXT NOT NULL DEFAULT 'percentage', fee_percent REAL NOT NULL DEFAULT 0,
  slab_definition TEXT NOT NULL DEFAULT '[]', fee_cap INTEGER NOT NULL DEFAULT 0,
  sourcing_arrangement TEXT NOT NULL DEFAULT '', upfront_adjustable INTEGER NOT NULL DEFAULT 0,
  upfront_adjustment INTEGER NOT NULL DEFAULT 0, forecast_fee INTEGER NOT NULL DEFAULT 0,
  fee_due INTEGER NOT NULL DEFAULT 0, invoiced_amount INTEGER NOT NULL DEFAULT 0,
  collected_amount INTEGER NOT NULL DEFAULT 0, outstanding INTEGER NOT NULL DEFAULT 0,
  discount INTEGER NOT NULL DEFAULT 0, waiver_amount INTEGER NOT NULL DEFAULT 0,
  partner_settlement INTEGER NOT NULL DEFAULT 0, tax_amount INTEGER NOT NULL DEFAULT 0,
  withholding_amount INTEGER NOT NULL DEFAULT 0, invoice_no TEXT NOT NULL DEFAULT '',
  invoice_date TEXT, due_date TEXT, status TEXT NOT NULL DEFAULT 'not_triggered',
  triggered_on TEXT, reconciled_on TEXT, dispute_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_success_startup ON success_fees(startup_id);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  entry_type TEXT NOT NULL, reference TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR', occurred_on TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'manual', source_id TEXT, memo TEXT NOT NULL DEFAULT '',
  created_by_id TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ledger_startup ON ledger_entries(startup_id);

CREATE TABLE IF NOT EXISTS production_handovers (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', selection_approved INTEGER NOT NULL DEFAULT 0,
  payment_cleared INTEGER NOT NULL DEFAULT 0, advance_notified INTEGER NOT NULL DEFAULT 0,
  pack_summary TEXT NOT NULL DEFAULT '', permitted_business_information TEXT NOT NULL DEFAULT '',
  handed_over_on TEXT, accepted_on TEXT, accepted_by_id TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS av_shoots (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started', story_research TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '', crew TEXT NOT NULL DEFAULT '', schedule_on TEXT,
  founder_availability TEXT NOT NULL DEFAULT '', shot_requirements TEXT NOT NULL DEFAULT '',
  completed_on TEXT, asset_links TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mock_shoots (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'not_started', scheduled_on TEXT,
  costumes_properties TEXT NOT NULL DEFAULT '', pitch_revisions TEXT NOT NULL DEFAULT '',
  product_demo_ready INTEGER NOT NULL DEFAULT 0, stage_movement_rehearsed INTEGER NOT NULL DEFAULT 0,
  final_ask INTEGER NOT NULL DEFAULT 0, valuation_information TEXT NOT NULL DEFAULT '',
  open_actions TEXT NOT NULL DEFAULT '', final_readiness_approved_on TEXT,
  final_readiness_by_id TEXT, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS main_shoots (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  episode_no TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'not_started',
  scheduled_on TEXT, completed_on TEXT, founder_attendance TEXT NOT NULL DEFAULT '',
  investor_attendance TEXT NOT NULL DEFAULT '', live_ask INTEGER NOT NULL DEFAULT 0,
  live_offers TEXT NOT NULL DEFAULT '', accepted_deal_terms TEXT NOT NULL DEFAULT '',
  lead_investor_id TEXT, co_investor_allocations TEXT NOT NULL DEFAULT '[]',
  conditions TEXT NOT NULL DEFAULT '', investment_commitment_letter_ref TEXT NOT NULL DEFAULT '',
  startup_deal_acceptance_letter_ref TEXT NOT NULL DEFAULT '', signature_completed_on TEXT,
  outstanding_actions TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS episodes (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  episode_no TEXT NOT NULL DEFAULT '', shoot_completed_on TEXT,
  editing_status TEXT NOT NULL DEFAULT 'not_started', approvals_status TEXT NOT NULL DEFAULT 'not_started',
  status TEXT NOT NULL DEFAULT 'not_allocated', created_at TEXT NOT NULL
);

-- A signing event is what drives a document, not the document's title (doc 06 §4). The target
-- date and the final deadline are tracked separately, so the 24-hour sign-off control and the
-- immediate-execution expectation can both be honoured (doc 11 open item).
CREATE TABLE IF NOT EXISTS signing_events (
  id TEXT PRIMARY KEY,
  main_shoot_id TEXT NOT NULL REFERENCES main_shoots(id),
  startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  required_document_purpose TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  target_on TEXT,
  final_deadline TEXT,
  signed_on TEXT,
  signed_by_id TEXT,
  document_ref TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_signing_events_shoot ON signing_events(main_shoot_id, status);

CREATE TABLE IF NOT EXISTS telecasts (
  id TEXT PRIMARY KEY, startup_id TEXT NOT NULL REFERENCES startups(id),
  season_id TEXT NOT NULL DEFAULT '',
  episode_no TEXT NOT NULL DEFAULT '', telecast_date TEXT, status TEXT NOT NULL DEFAULT 'not_scheduled',
  founder_notified_on TEXT, promo_requirements TEXT NOT NULL DEFAULT '',
  promo_assets_approved TEXT NOT NULL DEFAULT '', founder_posting_done INTEGER NOT NULL DEFAULT 0,
  post_telecast_activity TEXT NOT NULL DEFAULT '', founder_feedback TEXT NOT NULL DEFAULT '',
  public_announcement TEXT NOT NULL DEFAULT '', announced_amount INTEGER NOT NULL DEFAULT 0,
  committed_amount INTEGER NOT NULL DEFAULT 0, verified_deployed_amount INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_members (
  id TEXT PRIMARY KEY, person_id TEXT, name TEXT NOT NULL, email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '', member_type TEXT NOT NULL DEFAULT 'applicant',
  organisation TEXT NOT NULL DEFAULT '', sector TEXT NOT NULL DEFAULT '',
  geography TEXT NOT NULL DEFAULT '', interests TEXT NOT NULL DEFAULT '',
  relationship_owner_id TEXT, communication_preferences TEXT NOT NULL DEFAULT '',
  consent_marketing INTEGER NOT NULL DEFAULT 0, consent_contact INTEGER NOT NULL DEFAULT 0,
  confidential_access INTEGER NOT NULL DEFAULT 0, startup_id TEXT,
  engagement_summary TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_member_roles (
  id TEXT PRIMARY KEY, member_id TEXT NOT NULL REFERENCES community_members(id),
  role TEXT NOT NULL, since TEXT NOT NULL DEFAULT '', notes TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS community_events (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, event_type TEXT NOT NULL DEFAULT 'Founder meetup',
  purpose TEXT NOT NULL DEFAULT '', owner_id TEXT, budget INTEGER NOT NULL DEFAULT 0,
  scheduled_on TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'planned',
  registrations INTEGER NOT NULL DEFAULT 0, attendance INTEGER NOT NULL DEFAULT 0,
  feedback_score REAL NOT NULL DEFAULT 0, follow_up_tasks TEXT NOT NULL DEFAULT '',
  outcomes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS event_registrations (
  id TEXT PRIMARY KEY, event_id TEXT NOT NULL REFERENCES community_events(id),
  member_id TEXT NOT NULL, registered INTEGER NOT NULL DEFAULT 0,
  attended INTEGER NOT NULL DEFAULT 0, feedback TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS referrals (
  id TEXT PRIMARY KEY, source_type TEXT NOT NULL DEFAULT 'community_member', source_id TEXT,
  source_name TEXT NOT NULL DEFAULT '', referred_name TEXT NOT NULL DEFAULT '',
  referred_type TEXT NOT NULL DEFAULT 'startup_application', startup_id TEXT, investor_id TEXT,
  status TEXT NOT NULL DEFAULT 'new', original_contributor TEXT NOT NULL DEFAULT '',
  additional_contributors TEXT NOT NULL DEFAULT '', outcome TEXT NOT NULL DEFAULT '',
  outcome_amount INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS support_requests (
  id TEXT PRIMARY KEY, member_id TEXT NOT NULL, startup_id TEXT,
  request_type TEXT NOT NULL DEFAULT 'investor_introduction', detail TEXT NOT NULL DEFAULT '',
  owner_id TEXT, due_date TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open',
  outcome TEXT NOT NULL DEFAULT '', founder_feedback TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '', module TEXT NOT NULL DEFAULT '',
  entity_type TEXT, entity_id TEXT, owner_id TEXT, due_date TEXT NOT NULL DEFAULT '',
  required_output TEXT NOT NULL DEFAULT '', evidence TEXT NOT NULL DEFAULT '',
  approver_id TEXT, next_action TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'open',
  priority TEXT NOT NULL DEFAULT 'medium', escalation_status TEXT NOT NULL DEFAULT 'open',
  escalated_on TEXT, escalation_reason TEXT NOT NULL DEFAULT '', completed_on TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_entity ON tasks(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS handovers (
  id TEXT PRIMARY KEY, from_department TEXT NOT NULL, to_department TEXT NOT NULL,
  entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending', accepted_by_id TEXT, accepted_on TEXT,
  rejected_reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  title TEXT NOT NULL, purpose TEXT NOT NULL DEFAULT '', category TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'requested',
  file_ref TEXT NOT NULL DEFAULT '', uploaded_by_id TEXT, uploaded_on TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY, actor_id TEXT, actor_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL,
  field TEXT NOT NULL DEFAULT '', before_value TEXT NOT NULL DEFAULT '',
  after_value TEXT NOT NULL DEFAULT '', reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY, code TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL DEFAULT '',
  value TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'draft',
  effective_from TEXT NOT NULL DEFAULT '', approved_by_id TEXT, approved_on TEXT,
  superseded_by_id TEXT, notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_policies_code ON policies(code);

CREATE TABLE IF NOT EXISTS policy_revisions (
  id TEXT PRIMARY KEY, policy_id TEXT NOT NULL REFERENCES policies(id), version INTEGER NOT NULL,
  value TEXT NOT NULL, changed_by_id TEXT, changed_on TEXT NOT NULL, reason TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS fee_slabs (
  id TEXT PRIMARY KEY, schedule_code TEXT NOT NULL, schedule_version TEXT NOT NULL,
  turnover_min INTEGER NOT NULL DEFAULT 0, turnover_max INTEGER, fee_amount INTEGER NOT NULL DEFAULT 0,
  effective_from TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS calendars (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL DEFAULT '',
  holidays TEXT NOT NULL DEFAULT '[]', working_days TEXT NOT NULL DEFAULT '1,2,3,4,5'
);

CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'sanchi_connect',
  status TEXT NOT NULL DEFAULT 'not_configured', last_sync_at TEXT,
  last_sync_status TEXT NOT NULL DEFAULT '', records_synced INTEGER NOT NULL DEFAULT 0,
  failed_sync_alerts INTEGER NOT NULL DEFAULT 0, last_error TEXT NOT NULL DEFAULT '',
  config TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY, integration_id TEXT NOT NULL REFERENCES integrations(id),
  started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL DEFAULT 'success',
  records INTEGER NOT NULL DEFAULT 0, error TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS import_batches (
  id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, file_name TEXT NOT NULL DEFAULT '',
  rows INTEGER NOT NULL DEFAULT 0, imported INTEGER NOT NULL DEFAULT 0, skipped INTEGER NOT NULL DEFAULT 0,
  duplicates INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'completed',
  started_at TEXT NOT NULL, finished_at TEXT, log TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY, recipient_id TEXT, recipient_role TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL, body TEXT NOT NULL DEFAULT '', entity_type TEXT NOT NULL DEFAULT '',
  entity_id TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL, read_at TEXT
);

-- Sign-in. A user signs in with an email address or a mobile number and a one-time code,
-- so both are held on the user. Staff emails are already unique; a phone number is only
-- unique when present.
CREATE TABLE IF NOT EXISTS auth_otps (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL,          -- normalised: lowercased email, or E.164-ish digits
  channel TEXT NOT NULL,             -- email | phone
  code_hash TEXT NOT NULL,           -- SHA-256 of the code; the code itself is never stored
  purpose TEXT NOT NULL DEFAULT 'login', -- login | signup
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  user_id TEXT,
  consumed_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  request_ip TEXT NOT NULL DEFAULT '',
  delivered_via TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_auth_otps_identifier ON auth_otps(identifier, purpose, created_at);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,   -- SHA-256 of the bearer token
  user_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT '',
  revoked_at TEXT,
  user_agent TEXT NOT NULL DEFAULT '',
  request_ip TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS idx_auth_sessions_user ON auth_sessions(user_id, revoked_at);

CREATE TABLE IF NOT EXISTS auth_events (
  id TEXT PRIMARY KEY, identifier TEXT NOT NULL DEFAULT '', user_id TEXT,
  event TEXT NOT NULL, detail TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

-- Founder-facing communication. A founder and the Startup Singam team exchange messages in
-- the context of one stage of that founder's own journey. Internal-only notes never land
-- here; a note is addressed to the founder or it is not in this table at all.
CREATE TABLE IF NOT EXISTS founder_messages (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id),
  application_id TEXT,
  -- The founder-facing stage this thread belongs to, e.g. document_verification or mou.
  stage_key TEXT NOT NULL DEFAULT '',
  -- Who wrote it: the founder, or the internal team (staff).
  author_side TEXT NOT NULL DEFAULT 'founder',   -- founder | team
  author_id TEXT, author_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  -- A message can carry an attachment recorded against the founder's documents.
  attachment_document_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_founder_messages_startup ON founder_messages(startup_id, stage_key);

-- The document checklist the team sends the founder. Each row is one requested document with
-- its own verification status, so a founder sees exactly what is outstanding.
CREATE TABLE IF NOT EXISTS document_requests (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id),
  application_id TEXT,
  stage_key TEXT NOT NULL DEFAULT 'document_verification',
  purpose TEXT NOT NULL DEFAULT 'application_pack',
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  mandatory INTEGER NOT NULL DEFAULT 1,
  accepted_formats TEXT NOT NULL DEFAULT 'pdf,jpg,jpeg,png',
  max_size_mb INTEGER NOT NULL DEFAULT 10,
  -- not_uploaded | uploaded | under_verification | info_required | resubmission_required | verified
  status TEXT NOT NULL DEFAULT 'not_uploaded',
  document_id TEXT,
  clarification TEXT NOT NULL DEFAULT '',
  submitted_on TEXT,
  verified_on TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_document_requests_startup ON document_requests(startup_id, stage_key);

-- Dates the panel can offer for Pitch Day. The internal team confirms which are releasable to
-- the founder; only confirmed options are ever shown on the founder side.
CREATE TABLE IF NOT EXISTS pitch_day_options (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id),
  option_date TEXT NOT NULL,
  slot_note TEXT NOT NULL DEFAULT '',
  -- offered (confirmed by the team, releasable) | withdrawn | chosen
  status TEXT NOT NULL DEFAULT 'offered',
  founder_available INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pitch_day_options_startup ON pitch_day_options(startup_id);

-- Founder-submitted payment proof for the programme fee. A proof is evidence only: Finance
-- still verifies and allocates the receipt before an invoice is marked paid.
CREATE TABLE IF NOT EXISTS payment_proofs (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id),
  fee_id TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  reference TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  file_ref TEXT NOT NULL DEFAULT '',
  -- submitted | verified | rejected
  status TEXT NOT NULL DEFAULT 'submitted',
  reviewed_by_id TEXT, reviewed_on TEXT, review_note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_payment_proofs_fee ON payment_proofs(fee_id);

-- One inbox for every approval in the platform (doc 11 §1.1, §4). Each row is raised by the
-- owning team and decided by a super admin; the system records which one and why. The 2-working-day
-- SLA is computed from the raised-on date against the working-day calendar.
CREATE TABLE IF NOT EXISTS approval_requests (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  -- grade | commitment_change | mou_negotiation | irr_final | fee_exception | fee_extension |
  -- waiver | refund | dispute | mock_readiness | episode_edit | event_budget | promo_assets |
  -- legal_template | signature_refusal | season_setup
  approval_type TEXT NOT NULL,
  raised_by_id TEXT,
  startup_id TEXT, investor_id TEXT,
  record_entity TEXT NOT NULL DEFAULT '', record_id TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  impact TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  -- pending | approved | rejected | withdrawn
  status TEXT NOT NULL DEFAULT 'pending',
  -- Only types explicitly marked low-risk may be bulk approved (doc 11 §1.1; DECISIONS #15).
  low_risk INTEGER NOT NULL DEFAULT 0,
  raised_on TEXT NOT NULL,
  due_on TEXT NOT NULL DEFAULT '',
  decided_by_id TEXT, decided_on TEXT, reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status, due_on);

-- Legal template manager (doc 07 §5). A versioned template is immutable once approved; a new
-- version supersedes it rather than editing the live one.
CREATE TABLE IF NOT EXISTS legal_templates (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  -- founder_mou | participation_agreement | nda | investment_commitment_letter |
  -- deal_acceptance_letter | term_sheet
  template_type TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  body_ref TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL DEFAULT '',
  effective_from TEXT NOT NULL DEFAULT '',
  -- draft | approved | active | superseded
  status TEXT NOT NULL DEFAULT 'draft',
  approved_by_id TEXT, approved_on TEXT,
  active_for_season INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_legal_templates_type ON legal_templates(template_type, version);

-- Due-diligence findings, a task set inside the IR-owned deal (doc 07 §5). A finding carries a
-- severity and cannot close without resolution notes.
CREATE TABLE IF NOT EXISTS dd_findings (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  deal_id TEXT NOT NULL REFERENCES deals(id),
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  -- low | medium | high | critical
  severity TEXT NOT NULL DEFAULT 'medium',
  owner_id TEXT,
  due_date TEXT NOT NULL DEFAULT '',
  -- open | in_review | resolved
  status TEXT NOT NULL DEFAULT 'open',
  resolution_notes TEXT NOT NULL DEFAULT '',
  raised_on TEXT NOT NULL, resolved_on TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dd_findings_deal ON dd_findings(deal_id, status);

-- Pre-funding conditions that must clear before a tranche can be scheduled (doc 07 §5, §6).
-- A blocker condition visibly blocks tranche scheduling.
CREATE TABLE IF NOT EXISTS pre_funding_conditions (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  deal_id TEXT NOT NULL REFERENCES deals(id),
  condition_text TEXT NOT NULL,
  owner_id TEXT,
  due_date TEXT NOT NULL DEFAULT '',
  -- open | met | waived
  status TEXT NOT NULL DEFAULT 'open',
  blocker INTEGER NOT NULL DEFAULT 1,
  evidence TEXT NOT NULL DEFAULT '',
  met_on TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_pre_funding_conditions_deal ON pre_funding_conditions(deal_id, status);

-- Shoot-day exceptions logged on set, one of the five typed cases (doc 06 §3, §11.5).
CREATE TABLE IF NOT EXISTS shoot_exceptions (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  main_shoot_id TEXT NOT NULL REFERENCES main_shoots(id),
  startup_id TEXT NOT NULL DEFAULT '',
  -- founder_no_show | investor_absent | deal_withdrawn | signature_refused | technical_failure
  exception_type TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  action_taken TEXT NOT NULL DEFAULT '',
  notified_departments TEXT NOT NULL DEFAULT '',
  logged_by_id TEXT,
  logged_on TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_shoot_exceptions_shoot ON shoot_exceptions(main_shoot_id);

-- Public investment announcement with the three labelled figures and the mandatory investor
-- approval gate (doc 08 §1.7, §5). Wording must not claim more than the verified figure.
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id),
  deal_id TEXT,
  draft_text TEXT NOT NULL DEFAULT '',
  announced_amount INTEGER NOT NULL DEFAULT 0,
  committed_amount INTEGER NOT NULL DEFAULT 0,
  verified_deployed_amount INTEGER NOT NULL DEFAULT 0,
  -- the wording claims more than the verified figure
  mismatch_flag INTEGER NOT NULL DEFAULT 0,
  -- draft | awaiting_approval | approved | rejected | published
  status TEXT NOT NULL DEFAULT 'draft',
  investor_approval TEXT NOT NULL DEFAULT 'pending',
  approved_by_investor_id TEXT, approved_on TEXT,
  published_on TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_announcements_startup ON announcements(startup_id, status);

-- TDS deducted at source on a receipt, and the Form 16A certificate that closes reconciliation
-- (doc 05 §2D, §8). Reconciliation is not closed until the certificate is in.
CREATE TABLE IF NOT EXISTS tds_entries (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id),
  invoice_ref TEXT NOT NULL DEFAULT '',
  -- upfront | success_fee
  invoice_type TEXT NOT NULL DEFAULT 'success_fee',
  tds_amount INTEGER NOT NULL DEFAULT 0,
  certificate_ref TEXT NOT NULL DEFAULT '',
  -- pending | received
  status TEXT NOT NULL DEFAULT 'pending',
  received_on TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tds_entries_startup ON tds_entries(startup_id, status);

-- A credit note raised when a reversal follows an already-issued invoice (doc 05 §2C, §8).
CREATE TABLE IF NOT EXISTS credit_notes (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  startup_id TEXT NOT NULL REFERENCES startups(id),
  invoice_ref TEXT NOT NULL DEFAULT '',
  reversal_ref TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL DEFAULT '',
  -- issued | applied
  status TEXT NOT NULL DEFAULT 'issued',
  issued_on TEXT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_credit_notes_startup ON credit_notes(startup_id);

-- Reassignment of a startup or investor between owners, with a reason and an audit trail
-- (doc 11 §1.3, §3).
CREATE TABLE IF NOT EXISTS reassignments (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  from_user_id TEXT, to_user_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  reassigned_by_id TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reassignments_entity ON reassignments(entity_type, entity_id);

-- A merged community person: the duplicate is folded into the surviving record, never deleted
-- outright, so the interaction history survives (doc 09 §3).
CREATE TABLE IF NOT EXISTS member_merges (
  id TEXT PRIMARY KEY,
  season_id TEXT NOT NULL DEFAULT '',
  surviving_member_id TEXT NOT NULL,
  merged_member_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  merged_by_id TEXT,
  merged_on TEXT NOT NULL,
  created_at TEXT NOT NULL
);
`;
