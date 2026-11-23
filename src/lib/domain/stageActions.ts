/**
 * Stage actions.
 *
 * A record screen used to end with one long bar of every action that mentions the record:
 * the startup screen showed twenty-four buttons spanning finance, production, community and
 * marketing at once, so a reader had to know the workflow to pick the right one. This module
 * answers "what is the next step here?" instead: it maps each SOP stage to the small set of
 * actions that actually advance it, and each entity to the stage it usually sits at.
 *
 * The record screen leads with the stage's own actions and folds the rest away, so the same
 * handlers stay reachable without turning the screen into a menu.
 */

import type { StageDefinition } from "./workflows";

/**
 * The actions that advance each SOP stage, in the order they are offered. A stage lists only
 * the handlers a person working that stage would run; everything else stays available under
 * "all actions for this record".
 */
export const STAGE_ACTIONS: Record<string, string[]> = {
  /* Startup journey */
  startup_record: ["profile.review", "founder.add"],
  application_draft: ["application.draft"],
  application_submitted: ["application.submit"],
  internal_screening: ["screening.score"],
  prep_bootcamp: ["bootcamp.invite", "bootcamp.schedule", "bootcamp.record"],
  analyst_screening: ["analyst.evaluate"],
  mou_signing: ["mou.share", "mou.record_ama", "mou.respond"],
  irr_handover: ["irr.request", "irr.advance", "document.request_create"],
  virtual_pitch: ["pitch.schedule", "pitch.record"],
  pitch_day: ["pitchday.option_offer", "pitchday.confirm_slots", "pitchday.record", "pitchday.golden_pass"],
  golden_pass: ["pitchday.golden_pass"],
  detailed_discussions: ["match.share", "match.respond"],
  final_selection: ["committee.decide"],
  upfront_fee: [
    "upfront.initiate", "upfront.approve", "upfront.invoice", "upfront.record_receipt",
    "upfront.extension", "upfront.waive", "upfront.dispute", "upfront.refund",
  ],
  av_shoot: ["production.handover", "production.accept", "av.update"],
  mock_shoot: ["mock.update"],
  pre_shoot_documentation: ["document.request_create", "signing.event_create", "signing.event_complete"],
  main_shoot: ["mainshoot.update", "signing.event_create", "signing.event_complete", "shoot.exception_log"],
  post_shoot_documentation: ["document.request_create", "document.verify"],

  /* Investor journey */
  investor_sourcing: ["investor.create"],
  exploratory_discussion: ["investor.verify"],
  verification_agreement: ["investor.verify", "investor.agreement"],
  investor_grading: ["investor.grade"],
  thesis_mapping: ["investor_side.profile_save"],
  investor_analyst_evaluation: ["analyst.evaluate"],
  virtual_pitch_inv: ["pitch.schedule", "pitch.record"],
  pitch_day_inv: ["pitchday.record", "pitchday.golden_pass"],
  golden_pass_followon: ["pitchday.golden_pass"],
  selection_coordination: ["committee.decide"],
  preshoot_confirmation: ["preshoot.confirm", "commitment.confirm", "commitment.revise", "commitment.withdraw"],
  shoot_day_confirmation: ["commitment.confirm"],

  /* Content workstream */
  editing: ["episode.update"],
  approvals: ["approval.raise", "approval.decide"],
  telecast: ["telecast.update", "announcement.draft", "announcement.submit", "announcement.investor_approve", "announcement.publish"],
  promotions: ["telecast.update"],
  founder_feedback: ["telecast.update"],

  /* Investment workstream */
  deal_confirmation: ["deal.open"],
  communication_thread: ["founder.message_reply", "founder_side.message_send"],
  term_sheet: ["deal.advance"],
  due_diligence: ["deal.document", "legal.dd_finding_raise", "legal.dd_finding_resolve"],
  findings_resolution: ["legal.dd_finding_resolve"],
  definitive_agreements: ["deal.document", "deal.advance"],
  pre_funding_conditions: ["legal.condition_create", "legal.condition_clear"],
  fund_transfer: ["tranche.schedule", "tranche.report"],
  receipt_verification: ["tranche.confirm_receipt", "tranche.verify", "tranche.reverse"],
  allotment: ["deal.advance"],
  success_fee: [
    "successfee.calculate", "successfee.invoice", "successfee.collect", "ledger.add",
    "finance.tds_record", "finance.form16a_receive", "finance.reconciliation_check",
  ],
  portfolio_engagement: ["support.create", "referral.create"],

  /* Community & ecosystem */
  member_onboarding: ["community.member_create", "community.member_add_role"],
  event_engagement: ["event.create", "event.register", "event.complete"],
  referral_chain: ["referral.create", "referral.advance"],
  founder_support: ["support.create", "support.resolve"],

  /* Platform */
  approval: ["approval.raise", "approval.decide", "approval.withdraw"],
  task: ["task.create", "task.update", "task.escalate"],
  handover: ["handover.create", "handover.accept"],
  document: ["document.create", "document.verify"],
};

