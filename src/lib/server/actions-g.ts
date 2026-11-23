import { all, get, run } from "../db/client";
import { addDays, today } from "../domain/dates";
import { create, getOne, notify, raiseApproval, update, type Actor, type Row } from "./repo";
import { HttpError, type Session } from "./session";
import type { ActionHandler } from "./actions";

/**
 * Platform, Legal, Production-exception, Marketing-announcement and Finance-reconciliation
 * actions.
 *
 * These cover the parts of briefs 05-11 that were not already built: the unified approvals
 * inbox, the Legal workspace, the typed shoot-day exceptions, the announcement approval
 * gate, the season setup wizard, reassignment, and TDS / credit-note reconciliation.
 */

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

function requireString(body: Row, field: string): string {
  const value = body[field];
  if (value === undefined || value === null || value === "") {
    throw new HttpError(422, `field ${field} is required`);
  }
  return String(value);
}

function actorOf(session: Session): Actor {
  return session.actor;
}

/* ------------------------------------------------------------------ */
/* Approvals inbox (doc 11 §1.1, §4)                                   */
/* ------------------------------------------------------------------ */

const approvalRaise: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const approvalType = requireString(body, "approval_type");
  const record = raiseApproval(a, {
    approvalType,
    title: requireString(body, "title"),
    recordEntity: String(body.record_entity ?? ""),
    recordId: String(body.record_id ?? ""),
    startupId: body.startup_id ? String(body.startup_id) : null,
    investorId: body.investor_id ? String(body.investor_id) : null,
    impact: String(body.impact ?? ""),
    amount: body.amount ? Number(body.amount) : 0,
    lowRisk: Boolean(body.low_risk),
  });
  notify(
    "management",
    `Approval needed: ${String(body.title)}`,
    "Two working days per approval; overdue approvals appear on the dashboard.",
    "approval_request",
    String(record.id),
  );
  return { ok: true, message: "Approval raised into the inbox", data: record };
};

/**
 * Decide one approval, or a low-risk set of them (doc 11 §1.1, DECISIONS #15).
 *
 * A reason is mandatory, and the decision records the individual super admin who made it. Bulk
 * approval is refused for any type not explicitly flagged low-risk.
 */
const approvalDecide: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const ids: string[] = Array.isArray(body.approval_ids)
    ? (body.approval_ids as unknown[]).map(String)
    : [requireString(body, "approval_id")];
  const decision = requireString(body, "decision"); // approved | rejected
  if (!["approved", "rejected"].includes(decision)) {
    throw new HttpError(422, "decision must be approved or rejected");
  }
  const reason = requireString(body, "reason");

  if (ids.length > 1) {
    for (const id of ids) {
      const row = getOne("approval_requests", id);
      if (row && !row.low_risk) {
        throw new HttpError(422, `Approval ${id} is not marked low-risk, so it cannot be bulk approved`);
      }
    }
  }

  const decided: Row[] = [];
  for (const id of ids) {
    const request = getOne("approval_requests", id);
    if (!request) throw new HttpError(404, `Approval ${id} not found`);
    if (request.status !== "pending") throw new HttpError(409, `Approval ${id} is already ${request.status}`);
    const updated = update(
      "approval_requests",
      id,
      { status: decision, decided_by_id: a.id, decided_on: today(), reason },
      a,
      `Approval ${decision}: ${reason}`,
    );
    // Apply the decision to the source record so the workflow actually moves.
    applyApprovalOutcome(String(request.approval_type), String(request.record_entity), String(request.record_id), decision, reason, a);
    notify(
      String(request.raised_by_id ?? "management"),
      `Approval ${decision}`,
      `${String(request.title)} was ${decision}. Reason: ${reason}`,
      "approval_request",
      id,
    );
    decided.push(updated);
  }
  return { ok: true, message: `${ids.length} approval(s) ${decision}`, data: { approvals: decided } };
};

