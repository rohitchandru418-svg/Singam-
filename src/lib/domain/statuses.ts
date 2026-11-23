/**
 * Central status registry.
 *
 * Every workflow in the ERP keeps its own status field so that selection, production,
 * investment, community engagement and finance progress independently. A startup can
 * therefore read "shoot completed; telecast pending; Rs 75L deployed; success fee partly
 * collected" without any one status overwriting another.
 */

export type Tone =
  | "neutral"
  | "info"
  | "progress"
  | "success"
  | "warning"
  | "danger";

export interface StatusMeta {
  value: string;
  label: string;
  tone: Tone;
  /** Terminal statuses are not expected to move again without an explicit reopen. */
  terminal?: boolean;
}

const meta = (value: string, label: string, tone: Tone, terminal = false): StatusMeta => ({
  value,
  label,
  tone,
  terminal,
});

function registry(defs: StatusMeta[]): Record<string, StatusMeta> {
  return Object.fromEntries(defs.map((d) => [d.value, d]));
}

/* ------------------------------------------------------------------ */
/* Application & screening                                             */
/* ------------------------------------------------------------------ */

export const APPLICATION_STATUS = registry([
  meta("draft", "Draft", "neutral"),
  meta("submitted", "Submitted", "info"),
  meta("in_screening", "In screening", "progress"),
  meta("info_required", "Information required", "warning"),
  meta("hold", "On hold", "warning"),
  meta("rejected", "Rejected", "danger", true),
  meta("proceeded", "Proceeded", "success", true),
  meta("withdrawn", "Withdrawn", "neutral", true),
]);

export const SCREENING_OUTCOME = registry([
  meta("pending", "Pending", "neutral"),
  meta("proceed", "Proceed", "success", true),
  meta("info_required", "Information required", "warning"),
  meta("hold", "Hold", "warning"),
  meta("reject", "Reject", "danger", true),
]);

export const BOOTCAMP_STATUS = registry([
  meta("not_invited", "Not invited", "neutral"),
  meta("invited", "Invited", "info"),
  meta("registered", "Registered", "info"),
  meta("scheduled", "Scheduled", "info"),
  meta("attended", "Attended", "progress"),
  meta("prep_completed", "Preparation completed", "success", true),
  meta("not_attended", "Not attended", "danger"),
]);

export const ANALYST_RECOMMENDATION = registry([
  meta("pending", "Pending", "neutral"),
  meta("proceed", "Proceed", "success", true),
  meta("conditional", "Conditional proceed", "warning"),
  meta("hold", "Hold", "warning"),
  meta("reject", "Reject", "danger", true),
]);

export const MOU_STATUS = registry([
  meta("not_started", "Not started", "neutral"),
  meta("shared", "Shared with founder", "info"),
  meta("under_review", "Under review", "progress"),
  meta("legal_ama_done", "Legal AMA completed", "progress"),
  meta("negotiation", "Under negotiation", "warning"),
  meta("signed", "Signed", "success", true),
  meta("discontinued", "Discontinued", "danger", true),
]);

export const IRR_STATUS = registry([
  meta("not_requested", "Not requested", "neutral"),
  meta("requested", "Requested by Startup Relationships", "info"),
  meta("handover_accepted", "Handover accepted by Finance/IRR", "progress"),
  meta("checklist_sent", "Information checklist sent", "progress"),
  meta("docs_pending", "Documents pending", "warning"),
  meta("in_preparation", "In preparation", "progress"),
  meta("under_review", "Under review", "progress"),
  meta("approved", "Approved", "success"),
  meta("shared_with_ir", "Shared with Investor Relations", "success", true),
]);

/* ------------------------------------------------------------------ */
/* Investor relations                                                  */
/* ------------------------------------------------------------------ */