/**
 * The stage an entity usually sits at, used when a record's status does not map onto a stage
 * by itself (a MoU, an IRR, a tranche). It keeps the "next step" bar correct on records whose
 * status registry is not one the journey map tracks.
 */
export const ENTITY_STAGE: Record<string, string> = {
  startups: "startup_record",
  founders: "startup_record",
  applications: "internal_screening",
  screenings: "internal_screening",
  bootcamp_attendance: "prep_bootcamp",
  analyst_evaluations: "analyst_screening",
  mous: "mou_signing",
  irr_reports: "irr_handover",
  document_requests: "irr_handover",
  investors: "verification_agreement",
  investor_agreements: "verification_agreement",
  investor_grade_assessments: "investor_grading",
  matches: "detailed_discussions",
  virtual_pitches: "virtual_pitch",
  pitch_days: "pitch_day",
  pitch_day_options: "pitch_day",
  committee_decisions: "final_selection",
  commitments: "preshoot_confirmation",
  pre_shoot_confirmations: "preshoot_confirmation",
  upfront_fees: "upfront_fee",
  success_fees: "success_fee",
  funding_rounds: "fund_transfer",
  deals: "term_sheet",
  deal_documents: "due_diligence",
  tranches: "receipt_verification",
  production_handovers: "av_shoot",
  av_shoots: "av_shoot",
  mock_shoots: "mock_shoot",
  main_shoots: "main_shoot",
  episodes: "editing",
  telecasts: "telecast",
  community_members: "member_onboarding",
  community_events: "event_engagement",
  referrals: "referral_chain",
  support_requests: "founder_support",
  approvals: "approval",
  approval_requests: "approval",
  tasks: "task",
  handovers: "handover",
  documents: "document",
};

/** The action set for a stage, or an empty list when the stage has none mapped. */
export function actionsForStage(stageKey: string | null | undefined): string[] {
  if (!stageKey) return [];
  return STAGE_ACTIONS[stageKey] ?? [];
}

/**
 * Status-to-stage overrides, keyed by status registry then status value.
 *
 * A registry such as `application` is shared by more than one stage, and a terminal status
 * such as `proceeded` belongs to none of them, so matching on the status alone lands on the
 * wrong stage and offers an action the record has already completed (the draft stage offered
 * "Submit application" on a submitted application). These overrides name the stage a record at
 * that status is really at. `null` means the record has finished the journey, so the screen
 * shows every remaining action rather than a wrong next step.
 */