/** Move the source record the approval was raised against, so the inbox is not a dead letter. */
function applyApprovalOutcome(
  approvalType: string,
  entity: string,
  recordId: string,
  decision: string,
  reason: string,
  a: Actor,
): void {
  if (!entity || !recordId) return;
  const patch: Row = {};
  if (approvalType === "grade" && entity === "investor_grade_assessments") {
    patch.approval_status = decision;
    patch.change_reason = reason;
  } else if (approvalType === "mock_readiness" && entity === "mock_shoots") {
    patch.final_readiness_approved_on = decision === "approved" ? today() : null;
    patch.final_readiness_by_id = decision === "approved" ? a.id : null;
    patch.status = decision === "approved" ? "ready" : "in_progress";
  } else if (approvalType === "signature_refusal" && entity === "signing_events") {
    patch.status = "refused";
  } else if (approvalType === "episode_edit" && entity === "episodes") {
    patch.approvals_status = decision;
    if (decision === "approved") patch.status = "approved";
  } else if (approvalType === "promo_assets" && entity === "telecasts") {
    patch.promo_assets_approved = decision === "approved" ? 1 : 0;
  } else if (approvalType === "event_budget" && entity === "community_events") {
    patch.budget_approved = decision === "approved" ? 1 : 0;
  } else if (approvalType === "legal_template" && entity === "legal_templates") {
    patch.status = decision === "approved" ? "approved" : "draft";
    if (decision === "approved") {
      patch.approved_by_id = a.id;
      patch.approved_on = today();
    }
  } else if (
    (approvalType === "commitment_change" || approvalType === "mou_negotiation") &&
    entity
  ) {
    patch.approval_status = decision;
  }
  if (Object.keys(patch).length === 0) return;
  try {
    update(entity, recordId, patch, a, `Approval outcome: ${decision}`);
  } catch {
    // A record that has since been removed or is not writable must not fail the decision;
    // the approval row itself still carries who decided, when and why.
  }
}

const approvalWithdraw: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "approval_id");
  const request = getOne("approval_requests", id);
  if (!request) throw new HttpError(404, "Approval not found");
  const updated = update("approval_requests", id, { status: "withdrawn", reason: String(body.reason ?? "") }, a, "Approval withdrawn by the requester");
  return { ok: true, message: "Approval withdrawn", data: updated };
};

/* ------------------------------------------------------------------ */
/* Legal workspace (doc 07)                                            */
/* ------------------------------------------------------------------ */

const legalTemplateCreate: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const templateType = requireString(body, "template_type");
  // A new version of an existing type supersedes the old one; the live version is never edited.
  const existing = all<Row>(
    "SELECT * FROM legal_templates WHERE template_type = ? ORDER BY version DESC",
    templateType,
  );
  const nextVersion = existing.length ? Number(existing[0].version) + 1 : 1;
  const record = create(
    "legal_templates",
    {
      name: requireString(body, "name"),
      template_type: templateType,
      version: nextVersion,
      body_ref: String(body.body_ref ?? ""),
      summary: String(body.summary ?? ""),
      effective_from: String(body.effective_from ?? today()),
      status: "draft",
      active_for_season: 0,
    },
    a,
  );
  if (existing.length) {
    update("legal_templates", String(existing[0].id), { status: "superseded" }, a, "Superseded by a new version");
  }
  return { ok: true, message: `Template version v${nextVersion} created`, data: record };
};

const legalTemplateApprove: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "template_id");
  const template = getOne("legal_templates", id);
  if (!template) throw new HttpError(404, "Template not found");
  const request = raiseApproval(a, {
    approvalType: "legal_template",
    title: `Legal template approval: ${String(template.name)} v${template.version}`,
    recordEntity: "legal_templates",
    recordId: id,
  });
  return { ok: true, message: "Template sent for super-admin approval", data: request };
};

const legalTemplateActivate: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "template_id");
  const template = getOne("legal_templates", id);
  if (!template) throw new HttpError(404, "Template not found");
  if (template.status !== "approved" && template.status !== "active") {
    throw new HttpError(409, "Only an approved template can be made active for the season");
  }
  // One active version per type: retire the others first.
  for (const other of all<Row>("SELECT id FROM legal_templates WHERE template_type = ? AND id <> ?", String(template.template_type), id)) {
    update("legal_templates", String(other.id), { active_for_season: 0 }, a, "Retired in favour of the active version");
  }
  const record = update("legal_templates", id, { status: "active", active_for_season: 1 }, a, "Active for the season");
  return { ok: true, message: "Template is now active for the season", data: record };
};

