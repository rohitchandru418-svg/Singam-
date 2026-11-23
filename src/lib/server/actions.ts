import { all, get } from "../db/client";
import { seasonCodePrefix } from "./season";
import { addDays, nowISO, today } from "../domain/dates";
import { POLICY_DEFINITION_MAP } from "../domain/policies";
import { STAGE_MAP } from "../domain/workflows";
import { DEFAULT_QUALIFYING_RULE, scoreScreening, type QualifyingRule, type ScreeningScoreInput } from "../domain/scoring";
import { scoreMatch, type MatchScore } from "../domain/matching";
import { compactINR } from "../domain/money";
import { DEFAULT_CALENDAR, addWorkingDays } from "../domain/workingDays";
import { create, getOne, notify, notifyFounder, raiseApproval, update, type Actor, type Row } from "./repo";
import { HttpError, type Session } from "./session";

/**
 * Named business actions.
 *
 * Each action is the single place where a workflow transition happens. It validates the
 * precondition, writes the record, writes the audit entry and raises any notification, so
 * a screen, an API client or an automation all produce the same result.
 */

export interface ActionContext {
  session: Session;
  body: Row;
}

export type ActionHandler = (ctx: ActionContext) => Row | { ok: true; message: string; data?: Row | Row[] };

function requireString(body: Row, field: string): string {
  const value = body[field];
  if (value === undefined || value === null || value === "") {
    throw new HttpError(422, `field ${field} is required`);
  }
  return String(value);
}

function optionalNumber(body: Row, field: string): number | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === "") return undefined;
  return Number(value);
}

function actor(ctx: ActionContext): Actor {
  return ctx.session.actor;
}

function policyValue<T>(code: string): T {
  const row = get<{ value: string }>("SELECT value FROM policies WHERE code = ?", code);
  if (!row) return POLICY_DEFINITION_MAP[code]?.defaultValue as T;
  try {
    return JSON.parse(row.value) as T;
  } catch {
    return POLICY_DEFINITION_MAP[code]?.defaultValue as T;
  }
}

function qualifyingRule(): QualifyingRule {
  const value = policyValue<Partial<QualifyingRule> & { qualifyingScore?: number }>("POL-SCREEN-QUALIFY");
  // An earlier revision stored the cut-off as absolute marks (`qualifyingScore`); the framework is
  // out of 100, so marks and percent are the same number and the legacy key maps straight across.
  const qualifyingPercent = value.qualifyingPercent ?? value.qualifyingScore;
  return {
    ...DEFAULT_QUALIFYING_RULE,
    ...value,
    ...(qualifyingPercent !== undefined ? { qualifyingPercent } : {}),
  };
}

function calendarFromDb(): { holidays: string[]; workingDays: number[] } {
  const row = get<{ holidays: string; working_days: string }>("SELECT * FROM calendars LIMIT 1");
  if (!row) return DEFAULT_CALENDAR;
  return {
    holidays: JSON.parse(row.holidays) as string[],
    workingDays: row.working_days.split(",").map(Number),
  };
}

/* ================================================================== */
/* Startup journey                                                     */
/* ================================================================== */