export const INVESTOR_STATUS = registry([
  meta("sourced", "Sourced", "neutral"),
  meta("exploratory", "Exploratory discussion", "info"),
  meta("verification_pending", "Verification pending", "warning"),
  meta("verified", "Verified", "progress"),
  meta("agreement_pending", "Agreement pending", "warning"),
  meta("onboarded", "Onboarded", "success", true),
  meta("rejected", "Rejected", "danger", true),
]);

export const INVESTOR_GRADE = registry([
  meta("l1", "L1 - Strategic anchor", "success"),
  meta("l2", "L2 - Active participant", "info"),
  meta("l3", "L3 - Selective participant", "warning"),
  meta("l4", "L4 - Watchlist", "neutral"),
]);

export const MATCH_STATUS = registry([
  meta("suggested", "Suggested by system", "neutral"),
  meta("approved_for_circulation", "Approved for circulation", "info"),
  meta("shared", "Information shared", "progress"),
  meta("responded", "Response received", "progress"),
  meta("meeting_scheduled", "Meeting scheduled", "progress"),
  meta("advanced", "Advanced", "success"),
  meta("passed", "Passed", "danger", true),
  meta("withdrawn", "Withdrawn", "neutral", true),
]);

export const PITCH_RESPONSE = registry([
  meta("ready_to_invest", "Ready to Invest", "success"),
  meta("ready_to_proceed", "Ready to Proceed to the Next Stage", "info"),
  meta("info_requested", "Information Requested", "warning"),
  meta("pass", "Pass", "danger", true),
  meta("no_response", "No Response", "neutral"),
]);

export const PITCH_DAY_OUTCOME = registry([
  meta("one_to_one_held", "One-to-one meeting held", "info"),
  meta("golden_pass_issued", "Golden Pass issued", "success"),
  meta("follow_on_interest", "Follow-on interest (HNI)", "info"),
  meta("no_interest", "No interest", "neutral"),
]);

export const COMMITTEE_OUTCOME = registry([
  meta("pending", "Pending", "neutral"),
  meta("proceed", "Proceed", "success", true),
  meta("on_hold", "On hold", "warning"),
  meta("rejected", "Rejected", "danger", true),
]);

/** Written/confirmed investment commitment for a single investor-startup pair. */
export const COMMITMENT_STATUS = registry([
  meta("indicative", "Indicative only", "neutral"),
  meta("golden_pass", "Golden Pass (initial interest)", "info"),
  meta("written_proposed", "Written proposed commitment", "progress"),
  meta("confirmed", "Confirmed commitment", "success"),
  meta("shoot_day_confirmed", "Shoot-day deal confirmation", "success"),
  meta("revised", "Revised", "warning"),
  meta("withdrawn", "Withdrawn", "danger", true),
  meta("failed", "Failed", "danger", true),
]);

/* ------------------------------------------------------------------ */
/* Finance                                                             */
/* ------------------------------------------------------------------ */

export const UPFRONT_FEE_STATUS = registry([
  meta("not_initiated", "Not initiated", "neutral"),
  meta("under_calculation", "Under calculation", "progress"),
  meta("invoiced", "Invoiced", "info"),
  meta("part_paid", "Part paid", "warning"),
  meta("paid", "Paid", "success", true),
  meta("overdue", "Overdue", "danger"),
  meta("extension_approved", "Extension approved", "warning"),
  meta("disputed", "Disputed", "danger"),
  meta("waived", "Waived", "neutral", true),
  meta("refunded", "Refunded", "neutral", true),
]);

export const SUCCESS_FEE_STATUS = registry([
  meta("not_triggered", "Not triggered", "neutral"),
  meta("calculation_triggered", "Calculation triggered", "info"),
  meta("under_review", "Under review", "progress"),
  meta("invoiced", "Invoiced", "info"),
  meta("part_collected", "Part collected", "warning"),
  meta("collected", "Collected", "success", true),
  meta("overdue", "Overdue", "danger"),
  meta("disputed", "Disputed", "danger"),
  meta("waived", "Waived", "neutral", true),
]);