const ddFindingRaise: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const dealId = requireString(body, "deal_id");
  const deal = getOne("deals", dealId);
  if (!deal) throw new HttpError(404, "Deal not found");
  const severity = String(body.severity ?? "medium");
  if (!["low", "medium", "high", "critical"].includes(severity)) {
    throw new HttpError(422, "severity must be low, medium, high or critical");
  }
  const record = create(
    "dd_findings",
    {
      deal_id: dealId,
      title: requireString(body, "title"),
      detail: String(body.detail ?? ""),
      severity,
      owner_id: body.owner_id ?? a.id,
      due_date: String(body.due_date ?? addDays(today(), 7)),
      status: "open",
      raised_on: today(),
    },
    a,
  );
  notify("investor_relations", `Due-diligence finding (${severity})`, String(record.title), "deal", dealId);
  return { ok: true, message: "Finding logged", data: record };
};

const ddFindingResolve: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "finding_id");
  const finding = getOne("dd_findings", id);
  if (!finding) throw new HttpError(404, "Finding not found");
  const notes = String(body.resolution_notes ?? "").trim();
  // A finding cannot close without resolution notes (doc 07 §7).
  if (!notes) throw new HttpError(422, "A finding cannot close without resolution notes");
  const status = String(body.status ?? "resolved");
  const record = update(
    "dd_findings",
    id,
    { status, resolution_notes: notes, resolved_on: status === "resolved" ? today() : null },
    a,
    `Finding ${status}`,
  );
  return { ok: true, message: `Finding ${status}`, data: record };
};

const conditionCreate: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const dealId = requireString(body, "deal_id");
  const deal = getOne("deals", dealId);
  if (!deal) throw new HttpError(404, "Deal not found");
  const record = create(
    "pre_funding_conditions",
    {
      deal_id: dealId,
      condition_text: requireString(body, "condition_text"),
      owner_id: body.owner_id ?? a.id,
      due_date: String(body.due_date ?? addDays(today(), 14)),
      status: "open",
      blocker: body.blocker === false || body.blocker === 0 ? 0 : 1,
    },
    a,
  );
  return { ok: true, message: "Pre-funding condition recorded", data: record };
};

const conditionClear: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "condition_id");
  const condition = getOne("pre_funding_conditions", id);
  if (!condition) throw new HttpError(404, "Condition not found");
  const status = String(body.status ?? "met");
  if (!["met", "waived"].includes(status)) throw new HttpError(422, "status must be met or waived");
  const record = update(
    "pre_funding_conditions",
    id,
    { status, evidence: String(body.evidence ?? ""), met_on: today() },
    a,
    `Condition ${status}`,
  );
  return { ok: true, message: `Condition ${status}`, data: record };
};

/* ------------------------------------------------------------------ */
/* Production: shoot-day exceptions (doc 06 §3, §11.5)                 */
/* ------------------------------------------------------------------ */

const SHOOT_EXCEPTION_ACTIONS: Record<string, { action: string; departments: string[] }> = {
  founder_no_show: { action: "Reschedule the shoot and inform Startup Relationships", departments: ["startup_relationships"] },
  investor_absent: { action: "Adjust the panel and inform Investor Relations", departments: ["investor_relations"] },
  deal_withdrawn: { action: "Record the reason; Investor Relations starts a replacement-investor search", departments: ["investor_relations", "management"] },
  signature_refused: { action: "Escalate to Investor Relations and super admin", departments: ["investor_relations", "management"] },
  technical_failure: { action: "Schedule a reshoot", departments: ["production"] },
};

const shootExceptionLog: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const shootId = requireString(body, "main_shoot_id");
  const shoot = getOne("main_shoots", shootId);
  if (!shoot) throw new HttpError(404, "Main shoot not found");
  const exceptionType = requireString(body, "exception_type");
  const rule = SHOOT_EXCEPTION_ACTIONS[exceptionType];
  if (!rule) {
    throw new HttpError(422, `exception_type must be one of: ${Object.keys(SHOOT_EXCEPTION_ACTIONS).join(", ")}`);
  }
  const record = create(
    "shoot_exceptions",
    {
      main_shoot_id: shootId,
      startup_id: String(shoot.startup_id ?? ""),
      exception_type: exceptionType,
      reason: String(body.reason ?? ""),
      action_taken: rule.action,
      notified_departments: rule.departments.join(","),
      logged_by_id: a.id,
      logged_on: today(),
    },
    a,
  );
  // Each of the five types notifies the right team, so the exception is never a silent note.
  for (const dept of rule.departments) {
    notify(dept, `Shoot-day exception: ${exceptionType.replace(/_/g, " ")}`, rule.action, "main_shoot", shootId);
  }
  // Keep the exception visible on the shoot record itself.
  update("main_shoots", shootId, { exception_type: exceptionType, exception_reason: String(body.reason ?? "") }, a, "Shoot-day exception logged");
  return { ok: true, message: `Exception logged. ${rule.action}`, data: record };
};

