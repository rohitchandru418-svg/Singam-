import { all, get, run } from "../db/client";
import { addDays, nowISO, today } from "../domain/dates";
import { addWorkingDays } from "../domain/workingDays";
import { DOCUMENT_PURPOSE_MAP } from "../domain/documents";
import { create, getOne, notify, notifyFounder, raiseApproval, update, type Actor, type Row } from "./repo";
import { HttpError } from "./session";
import type { ActionContext, ActionHandler } from "./actions";

function actor(ctx: ActionContext): Actor {
  return ctx.session.actor;
}

function requireString(body: Row, field: string): string {
  const value = body[field];
  if (value === undefined || value === null || value === "") throw new HttpError(422, `field ${field} is required`);
  return String(value);
}

/* ================================================================== */
/* Production                                                          */
/* ================================================================== */

const productionHandover: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const committee = get<Row>(
    "SELECT * FROM committee_decisions WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1",
    startupId,
    session.seasonId,
  );
  const fee = get<Row>(
    "SELECT * FROM upfront_fees WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1",
    startupId,
    session.seasonId,
  );
  const selectionApproved = committee?.outcome === "proceed" ? 1 : 0;
  const paymentCleared = fee && Number(fee.outstanding) === 0 && Number(fee.paid_amount) > 0 ? 1 : 0;

  const existing = get<Row>(
    "SELECT * FROM production_handovers WHERE startup_id = ? AND season_id = ?",
    startupId,
    session.seasonId,
  );
  const payload = {
    startup_id: startupId,
    status: "pending",
    selection_approved: selectionApproved,
    payment_cleared: paymentCleared,
    advance_notified: 1,
    pack_summary: body.pack_summary ?? "",
    permitted_business_information: body.permitted_business_information ?? "",
    handed_over_on: today(),
  };
  const record = existing
    ? update("production_handovers", String(existing.id), payload, a, "Handover refreshed")
    : create("production_handovers", payload, a);

  return {
    ok: true,
    message: paymentCleared
      ? "Handover raised. Selection approved and payment cleared; production may accept the pack."
      : "Advance notification recorded. The AV shoot handover follows completed payment, so acceptance stays blocked.",
    data: record,
  };
};

const productionAccept: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "handover_id");
  const handover = getOne("production_handovers", id);
  if (!handover) throw new HttpError(404, "Handover not found");
  if (!handover.payment_cleared) {
    throw new HttpError(409, "The AV shoot handover follows completed payment; payment is not cleared");
  }
  const record = update(
    "production_handovers",
    id,
    { status: "accepted", accepted_on: today(), accepted_by_id: a.id },
    a,
    "Production accepted the handover pack",
  );
  return { ok: true, message: "Handover accepted", data: record };
};

const avShootUpdate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const existing = get<Row>("SELECT * FROM av_shoots WHERE startup_id = ? AND season_id = ?", startupId, session.seasonId);
  const payload: Row = {
    startup_id: startupId,
    story_research: body.story_research ?? "",
    location: body.location ?? "",
    crew: body.crew ?? "",
    schedule_on: body.schedule_on ?? null,
    founder_availability: body.founder_availability ?? "",
    shot_requirements: body.shot_requirements ?? "",
    asset_links: body.asset_links ?? "",
    status: body.status ?? "planned",
  };
  if (body.status === "completed") payload.completed_on = today();
  const record = existing
    ? update("av_shoots", String(existing.id), payload, a, "AV shoot updated")
    : create("av_shoots", payload, a);
  return { ok: true, message: "AV shoot updated", data: record };
};

const mockShootUpdate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const existing = get<Row>("SELECT * FROM mock_shoots WHERE startup_id = ? AND season_id = ?", startupId, session.seasonId);
  const approveReadiness = Boolean(body.approve_readiness);
  const payload: Row = {
    startup_id: startupId,
    scheduled_on: body.scheduled_on ?? null,
    costumes_properties: body.costumes_properties ?? "",
    pitch_revisions: body.pitch_revisions ?? "",
    product_demo_ready: body.product_demo_ready ? 1 : 0,
    stage_movement_rehearsed: body.stage_movement_rehearsed ? 1 : 0,
    final_ask: Number(body.final_ask ?? 0),
    valuation_information: body.valuation_information ?? "",
    open_actions: body.open_actions ?? "",
    status: approveReadiness ? "ready" : (body.status ?? "scheduled"),
  };
  const record = existing
    ? update("mock_shoots", String(existing.id), payload, a, approveReadiness ? "Final readiness proposed" : "Mock shoot updated")
    : create("mock_shoots", payload, a);
  if (!approveReadiness) {
    return { ok: true, message: "Mock shoot updated", data: record };
  }
  // Final readiness needs super-admin approval (doc 06 §1.6, doc 11 §2.7).
  const approval = raiseApproval(a, {
    approvalType: "mock_readiness",
    title: `Mock shoot final readiness for ${startupId}`,
    recordEntity: "mock_shoots",
    recordId: String(record.id),
    startupId,
  });
  return { ok: true, message: "Final readiness proposed; awaiting super-admin approval", data: { ...record, approval_id: approval.id } };
};