/* ------------------------------------------------------------------ */
/* Production                                                          */
/* ------------------------------------------------------------------ */

export const AV_SHOOT_STATUS = registry([
  meta("not_started", "Not started", "neutral"),
  meta("planned", "Planned", "info"),
  meta("in_progress", "In progress", "progress"),
  meta("completed", "Completed", "success", true),
]);

export const MOCK_SHOOT_STATUS = registry([
  meta("not_started", "Not started", "neutral"),
  meta("scheduled", "Scheduled", "info"),
  meta("in_progress", "In progress", "progress"),
  meta("ready", "Final readiness approved", "success", true),
  meta("hold", "On hold", "warning"),
]);

export const MAIN_SHOOT_STATUS = registry([
  meta("not_started", "Not started", "neutral"),
  meta("scheduled", "Scheduled", "info"),
  meta("shooting", "Shooting", "progress"),
  meta("completed", "Completed", "success", true),
  meta("exceptions", "Completed with exceptions", "warning", true),
]);

export const EPISODE_STATUS = registry([
  meta("not_allocated", "Not allocated", "neutral"),
  meta("allocated", "Allocated", "info"),
  meta("edited", "Edited", "progress"),
  meta("approved", "Approved", "progress"),
  meta("telecast", "Telecast", "success"),
  meta("promoted", "Promoted", "success"),
  meta("closed", "Closed", "success", true),
]);

export const TELECAST_STATUS = registry([
  meta("not_scheduled", "Not scheduled", "neutral"),
  meta("scheduled", "Scheduled", "info"),
  meta("founder_notified", "Founder notified", "info"),
  meta("promo_pending", "Promotional requirements pending", "warning"),
  meta("promo_done", "Promotional requirements completed", "progress"),
  meta("telecast", "Telecast", "success"),
  meta("feedback_pending", "Founder feedback pending", "warning"),
  meta("completed", "Completed", "success", true),
]);

/* ------------------------------------------------------------------ */
/* Deal closure & deployment                                           */
/* ------------------------------------------------------------------ */

export const DEAL_STATUS = registry([
  meta("not_started", "Not started", "neutral"),
  meta("deal_confirmed", "Deal confirmed", "info"),
  meta("communication_thread", "Communication thread opened", "progress"),
  meta("term_sheet", "Term sheet", "progress"),
  meta("due_diligence", "Due diligence", "progress"),
  meta("findings_resolution", "Findings resolution", "warning"),
  meta("definitive_agreements", "Definitive agreements", "progress"),
  meta("pre_funding_conditions", "Pre-funding conditions", "warning"),
  meta("fund_transfer", "Fund transfer", "progress"),
  meta("receipt_verification", "Receipt verification", "progress"),
  meta("allotment", "Allotment & post-funding obligations", "progress"),
  meta("closed", "Closed", "success", true),
  meta("withdrawn", "Withdrawn", "danger", true),
  meta("failed", "Failed", "danger", true),
]);

export const TRANCHE_STATUS = registry([
  meta("scheduled", "Scheduled", "neutral"),
  meta("reported_by_investor", "Reported by investor", "info"),
  meta("receipt_confirmed", "Receipt confirmed by startup", "progress"),
  meta("verified", "Verified", "success"),
  meta("part_verified", "Part verified", "warning"),
  meta("reversed", "Reversed / returned", "danger"),
]);

export const DOCUMENT_STATUS = registry([
  meta("requested", "Requested", "neutral"),
  meta("received", "Received", "info"),
  meta("verified", "Verified", "success"),
  meta("rejected", "Rejected", "danger"),
  meta("expired", "Expired", "warning"),
]);

/* ------------------------------------------------------------------ */
/* Community                                                           */
/* ------------------------------------------------------------------ */

export const MEMBER_TYPE = registry([
  meta("applicant", "Applicant", "neutral"),
  meta("selected_startup", "Selected startup", "info"),
  meta("alumni", "Alumni", "info"),
  meta("investor", "Investor", "progress"),
  meta("mentor", "Mentor", "progress"),
  meta("incubator", "Incubator", "neutral"),
  meta("college", "College", "neutral"),
  meta("ecosystem_partner", "Ecosystem partner", "neutral"),
]);