/* ------------------------------------------------------------------ */
/* Production: signing events (doc 06 §4, §7)                          */
/* ------------------------------------------------------------------ */

/** The signing events and the document purpose each one requires, per the production brief. */
const SIGNING_EVENT_DOCUMENTS: Record<string, string> = {
  investor_commits_on_set: "investment_commitment_letter",
  founder_accepts_deal: "deal_acceptance_letter",
  mou_printed_and_signed: "signed_mou",
  term_sheet_signed: "term_sheet",
  definitive_agreements_signed: "definitive_agreements",
};

const signingEventCreate: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const shootId = requireString(body, "main_shoot_id");
  const shoot = getOne("main_shoots", shootId);
  if (!shoot) throw new HttpError(404, "Main shoot not found");
  const eventType = requireString(body, "event_type");
  // The document follows the signing event, never the other way round (doc 06 §4).
  const purpose = String(body.required_document_purpose ?? SIGNING_EVENT_DOCUMENTS[eventType] ?? "");
  const target = body.target_on ? String(body.target_on) : today();
  // Target and final deadline are separate fields (doc 11 open item): the target is immediate
  // execution on set, the final deadline is the 24-hour sign-off control.
  const deadline = body.final_deadline ? String(body.final_deadline) : addDays(target, 1);
  const record = create(
    "signing_events",
    {
      main_shoot_id: shootId,
      startup_id: String(shoot.startup_id ?? ""),
      season_id: String(shoot.season_id ?? ""),
      event_type: eventType,
      required_document_purpose: purpose,
      status: "pending",
      target_on: target,
      final_deadline: deadline,
      notes: String(body.notes ?? ""),
    },
    a,
  );
  return { ok: true, message: `Signing event recorded; ${purpose || "the document"} is required by ${deadline}`, data: record };
};

const signingEventComplete: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "signing_event_id");
  const event = getOne("signing_events", id);
  if (!event) throw new HttpError(404, "Signing event not found");
  const status = String(body.status ?? "signed");
  if (!["signed", "refused", "waived"].includes(status)) {
    throw new HttpError(422, "status must be signed, refused or waived");
  }
  if (status === "signed") {
    // A signature must carry the document it produced, so the record is not a bare checkbox.
    requireString(body, "document_ref");
  }
  const record = update(
    "signing_events",
    id,
    {
      status,
      signed_on: status === "signed" ? today() : null,
      signed_by_id: status === "signed" ? a.id : null,
      document_ref: String(body.document_ref ?? ""),
      notes: String(body.notes ?? event.notes ?? ""),
    },
    a,
    `Signing event ${status}`,
  );
  if (status === "refused") {
    // A refused signature escalates to IR and the super admin (doc 06 §3).
    const approval = raiseApproval(a, {
      approvalType: "signature_refusal",
      title: `Signature refused at shoot ${String(event.main_shoot_id)}`,
      recordEntity: "signing_events",
      recordId: id,
      startupId: String(event.startup_id),
      impact: String(body.notes ?? "Signature refused on set"),
    });
    return { ok: true, message: "Refusal recorded and escalated to Investor Relations and the super admin", data: { ...record, approval_id: approval.id } };
  }
  return { ok: true, message: `Signing event ${status}`, data: record };
};

/* ------------------------------------------------------------------ */
/* Marketing: public announcement approval gate (doc 08 §1.7, §5)      */
/* ------------------------------------------------------------------ */