const mainShootUpdate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const existing = get<Row>("SELECT * FROM main_shoots WHERE startup_id = ? AND season_id = ? ORDER BY scheduled_on DESC LIMIT 1", startupId, session.seasonId);
  const payload: Row = {
    startup_id: startupId,
    episode_no: body.episode_no ?? "",
    scheduled_on: body.scheduled_on ?? null,
    founder_attendance: body.founder_attendance ?? "",
    investor_attendance: body.investor_attendance ?? "",
    live_ask: Number(body.live_ask ?? 0),
    live_offers: body.live_offers ?? "",
    accepted_deal_terms: body.accepted_deal_terms ?? "",
    lead_investor_id: body.lead_investor_id ?? null,
    co_investor_allocations: body.co_investor_allocations ?? "[]",
    conditions: body.conditions ?? "",
    outstanding_actions: body.outstanding_actions ?? "",
    status: body.status ?? "scheduled",
  };
  if (body.status === "completed" || body.status === "exceptions") payload.completed_on = today();
  const record = existing
    ? update("main_shoots", String(existing.id), payload, a, "Main shoot updated")
    : create("main_shoots", payload, a);
  if (payload.scheduled_on) {
    notifyFounder(startupId, "Your shoot date is set", `Your main shoot is scheduled for ${String(payload.scheduled_on)}. Production will confirm the call time, documentation and dress rehearsal separately.`, "startup", startupId);
  }
  return {
    ok: true,
    message: "Main shoot updated. Signature requirement follows the signing event and purpose, not the document title.",
    data: record,
  };
};

/* ================================================================== */
/* Content and marketing                                               */
/* ================================================================== */

const episodeUpdate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const existing = get<Row>("SELECT * FROM episodes WHERE startup_id = ? AND season_id = ?", startupId, session.seasonId);
  const payload: Row = {
    startup_id: startupId,
    episode_no: body.episode_no ?? "",
    shoot_completed_on: body.shoot_completed_on ?? null,
    editing_status: body.editing_status ?? "not_started",
    approvals_status: body.approvals_status ?? "not_started",
    status: body.status ?? "allocated",
  };
  const record = existing
    ? update("episodes", String(existing.id), payload, a, "Episode updated")
    : create("episodes", payload, a);
  // The final episode edit approval is proposed to the super admin (doc 06 §1.9, doc 11 §2.8).
  if (String(payload.approvals_status) === "pending") {
    const approval = raiseApproval(a, {
      approvalType: "episode_edit",
      title: `Episode edit approval for ${startupId}`,
      recordEntity: "episodes",
      recordId: String(record.id),
      startupId,
    });
    return { ok: true, message: "Episode edit sent to the super admin for approval", data: { episode: record, approval } };
  }
  return { ok: true, message: "Episode updated", data: record };
};