export const STATUS_STAGE: Record<string, Record<string, string | null>> = {
  application: {
    draft: "application_draft",
    submitted: "application_submitted",
    in_screening: "internal_screening",
    info_required: "internal_screening",
    hold: "internal_screening",
    proceeded: "prep_bootcamp",
    rejected: null,
    withdrawn: null,
  },
  screening_outcome: {
    proceed: "prep_bootcamp",
    info_required: "internal_screening",
    hold: "internal_screening",
    reject: null,
  },
  investor: {
    sourced: "investor_sourcing",
    exploratory: "exploratory_discussion",
    verification_pending: "verification_agreement",
    agreement_pending: "verification_agreement",
    verified: "investor_grading",
    onboarded: "investor_grading",
    active: "investor_grading",
    inactive: null,
    rejected: null,
  },
  deal: {
    deal_confirmed: "deal_confirmation",
    communication_thread: "communication_thread",
    term_sheet: "term_sheet",
    due_diligence: "due_diligence",
    findings_resolution: "findings_resolution",
    definitive_agreements: "definitive_agreements",
    pre_funding_conditions: "pre_funding_conditions",
    fund_transfer: "fund_transfer",
    receipt_verification: "receipt_verification",
    allotment: "allotment",
    closed: null,
    withdrawn: null,
    failed: null,
  },
  upfront_fee: {
    not_initiated: "upfront_fee",
    under_calculation: "upfront_fee",
    invoiced: "upfront_fee",
    part_paid: "upfront_fee",
    paid: "av_shoot",
    overdue: "upfront_fee",
    extension_approved: "upfront_fee",
    disputed: "upfront_fee",
    waived: "av_shoot",
    refunded: null,
  },
  profile: {
    incomplete: "startup_record",
    submitted: "startup_record",
    approved: "startup_record",
    rejected: "startup_record",
  },
  bootcamp: {
    not_invited: "prep_bootcamp",
    invited: "prep_bootcamp",
    registered: "prep_bootcamp",
    scheduled: "prep_bootcamp",
    attended: "prep_bootcamp",
    prep_completed: "analyst_screening",
    not_attended: "prep_bootcamp",
  },
  analyst_recommendation: {
    // An analyst evaluation is the record *of* the analyst stage. Its recommendation advances
    // the startup, not the evaluation record, so the record stays at Analyst screening. Mapping
    // proceed/conditional onto `mou_signing` made every passed evaluation open on the same MoU
    // panel — the repetition the audit reported — and labelled the record with the wrong stage.
    pending: "analyst_screening",
    proceed: "analyst_screening",
    conditional: "analyst_screening",
    hold: "analyst_screening",
    reject: null,
  },
  mou: {
    not_started: "mou_signing",
    shared: "mou_signing",
    under_review: "mou_signing",
    legal_ama_done: "mou_signing",
    negotiation: "mou_signing",
    signed: "irr_handover",
    discontinued: null,
  },
  irr: {
    not_requested: "irr_handover",
    requested: "irr_handover",
    handover_accepted: "irr_handover",
    checklist_sent: "irr_handover",
    docs_pending: "irr_handover",
    in_preparation: "irr_handover",
    under_review: "irr_handover",
    approved: "virtual_pitch",
    shared_with_ir: "virtual_pitch",
  },
  pitch_response: {
    ready_to_invest: "pitch_day",
    ready_to_proceed: "pitch_day",
    info_requested: "virtual_pitch",
    pass: null,
    no_response: "virtual_pitch",
  },
  pitch_day_outcome: {
    one_to_one_held: "pitch_day",
    golden_pass_issued: "golden_pass",
    follow_on_interest: "golden_pass",
    no_interest: null,
  },
  committee_outcome: {
    pending: "final_selection",
    proceed: "upfront_fee",
    on_hold: "final_selection",
    rejected: null,
  },
  av_shoot: {
    not_started: "av_shoot",
    planned: "av_shoot",
    in_progress: "av_shoot",
    completed: "mock_shoot",
  },
  mock_shoot: {
    not_started: "mock_shoot",
    scheduled: "mock_shoot",
    in_progress: "mock_shoot",
    ready: "pre_shoot_documentation",
    hold: "mock_shoot",
  },
  main_shoot: {
    not_started: "main_shoot",
    scheduled: "main_shoot",
    shooting: "main_shoot",
    completed: "post_shoot_documentation",
    exceptions: "post_shoot_documentation",
  },
  episode: {
    not_allocated: "editing",
    allocated: "editing",
    edited: "approvals",
    approved: "telecast",
    telecast: "telecast",
    promoted: "promotions",
    closed: null,
  },
  telecast: {
    not_scheduled: "telecast",
    scheduled: "telecast",
    founder_notified: "telecast",
    promo_pending: "telecast",
    promo_done: "telecast",
    telecast: "founder_feedback",
    feedback_pending: "founder_feedback",
    completed: null,
  },
  tranche: {
    scheduled: "fund_transfer",
    reported_by_investor: "receipt_verification",
    receipt_confirmed: "receipt_verification",
    verified: "receipt_verification",
    part_verified: "receipt_verification",
    reversed: null,
  },
  success_fee: {
    not_triggered: "success_fee",
    calculation_triggered: "success_fee",
    under_review: "success_fee",
    invoiced: "success_fee",
    part_collected: "success_fee",
    collected: "success_fee",
    overdue: "success_fee",
    disputed: "success_fee",
    waived: "success_fee",
  },
  event: {
    planned: "event_engagement",
    open_for_registration: "event_engagement",
    completed: null,
    cancelled: null,
  },
  referral: {
    new: "referral_chain",
    qualified: "referral_chain",
    engaged: "referral_chain",
    converted: null,
    dropped: null,
  },
  support_request: {
    open: "founder_support",
    in_progress: "founder_support",
    resolved: null,
    closed: null,
  },
};