export const EVENT_STATUS = registry([
  meta("planned", "Planned", "neutral"),
  meta("open_for_registration", "Open for registration", "info"),
  meta("completed", "Completed", "success", true),
  meta("cancelled", "Cancelled", "danger", true),
]);

export const REFERRAL_STATUS = registry([
  meta("new", "New", "neutral"),
  meta("qualified", "Qualified", "info"),
  meta("engaged", "Engaged", "progress"),
  meta("converted", "Converted", "success", true),
  meta("dropped", "Dropped", "neutral", true),
]);

export const SUPPORT_REQUEST_STATUS = registry([
  meta("open", "Open", "neutral"),
  meta("in_progress", "In progress", "progress"),
  meta("resolved", "Resolved", "success", true),
  meta("closed", "Closed", "neutral", true),
]);

/* ------------------------------------------------------------------ */
/* ERP-wide                                                            */
/* ------------------------------------------------------------------ */

export const TASK_STATUS = registry([
  meta("open", "Open", "neutral"),
  meta("in_progress", "In progress", "progress"),
  meta("blocked", "Blocked", "danger"),
  meta("done", "Done", "success", true),
  meta("cancelled", "Cancelled", "neutral", true),
]);

export const TASK_PRIORITY = registry([
  meta("low", "Low", "neutral"),
  meta("medium", "Medium", "info"),
  meta("high", "High", "warning"),
  meta("critical", "Critical", "danger"),
]);

export const HANDOVER_STATUS = registry([
  meta("pending", "Pending acceptance", "warning"),
  meta("accepted", "Accepted", "success", true),
  meta("rejected", "Rejected", "danger", true),
  meta("completed", "Completed", "success", true),
]);

export const ESCALATION_STATUS = registry([
  meta("open", "Open", "warning"),
  meta("escalated", "Escalated", "danger"),
  meta("resolved", "Resolved", "success", true),
]);

/** Every registry, keyed by name, for generic badge rendering and validation. */
/** Policy lifecycle. A revision supersedes the earlier version rather than overwriting it. */
export const POLICY_STATUS = registry([
  meta("draft", "Draft", "neutral"),
  meta("pending_approval", "Pending approval", "warning"),
  meta("approved", "Approved", "success"),
  meta("superseded", "Superseded", "neutral", true),
  meta("retired", "Retired", "neutral", true),
]);

/** The founder's own profile completeness, reviewed by Startup Relationship. */
export const PROFILE_STATUS = registry([
  meta("incomplete", "Incomplete", "neutral"),
  meta("submitted", "Submitted for review", "progress"),
  meta("approved", "Approved", "success"),
  meta("rejected", "Changes requested", "warning"),
]);

/** A call for applications a founder applies to. */
export const PROGRAM_STATUS = registry([
  meta("draft", "Draft", "neutral"),
  meta("open", "Open for applications", "success"),
  meta("closed", "Closed", "neutral", true),
]);

/* ------------------------------------------------------------------ */
/* Approvals, Legal, Production exceptions, Marketing                  */
/* ------------------------------------------------------------------ */

export const APPROVAL_STATUS = registry([
  meta("pending", "Pending", "warning"),
  meta("approved", "Approved", "success", true),
  meta("rejected", "Rejected", "danger", true),
  meta("withdrawn", "Withdrawn", "neutral", true),
]);

export const TEMPLATE_STATUS = registry([
  meta("draft", "Draft", "neutral"),
  meta("approved", "Approved", "info"),
  meta("active", "Active for season", "success"),
  meta("superseded", "Superseded", "neutral", true),
]);

export const DD_FINDING_STATUS = registry([
  meta("open", "Open", "warning"),
  meta("in_review", "In review", "progress"),
  meta("resolved", "Resolved", "success", true),
]);