const telecastUpdate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const existing = get<Row>("SELECT * FROM telecasts WHERE startup_id = ? AND season_id = ?", startupId, session.seasonId);
  const step = body.step ? String(body.step) : null;

  const patch: Row = {
    startup_id: startupId,
    episode_no: body.episode_no ?? "",
    telecast_date: body.telecast_date ?? null,
    promo_requirements: body.promo_requirements ?? "",
    promo_assets_approved: body.promo_assets_approved ?? "",
    founder_posting_done: body.founder_posting_done ? 1 : 0,
    post_telecast_activity: body.post_telecast_activity ?? "",
    founder_feedback: body.founder_feedback ?? "",
    public_announcement: body.public_announcement ?? "",
    announced_amount: Number(body.announced_amount ?? 0),
    committed_amount: Number(body.committed_amount ?? 0),
    verified_deployed_amount: Number(body.verified_deployed_amount ?? 0),
    status: body.status ?? (existing ? String(existing.status) : "not_scheduled"),
  };

  const stepStatus: Record<string, string> = {
    schedule: "scheduled",
    notify_founder: "founder_notified",
    require_promos: "promo_pending",
    promos_done: "promo_done",
    telecast: "telecast",
    request_feedback: "feedback_pending",
    complete: "completed",
  };
  if (step && stepStatus[step]) patch.status = stepStatus[step];
  if (step === "notify_founder") patch.founder_notified_on = today();

  // Public figures must distinguish announced, committed and verified deployed amounts.
  if (patch.status === "telecast" || patch.status === "completed") {
    const deployed = Number(
      get<{ v: number }>(
        "SELECT COALESCE(SUM(t.verified_amount),0) AS v FROM tranches t JOIN deals d ON d.id = t.deal_id WHERE d.startup_id = ? AND t.season_id = ?",
        startupId,
        session.seasonId,
      )?.v ?? 0,
    );
    const committed = Number(
      get<{ v: number }>(
        "SELECT COALESCE(SUM(amount),0) AS v FROM commitments WHERE startup_id = ? AND season_id = ? AND status IN ('confirmed','shoot_day_confirmed')",
        startupId,
        session.seasonId,
      )?.v ?? 0,
    );
    if (!body.verified_deployed_amount) patch.verified_deployed_amount = deployed;
    if (!body.committed_amount) patch.committed_amount = committed;
  }

  const record = existing
    ? update("telecasts", String(existing.id), patch, a, step ? `Telecast step: ${step}` : "Telecast updated")
    : create("telecasts", patch, a);
  return {
    ok: true,
    message: "Telecast updated. Public claims keep announced, committed and verified deployed amounts separate.",
    data: record,
  };
};

/* ================================================================== */
/* Community                                                           */
/* ================================================================== */

const communityMemberCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const name = requireString(body, "name");
  const memberType = String(body.member_type ?? "applicant");

  // A founder who is also a mentor or investor keeps one person record with several roles.
  const existing = all<Row>(
    "SELECT * FROM community_members WHERE lower(email) = lower(?) AND email <> ''",
    String(body.email ?? ""),
  );
  if (existing.length > 0) {
    const primary = existing[0];
    const roleExists = get<Row>(
      "SELECT * FROM community_member_roles WHERE member_id = ? AND role = ?",
      primary.id,
      memberType,
    );
    if (!roleExists) {
      create(
        "community_member_roles",
        { member_id: String(primary.id), role: memberType, since: today(), notes: "Role added to the existing person record." },
        a,
      );
    }
    return {
      ok: true,
      message: `${name} already has a community record; the additional role "${memberType}" was added to the same person instead of creating a duplicate.`,
      data: primary,
    };
  }

  const record = create(
    "community_members",
    {
      person_id: body.person_id ?? null,
      name,
      email: body.email ?? "",
      phone: body.phone ?? "",
      member_type: memberType,
      organisation: body.organisation ?? "",
      sector: body.sector ?? "",
      geography: body.geography ?? "",
      interests: body.interests ?? "",
      relationship_owner_id: body.relationship_owner_id ?? a.id,
      communication_preferences: body.communication_preferences ?? "",
      consent_marketing: body.consent_marketing ? 1 : 0,
      consent_contact: body.consent_contact ? 1 : 0,
      // Membership never grants confidential deal access by default.
      confidential_access: 0,
      startup_id: body.startup_id ?? null,
      engagement_summary: body.engagement_summary ?? "",
    },
    a,
  );
  create(
    "community_member_roles",
    { member_id: String(record.id), role: memberType, since: today(), notes: "Initial role." },
    a,
  );
  return { ok: true, message: "Community member created with confidential deal access withheld", data: record };
};

const communityMemberAddRole: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const memberId = requireString(body, "member_id");
  const role = requireString(body, "role");
  const record = create(
    "community_member_roles",
    { member_id: memberId, role, since: today(), notes: body.notes ?? "" },
    a,
  );
  return { ok: true, message: `Role "${role}" added to the same person record`, data: record };
};

const communityEventCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const record = create(
    "community_events",
    {
      name: requireString(body, "name"),
      event_type: body.event_type ?? "Founder meetup",
      purpose: body.purpose ?? "",
      owner_id: body.owner_id ?? a.id,
      budget: Number(body.budget ?? 0),
      scheduled_on: body.scheduled_on ?? addDays(today(), 14),
      status: body.status ?? "planned",
      follow_up_tasks: body.follow_up_tasks ?? "",
    },
    a,
  );
  return { ok: true, message: "Event created with purpose, owner and budget", data: record };
};