/**
 * The stage a record is at: the status override when there is one, otherwise the journey
 * stage the status maps to, otherwise the entity's usual stage.
 */
export function resolveStageKey(args: {
  registry?: string | null;
  statusValue?: unknown;
  entity: string;
  matchedStageKey?: string | null;
}): string | null {
  const { registry, statusValue, entity, matchedStageKey } = args;
  if (registry && statusValue != null) {
    const override = STATUS_STAGE[registry];
    if (override && Object.prototype.hasOwnProperty.call(override, String(statusValue))) {
      return override[String(statusValue)];
    }
  }
  return matchedStageKey ?? ENTITY_STAGE[entity] ?? null;
}

/**
 * Split a record's actions into the ones that belong to its current stage and the rest.
 * The stage list keeps the stage's own order; anything not mapped to the stage falls through
 * to `others`, so no handler becomes unreachable.
 */
export function splitStageActions(
  actions: string[],
  stageKey: string | null | undefined,
): { primary: string[]; others: string[] } {
  const stage = actionsForStage(stageKey);
  if (stage.length === 0) return { primary: actions, others: [] };
  const wanted = new Set(stage);
  const primary = stage.filter((a) => actions.includes(a));
  const others = actions.filter((a) => !wanted.has(a));
  // A stage whose actions are all unavailable for the record keeps the full list visible
  // rather than showing an empty next-step bar.
  if (primary.length === 0) return { primary: actions, others: [] };
  return { primary, others };
}

/**
 * The actions a record has already moved past: those whose last home in this journey sits
 * before the stage the record is on. The panel shows these as completed rather than offering
 * them again — a screening score that has been recorded should read "done", not "run me".
 */
export function completedStageActions(journeyStageKeys: string[], currentIndex: number, actions: string[]): string[] {
  return actions.filter((action) => {
    const indices: number[] = [];
    journeyStageKeys.forEach((key, i) => {
      if ((STAGE_ACTIONS[key] ?? []).includes(action)) indices.push(i);
    });
    return indices.length > 0 && Math.max(...indices) < currentIndex;
  });
}

/** A stage definition is a `StageDefinition`; re-exported so callers share the type. */
export type { StageDefinition };