export const DD_SEVERITY = registry([
  meta("low", "Low", "neutral"),
  meta("medium", "Medium", "info"),
  meta("high", "High", "warning"),
  meta("critical", "Critical", "danger"),
]);

export const CONDITION_STATUS = registry([
  meta("open", "Open", "warning"),
  meta("met", "Met", "success", true),
  meta("waived", "Waived", "neutral", true),
]);

export const SHOOT_EXCEPTION_TYPE = registry([
  meta("founder_no_show", "Founder no-show", "danger"),
  meta("investor_absent", "Investor absent", "warning"),
  meta("deal_withdrawn", "Deal withdrawn on set", "danger"),
  meta("signature_refused", "Signature refused", "danger"),
  meta("technical_failure", "Technical failure", "warning"),
]);

export const SIGNING_EVENT_STATUS = registry([
  meta("pending", "Awaiting signature", "warning"),
  meta("signed", "Signed", "success"),
  meta("refused", "Refused", "danger"),
  meta("waived", "Waived", "neutral"),
]);

export const ANNOUNCEMENT_STATUS = registry([
  meta("draft", "Draft", "neutral"),
  meta("awaiting_approval", "Awaiting investor approval", "warning"),
  meta("approved", "Approved", "info"),
  meta("rejected", "Rejected", "danger", true),
  meta("published", "Published", "success", true),
]);

export const TDS_STATUS = registry([
  meta("pending", "Certificate pending", "warning"),
  meta("received", "Form 16A received", "success", true),
]);

export const STATUS_REGISTRIES: Record<string, Record<string, StatusMeta>> = {
  approval: APPROVAL_STATUS,
  template: TEMPLATE_STATUS,
  dd_finding: DD_FINDING_STATUS,
  dd_severity: DD_SEVERITY,
  condition: CONDITION_STATUS,
  shoot_exception: SHOOT_EXCEPTION_TYPE,
  signing_event: SIGNING_EVENT_STATUS,
  announcement: ANNOUNCEMENT_STATUS,
  tds: TDS_STATUS,
  application: APPLICATION_STATUS,
  profile: PROFILE_STATUS,
  program: PROGRAM_STATUS,
  screening_outcome: SCREENING_OUTCOME,
  bootcamp: BOOTCAMP_STATUS,
  analyst_recommendation: ANALYST_RECOMMENDATION,
  mou: MOU_STATUS,
  irr: IRR_STATUS,
  investor: INVESTOR_STATUS,
  investor_grade: INVESTOR_GRADE,
  match: MATCH_STATUS,
  pitch_response: PITCH_RESPONSE,
  pitch_day_outcome: PITCH_DAY_OUTCOME,
  committee_outcome: COMMITTEE_OUTCOME,
  commitment: COMMITMENT_STATUS,
  upfront_fee: UPFRONT_FEE_STATUS,
  success_fee: SUCCESS_FEE_STATUS,
  av_shoot: AV_SHOOT_STATUS,
  mock_shoot: MOCK_SHOOT_STATUS,
  main_shoot: MAIN_SHOOT_STATUS,
  episode: EPISODE_STATUS,
  telecast: TELECAST_STATUS,
  deal: DEAL_STATUS,
  tranche: TRANCHE_STATUS,
  document: DOCUMENT_STATUS,
  member_type: MEMBER_TYPE,
  event: EVENT_STATUS,
  referral: REFERRAL_STATUS,
  support_request: SUPPORT_REQUEST_STATUS,
  task: TASK_STATUS,
  task_priority: TASK_PRIORITY,
  handover: HANDOVER_STATUS,
  escalation: ESCALATION_STATUS,
  policy: POLICY_STATUS,
};

export function statusMeta(registryName: string, value: string): StatusMeta {
  const reg = STATUS_REGISTRIES[registryName];
  return reg?.[value] ?? meta(value, value, "neutral");
}