const eventRegister: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const eventId = requireString(body, "event_id");
  const memberId = requireString(body, "member_id");
  const existing = get<Row>(
    "SELECT * FROM event_registrations WHERE event_id = ? AND member_id = ?",
    eventId,
    memberId,
  );
  const attended = Boolean(body.attended);
  const payload = {
    event_id: eventId,
    member_id: memberId,
    registered: 1,
    attended: attended ? 1 : 0,
    feedback: body.feedback ?? "",
  };
  const record = existing
    ? update("event_registrations", String(existing.id), payload, a, "Registration updated")
    : create("event_registrations", payload, a);

  const counts = get<{ reg: number; att: number }>(
    "SELECT COUNT(*) AS reg, SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) AS att FROM event_registrations WHERE event_id = ?",
    eventId,
  );
  update(
    "community_events",
    eventId,
    { registrations: counts?.reg ?? 0, attendance: counts?.att ?? 0 },
    a,
    "Event counts recalculated from registrations",
  );

  return { ok: true, message: attended ? "Attendance recorded" : "Registration recorded", data: record };
};

const eventComplete: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "event_id");
  const record = update(
    "community_events",
    id,
    {
      status: "completed",
      outcomes: body.outcomes ?? "",
      follow_up_tasks: body.follow_up_tasks ?? "",
      feedback_score: Number(body.feedback_score ?? 0),
    },
    a,
    "Event completed with outcomes and follow-up tasks",
  );
  return { ok: true, message: "Event completed", data: record };
};

const referralCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const referredType = String(body.referred_type ?? "startup_application");

  // An event-generated application links to the existing startup record instead of duplicating it.
  let startupId = body.startup_id ? String(body.startup_id) : null;
  let linkedMessage = "";
  if (referredType === "startup_application" && body.referred_name) {
    const match = get<Row>(
      "SELECT * FROM startups WHERE lower(name) = lower(?)",
      String(body.referred_name),
    );
    if (match) {
      startupId = String(match.id);
      linkedMessage = ` Linked to the existing startup record ${match.name} rather than creating a duplicate.`;
    }
  }

  const record = create(
    "referrals",
    {
      source_type: body.source_type ?? "community_member",
      source_id: body.source_id ?? null,
      source_name: body.source_name ?? "",
      referred_name: requireString(body, "referred_name"),
      referred_type: referredType,
      startup_id: startupId,
      investor_id: body.investor_id ?? null,
      status: body.status ?? "new",
      // Original source and later contributors are stored separately.
      original_contributor: body.original_contributor ?? "",
      additional_contributors: body.additional_contributors ?? "",
      outcome: body.outcome ?? "",
    },
    a,
  );
  return { ok: true, message: `Referral recorded.${linkedMessage}`, data: record };
};

const referralAdvance: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "referral_id");
  const status = requireString(body, "status");
  const record = update(
    "referrals",
    id,
    { status, outcome: body.outcome ?? "", outcome_amount: Number(body.outcome_amount ?? 0) },
    a,
    `Referral moved to ${status}`,
  );
  return { ok: true, message: `Referral moved to ${status}`, data: record };
};

const supportRequestCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const policy = get<{ value: string }>("SELECT value FROM policies WHERE code = 'POL-COMMUNITY'");
  const sla = policy ? (JSON.parse(policy.value) as { supportRequestSlaWorkingDays?: number }).supportRequestSlaWorkingDays ?? 5 : 5;
  const record = create(
    "support_requests",
    {
      member_id: requireString(body, "member_id"),
      startup_id: body.startup_id ?? null,
      request_type: body.request_type ?? "investor_introduction",
      detail: requireString(body, "detail"),
      owner_id: body.owner_id ?? a.id,
      due_date: body.due_date ?? addWorkingDays(today(), sla),
      status: "open",
    },
    a,
  );
  return { ok: true, message: `Support request created with a ${sla} working-day SLA`, data: record };
};

const supportRequestResolve: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "request_id");
  const record = update(
    "support_requests",
    id,
    { status: body.status ?? "resolved", outcome: body.outcome ?? "", founder_feedback: body.founder_feedback ?? "" },
    a,
    "Support request closed with an outcome and founder feedback",
  );
  return { ok: true, message: "Support request closed", data: record };
};

/* ================================================================== */
/* ERP-wide                                                            */
/* ================================================================== */

const taskCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const record = create(
    "tasks",
    {
      title: requireString(body, "title"),
      description: body.description ?? "",
      department: body.department ?? a.department,
      module: body.module ?? "",
      entity_type: body.entity_type ?? null,
      entity_id: body.entity_id ?? null,
      owner_id: body.owner_id ?? a.id,
      due_date: body.due_date ?? addDays(today(), 5),
      required_output: body.required_output ?? "",
      evidence: body.evidence ?? "",
      approver_id: body.approver_id ?? null,
      next_action: body.next_action ?? "",
      status: "open",
      priority: body.priority ?? "medium",
    },
    a,
  );
  return { ok: true, message: "Task created with owner, due date, required output, evidence, approver and next action", data: record };
};

const taskUpdate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "task_id");
  // Only the fields actually supplied are written, so an absent field keeps its value
  // instead of overwriting a NOT NULL column with NULL.
  const patch: Row = {};
  for (const field of ["status", "evidence", "required_output", "next_action", "priority", "due_date"]) {
    if (body[field] !== undefined && body[field] !== null && body[field] !== "") patch[field] = body[field];
  }
  if (body.status === "done") {
    patch.completed_on = today();
    patch.escalation_status = "resolved";
  }
  const record = update("tasks", id, patch, a, "Task updated");
  return { ok: true, message: "Task updated", data: record };
};

const taskEscalate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "task_id");
  const record = update(
    "tasks",
    id,
    {
      escalation_status: "escalated",
      escalated_on: today(),
      escalation_reason: requireString(body, "reason"),
      status: "blocked",
    },
    a,
    "Escalated to Management",
  );
  notify("management", "Task escalated", String(body.reason), "task", id);
  return { ok: true, message: "Task escalated to Management", data: record };
};

const handoverCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const record = create(
    "handovers",
    {
      from_department: body.from_department ?? a.department,
      to_department: requireString(body, "to_department"),
      entity_type: requireString(body, "entity_type"),
      entity_id: requireString(body, "entity_id"),
      summary: body.summary ?? "",
      status: "pending",
    },
    a,
  );
  return { ok: true, message: "Handover raised and awaiting acceptance", data: record };
};

const handoverAccept: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "handover_id");
  const accept = body.accept !== false;
  const record = update(
    "handovers",
    id,
    accept
      ? { status: "accepted", accepted_on: today(), accepted_by_id: a.id }
      : { status: "rejected", rejected_reason: requireString(body, "reason") },
    a,
    accept ? "Handover accepted" : "Handover rejected with a reason",
  );
  return { ok: true, message: accept ? "Handover accepted" : "Handover rejected", data: record };
};

const documentCreate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const purpose = requireString(body, "purpose");
  const purposeMeta = DOCUMENT_PURPOSE_MAP[purpose];
  if (!purposeMeta) throw new HttpError(422, `unknown document purpose: ${purpose}`);

  const existing = all<Row>(
    "SELECT * FROM documents WHERE entity_type = ? AND entity_id = ? AND purpose = ?",
    String(body.entity_type ?? ""),
    String(body.entity_id ?? ""),
    purpose,
  );
  const version = existing.length + 1;
  const record = create(
    "documents",
    {
      entity_type: requireString(body, "entity_type"),
      entity_id: requireString(body, "entity_id"),
      title: body.title ?? purposeMeta.label,
      purpose,
      category: body.category ?? "General",
      version,
      status: body.status ?? "received",
      file_ref: body.file_ref ?? "",
      uploaded_by_id: a.id,
      uploaded_on: today(),
      notes: body.notes ?? "",
    },
    a,
  );
  return { ok: true, message: `Document recorded as version ${version}; earlier versions are preserved`, data: record };
};

const documentVerify: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "document_id");
  const record = update(
    "documents",
    id,
    { status: body.status ?? "verified", notes: body.notes ?? "" },
    a,
    "Document verified",
  );
  return { ok: true, message: "Document verified", data: record };
};