const announcementDraft: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const startupId = requireString(body, "startup_id");
  const dealId = body.deal_id ? String(body.deal_id) : "";
  // Figures come from system records, never from free text, so a claim cannot be overstated.
  let committed = 0;
  let deployed = 0;
  if (dealId) {
    committed = Number(getOne("deals", dealId)?.committed_amount ?? 0);
    deployed = Number(
      get<{ v: number }>("SELECT COALESCE(SUM(verified_amount),0) AS v FROM tranches WHERE deal_id = ? AND status <> 'reversed'", dealId)?.v ?? 0,
    );
  }
  const announced = body.announced_amount ? Number(body.announced_amount) : committed;
  const mismatch = announced > deployed ? 1 : 0;
  const record = create(
    "announcements",
    {
      startup_id: startupId,
      deal_id: dealId || null,
      draft_text: requireString(body, "draft_text"),
      announced_amount: announced,
      committed_amount: committed,
      verified_deployed_amount: deployed,
      mismatch_flag: mismatch,
      status: "draft",
      investor_approval: "pending",
    },
    a,
  );
  return {
    ok: true,
    message: mismatch
      ? "Draft saved. Warning: the announced figure is higher than the verified deployed figure, so the wording must not claim it as deployed."
      : "Draft saved with the three labelled figures.",
    data: record,
  };
};

const announcementSubmit: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "announcement_id");
  const announcement = getOne("announcements", id);
  if (!announcement) throw new HttpError(404, "Announcement not found");
  const record = update("announcements", id, { status: "awaiting_approval" }, a, "Sent to the investor for approval");
  return { ok: true, message: "Sent to the investor for approval", data: record };
};

/**
 * The investor approves the wording (doc 08 §1.7). Founder approval is not needed; investor
 * approval is mandatory before publication.
 */
const announcementInvestorApprove: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "announcement_id");
  const announcement = getOne("announcements", id);
  if (!announcement) throw new HttpError(404, "Announcement not found");
  if (announcement.status !== "awaiting_approval") {
    throw new HttpError(409, "The announcement must be awaiting approval first");
  }
  const decision = String(body.decision ?? "approved");
  const investorId = body.investor_id ? String(body.investor_id) : null;
  const record = update(
    "announcements",
    id,
    {
      status: decision === "approved" ? "approved" : "rejected",
      investor_approval: decision,
      approved_by_investor_id: investorId,
      approved_on: today(),
    },
    a,
    `Investor ${decision} the public wording`,
  );
  return { ok: true, message: `Investor ${decision} the wording`, data: record };
};

const announcementPublish: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "announcement_id");
  const announcement = getOne("announcements", id);
  if (!announcement) throw new HttpError(404, "Announcement not found");
  // Cannot publish without investor approval (doc 08 §5).
  if (announcement.status !== "approved") {
    throw new HttpError(409, "An announcement cannot publish until the investor has approved the wording");
  }
  const record = update("announcements", id, { status: "published", published_on: today() }, a, "Published after investor approval");
  return { ok: true, message: "Announcement published", data: record };
};

/* ------------------------------------------------------------------ */
/* Finance: TDS, Form 16A and credit notes (doc 05 §2D, §7, §8)        */
/* ------------------------------------------------------------------ */

const tdsRecord: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const startupId = requireString(body, "startup_id");
  const record = create(
    "tds_entries",
    {
      startup_id: startupId,
      invoice_ref: String(body.invoice_ref ?? ""),
      invoice_type: String(body.invoice_type ?? "success_fee"),
      tds_amount: Number(body.tds_amount ?? 0),
      certificate_ref: String(body.certificate_ref ?? ""),
      status: "pending",
    },
    a,
  );
  return { ok: true, message: "TDS recorded; the Form 16A certificate is still pending", data: record };
};

const form16aReceive: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const id = requireString(body, "tds_entry_id");
  const entry = getOne("tds_entries", id);
  if (!entry) throw new HttpError(404, "TDS entry not found");
  const record = update(
    "tds_entries",
    id,
    { status: "received", certificate_ref: String(body.certificate_ref ?? entry.certificate_ref ?? ""), received_on: today() },
    a,
    "Form 16A certificate received",
  );
  return { ok: true, message: "Form 16A recorded", data: record };
};

/**
 * Reconciliation close gate (doc 05 §8): the startup account closes only when it balances
 * and the TDS certificates are in.
 */