const applicationDraft: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const stage = String(body.stage_at_application ?? "early_revenue");
  const application = create(
    "applications",
    {
      season_id: body.season_id ?? session.seasonId,
      startup_id: startupId,
      reference_no: body.reference_no ?? `${seasonCodePrefix(session.seasonId)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
      source: body.source ?? "Direct",
      referring_partner: body.referring_partner ?? "",
      campaign: body.campaign ?? "",
      relationship_manager_id: body.relationship_manager_id ?? null,
      stage_at_application: stage,
      status: "draft",
      completion_pct: Number(body.completion_pct ?? 0),
      notes: body.notes ?? "",
    },
    a,
  );
  return { ok: true, message: "Draft application created", data: application };
};

const applicationSubmit: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "application_id");
  const application = getOne("applications", id);
  if (!application) throw new HttpError(404, "Application not found");

  const startupId = String(application.startup_id);
  const earlier = get<Row>(
    "SELECT * FROM applications WHERE startup_id = ? AND id <> ? ORDER BY submitted_at ASC LIMIT 1",
    startupId,
    id,
  );

  const required: string[] = ["Pitch deck", "Founder KYC"];
  if (String(application.stage_at_application) !== "idea") required.push("Financial statements");

  const documents = all<Row>(
    "SELECT * FROM documents WHERE entity_type = 'startup' AND entity_id = ?",
    startupId,
  );
  const present = new Set(documents.map((d) => String(d.title)));
  const missing = required.filter((r) => ![...present].some((p) => p.toLowerCase().includes(r.toLowerCase().split(" ")[0])));

  const updated = update(
    "applications",
    id,
    {
      status: missing.length ? "info_required" : "submitted",
      submitted_at: today(),
      acknowledged_at: nowISO(),
      relationship_manager_id: application.relationship_manager_id ?? "U-SR1",
      duplicate_of: earlier ? earlier.id : null,
      completion_pct: 100,
    },
    a,
    "Formal submission recorded; movement into screening follows submission only",
  );

  notify(
    "startup_relationships",
    `Application submitted: ${application.reference_no}`,
    missing.length
      ? `Missing documents: ${missing.join(", ")}. The application stays in Information required.`
      : "Acknowledgement issued and a relationship manager assigned. The application may now enter screening.",
    "application",
    id,
  );

  return {
    ok: true,
    message: missing.length
      ? `Submission acknowledged with ${missing.length} outstanding document(s)`
      : "Submission acknowledged; assigned to a relationship manager",
    data: { application: updated, missing_documents: missing, linked_to: earlier?.reference_no ?? null },
  };
};

const screeningScore: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const applicationId = requireString(body, "application_id");
  const input: ScreeningScoreInput = {
    completeness: optionalNumber(body, "completeness") ?? null,
    documents: optionalNumber(body, "documents") ?? null,
    unique_idea: optionalNumber(body, "unique_idea") ?? null,
    revenue: optionalNumber(body, "revenue") ?? null,
    traction: optionalNumber(body, "traction") ?? null,
    past_funding: optionalNumber(body, "past_funding") ?? null,
    founder_capability: optionalNumber(body, "founder_capability") ?? null,
    incubation: optionalNumber(body, "incubation") ?? null,
    ip_defensibility: optionalNumber(body, "ip_defensibility") ?? null,
  };
  const result = scoreScreening(input, qualifyingRule());
  const explicitOutcome = body.outcome ? String(body.outcome) : undefined;
  const outcome = explicitOutcome ?? (result.qualifies ? "proceed" : "reject");

  const existing = get<Row>("SELECT * FROM screenings WHERE application_id = ?", applicationId);
  const payload = {
    application_id: applicationId,
    reviewer_id: body.reviewer_id ?? a.id,
    completeness: input.completeness,
    documents: input.documents,
    unique_idea: input.unique_idea,
    revenue: input.revenue,
    traction: input.traction,
    past_funding: input.past_funding,
    founder_capability: input.founder_capability,
    incubation: input.incubation,
    ip_defensibility: input.ip_defensibility,
    total: result.total,
    outcome,
    comments: body.comments ?? "",
    evidence: body.evidence ?? "",
    submitted_at: today(),
  };

  const screening = existing
    ? update("screenings", String(existing.id), payload, a, "Screening scored")
    : create("screenings", payload, a);

  update(
    "applications",
    applicationId,
    {
      status:
        outcome === "proceed" ? "proceeded" : outcome === "reject" ? "rejected" : outcome === "hold" ? "hold" : "info_required",
    },
    a,
    "Application status follows the screening outcome",
  );

  // The founder is told the outcome in plain language, so a rejection or a hold is not a
  // silent state change they only discover by logging in.
  const appRow = getOne("applications", applicationId);
  if (appRow) {
    const startupId = String(appRow.startup_id);
    if (outcome === "proceed") {
      notifyFounder(startupId, "Your application has cleared review", "Congratulations — your application has cleared the initial review and moves to the next stage.", "application", applicationId);
    } else if (outcome === "reject") {
      notifyFounder(startupId, "An update on your application", "After careful consideration your application has not been selected to progress in this programme. Thank you for applying.", "application", applicationId);
    } else if (outcome === "hold") {
      notifyFounder(startupId, "Your application is on hold", "Your application is temporarily on hold. We will update you if any further information is needed.", "application", applicationId);
    } else {
      notifyFounder(startupId, "We need something from you", "Our review team needs a little more information before the review can continue. Please check your document checklist.", "application", applicationId);
    }
  }

  return {
    ok: true,
    message: `Screening recorded: ${result.total}/${result.maxApplicable} (${result.percent}%), outcome ${outcome}`,
    data: { screening, calculation: result },
  };
};

const bootcampInvite: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const applicationId = requireString(body, "application_id");
  const existing = get<Row>("SELECT * FROM bootcamp_attendance WHERE application_id = ?", applicationId);
  // A founder who has already completed the preparation is not re-invited: re-opening the
  // record would regress a completed bootcamp to "invited" and restart the deadline clock. The
  // invitation stands as a no-op so a replay does not corrupt the completed record.
  if (existing && (Number(existing.preparation_completed) === 1 || String(existing.status) === "prep_completed")) {
    return { ok: true, message: "Preparation is already complete for this application; the invitation stands", data: existing };
  }
  const payload = {
    application_id: applicationId,
    invited_on: today(),
    status: "invited",
  };
  const record = existing
    ? update("bootcamp_attendance", String(existing.id), payload, a, "Re-invited to the Prep Bootcamp")
    : create("bootcamp_attendance", payload, a);
  const appRow = getOne("applications", applicationId);
  if (appRow) {
    notifyFounder(
      String(appRow.startup_id),
      "You are invited to the Prep Bootcamp",
      "You are invited to the Prep Bootcamp. Attend the process, readiness, MoU and fee briefing sessions; preparation counts as complete only when every session is done.",
      "application",
      applicationId,
    );
    // The stage carries a 3-working-day deadline and a non-attendance escalation. Both become
    // tracked work items so the deadline is not left to memory (Owner, due date, escalation).
    const stage = STAGE_MAP.prep_bootcamp;
    const ownerId = String(appRow.relationship_manager_id ?? a.id);
    const dueDate = stage?.deadline
      ? addWorkingDays(today(), stage.deadline.workingDays, calendarFromDb())
      : today();
    const openTask = get<Row>(
      "SELECT id FROM tasks WHERE entity_type = 'bootcamp_attendance' AND entity_id = ? AND status = 'open'",
      String(record.id),
    );
    if (!openTask) {
      create(
        "tasks",
        {
          title: `Run the Prep Bootcamp and confirm preparation for ${String(appRow.startup_id)}`,
          description:
            "The founder must complete the process, readiness, MoU and fee briefings; attendance alone is not preparation.",
          department: "startup_relationships",
          module: "bootcamp",
          entity_type: "bootcamp_attendance",
          entity_id: String(record.id),
          owner_id: ownerId,
          due_date: dueDate,
          required_output: "Attendance and readiness record, actions assigned",
          evidence: "Attendance, session completion flags, founder questions",
          approver_id: null,
          next_action: "Schedule the session, then record attendance and each completed briefing",
          status: "open",
          priority: "medium",
        },
        a,
      );
    }
  }
  return { ok: true, message: "Bootcamp invitation recorded", data: record };
};

const bootcampRecord: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const applicationId = requireString(body, "application_id");
  const existing = get<Row>("SELECT * FROM bootcamp_attendance WHERE application_id = ?", applicationId);
  if (!existing) throw new HttpError(404, "No bootcamp record for this application");

  const attended = Boolean(body.attended);
  const sessions = [
    Boolean(body.process_briefing_done),
    Boolean(body.readiness_session_done),
    Boolean(body.mou_briefing_done),
    Boolean(body.fee_briefing_done),
  ];
  const preparationCompleted = attended && sessions.every(Boolean);
  // A no-show can follow any pre-attendance status — invited, registered or scheduled — so the
  // not-attended branch must not be limited to "invited", or a scheduled founder who does not
  // turn up is never marked as such.
  const beforeAttendance = ["not_invited", "invited", "registered", "scheduled"].includes(String(existing.status));
  const notAttended = !attended && beforeAttendance;

  const record = update(
    "bootcamp_attendance",
    String(existing.id),
    {
      registered: body.registered ?? existing.registered,
      attended_on: attended ? today() : null,
      process_briefing_done: sessions[0],
      readiness_session_done: sessions[1],
      mou_briefing_done: sessions[2],
      fee_briefing_done: sessions[3],
      questions: body.questions ?? "",
      actions_assigned: body.actions_assigned ?? "",
      preparation_completed: preparationCompleted,
      status: preparationCompleted
        ? "prep_completed"
        : attended
          ? "attended"
          : notAttended
            ? "not_attended"
            : String(existing.status),
    },
    a,
    "Bootcamp preparation recorded; completion requires every session, not mere attendance",
  );

  if (notAttended) {
    // The stage escalates non-attendance to the Startup Relationship lead.
    const openTask = get<Row>(
      "SELECT id FROM tasks WHERE entity_type = 'bootcamp_attendance' AND entity_id = ? AND status = 'open'",
      String(existing.id),
    );
    if (openTask) {
      update(
        "tasks",
        String(openTask.id),
        { escalation_status: "escalated", escalated_on: today(), escalation_reason: "Founder did not attend the Prep Bootcamp" },
        a,
        "Non-attendance escalated to the Startup Relationship lead",
      );
    }
    notify(
      "startup_relationships",
      "Prep Bootcamp non-attendance",
      `The founder did not attend the Prep Bootcamp for application ${applicationId}. Follow up before the analyst stage.`,
      "application",
      applicationId,
    );
  }

  if (preparationCompleted) {
    const openTask = get<Row>(
      "SELECT id FROM tasks WHERE entity_type = 'bootcamp_attendance' AND entity_id = ? AND status = 'open'",
      String(existing.id),
    );
    if (openTask) {
      update("tasks", String(openTask.id), { status: "done", completed_on: today() }, a, "Preparation completed");
    }
  }

  return {
    ok: true,
    message: preparationCompleted
      ? "Preparation completed; the founder may enter analyst evaluation"
      : notAttended
        ? "Non-attendance recorded and escalated to the Startup Relationship lead"
        : "Attendance recorded; preparation is not yet complete",
    data: record,
  };
};

const analystEvaluate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const applicationId = requireString(body, "application_id");
  // The SOP sequences analyst evaluation after a completed Prep Bootcamp. The gate refuses an
  // evaluation while preparation is incomplete, so a startup is never scored before it is ready.
  const bootcamp = get<Row>("SELECT * FROM bootcamp_attendance WHERE application_id = ?", applicationId);
  const ready = bootcamp && (Number(bootcamp.preparation_completed) === 1 || String(bootcamp.status) === "prep_completed");
  if (!ready) {
    throw new HttpError(409, "Prep Bootcamp preparation is not complete for this application; complete every briefing before the analyst evaluation");
  }
  const payload = {
    application_id: applicationId,
    analyst_id: body.analyst_id ?? a.id,
    thesis_fit: Number(body.thesis_fit ?? 0),
    market_opportunity: Number(body.market_opportunity ?? 0),
    traction: Number(body.traction ?? 0),
    business_model: Number(body.business_model ?? 0),
    competitive_positioning: Number(body.competitive_positioning ?? 0),
    willingness_to_invest: Number(body.willingness_to_invest ?? 0),
    indicative_amount: Number(body.indicative_amount ?? 0),
    recommendation: body.recommendation ?? "pending",
    decision_reason: body.decision_reason ?? "",
    outstanding_concern: body.outstanding_concern ?? "",
    evaluated_at: today(),
  };
  const existing = get<Row>("SELECT * FROM analyst_evaluations WHERE application_id = ?", applicationId);
  const record = existing
    ? update("analyst_evaluations", String(existing.id), payload, a, "Analyst evaluation updated")
    : create("analyst_evaluations", payload, a);
  const appRow = getOne("applications", applicationId);
  if (appRow && String(payload.recommendation) !== "pending") {
    const proceed = String(payload.recommendation) === "proceed";
    notifyFounder(
      String(appRow.startup_id),
      proceed ? "Funding fit: cleared for the next stage" : "Funding fit: outcome recorded",
      proceed
        ? "Our analyst has completed the funding-fit review and cleared your startup for the next stage."
        : "Our analyst has completed the funding-fit review. The team will be in touch about the next step.",
      "application",
      applicationId,
    );
  }
  return {
    ok: true,
    message: "Analyst evaluation recorded. Willingness to invest stays indicative and is never treated as a commitment.",
    data: record,
  };
};

const mouShare: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const applicationId = requireString(body, "application_id");
  const policy = policyValue<{ legalAmaWorkingDay: number; signingDeadlineWorkingDay: number }>("POL-MOU-TIMING");
  const cal = calendarFromDb();
  const shared = today();
  const amaDue = addWorkingDays(shared, policy.legalAmaWorkingDay ?? 4, cal);
  const deadline = addWorkingDays(shared, policy.signingDeadlineWorkingDay ?? 7, cal);
  const app = getOne("applications", applicationId);

  const existing = get<Row>("SELECT * FROM mous WHERE application_id = ?", applicationId);
  const payload = {
    application_id: applicationId,
    shared_on: shared,
    legal_ama_due: amaDue,
    signing_deadline: deadline,
    status: "shared",
    commercial_schedule: body.commercial_schedule ?? "",
    founder_email: body.founder_email ?? "",
  };
  const record = existing
    ? update("mous", String(existing.id), payload, a, "MoU shared; review clock started")
    : create("mous", payload, a);

  notify(
    "legal",
    `MoU shared for ${app?.reference_no ?? applicationId}`,
    `Legal AMA on ${amaDue} (working day 4) and signing deadline on ${deadline} (working day 7).`,
    "mou",
    String(record.id),
  );

  // The founder is told the agreement is ready and the dates they must work to.
  if (app) {
    notifyFounder(
      String(app.startup_id),
      "Your participation agreement is ready to review",
      `Read and sign your participation agreement by ${deadline}. A Legal AMA is available on ${amaDue} if you have questions.`,
      "mou",
      String(record.id),
    );
  }

  return { ok: true, message: `MoU shared. AMA due ${amaDue}, signing deadline ${deadline}.`, data: record };
};

const mouRespond: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "mou_id");
  const response = requireString(body, "response"); // Proceed | Negotiate | Discontinue
  const mou = getOne("mous", id);
  if (!mou) throw new HttpError(404, "MoU not found");

  if (response === "Proceed") {
    const record = update(
      "mous",
      id,
      { response, signed_on: today(), status: "signed", approved_exceptions: body.approved_exceptions ?? mou.approved_exceptions },
      a,
      "Founder proceeded and signed the MoU",
    );
    return { ok: true, message: "MoU signed", data: record };
  }

  if (response === "Negotiate") {
    const record = update(
      "mous",
      id,
      { response, status: "negotiation", escalated_to_management: 1, approved_exceptions: body.notes ?? mou.approved_exceptions },
      a,
      "Negotiation requested; escalated to Management",
    );
    notify("management", "MoU negotiation escalated", `Application ${mou.application_id} requires a Management decision.`, "mou", id);
    return { ok: true, message: "Negotiation recorded and escalated to Management", data: record };
  }

  if (response === "Discontinue") {
    const record = update(
      "mous",
      id,
      {
        response,
        status: "discontinued",
        discontinued_reason: body.reason ?? "",
        founder_email: body.founder_email ?? mou.founder_email,
      },
      a,
      "Founder discontinued; email and reason retained for the record",
    );
    return { ok: true, message: "Discontinuation recorded with the founder email and reason retained", data: record };
  }

  throw new HttpError(422, "response must be Proceed, Negotiate or Discontinue");
};

const mouRecordAma: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "mou_id");
  return {
    ok: true,
    message: "Legal AMA recorded",
    data: update("mous", id, { legal_ama_on: today(), status: "legal_ama_done" }, a, "Legal AMA completed on the fourth working day"),
  };
};

/* ---------------------------- IRR handover ---------------------------- */

const irrRequest: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const applicationId = requireString(body, "application_id");
  const priorVersions = all<Row>("SELECT * FROM irr_reports WHERE application_id = ?", applicationId);
  const version = priorVersions.length + 1;

  const record = create(
    "irr_reports",
    { application_id: applicationId, version, status: "requested", requested_on: today() },
    a,
  );
  create(
    "handovers",
    {
      from_department: "startup_relationships",
      to_department: "finance",
      entity_type: "startup",
      entity_id: getOne("applications", applicationId)?.startup_id ?? applicationId,
      summary: "IRR request raised after MoU signing.",
      status: "pending",
    },
    a,
  );
  return { ok: true, message: `IRR v${version} requested from Finance/IRR`, data: record };
};

const irrAdvance: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "irr_id");
  const step = requireString(body, "step");
  const map: Record<string, Row> = {
    accept_handover: { status: "handover_accepted", handover_accepted_on: today() },
    send_checklist: { status: "checklist_sent", checklist_sent_on: today() },
    prepare: { status: "in_preparation", prepared_on: today() },
    request_docs: { status: "docs_pending", missing_documents: body.missing_documents ?? "" },
    review: { status: "under_review", reviewed_by_id: a.id },
    approve: { status: "approved", approved_on: today(), approved_by_id: a.id },
    share_with_ir: { status: "shared_with_ir", shared_with_ir_on: today(), document_ref: body.document_ref ?? "" },
  };
  const patch = map[step];
  if (!patch) throw new HttpError(422, `unknown IRR step: ${step}`);

  const record = update("irr_reports", id, { ...patch, ...(body.missing_documents ? { missing_documents: body.missing_documents } : {}) }, a, `IRR step: ${step}`);

  if (step === "share_with_ir") {
    const irr = getOne("irr_reports", id);
    const app = irr ? getOne("applications", String(irr.application_id)) : undefined;
    create(
      "handovers",
      {
        from_department: "finance",
        to_department: "investor_relations",
        entity_type: "startup",
        entity_id: app?.startup_id ?? "",
        summary: `Approved IRR v${irr?.version ?? 1} handed to Investor Relations.`,
        status: "accepted",
        accepted_by_id: a.id,
        accepted_on: today(),
      },
      a,
    );
    create(
      "documents",
      {
        entity_type: "startup",
        entity_id: app?.startup_id ?? "",
        title: `IRR - version ${irr?.version ?? 1}`,
        purpose: "irr_report",
        category: "Report",
        version: irr?.version ?? 1,
        status: "verified",
        file_ref: body.document_ref ?? "",
        uploaded_by_id: a.id,
        uploaded_on: today(),
        notes: "The version shared with investors is preserved.",
      },
      a,
    );
  }
  return { ok: true, message: `IRR updated: ${step}`, data: record };
};

/* ================================================================== */
/* Investor journey                                                    */
/* ================================================================== */

const investorCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const record = create(
    "investors",
    {
      ...body,
      status: body.status ?? "sourced",
      relationship_owner_id: body.relationship_owner_id ?? a.id,
    },
    a,
  );
  return { ok: true, message: "Investor record created", data: record };
};

const investorVerify: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "investor_id");
  const policy = policyValue<{ requireVerificationEvidence: boolean; requireReferenceChecks: boolean }>("POL-INV-ELIGIBILITY");
  const investor = getOne("investors", id);
  if (!investor) throw new HttpError(404, "Investor not found");

  if (policy.requireVerificationEvidence && !body.verification_evidence && !investor.verification_evidence) {
    throw new HttpError(422, "Verification evidence is required before the investor can be verified");
  }
  if (policy.requireReferenceChecks && !body.reference_checks && !investor.reference_checks) {
    throw new HttpError(422, "Reference checks are required before the investor can be verified");
  }

  const record = update(
    "investors",
    id,
    {
      verification_evidence: body.verification_evidence ?? investor.verification_evidence,
      reference_checks: body.reference_checks ?? investor.reference_checks,
      status: "verified",
    },
    a,
    "Investor verification completed against the eligibility policy",
  );
  return { ok: true, message: "Investor verified", data: record };
};

const investorGrade: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "investor_id");
  const grade = requireString(body, "grade");
  const investor = getOne("investors", id);
  if (!investor) throw new HttpError(404, "Investor not found");

  const previousGrade = investor.grade ? String(investor.grade) : null;
  const record = create(
    "investor_grade_assessments",
    {
      investor_id: id,
      grade,
      dimension: body.dimension ?? "Overall",
      score: Number(body.score ?? 0),
      evidence: body.evidence ?? "",
      reviewer_id: a.id,
      approved_on: today(),
      permitted_engagement: body.permitted_engagement ?? "",
      panel_role: body.panel_role ?? "",
      review_date: body.review_date ?? addDays(today(), 365),
      change_reason: body.change_reason ?? (previousGrade && previousGrade !== grade ? `Changed from ${previousGrade}` : ""),
    },
    a,
  );
  update("investors", id, { grade, status: investor.status === "verified" ? "onboarded" : investor.status }, a, `Grade ${grade.toUpperCase()} proposed`);

  // A grade is internal-only and needs super-admin approval before it takes effect (doc 11 §2.1).
  const approval = raiseApproval(a, {
    approvalType: "grade",
    title: `Investor grade ${grade.toUpperCase()} for ${String(investor.name ?? id)}`,
    recordEntity: "investor_grade_assessments",
    recordId: String(record.id),
    investorId: id,
    impact: `Grade ${grade.toUpperCase()} sets engagement and panel role`,
  });
  return { ok: true, message: `Investor grade ${grade.toUpperCase()} proposed; awaiting super-admin approval`, data: { ...record, approval_id: approval.id } };
};

const investorAgreement: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const investorId = requireString(body, "investor_id");
  const documentType = requireString(body, "document_type");
  const status = body.status ?? "verified";
  const record = create(
    "investor_agreements",
    {
      investor_id: investorId,
      document_type: documentType,
      status,
      signed_on: status === "verified" ? today() : null,
      reference: body.reference ?? "",
      notes: body.notes ?? "",
    },
    a,
  );

  const policy = policyValue<{ byCategory: Record<string, string[]>; exitGateRequiresAll: boolean }>("POL-INVESTOR-DOCS");
  const investor = getOne("investors", investorId);
  const required = policy.byCategory[String(investor?.category ?? "")] ?? [];
  const signed = all<Row>(
    "SELECT document_type FROM investor_agreements WHERE investor_id = ? AND status = 'verified'",
    investorId,
  ).map((r) => String(r.document_type));
  const missing = required.filter((r) => !signed.includes(r));

  if (missing.length === 0 && investor && investor.status !== "onboarded") {
    update("investors", investorId, { status: "onboarded" }, a, "Mandatory document set complete");
  }

  return {
    ok: true,
    message: missing.length
      ? `Agreement recorded. Still required for this category: ${missing.join(", ")}.`
      : "Agreement recorded; the mandatory document set for this category is complete",
    data: { agreement: record, missing },
  };
};

const matchSuggest: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const startup = getOne("startups", startupId);
  if (!startup) throw new HttpError(404, "Startup not found");

  const ask = Number(
    get<{ v: number }>(
      "SELECT COALESCE(MAX(final_ask),0) AS v FROM mock_shoots WHERE startup_id = ? AND season_id = ?",
      startupId,
      session.seasonId,
    )?.v ?? 0,
  );

  const investors = all<Row>("SELECT * FROM investors WHERE status IN ('onboarded','verified')");
  const existing = all<Row>("SELECT * FROM matches WHERE startup_id = ? AND season_id = ?", startupId, session.seasonId);
  const existingInvestors = new Set(existing.map((m) => String(m.investor_id)));

  const created: Row[] = [];
  const scored: (MatchScore & { investor_id: string; name: string })[] = [];

  for (const investor of investors) {
    const allocated = Number(investor.proposed_season_allocation ?? 0);
    const used = Number(
      get<{ v: number }>(
        `SELECT COALESCE(SUM(amount),0) AS v FROM commitments
          WHERE investor_id = ? AND status IN ('confirmed','shoot_day_confirmed','written_proposed')`,
        investor.id,
      )?.v ?? 0,
    );
    const result = scoreMatch({
      startup: { sector: String(startup.sector), stage: String(startup.stage), geography: String(startup.geography) },
      investor: {
        sector_focus: String(investor.sector_focus),
        stage_focus: String(investor.stage_focus),
        geography: String(investor.geography),
        thesis: String(investor.thesis),
        ticket_min: Number(investor.ticket_min),
        ticket_max: Number(investor.ticket_max),
        grade: investor.grade ? String(investor.grade) : null,
        status: String(investor.status),
      },
      availableAllocationPaise: Math.max(0, allocated - used),
      fundingAskPaise: ask,
    });
    scored.push({ ...result, investor_id: String(investor.id), name: String(investor.name) });

    if (result.blockers.length > 0 || existingInvestors.has(String(investor.id))) continue;

    const record = create(
      "matches",
      {
        startup_id: startupId,
        investor_id: String(investor.id),
        score: result.score,
        score_reasons: JSON.stringify(result.reasons),
        status: "suggested",
        next_action: "Investor Relations approval to circulate",
        next_action_due: addDays(today(), 3),
      },
      a,
    );
    created.push(record);
  }

  scored.sort((x, y) => y.score - x.score);
  return {
    ok: true,
    message: `${created.length} new suggestion(s) created; ${scored.length} investors scored. The system recommends only - Investor Relations approves circulation.`,
    data: { created, scored },
  };
};

const matchApprove: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "match_id");
  return {
    ok: true,
    message: "Match approved for circulation",
    data: update(
      "matches",
      id,
      { status: "approved_for_circulation", approved_for_circulation_by_id: a.id },
      a,
      "Investor Relations approved circulation",
    ),
  };
};

const matchShare: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "match_id");
  const match = getOne("matches", id);
  if (!match) throw new HttpError(404, "Match not found");
  if (match.status === "suggested") {
    throw new HttpError(409, "A suggested match must be approved by Investor Relations before it is shared");
  }

  const record = update(
    "matches",
    id,
    {
      status: "shared",
      information_shared: body.information_shared ?? match.information_shared,
      info_version: body.info_version ?? match.info_version,
      shared_on: today(),
      next_action: "Follow up on the response",
      next_action_due: addDays(today(), 7),
    },
    a,
    "Information shared with the investor; the shared version is preserved",
  );

  const startup = getOne("startups", String(match.startup_id));
  create(
    "documents",
    {
      entity_type: "match",
      entity_id: id,
      title: `${body.info_version ?? match.info_version} shared with investor`,
      purpose: "irr_report",
      category: "Distribution record",
      version: 1,
      status: "received",
      file_ref: String(body.information_shared ?? ""),
      uploaded_by_id: a.id,
      uploaded_on: today(),
      notes: `Investor ${match.investor_id}; version ${body.info_version ?? match.info_version}.`,
    },
    a,
  );
  void startup;

  return { ok: true, message: "Information shared and the shared version recorded", data: record };
};

const matchRespond: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "match_id");
  const response = requireString(body, "response");
  const match = getOne("matches", id);
  if (!match) throw new HttpError(404, "Match not found");

  const status =
    response === "Pass"
      ? "passed"
      : response === "Ready to Invest"
        ? "advanced"
        : response === "No Response"
          ? "shared"
          : "responded";

  const record = update(
    "matches",
    id,
    {
      status,
      response,
      questions: body.questions ?? match.questions,
      documents_requested: body.documents_requested ?? match.documents_requested,
      indicative_amount: Number(body.indicative_amount ?? match.indicative_amount),
      pass_reason: response === "Pass" ? body.pass_reason ?? "" : "",
      next_action: body.next_action ?? match.next_action,
      next_action_due: body.next_action_due ?? match.next_action_due,
    },
    a,
    "Investor response recorded",
  );

  if (response === "Ready to Invest") {
    notify(
      "investor_relations",
      "Ready to Invest received",
      "Confirm amount, terms and conditions. This is not deployed or contractually committed capital.",
      "match",
      id,
    );
  }

  return {
    ok: true,
    message:
      response === "Ready to Invest"
        ? "Response recorded. Ready to Invest confirms amount and terms; it is not yet committed or deployed capital."
        : `Response recorded: ${response}`,
    data: record,
  };
};

const pitchSchedule: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const scheduledAt = String(body.scheduled_at ?? `${today()}T10:00:00.000Z`);
  // One scheduled pitch per startup in the season: scheduling again reschedules the same
  // record (with the reason kept in the audit) instead of stacking duplicate pitches.
  const existing = get<Row>(
    "SELECT * FROM virtual_pitches WHERE startup_id = ? AND season_id = ? AND attended = 0 ORDER BY scheduled_at DESC LIMIT 1",
    startupId,
    session.seasonId,
  );
  const payload = {
    startup_id: startupId,
    season_id: session.seasonId,
    match_id: body.match_id ?? existing?.match_id ?? null,
    investor_id: body.investor_id ?? existing?.investor_id ?? null,
    scheduled_at: scheduledAt,
    duration_pitch_min: Number(body.duration_pitch_min ?? 5),
    duration_qa_min: Number(body.duration_qa_min ?? 5),
    material_shared: body.material_shared ?? "",
    meet_link: body.meet_link ?? existing?.meet_link ?? "",
    // A rescheduled pitch is not a missed pitch any more.
    missed: 0,
    reschedule_reason: String(body.reschedule_reason ?? ""),
    response: "no_response",
  };
  const record = existing
    ? update("virtual_pitches", String(existing.id), payload, a, body.reschedule_reason ? `Virtual pitch rescheduled: ${String(body.reschedule_reason)}` : "Virtual pitch rescheduled")
    : create("virtual_pitches", payload, a);

  notifyFounder(
    startupId,
    existing ? "Your virtual pitch has been rescheduled" : "Your virtual pitch is scheduled",
    `Your virtual investor pitch is on ${scheduledAt.slice(0, 10)} — five minutes of pitch and five minutes of questions. The meeting link and material will be shared with you.`,
    "startup",
    startupId,
  );
  return { ok: true, message: `Virtual pitch ${existing ? "rescheduled" : "scheduled"} with 5 minutes of pitch and 5 minutes of Q&A`, data: record };
};

const pitchRecord: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "pitch_id");
  const response = requireString(body, "response");
  const attended = body.attended === undefined ? 1 : Number(body.attended) === 1 ? 1 : 0;
  const record = update(
    "virtual_pitches",
    id,
    {
      attended,
      // A missed pitch is recorded explicitly so the founder's journey can show it and the
      // team can offer a new date, rather than the record looking like a quiet no-response.
      missed: attended === 0 ? 1 : 0,
      investor_questions: body.investor_questions ?? "",
      responses: body.responses ?? "",
      response,
      amount_confirmed: Number(body.amount_confirmed ?? 0),
      terms_confirmed: body.terms_confirmed ?? "",
    },
    a,
    attended === 0 ? "Virtual pitch not attended" : "Virtual pitch response recorded",
  );
  const pitch = getOne("virtual_pitches", id);
  if (pitch && attended === 0) {
    notifyFounder(
      String(pitch.startup_id),
      "You missed your virtual pitch",
      "The team recorded that you could not attend your virtual pitch. Ask to reschedule and the team will offer a new date.",
      "startup",
      String(pitch.startup_id),
    );
  }
  return { ok: true, message: attended === 0 ? "Missed pitch recorded; the team will offer a new date" : `Pitch response recorded: ${response}`, data: record };
};

const pitchDayRecord: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const record = create(
    "pitch_days",
    {
      startup_id: startupId,
      episode_no: body.episode_no ?? "",
      scheduled_at: body.scheduled_at ?? today(),
      irr_distributed: body.irr_distributed ? 1 : 0,
      information_memorandum_distributed: body.information_memorandum_distributed ? 1 : 0,
      outcome: body.outcome ?? "one_to_one_held",
      follow_on_interest: body.follow_on_interest ?? "",
      further_discussion_deadline: body.further_discussion_deadline ?? "",
    },
    a,
  );

  for (const slot of (body.slots as Row[] | undefined) ?? []) {
    create(
      "pitch_day_slots",
      {
        pitch_day_id: String(record.id),
        investor_id: slot.investor_id,
        slot_time: slot.slot_time ?? "",
        held: slot.held ? 1 : 0,
        outcome: slot.outcome ?? "one_to_one_held",
        notes: slot.notes ?? "",
      },
      a,
    );
  }
  return { ok: true, message: "Pitch Day recorded with one-to-one slots", data: record };
};

const goldenPassIssue: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const investorId = requireString(body, "investor_id");
  const policy = policyValue<{ minimumIndicativeAmount: number; requiresWrittenEvidence: boolean; countsAsWrittenCommitment: boolean }>("POL-GOLDEN-PASS");
  const amount = Number(body.amount ?? 0);

  if (amount < policy.minimumIndicativeAmount) {
    throw new HttpError(
      422,
      `Golden Pass requires an indicated amount of at least ${compactINR(policy.minimumIndicativeAmount)} under the current policy`,
    );
  }
  if (policy.requiresWrittenEvidence && !body.evidence) {
    throw new HttpError(422, "Golden Pass requires written evidence under the current policy");
  }

  const commitment = create(
    "commitments",
    {
      startup_id: startupId,
      investor_id: investorId,
      status: policy.countsAsWrittenCommitment ? "written_proposed" : "golden_pass",
      amount,
      valuation: body.valuation ?? "",
      terms: body.terms ?? "",
      evidence: body.evidence ?? "",
      is_golden_pass: 1,
    },
    a,
  );

  if (body.pitch_day_id) {
    update(
      "pitch_days",
      String(body.pitch_day_id),
      {
        outcome: "golden_pass_issued",
        golden_pass_issuer_investor_id: investorId,
        golden_pass_evidence: body.evidence ?? "",
      },
      a,
      "Golden Pass recorded against the Pitch Day",
    );
  }

  return {
    ok: true,
    message:
      "Golden Pass recorded as initial interest. It stays separate from a written investment commitment and from deployed capital.",
    data: commitment,
  };
};

const committeeDecide: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const outcome = requireString(body, "outcome");
  const pack = buildCommitteePack(startupId, session.seasonId);

  const existing = get<Row>(
    "SELECT * FROM committee_decisions WHERE startup_id = ? AND season_id = ? AND outcome = 'pending'",
    startupId,
    session.seasonId,
  );
  const payload = {
    startup_id: startupId,
    pack_summary: body.pack_summary ?? pack.summary,
    outcome,
    conditions: body.conditions ?? "",
    approver_id: a.id,
    decided_on: today(),
    re_review_date: outcome === "on_hold" ? body.re_review_date ?? addDays(today(), 14) : "",
  };
  const record = existing
    ? update("committee_decisions", String(existing.id), payload, a, "Committee decision recorded")
    : create("committee_decisions", payload, a);

  notify(
    "startup_relationships",
    `Committee outcome: ${outcome}`,
    "This is the authorisation point for show selection and the upfront fee workflow.",
    "startup",
    startupId,
  );

  // The founder hears the committee's decision directly, including a hold or a rejection.
  if (outcome === "proceed") {
    notifyFounder(startupId, "You have been selected for the show", "The selection committee has approved your startup. Next: your programme fee and production scheduling.", "startup", startupId);
  } else if (outcome === "on_hold") {
    notifyFounder(startupId, "Your selection is on hold", "The committee has placed your selection on hold. The team will confirm the re-review date and any conditions.", "startup", startupId);
  } else if (outcome === "rejected") {
    notifyFounder(startupId, "An update on your selection", "After committee review your startup has not been selected for this season. Thank you for taking part.", "startup", startupId);
  }

  return { ok: true, message: `Committee outcome recorded: ${outcome}`, data: { decision: record, pack } };
};

export function buildCommitteePack(
  startupId: string,
  seasonId: string,
): { summary: string; items: Record<string, unknown>[] } {
  const startup = getOne("startups", startupId);
  const irr = get<Row>(
    "SELECT * FROM irr_reports WHERE application_id IN (SELECT id FROM applications WHERE startup_id = ? AND season_id = ?) ORDER BY version DESC LIMIT 1",
    startupId,
    seasonId,
  );
  const feedback = all<Row>("SELECT * FROM matches WHERE startup_id = ? AND season_id = ?", startupId, seasonId);
  const passes = all<Row>("SELECT * FROM commitments WHERE startup_id = ? AND season_id = ? AND is_golden_pass = 1", startupId, seasonId);
  const unresolved = feedback.filter((f) => String(f.questions ?? "") !== "" && String(f.status) !== "passed");
  const production = get<Row>("SELECT * FROM production_handovers WHERE startup_id = ? AND season_id = ?", startupId, seasonId);
  const fee = get<Row>("SELECT * FROM upfront_fees WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, seasonId);

  const items = [
    { label: "Startup evaluation and IRR", value: irr ? `IRR v${irr.version} - ${irr.status}` : "Not prepared" },
    { label: "Investor feedback", value: `${feedback.length} conversation(s)` },
    { label: "Golden Pass details", value: passes.length ? `${passes.length} pass(es) issued` : "None" },
    { label: "Unresolved questions", value: unresolved.length ? `${unresolved.length} open` : "None" },
    { label: "Proposed investor participation", value: `${feedback.filter((f) => f.status === "advanced").length} advanced` },
    { label: "Production readiness", value: production ? String(production.status) : "Not started" },
    { label: "Commercial status", value: fee ? `Upfront fee ${fee.status}` : "Not initiated" },
  ];

  return {
    summary: `${startup?.name ?? startupId}: ${items.map((i) => `${i.label} - ${i.value}`).join("; ")}.`,
    items,
  };
}

const preshootConfirm: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const shootDate = body.shoot_date ? String(body.shoot_date) : null;
  const policy = policyValue<{ workingDaysBeforeShoot: number; atRiskThresholdWorkingDays: number }>("POL-IRR-2WEEK");

  let alert: string | null = null;
  if (shootDate) {
    const requiredBy = addWorkingDays(shootDate, -(policy.workingDaysBeforeShoot ?? 10), calendarFromDb());
    if (requiredBy < today()) {
      alert = `The IRR two-week deadline was ${requiredBy}; the shoot is ${shootDate}. Escalate to Management.`;
      notify("management", "IRR deadline at risk", alert, "startup", startupId);
    }
  }

  const existing = get<Row>("SELECT * FROM pre_shoot_confirmations WHERE startup_id = ? AND season_id = ?", startupId, session.seasonId);
  const payload = {
    startup_id: startupId,
    episode_no: body.episode_no ?? "",
    panel_summary: body.panel_summary ?? "",
    written_commitment_ref: body.written_commitment_ref ?? "",
    valuation_boundaries: body.valuation_boundaries ?? "",
    decision_parameters: body.decision_parameters ?? "",
    production_briefing_done: body.production_briefing_done ? 1 : 0,
    outstanding_issues: body.outstanding_issues ?? "",
    required_documentation: body.required_documentation ?? "",
    irr_shared_on: body.irr_shared_on ?? null,
    shoot_date: shootDate,
  };
  const record = existing
    ? update("pre_shoot_confirmations", String(existing.id), payload, a, "Pre-shoot confirmation updated")
    : create("pre_shoot_confirmations", payload, a);

  return { ok: true, message: alert ?? "Pre-shoot panel and commitment confirmation recorded", data: { record, alert } };
};

const commitmentConfirm: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "commitment_id");
  const record = update(
    "commitments",
    id,
    { status: body.status ?? "confirmed", confirmed_on: today(), evidence: body.evidence ?? "" },
    a,
    "Written commitment confirmed",
  );
  return { ok: true, message: "Commitment confirmed", data: record };
};

const commitmentRevise: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const originalId = requireString(body, "commitment_id");
  const original = getOne("commitments", originalId);
  if (!original) throw new HttpError(404, "Commitment not found");

  const record = create(
    "commitments",
    {
      startup_id: original.startup_id,
      investor_id: original.investor_id,
      status: "revised",
      amount: Number(body.amount ?? original.amount),
      valuation: body.valuation ?? original.valuation,
      terms: body.terms ?? original.terms,
      evidence: body.evidence ?? "",
      // A revised commitment is a new record. It keeps the Golden Pass flag unless the caller
      // says otherwise, so a Golden Pass converted into a written commitment stays distinct
      // from the initial-interest record it came from.
      is_golden_pass: body.is_golden_pass !== undefined ? (body.is_golden_pass ? 1 : 0) : original.is_golden_pass,
      revised_from_id: originalId,
      revision_reason: requireString(body, "revision_reason"),
    },
    a,
  );
  // A revised commitment needs super-admin approval (doc 11 §2.2).
  const approval = raiseApproval(a, {
    approvalType: "commitment_change",
    title: `Revised commitment for ${String(original.startup_id)}`,
    recordEntity: "commitments",
    recordId: String(record.id),
    startupId: String(original.startup_id),
    investorId: String(original.investor_id ?? ""),
    amount: Number(body.amount ?? original.amount ?? 0),
  });
  return { ok: true, message: "Commitment revised; the original record, the reason and the approval request are recorded", data: { ...record, approval_id: approval.id } };
};

const commitmentWithdraw: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "commitment_id");
  const original = getOne("commitments", id);
  if (!original) throw new HttpError(404, "Commitment not found");
  const updated = update("commitments", id, { status: "withdrawn", revision_reason: requireString(body, "reason") }, a, "Commitment withdrawn");
  // A withdrawn commitment needs super-admin approval (doc 11 §2.2).
  const approval = raiseApproval(a, {
    approvalType: "commitment_change",
    title: `Withdrawn commitment for ${String(original.startup_id)}`,
    recordEntity: "commitments",
    recordId: id,
    startupId: String(original.startup_id),
    investorId: String(original.investor_id ?? ""),
  });
  return { ok: true, message: "Commitment withdrawn with the reason recorded; awaiting super-admin approval", data: { ...updated, approval_id: approval.id } };
};

/* ------------------------------------------------------------------ */

export const ACTIONS_A: Record<string, ActionHandler> = {
  "application.draft": applicationDraft,
  "application.submit": applicationSubmit,
  "screening.score": screeningScore,
  "bootcamp.invite": bootcampInvite,
  "bootcamp.record": bootcampRecord,
  "analyst.evaluate": analystEvaluate,
  "mou.share": mouShare,
  "mou.record_ama": mouRecordAma,
  "mou.respond": mouRespond,
  "irr.request": irrRequest,
  "irr.advance": irrAdvance,
  "investor.create": investorCreate,
  "investor.verify": investorVerify,
  "investor.grade": investorGrade,
  "investor.agreement": investorAgreement,
  "match.suggest": matchSuggest,
  "match.approve": matchApprove,
  "match.share": matchShare,
  "match.respond": matchRespond,
  "pitch.schedule": pitchSchedule,
  "pitch.record": pitchRecord,
  "pitchday.record": pitchDayRecord,
  "pitchday.golden_pass": goldenPassIssue,
  "committee.decide": committeeDecide,
  "preshoot.confirm": preshootConfirm,
  "commitment.confirm": commitmentConfirm,
  "commitment.revise": commitmentRevise,
  "commitment.withdraw": commitmentWithdraw,
};