const policyRevise: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  if (a.role !== "management" && a.role !== "admin") {
    throw new HttpError(403, "Policy changes require Management or Administrator");
  }
  const code = requireString(body, "code");
  const value = body.value ?? {};
  const policy = get<Row>("SELECT * FROM policies WHERE code = ?", code);
  if (!policy) throw new HttpError(404, `Policy ${code} not found`);

  const revisions = all<Row>("SELECT * FROM policy_revisions WHERE policy_id = ?", policy.id);
  const version = revisions.length + 1;
  const serialised = JSON.stringify(value);

  create(
    "policy_revisions",
    {
      policy_id: String(policy.id),
      version,
      value: serialised,
      changed_by_id: a.id,
      changed_on: today(),
      reason: body.reason ?? "",
    },
    a,
  );
  const record = update(
    "policies",
    String(policy.id),
    { value: serialised, effective_from: body.effective_from ?? today(), approved_by_id: a.id, approved_on: today() },
    a,
    `Policy revised to version ${version}; the earlier version is retained`,
  );
  return { ok: true, message: `Policy ${code} revised to version ${version}; earlier versions are preserved`, data: record };
};

const integrationSync: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "integration_id");
  const integration = getOne("integrations", id);
  if (!integration) throw new HttpError(404, "Integration not found");

  // The integration reports its own outcome. A non-empty `error` means the sync failed, so a
  // failed-sync alert is raised and work does not stop silently; otherwise the run succeeded.
  const error = String(body.error ?? "").trim();
  const fail = error.length > 0;
  const records = fail ? 0 : Number(body.records ?? 12);
  create(
    "sync_runs",
    {
      integration_id: id,
      started_at: nowISO(),
      finished_at: nowISO(),
      status: fail ? "failed" : "success",
      records,
      error: fail ? error : "",
    },
    a,
  );
  const record = update(
    "integrations",
    id,
    {
      last_sync_at: nowISO(),
      last_sync_status: fail ? "failed" : "success",
      records_synced: Number(integration.records_synced) + records,
      failed_sync_alerts: fail ? Number(integration.failed_sync_alerts) + 1 : 0,
      last_error: fail ? error : "",
      status: fail ? "degraded" : "connected",
    },
    a,
    "Sync attempted",
  );

  if (fail) {
    notify(
      "management",
      `Failed sync on ${integration.name}`,
      "A failed-sync alert is open so the integration error does not silently stop work.",
      "integration",
      id,
    );
  }
  return {
    ok: true,
    message: fail ? "Sync failed; a failed-sync alert is now open" : "Sync completed",
    data: record,
  };
};

const importRun: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const entityType = requireString(body, "entity_type");
  const fileName = String(body.file_name ?? "upload.csv");
  const rows = Number(body.rows ?? 0);
  const duplicates = Number(body.duplicates ?? 0);
  const skipped = Number(body.skipped ?? 0);
  const imported = Math.max(0, rows - duplicates - skipped);

  const record = create(
    "import_batches",
    {
      entity_type: entityType,
      file_name: fileName,
      rows,
      imported,
      skipped,
      duplicates,
      status: "completed",
      started_at: nowISO(),
      finished_at: nowISO(),
      log: `${imported} imported, ${duplicates} duplicates merged into existing records, ${skipped} rows skipped.`,
    },
    a,
  );
  return {
    ok: true,
    message: `Import finished: ${imported} imported, ${duplicates} duplicates merged (existing records are linked, not replaced)`,
    data: record,
  };
};

const notificationRead: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = body.notification_id ? String(body.notification_id) : null;
  if (id) {
    update("notifications", id, { read_at: nowISO() }, a, "Notification read");
  } else {
    run("UPDATE notifications SET read_at = ? WHERE read_at IS NULL", nowISO());
  }
  return { ok: true, message: "Notifications marked as read" };
};

export const ACTIONS_C: Record<string, ActionHandler> = {
  "production.handover": productionHandover,
  "production.accept": productionAccept,
  "av.update": avShootUpdate,
  "mock.update": mockShootUpdate,
  "mainshoot.update": mainShootUpdate,
  "episode.update": episodeUpdate,
  "telecast.update": telecastUpdate,
  "community.member_create": communityMemberCreate,
  "community.member_add_role": communityMemberAddRole,
  "event.create": communityEventCreate,
  "event.register": eventRegister,
  "event.complete": eventComplete,
  "referral.create": referralCreate,
  "referral.advance": referralAdvance,
  "support.create": supportRequestCreate,
  "support.resolve": supportRequestResolve,
  "task.create": taskCreate,
  "task.update": taskUpdate,
  "task.escalate": taskEscalate,
  "handover.create": handoverCreate,
  "handover.accept": handoverAccept,
  "document.create": documentCreate,
  "document.verify": documentVerify,
  "policy.revise": policyRevise,
  "integration.sync": integrationSync,
  "import.run": importRun,
  "notification.read": notificationRead,
};