const reconciliationCheck: ActionHandler = ({ body }) => {
  const startupId = requireString(body, "startup_id");
  const pendingTds = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM tds_entries WHERE startup_id = ? AND status = 'pending'", startupId)?.n ?? 0,
  );
  const openCredit = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM credit_notes WHERE startup_id = ? AND status = 'issued'", startupId)?.n ?? 0,
  );
  const balance = startupAccountBalance(startupId);
  const closed = pendingTds === 0 && balance === 0;
  return {
    ok: true,
    message: closed
      ? "The account balances and every TDS certificate is in: reconciliation can close."
      : "Reconciliation cannot close yet.",
    data: {
      startup_id: startupId,
      balance,
      pending_tds: pendingTds,
      unapplied_credit_notes: openCredit,
      can_close: closed,
      reasons: [
        balance !== 0 ? `Outstanding balance of ${balance} paise` : "",
        pendingTds ? `${pendingTds} TDS certificate(s) still pending` : "",
      ].filter(Boolean),
    },
  };
};

/** The startup account balance: charges less verified receipts, in paise. */
export function startupAccountBalance(startupId: string): number {
  const upfront = Number(
    get<{ v: number }>("SELECT COALESCE(SUM(fee_amount),0) AS v FROM upfront_fees WHERE startup_id = ?", startupId)?.v ?? 0,
  );
  const success = Number(
    get<{ v: number }>("SELECT COALESCE(SUM(fee_due),0) AS v FROM success_fees WHERE startup_id = ?", startupId)?.v ?? 0,
  );
  const collectedUpfront = Number(
    get<{ v: number }>("SELECT COALESCE(SUM(paid_amount),0) AS v FROM upfront_fees WHERE startup_id = ?", startupId)?.v ?? 0,
  );
  const collectedSuccess = Number(
    get<{ v: number }>("SELECT COALESCE(SUM(collected_amount),0) AS v FROM success_fees WHERE startup_id = ?", startupId)?.v ?? 0,
  );
  const credits = Number(
    get<{ v: number }>("SELECT COALESCE(SUM(amount),0) AS v FROM credit_notes WHERE startup_id = ? AND status = 'issued'", startupId)?.v ?? 0,
  );
  return upfront + success - collectedUpfront - collectedSuccess - credits;
}

/* ------------------------------------------------------------------ */
/* Admin: reassignment and season setup (doc 11 §1.3, §1.5)            */
/* ------------------------------------------------------------------ */

const reassign: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const entityType = requireString(body, "entity_type"); // startups | investors
  const entityId = requireString(body, "entity_id");
  const toUserId = requireString(body, "to_user_id");
  const reason = requireString(body, "reason");

  const column = entityType === "startups" ? "relationship_manager_id" : "relationship_owner_id";
  const table = entityType === "startups" ? "startups" : "investors";
  const before = getOne(table, entityId);
  if (!before) throw new HttpError(404, `${entityType} record not found`);

  update(table, entityId, { [column]: toUserId }, a, `Reassigned: ${reason}`);
  const record = create(
    "reassignments",
    {
      entity_type: entityType,
      entity_id: entityId,
      from_user_id: before[column] ?? null,
      to_user_id: toUserId,
      reason,
      reassigned_by_id: a.id,
    },
    a,
  );
  notify(toUserId, "A record was reassigned to you", `${entityType} ${entityId}: ${reason}`, entityType, entityId, toUserId);
  return { ok: true, message: "Reassigned", data: record };
};

const seasonSetup: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const seasonId = requireString(body, "season_id");
  const season = getOne("seasons", seasonId);
  if (!season) throw new HttpError(404, "Season not found");

  const steps: { key: string; done: boolean }[] = [];
  const windowSet = Boolean(String(body.window_opens ?? "").trim() && String(body.window_closes ?? "").trim());
  steps.push({ key: "application_window", done: windowSet });
  const feeVersion = String(body.fee_schedule_version ?? "").trim();
  steps.push({ key: "fee_schedule", done: Boolean(feeVersion) });
  const episodes = Number(body.episodes ?? 0);
  steps.push({ key: "episodes", done: episodes > 0 });
  const panel = Array.isArray(body.committee_members) && body.committee_members.length > 0;
  steps.push({ key: "committee_panel", done: panel });
  const templates = Number(
    get<{ n: number }>("SELECT COUNT(*) AS n FROM legal_templates WHERE status IN ('approved','active')")?.n ?? 0,
  );
  steps.push({ key: "legal_templates", done: templates > 0 });

  const incomplete = steps.filter((s) => !s.done).map((s) => s.key);
  const open = String(body.action ?? "save") === "open";
  if (open && incomplete.length) {
    throw new HttpError(409, `The season cannot open until setup is complete. Missing: ${incomplete.join(", ")}`);
  }

  // Persist what was supplied; the season row carries the setup summary.
  const patch: Row = {};
  if (windowSet) {
    patch.starts_on = String(body.window_opens);
    patch.ends_on = String(body.window_closes);
  }
  if (open) patch.status = "live";
  if (Object.keys(patch).length) update("seasons", seasonId, patch, a, open ? "Season opened after setup" : "Season setup saved");

  return {
    ok: true,
    message: open ? "Season opened" : incomplete.length ? `Setup saved; still missing: ${incomplete.join(", ")}` : "Setup complete; the season can open",
    data: { season_id: seasonId, steps, incomplete, opened: open && incomplete.length === 0 },
  };
};

/* ------------------------------------------------------------------ */
/* Community: merge and event budget (doc 09 §2, §3, §5)               */
/* ------------------------------------------------------------------ */

const memberMerge: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const surviving = requireString(body, "surviving_member_id");
  const merged = requireString(body, "merged_member_id");
  if (surviving === merged) throw new HttpError(422, "A member cannot be merged into itself");
  const survivor = getOne("community_members", surviving);
  const duplicate = getOne("community_members", merged);
  if (!survivor || !duplicate) throw new HttpError(404, "Member not found");

  // Fold the duplicate's roles onto the survivor so a person who is founder and mentor keeps
  // both roles on one record (doc 09 §5).
  for (const role of all<Row>("SELECT * FROM community_member_roles WHERE member_id = ?", merged)) {
    create(
      "community_member_roles",
      { member_id: surviving, role: role.role, since: role.since ?? today(), notes: role.notes ?? "" },
      a,
    );
  }
  // Re-point support requests to the survivor rather than deleting the history.
  run("UPDATE support_requests SET member_id = ? WHERE member_id = ?", surviving, merged);
  update("community_members", merged, { member_type: "merged", engagement_summary: `Merged into ${surviving}` }, a, "Merged into a surviving record");
  const record = create(
    "member_merges",
    { surviving_member_id: surviving, merged_member_id: merged, reason: String(body.reason ?? ""), merged_by_id: a.id, merged_on: today() },
    a,
  );
  return { ok: true, message: "Members merged; roles and history preserved on one record", data: record };
};

const eventBudgetApprove: ActionHandler = ({ session, body }) => {
  const a = actorOf(session);
  const eventId = requireString(body, "event_id");
  const event = getOne("community_events", eventId);
  if (!event) throw new HttpError(404, "Event not found");
  const request = raiseApproval(a, {
    approvalType: "event_budget",
    title: `Event budget approval: ${String(event.name)}`,
    recordEntity: "community_events",
    recordId: eventId,
    amount: Number(body.budget ?? event.budget ?? 0),
    impact: `Budget ${Number(body.budget ?? event.budget ?? 0)} paise`,
  });
  return { ok: true, message: "Event budget sent to the super-admin inbox", data: request };
};

/* ------------------------------------------------------------------ */

export const ACTIONS_G: Record<string, ActionHandler> = {
  "approval.raise": approvalRaise,
  "approval.decide": approvalDecide,
  "approval.withdraw": approvalWithdraw,
  "legal.template_create": legalTemplateCreate,
  "legal.template_approve": legalTemplateApprove,
  "legal.template_activate": legalTemplateActivate,
  "legal.dd_finding_raise": ddFindingRaise,
  "legal.dd_finding_resolve": ddFindingResolve,
  "legal.condition_create": conditionCreate,
  "legal.condition_clear": conditionClear,
  "shoot.exception_log": shootExceptionLog,
  "signing.event_create": signingEventCreate,
  "signing.event_complete": signingEventComplete,
  "announcement.draft": announcementDraft,
  "announcement.submit": announcementSubmit,
  "announcement.investor_approve": announcementInvestorApprove,
  "announcement.publish": announcementPublish,
  "finance.tds_record": tdsRecord,
  "finance.form16a_receive": form16aReceive,
  "finance.reconciliation_check": reconciliationCheck,
  "admin.reassign": reassign,
  "admin.season_setup": seasonSetup,
  "community.member_merge": memberMerge,
  "community.event_budget_approve": eventBudgetApprove,
};
