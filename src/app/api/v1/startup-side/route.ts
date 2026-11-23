import { fail, ok } from "@/lib/server/api";
import { all, get } from "@/lib/db/client";
import { getOne, type Row } from "@/lib/server/repo";
import { actorFromRequest, HttpError, type Session } from "@/lib/server/session";
import { eligibility, profileCompleteness } from "@/lib/domain/startupProfile";
import { applicationCompleteness, needsFinancials } from "@/lib/domain/applicationForm";
import { founderJourney, type FounderJourneyInput } from "@/lib/domain/founderJourney";

export const dynamic = "force-dynamic";

/**
 * The founder side.
 *
 * One endpoint serves the founder's whole workspace. Every row is read with the session's
 * `startupId`, so a founder can never see another startup. Internal-only data — screening
 * scores, analyst remarks, investor identities and terms, staff notes — is never included;
 * the journey is built by `founderJourney`, a presentation mapping over the same records the
 * console reads, so the two views can never disagree.
 */

function requireFounder(request: Request): Session {
  const session = actorFromRequest(request);
  if (session.actor.kind !== "founder") {
    throw new HttpError(403, "This endpoint is only available to a startup-side login");
  }
  return session;
}

function seasonName(seasonId: string): string {
  return get<{ name: string }>("SELECT name FROM seasons WHERE id = ?", seasonId)?.name ?? "";
}

/** A display name for the relationship manager assigned to an application. */
function relationshipManagerName(userId: string): string {
  return get<{ name: string }>("SELECT name FROM users WHERE id = ?", userId)?.name ?? "";
}

/** Rupees from paise, grouped Indian-style, e.g. 1,00,000. */
function formatMoney(paise: number): string {
  return `Rs ${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

/** Whole days from today to an ISO date, for a "closes in N days" line. */
function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const a = Date.parse(`${iso.split("T")[0]}T00:00:00Z`);
  const b = Date.parse(`${new Date().toISOString().split("T")[0]}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

const MILESTONE_LABELS: Record<string, string> = {
  term_sheet: "Term sheet",
  due_diligence: "Due diligence",
  agreements: "Agreements",
  conditions: "Conditions",
  transfer: "Fund transfer",
};

/** "Term sheet 17 Oct 2026 · Due diligence 23 Oct 2026" from a stored milestone JSON map. */
function formatMilestones(raw: unknown): string {
  if (!raw) return "";
  let parsed: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return "";
    }
  } else if (typeof raw === "object") {
    parsed = raw as Record<string, unknown>;
  } else {
    return "";
  }
  const parts: string[] = [];
  for (const [key, iso] of Object.entries(parsed)) {
    const datePart = String(iso ?? "").split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) continue;
    const [y, m, d] = datePart.split("-").map(Number);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    parts.push(`${MILESTONE_LABELS[key] ?? key.replace(/_/g, " ")} ${d} ${months[m - 1]} ${y}`);
  }
  return parts.join(" · ");
}

/** The milestone map as label/date pairs, for the per-investor deal timeline. */
function milestonePairs(raw: unknown): { label: string; date: string }[] {
  if (!raw) return [];
  let parsed: Record<string, unknown>;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return [];
    }
  } else if (typeof raw === "object") {
    parsed = raw as Record<string, unknown>;
  } else {
    return [];
  }
  const pairs: { label: string; date: string }[] = [];
  for (const [key, iso] of Object.entries(parsed)) {
    const datePart = String(iso ?? "").split("T")[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) continue;
    pairs.push({ label: MILESTONE_LABELS[key] ?? key.replace(/_/g, " "), date: datePart });
  }
  return pairs;
}

/**
 * A founder who has signed up but not yet named their business has a login and no startup.
 * Returning this shape (instead of a 403) lets the portal show the onboarding step, and it
 * carries the same fields the filled-in workspace uses so the client never sees a broken page.
 */
function emptyWorkspace(session: Session) {
  const programs = all<Row>("SELECT * FROM programs WHERE season_id = ? ORDER BY opens_on DESC", session.seasonId);
  return {
    startup: null,
    founders: [],
    profile: { percent: 0, complete: 0, total: 0, missing: [], missingSections: [], sections: [] },
    eligibility: { ok: false, blocking: ["Register your startup to begin"], advisories: [] },
    applications: [],
    currentApplicationId: null,
    currentSeasonId: session.seasonId,
    currentSeasonName: seasonName(session.seasonId),
    documents: [],
    documentRequests: [],
    messages: [],
    pitchDayOptions: [],
    paymentProofs: [],
    agreement: null,
    supportRequests: [],
    tasks: [],
    history: [],
    bootcamp: null,
    virtualPitch: null,
    notices: all<Row>(
      "SELECT id, title, body, created_at FROM notifications WHERE recipient_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 10",
      session.actor.id,
    ),
    programs: programs.map((p) => publicProgram(p, false)),
    journey: {
      stages: [
        {
          key: "profile",
          order: 0,
          label: "Profile",
          status: "action_required",
          track: "sequential",
          mapsFrom: [],
          owner: "You",
          needsYou: true,
          content: {
            title: "Profile",
            summary: "Register your startup to open your workspace",
            whatThisMeans:
              "Register your startup to open your workspace, complete your profile and apply to the season.",
            latestUpdate: "Not started.",
            nextStep: "Register your startup to begin.",
          },
        },
      ],
      currentKey: "profile",
      currentLabel: "Profile",
      completedCount: 0,
    },
    finance: { fee: null, committed: 0, committedCount: 0, deployed: 0, successFee: null },
    shoot: { av_id: null, av_status: null, av_scheduled_on: null, av_location: "", av_availability: "", mock_scheduled_on: null, main_scheduled_on: null, main_status: null },
    mock: null,
    telecast: null,
    episodeNo: "",
    investment: { hasCommitment: false, committed: 0, committedCount: 0, deployed: 0, trancheCount: 0, verifiedTranches: 0, dealStatus: null, agreementPending: false },
    dealsPerInvestor: [],
    fundingPerDeal: [],
    meta: { needsFinancials: true },
  };
}

export async function GET(request: Request) {
  try {
    const session = requireFounder(request);
    if (!session.actor.startupId) return ok(emptyWorkspace(session));
    const startupId = session.actor.startupId as string;
    const startup = getOne("startups", startupId);
    if (!startup) throw new HttpError(404, "Startup not found");

    const founders = all<Row>(
      "SELECT id, name, role, email, phone, linkedin, is_primary FROM founders WHERE startup_id = ? ORDER BY is_primary DESC, name",
      startupId,
    );

    const applications = all<Row>(
      `SELECT a.*, s.code AS season_code, s.name AS season_name
         FROM applications a LEFT JOIN seasons s ON s.id = a.season_id
        WHERE a.startup_id = ? ORDER BY a.submitted_at DESC`,
      startupId,
    );
    // The founder works in the season they are viewing. Their closed-season applications
    // stay in `applications` as history, but the live journey, decisions, shoot and money
    // are read only for the season on screen, so a Season 1 record can never resurface.
    const seasonApplications = applications.filter((a) => String(a.season_id) === session.seasonId);
    const applicationIds = seasonApplications.map((a) => String(a.id));
    const current = seasonApplications.find((a) => String(a.status) !== "withdrawn") ?? seasonApplications[0] ?? null;
    const inList = (ids: string[]) => (ids.length ? `(${ids.map(() => "?").join(", ")})` : "(NULL)");
    const sid = session.seasonId;

    const screening = applicationIds.length
      ? get<Row>(`SELECT id, outcome, total, submitted_at FROM screenings WHERE application_id IN ${inList(applicationIds)} ORDER BY submitted_at DESC LIMIT 1`, ...applicationIds)
      : undefined;
    const bootcamp = applicationIds.length
      ? get<Row>(`SELECT id, status, invited_on, attended_on, preparation_completed, acknowledgement, acknowledged_on, session_dates, meet_link FROM bootcamp_attendance WHERE application_id IN ${inList(applicationIds)} ORDER BY invited_on DESC LIMIT 1`, ...applicationIds)
      : undefined;
    const analyst = applicationIds.length
      ? get<Row>(`SELECT id, recommendation, evaluated_at FROM analyst_evaluations WHERE application_id IN ${inList(applicationIds)} ORDER BY evaluated_at DESC LIMIT 1`, ...applicationIds)
      : undefined;
    const mou = applicationIds.length
      ? get<Row>(`SELECT * FROM mous WHERE application_id IN ${inList(applicationIds)} ORDER BY shared_on DESC LIMIT 1`, ...applicationIds)
      : undefined;
    const irr = applicationIds.length
      ? get<Row>(`SELECT id, version, status, document_ref, approved_on, shared_with_ir_on FROM irr_reports WHERE application_id IN ${inList(applicationIds)} ORDER BY version DESC LIMIT 1`, ...applicationIds)
      : undefined;

    const committee = get<Row>("SELECT * FROM committee_decisions WHERE startup_id = ? AND season_id = ? ORDER BY decided_on DESC LIMIT 1", startupId, sid);
    const av = get<Row>("SELECT * FROM av_shoots WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);
    const mock = get<Row>("SELECT * FROM mock_shoots WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);
    const main = get<Row>("SELECT * FROM main_shoots WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);
    const episode = get<Row>("SELECT * FROM episodes WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);
    const telecast = get<Row>("SELECT * FROM telecasts WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);
    const fee = get<Row>("SELECT * FROM upfront_fees WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);

    const virtualPitch = get<Row>(
      "SELECT * FROM virtual_pitches WHERE startup_id = ? AND season_id = ? ORDER BY scheduled_at DESC LIMIT 1",
      startupId, sid,
    );
    const pitchDay = get<Row>("SELECT * FROM pitch_days WHERE startup_id = ? AND season_id = ? ORDER BY scheduled_at DESC LIMIT 1", startupId, sid);
    const goldenPasses = get<{ n: number }>("SELECT COUNT(*) AS n FROM commitments WHERE startup_id = ? AND season_id = ? AND is_golden_pass = 1", startupId, sid)?.n ?? 0;

    // Investment: only the total written commitment, never investor identities or terms.
    const commitmentTotal = get<{ total: number; n: number }>(
      "SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS n FROM commitments WHERE startup_id = ? AND season_id = ? AND status IN ('confirmed','shoot_day_confirmed')",
      startupId, sid,
    );
    // The written commitment is carried on the deal when a deal is opened directly (the
    // show-day path), and on a `commitments` row when a commitment is confirmed first. The
    // founder's summary reads whichever exists so committed and deployed always reconcile.
    const dealCommitted = get<{ total: number; n: number }>(
      "SELECT COALESCE(SUM(committed_amount), 0) AS total, COUNT(*) AS n FROM deals WHERE startup_id = ? AND season_id = ? AND status NOT IN ('withdrawn','failed')",
      startupId, sid,
    );
    const committedTotal = (dealCommitted?.total ?? 0) > 0 ? (dealCommitted?.total ?? 0) : (commitmentTotal?.total ?? 0);
    const committedCount = (dealCommitted?.total ?? 0) > 0 ? (dealCommitted?.n ?? 0) : (commitmentTotal?.n ?? 0);
    const deployed = get<{ total: number }>(
      `SELECT COALESCE(SUM(t.verified_amount), 0) AS total
         FROM tranches t JOIN deals d ON d.id = t.deal_id
        WHERE d.startup_id = ? AND t.season_id = ? AND t.status IN ('verified','part_verified')`,
      startupId, sid,
    );
    const trancheStats = get<{ total: number; verified: number }>(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN t.status IN ('verified','part_verified') THEN 1 ELSE 0 END) AS verified
         FROM tranches t JOIN deals d ON d.id = t.deal_id WHERE d.startup_id = ? AND t.season_id = ?`,
      startupId, sid,
    );
    const latestDeal = get<Row>("SELECT * FROM deals WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);
    const agreementPending = Boolean(latestDeal) && !["closed", "withdrawn", "failed"].includes(String(latestDeal?.status ?? ""));

    const documents = all<Row>(
      "SELECT id, title, purpose, category, version, status, file_ref, uploaded_on FROM documents WHERE entity_type = 'startup' AND entity_id = ? ORDER BY uploaded_on DESC",
      startupId,
    );
    const documentRequests = all<Row>("SELECT * FROM document_requests WHERE startup_id = ? AND season_id = ? ORDER BY mandatory DESC, created_at", startupId, sid);
    const messages = all<Row>(
      "SELECT id, stage_key, author_side, author_name, body, attachment_document_id, created_at FROM founder_messages WHERE startup_id = ? AND season_id = ? ORDER BY created_at",
      startupId, sid,
    );
    const pitchDayOptions = all<Row>(
      `SELECT o.id, o.option_date, o.slot_note, o.status, o.founder_available, o.slot_time,
              o.approval, o.review_note, o.investor_id, i.name AS investor_name, i.category AS investor_category
         FROM pitch_day_options o LEFT JOIN investors i ON i.id = o.investor_id
        WHERE o.startup_id = ? AND o.season_id = ? AND o.status <> 'withdrawn' ORDER BY o.option_date`,
      startupId, sid,
    );
    const paymentProofs = all<Row>(
      "SELECT id, fee_id, amount, reference, note, file_ref, status, reviewed_on, review_note, created_at FROM payment_proofs WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC",
      startupId, sid,
    );
    const supportRequests = all<Row>(
      "SELECT id, request_type, detail, status, due_date, outcome, created_at FROM support_requests WHERE startup_id = ? ORDER BY created_at DESC",
      startupId,
    );
    const openTasks = all<Row>(
      "SELECT id, title, required_output, due_date, status, next_action FROM tasks WHERE entity_type = 'startup' AND entity_id = ? AND status NOT IN ('completed','done','cancelled') ORDER BY due_date",
      startupId,
    );

    const programs = all<Row>("SELECT * FROM programs WHERE season_id = ? ORDER BY opens_on DESC", session.seasonId);
    const appliedProgramIds = new Set(applications.map((a) => String(a.program_id ?? "")));
    const openProgram = programs.find((p) => String(p.status) === "open") ?? programs[0] ?? null;

    // The investor side of the founder's own journey. The founder sees how many investors
    // they were matched with and the verdict per investor, never the identities or terms.
    const matches = all<Row>(
      "SELECT id, status, response, shared_on, indicative_amount, next_action_due FROM matches WHERE startup_id = ? AND season_id = ? ORDER BY score DESC",
      startupId, sid,
    );
    const dealRows = all<Row>(
      "SELECT id, status, committed_amount, milestone_dates, open_documents, open_conditions, withdrawal_reason, replacement_investor_id FROM deals WHERE startup_id = ? AND season_id = ? ORDER BY created_at",
      startupId, sid,
    );
    const successFee = get<Row>("SELECT * FROM success_fees WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, sid);
    const successFeeProofs = successFee
      ? all<Row>("SELECT id, status, amount, created_at FROM payment_proofs WHERE fee_id = ? ORDER BY created_at DESC", String(successFee.id))
      : [];
    const communityMember = get<Row>("SELECT id, member_type FROM community_members WHERE startup_id = ? LIMIT 1", startupId);
    const communityEvents = communityMember
      ? get<{ registered: number; attended: number }>(
          "SELECT COUNT(*) AS registered, SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) AS attended FROM event_registrations WHERE member_id = ?",
          String(communityMember.id),
        )
      : undefined;
    const referralCount = get<{ n: number }>("SELECT COUNT(*) AS n FROM referrals WHERE startup_id = ?", startupId)?.n ?? 0;
    const supportOpen = supportRequests.filter((r) => !["resolved", "closed", "declined"].includes(String(r.status))).length;
    const supportResolved = supportRequests.filter((r) => ["resolved", "closed"].includes(String(r.status))).length;
    const trancheRows = all<Row>(
      `SELECT t.scheduled_amount, t.scheduled_on, t.verified_amount, t.status
         FROM tranches t JOIN deals d ON d.id = t.deal_id
        WHERE d.startup_id = ? AND t.season_id = ? ORDER BY t.scheduled_on`,
      startupId, sid,
    );

    // Per-investor detail for the money stages. The founder sees each investor's commitment
    // and each tranche on its own, but never the investor's identity beyond a display name,
    // and never internal terms or remarks.
    const dealDetail = all<Row>(
      `SELECT d.id, d.status, d.committed_amount, d.valuation, d.milestone_dates, d.open_documents,
              d.open_conditions, d.withdrawal_reason, d.replacement_investor_id, d.closed_on,
              i.name AS investor_name, i.category AS investor_category,
              r.name AS replacement_name
         FROM deals d
         LEFT JOIN investors i ON i.id = d.investor_id
         LEFT JOIN investors r ON r.id = d.replacement_investor_id
        WHERE d.startup_id = ? AND d.season_id = ? ORDER BY d.created_at`,
      startupId, sid,
    );
    const trancheDetail = all<Row>(
      `SELECT t.id, t.deal_id, t.seq, t.scheduled_amount, t.scheduled_on, t.reported_amount, t.reported_on,
              t.startup_confirmed_on, t.verified_amount, t.verified_on, t.status, t.reversal_reason
         FROM tranches t JOIN deals d ON d.id = t.deal_id
        WHERE d.startup_id = ? AND t.season_id = ? ORDER BY t.deal_id, t.seq`,
      startupId, sid,
    );
    const dealDocuments = all<Row>(
      `SELECT dd.deal_id, dd.purpose, dd.document_type, dd.status, dd.version, dd.received_on, dd.signed_on
         FROM deal_documents dd JOIN deals d ON d.id = dd.deal_id
        WHERE d.startup_id = ? AND dd.season_id = ? ORDER BY dd.deal_id, dd.version`,
      startupId, sid,
    );
    // Virtual pitches: the founder sees the schedule, the meeting link and whether it was
    // held, but never which investor matched — the team keeps the matching private.
    const virtualPitchRows = all<Row>(
      `SELECT v.id, v.scheduled_at, v.attended, v.missed, v.reschedule_reason, v.meet_link, v.response,
              v.material_shared, v.duration_pitch_min, v.duration_qa_min
         FROM virtual_pitches v
        WHERE v.startup_id = ? AND v.season_id = ? ORDER BY v.scheduled_at`,
      startupId, sid,
    );

    const completeness = applicationCompleteness(startup, founders);
    // The startup record's own completeness — the gate `profile.submit` enforces. It is a
    // smaller field set than the application's, so the profile tab and the application wizard
    // each report progress against the gate they actually have to clear.
    const profileRecord = profileCompleteness(startup, founders);
    const journeyInput: FounderJourneyInput = {
      profileStatus: String(startup.profile_status),
      profile: {
        complete: profileRecord.complete,
        total: profileRecord.total,
        percent: profileRecord.percent,
        missing: profileRecord.missing,
      },
      application: current
        ? {
            id: String(current.id),
            referenceNo: String(current.reference_no),
            status: String(current.status),
            submittedAt: current.submitted_at ? String(current.submitted_at) : null,
            acknowledgedAt: current.acknowledged_at ? String(current.acknowledged_at) : null,
            relationshipManager: current.relationship_manager_id ? relationshipManagerName(String(current.relationship_manager_id)) : null,
            completionPct: Number(current.completion_pct ?? 0),
          }
        : null,
      draft: {
        complete: completeness.complete,
        total: completeness.total,
        percent: completeness.percent,
        missingSections: completeness.missingSections,
        closeInDays: daysUntil(openProgram?.closes_on ? String(openProgram.closes_on) : null),
      },
      screening: screening
        ? {
            outcome: String(screening.outcome),
            decidedOn: screening.submitted_at ? String(screening.submitted_at) : null,
            replyBy: null,
            informationRequested: String(screening.comments ?? ""),
          }
        : null,
      bootcamp: bootcamp
        ? {
            status: String(bootcamp.status),
            invitedOn: String(bootcamp.invited_on ?? ""),
            attendedOn: bootcamp.attended_on ? String(bootcamp.attended_on) : null,
            sessionDates: String(bootcamp.session_dates ?? ""),
            meetLink: String(bootcamp.meet_link ?? ""),
            preparationCompleted: Number(bootcamp.preparation_completed ?? 0),
            acknowledgement: String(bootcamp.acknowledgement ?? ""),
            acknowledgedOn: bootcamp.acknowledged_on ? String(bootcamp.acknowledged_on) : null,
          }
        : null,
      analyst: analyst ? { recommendation: String(analyst.recommendation), evaluatedAt: analyst.evaluated_at ? String(analyst.evaluated_at) : null } : null,
      mou: mou
        ? {
            status: String(mou.status),
            sharedOn: String(mou.shared_on ?? ""),
            signingDeadline: String(mou.signing_deadline ?? ""),
            signedOn: mou.signed_on ? String(mou.signed_on) : null,
            legalAmaOn: mou.legal_ama_on ? String(mou.legal_ama_on) : null,
            response: String(mou.response ?? ""),
          }
        : null,
      irr: irr ? { status: String(irr.status), version: Number(irr.version ?? 1), approvedOn: irr.approved_on ? String(irr.approved_on) : null, sharedWithIrOn: irr.shared_with_ir_on ? String(irr.shared_with_ir_on) : null } : null,
      documentRequests: documentRequests.map((r) => ({
        id: String(r.id),
        stageKey: String(r.stage_key ?? ""),
        title: String(r.title),
        mandatory: Number(r.mandatory ?? 1),
        status: String(r.status),
        clarification: String(r.clarification ?? ""),
        dueDate: r.due_date ? String(r.due_date) : null,
      })),
      matching: {
        matched: matches.length,
        responses: matches.filter((m) => String(m.response ?? "") !== "").map((m) => ({ response: String(m.response) })),
        nextSlotOn: matches.map((m) => (m.next_action_due ? String(m.next_action_due) : null)).filter(Boolean).sort()[0] ?? null,
      },
      virtualPitch: virtualPitch
        ? {
            id: String(virtualPitch.id),
            scheduledAt: String(virtualPitch.scheduled_at ?? ""),
            attended: Number(virtualPitch.attended ?? 0),
            missed: Number(virtualPitch.missed ?? 0),
            rescheduleReason: String(virtualPitch.reschedule_reason ?? ""),
            meetLink: String(virtualPitch.meet_link ?? ""),
            response: String(virtualPitch.response ?? ""),
          }
        : null,
      virtualPitches: virtualPitchRows.map((v) => ({
        id: String(v.id),
        scheduledAt: String(v.scheduled_at ?? ""),
        attended: Number(v.attended ?? 0),
        missed: Number(v.missed ?? 0),
        meetLink: String(v.meet_link ?? ""),
        response: String(v.response ?? ""),
        materialShared: String(v.material_shared ?? ""),
        pitchMin: Number(v.duration_pitch_min ?? 5),
        qaMin: Number(v.duration_qa_min ?? 5),
      })),
      pitchDayOptions: pitchDayOptions.map((o) => ({
        id: String(o.id),
        optionDate: String(o.option_date),
        slotTime: String(o.slot_time ?? ""),
        status: String(o.status),
        founderAvailable: Number(o.founder_available ?? 0),
        approval: String(o.approval ?? "pending"),
        reviewNote: String(o.review_note ?? ""),
        investorName: String(o.investor_name ?? ""),
        investorCategory: String(o.investor_category ?? ""),
      })),
      pitchDay: pitchDay
        ? { scheduledAt: String(pitchDay.scheduled_at ?? ""), outcome: String(pitchDay.outcome), goldenPasses }
        : null,
      committee: committee ? { outcome: String(committee.outcome), decidedOn: committee.decided_on ? String(committee.decided_on) : null, conditions: String(committee.conditions ?? ""), reReviewDate: String(committee.re_review_date ?? "") } : null,
      fee: fee
        ? {
            status: String(fee.status),
            invoiceNo: String(fee.invoice_no ?? ""),
            feeAmount: Number(fee.fee_amount ?? 0),
            paidAmount: Number(fee.paid_amount ?? 0),
            outstanding: Number(fee.outstanding ?? 0),
            turnoverBasis: fee.turnover ? formatMoney(Number(fee.turnover)) : "",
            financialYear: String(fee.financial_year ?? ""),
            dueDate: fee.due_date ? String(fee.due_date) : null,
            invoiceDate: fee.invoice_date ? String(fee.invoice_date) : null,
            bankDetails: "",
            extensionApproved: Number(fee.extension_approved ?? 0) === 1,
            feeScheduleCode: String(fee.fee_schedule_code ?? ""),
            feeScheduleVersion: String(fee.fee_schedule_version ?? ""),
            turnover: Number(fee.turnover ?? 0),
          }
        : null,
      paymentProof: paymentProofs[0] ? { status: String(paymentProofs[0].status), submittedOn: String(paymentProofs[0].created_at) } : null,
      handover: null,
      av: av ? { status: String(av.status), scheduledOn: av.schedule_on ? String(av.schedule_on) : null, location: String(av.location ?? ""), prepare: String(av.shot_requirements ?? "") } : null,
      mock: mock
        ? {
            status: String(mock.status),
            scheduledOn: mock.scheduled_on ? String(mock.scheduled_on) : null,
            productDemoReady: Number(mock.product_demo_ready ?? 0),
            stageMovementRehearsed: Number(mock.stage_movement_rehearsed ?? 0),
            finalReadinessApprovedOn: mock.final_readiness_approved_on ? String(mock.final_readiness_approved_on) : null,
            openActions: String(mock.open_actions ?? ""),
          }
        : null,
      main: main
        ? {
            status: String(main.status),
            scheduledOn: main.scheduled_on ? String(main.scheduled_on) : null,
            completedOn: main.completed_on ? String(main.completed_on) : null,
            signingDeadline: main.signature_completed_on ? String(main.signature_completed_on) : main.scheduled_on ? String(main.scheduled_on) : null,
            signatureCompletedOn: main.signature_completed_on ? String(main.signature_completed_on) : null,
            dealAcceptanceSigned: Boolean(main.startup_deal_acceptance_letter_ref),
            outstandingActions: String(main.outstanding_actions ?? ""),
          }
        : null,
      episode: episode ? { status: String(episode.status), episodeNo: String(episode.episode_no ?? "") } : null,
      telecast: telecast
        ? {
            status: String(telecast.status),
            telecastDate: telecast.telecast_date ? String(telecast.telecast_date) : null,
            promoRequirements: String(telecast.promo_requirements ?? ""),
            promoAssetsApproved: String(telecast.promo_assets_approved ?? "").trim().length > 0 ? 1 : 0,
            founderPostingDone: Number(telecast.founder_posting_done ?? 0),
            founderFeedback: String(telecast.founder_feedback ?? ""),
            publicAnnouncement: String(telecast.public_announcement ?? ""),
            promoPosts: String(telecast.promo_posts ?? ""),
            announcementWording: String(telecast.announcement_wording ?? ""),
            episodeNo: String(telecast.episode_no ?? ""),
          }
        : null,
      deals: {
        count: dealRows.length,
        committed: dealRows.reduce((sum, d) => sum + Number(d.committed_amount ?? 0), 0),
        milestoneDates: dealRows.map((d) => formatMilestones(d.milestone_dates)).filter(Boolean).join("; "),
        openDocuments: dealRows.map((d) => String(d.open_documents ?? "")).filter(Boolean).join("; "),
        openConditions: dealRows.map((d) => String(d.open_conditions ?? "")).filter(Boolean).join("; "),
        withdrawalReason: dealRows.map((d) => String(d.withdrawal_reason ?? "")).filter(Boolean).join("; "),
        hasReplacement: dealRows.some((d) => Boolean(d.replacement_investor_id)),
        perInvestor: dealDetail.map((d) => ({
          id: String(d.id),
          investorName: String(d.investor_name ?? "Investor"),
          investorCategory: String(d.investor_category ?? ""),
          status: String(d.status),
          committed: Number(d.committed_amount ?? 0),
          valuation: String(d.valuation ?? ""),
          milestones: milestonePairs(d.milestone_dates),
          openDocuments: String(d.open_documents ?? ""),
          openConditions: String(d.open_conditions ?? ""),
          withdrawalReason: String(d.withdrawal_reason ?? ""),
          replacementName: String(d.replacement_name ?? ""),
          documents: dealDocuments
            .filter((doc) => String(doc.deal_id) === String(d.id))
            .map((doc) => ({
              purpose: String(doc.purpose ?? ""),
              type: String(doc.document_type ?? ""),
              status: String(doc.status ?? ""),
              receivedOn: doc.received_on ? String(doc.received_on) : null,
              signedOn: doc.signed_on ? String(doc.signed_on) : null,
            })),
        })),
      },
      funding: {
        committed: committedTotal ?? 0,
        received: deployed?.total ?? 0,
        pending: Math.max(0, (committedTotal ?? 0) - (deployed?.total ?? 0)),
        trancheCount: trancheRows.length,
        verifiedTranches: trancheRows.filter((t) => ["verified", "part_verified"].includes(String(t.status))).length,
        nextTrancheOn: trancheRows.find((t) => !["verified", "part_verified"].includes(String(t.status)) && t.scheduled_on)?.scheduled_on
          ? String(trancheRows.find((t) => !["verified", "part_verified"].includes(String(t.status)) && t.scheduled_on)?.scheduled_on)
          : null,
        perDeal: dealDetail.map((d) => {
          const rows = trancheDetail.filter((t) => String(t.deal_id) === String(d.id));
          const received = rows.reduce((sum, t) => sum + (["verified", "part_verified"].includes(String(t.status)) ? Number(t.verified_amount ?? 0) : 0), 0);
          const committed = Number(d.committed_amount ?? 0);
          return {
            dealId: String(d.id),
            investorName: String(d.investor_name ?? "Investor"),
            committed,
            received,
            pending: Math.max(0, committed - received),
            tranches: rows.map((t) => ({
              id: String(t.id),
              seq: Number(t.seq ?? 1),
              scheduledAmount: Number(t.scheduled_amount ?? 0),
              scheduledOn: t.scheduled_on ? String(t.scheduled_on) : null,
              reportedAmount: Number(t.reported_amount ?? 0),
              reportedOn: t.reported_on ? String(t.reported_on) : null,
              startupConfirmedOn: t.startup_confirmed_on ? String(t.startup_confirmed_on) : null,
              verifiedAmount: Number(t.verified_amount ?? 0),
              verifiedOn: t.verified_on ? String(t.verified_on) : null,
              status: String(t.status ?? "scheduled"),
              reversalReason: String(t.reversal_reason ?? ""),
            })),
          };
        }),
      },
      successFee: successFee
        ? {
            status: String(successFee.status),
            invoiceNo: String(successFee.invoice_no ?? ""),
            feeDue: Number(successFee.fee_due ?? 0),
            collected: Number(successFee.collected_amount ?? 0),
            outstanding: Number(successFee.outstanding ?? 0),
            dueDate: successFee.due_date ? String(successFee.due_date) : null,
            base: Number(successFee.eligible_funding ?? 0),
            ratePercent: Number(successFee.fee_percent ?? 0),
            structure: String(successFee.fee_structure ?? "percentage"),
            cap: Number(successFee.fee_cap ?? 0),
            invoiced: Number(successFee.invoiced_amount ?? 0),
          }
        : null,
      successFeeProof: successFeeProofs[0] ? { status: String(successFeeProofs[0].status), submittedOn: String(successFeeProofs[0].created_at) } : null,
      community: {
        isMember: Boolean(communityMember),
        memberType: communityMember ? String(communityMember.member_type ?? "") : "",
        eventsRegistered: Number(communityEvents?.registered ?? 0),
        eventsAttended: Number(communityEvents?.attended ?? 0),
        supportOpen,
        supportResolved,
        referrals: referralCount,
      },
      today: new Date().toISOString().slice(0, 10),
    };

    const notices = all<Row>(
      "SELECT id, title, body, created_at FROM notifications WHERE recipient_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 10",
      session.actor.id,
    );

    // A founder-readable "what has happened so far": the same stage records, in date order,
    // with the internal score, identities and terms kept out. It is derived, never stored, so
    // it can never disagree with the journey it summarises.
    const history: { date: string; title: string; detail: string; tone: "ok" | "info" | "warn" | "risk" }[] = [];
    const push = (date: string | null | undefined, title: string, detail: string, tone: "ok" | "info" | "warn" | "risk" = "info") => {
      if (date) history.push({ date: String(date).slice(0, 10), title, detail, tone });
    };
    if (current?.submitted_at) push(String(current.submitted_at), "Application submitted", `Reference ${current.reference_no}.`, "ok");
    if (screening?.submitted_at) push(String(screening.submitted_at), "Internal screening completed", "The team reviewed your application against the programme framework.", screening.outcome === "proceed" ? "ok" : screening.outcome === "reject" ? "risk" : "warn");
    if (bootcamp?.invited_on) push(String(bootcamp.invited_on), "Invited to the Prep Bootcamp", "Attend the process, readiness, agreement and fee briefings.", "info");
    if (bootcamp?.attended_on) push(String(bootcamp.attended_on), "Prep Bootcamp attended", Number(bootcamp.preparation_completed) === 1 ? "Preparation completed." : "Some sessions are still outstanding.", "ok");
    if (analyst?.evaluated_at) push(String(analyst.evaluated_at), "Funding-fit review completed", "The analyst recorded an indicative view, not a commitment.", "info");
    if (mou?.shared_on) push(String(mou.shared_on), "Participation agreement shared", "The signing clock started.", "info");
    if (mou?.signed_on) push(String(mou.signed_on), "Participation agreement signed", "A signed copy is stored against your startup.", "ok");
    if (irr?.approved_on) push(String(irr.approved_on), "Investment Readiness Report approved", `Version ${Number(irr.version ?? 1)} was approved and shared with Investor Relations.`, "ok");
    if (virtualPitch?.scheduled_at) push(String(virtualPitch.scheduled_at), Number(virtualPitch.missed) === 1 ? "Virtual pitch missed" : "Virtual pitch scheduled", "Five minutes of pitch and five minutes of questions.", Number(virtualPitch.missed) === 1 ? "warn" : "info");
    if (pitchDay?.scheduled_at) push(String(pitchDay.scheduled_at), "Pitch Day", "One-to-one meetings with the investor panel.", "info");
    if (committee?.decided_on) push(String(committee.decided_on), "Final selection decision", String(committee.outcome) === "proceed" ? "You were selected for the season." : String(committee.outcome) === "rejected" ? "The committee did not select your startup this season." : "The committee placed your startup on hold.", String(committee.outcome) === "proceed" ? "ok" : String(committee.outcome) === "rejected" ? "risk" : "warn");
    if (fee?.invoice_date) push(String(fee.invoice_date), "Programme fee invoice issued", `Invoice ${fee.invoice_no ?? ""}. The AV shoot handover follows completed payment.`, "info");
    if (av?.schedule_on) push(String(av.schedule_on), "AV shoot scheduled", String(av.location ?? "") || "", "info");
    if (main?.completed_on) push(String(main.completed_on), "Main shoot completed", "", "ok");
    if (episode?.shoot_completed_on) push(String(episode.shoot_completed_on), "Episode shoot completed", String(episode.episode_no ?? "") ? `Episode ${episode.episode_no}.` : "", "ok");
    if (telecast?.telecast_date) push(String(telecast.telecast_date), "Telecast", "Your episode was scheduled for broadcast.", "info");
    history.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

    return ok({
      startup: publicStartup(startup),
      founders,
      profile: {
        percent: profileRecord.percent,
        complete: profileRecord.complete,
        total: profileRecord.total,
        missing: profileRecord.missing,
        missingSections: completeness.missingSections,
        sections: completeness.sections,
      },
      eligibility: eligibility(startup),
      applications: applications.map(publicApplication),
      currentApplicationId: current ? String(current.id) : null,
      // The live season, so the form never mistakes a closed-season application for this
      // season's work: a returning founder sees a fresh Season 3 form until they apply.
      currentSeasonId: session.seasonId,
      currentSeasonName: seasonName(session.seasonId),
      documents,
      documentRequests: documentRequests.map(publicDocumentRequest),
      messages,
      pitchDayOptions: pitchDayOptions.map((o) => ({
        id: String(o.id),
        option_date: String(o.option_date),
        slot_note: String(o.slot_note ?? ""),
        slot_time: String(o.slot_time ?? ""),
        status: String(o.status),
        founder_available: Number(o.founder_available ?? 0),
        approval: String(o.approval ?? "pending"),
        review_note: String(o.review_note ?? ""),
        investor_name: String(o.investor_name ?? ""),
        investor_category: String(o.investor_category ?? ""),
      })),
      paymentProofs,
      agreement: mou ? publicAgreement(mou, documents) : null,
      supportRequests,
      tasks: openTasks,
      notices,
      history,
      // The founder's own view of the two stages that need a reply from them: the
      // bootcamp invitation and the virtual pitch they may need to move.
      bootcamp: bootcamp
        ? {
            status: String(bootcamp.status),
            invitedOn: String(bootcamp.invited_on ?? ""),
            attendedOn: bootcamp.attended_on ? String(bootcamp.attended_on) : null,
            sessionDates: String(bootcamp.session_dates ?? ""),
            meetLink: String(bootcamp.meet_link ?? ""),
            preparationCompleted: Number(bootcamp.preparation_completed ?? 0),
            acknowledgement: String(bootcamp.acknowledgement ?? ""),
            acknowledgedOn: bootcamp.acknowledged_on ? String(bootcamp.acknowledged_on) : null,
          }
        : null,
      virtualPitch: virtualPitch
        ? {
            id: String(virtualPitch.id),
            scheduledAt: String(virtualPitch.scheduled_at ?? ""),
            attended: Number(virtualPitch.attended ?? 0),
            missed: Number(virtualPitch.missed ?? 0),
            rescheduleReason: String(virtualPitch.reschedule_reason ?? ""),
            meetLink: String(virtualPitch.meet_link ?? ""),
            response: String(virtualPitch.response ?? ""),
          }
        : null,
      virtualPitches: virtualPitchRows.map((v) => ({
        id: String(v.id),
        scheduledAt: String(v.scheduled_at ?? ""),
        attended: Number(v.attended ?? 0),
        missed: Number(v.missed ?? 0),
        meetLink: String(v.meet_link ?? ""),
        response: String(v.response ?? ""),
        materialShared: String(v.material_shared ?? ""),
        pitchMin: Number(v.duration_pitch_min ?? 5),
        qaMin: Number(v.duration_qa_min ?? 5),
      })),
      programs: programs.map((p) => publicProgram(p, appliedProgramIds.has(String(p.id)))),
      journey: founderJourney(journeyInput),
      shoot: {
        av_id: av ? String(av.id) : null,
        av_status: av ? String(av.status) : null,
        av_scheduled_on: av?.schedule_on ? String(av.schedule_on) : null,
        av_location: av ? String(av.location ?? "") : "",
        av_availability: av ? String(av.founder_availability ?? "") : "",
        mock_scheduled_on: mock?.scheduled_on ? String(mock.scheduled_on) : null,
        main_scheduled_on: main?.scheduled_on ? String(main.scheduled_on) : null,
        main_status: main ? String(main.status) : null,
      },
      mock: mock
        ? {
            status: String(mock.status),
            scheduledOn: mock.scheduled_on ? String(mock.scheduled_on) : null,
            productDemoReady: Number(mock.product_demo_ready ?? 0),
            stageMovementRehearsed: Number(mock.stage_movement_rehearsed ?? 0),
            finalReadinessApprovedOn: mock.final_readiness_approved_on ? String(mock.final_readiness_approved_on) : null,
          }
        : null,
      telecast: telecast
        ? {
            episodeNo: String(telecast.episode_no ?? ""),
            telecastDate: telecast.telecast_date ? String(telecast.telecast_date) : null,
            status: String(telecast.status),
            promoAssetsApproved: String(telecast.promo_assets_approved ?? "").trim().length > 0 ? 1 : 0,
            founderPostingDone: Number(telecast.founder_posting_done ?? 0),
            promoRequirements: String(telecast.promo_requirements ?? ""),
            promoPosts: String(telecast.promo_posts ?? ""),
            announcementWording: String(telecast.announcement_wording ?? ""),
            publicAnnouncement: String(telecast.public_announcement ?? ""),
            founderFeedback: String(telecast.founder_feedback ?? ""),
          }
        : null,
      episodeNo: episode ? String(episode.episode_no ?? "") : "",
      finance: {
        fee: fee ? publicFee(fee) : null,
        committed: committedTotal ?? 0,
        committedCount: committedCount ?? 0,
        deployed: deployed?.total ?? 0,
        successFee: successFee
          ? {
              id: String(successFee.id),
              status: String(successFee.status),
              invoiceNo: String(successFee.invoice_no ?? ""),
              feeDue: Number(successFee.fee_due ?? 0),
              collected: Number(successFee.collected_amount ?? 0),
              outstanding: Number(successFee.outstanding ?? 0),
              dueDate: successFee.due_date ? String(successFee.due_date) : null,
              base: Number(successFee.eligible_funding ?? 0),
              ratePercent: Number(successFee.fee_percent ?? 0),
              structure: String(successFee.fee_structure ?? "percentage"),
              cap: Number(successFee.fee_cap ?? 0),
              invoiced: Number(successFee.invoiced_amount ?? 0),
            }
          : null,
      },
      investment: {
        hasCommitment: (committedCount ?? 0) > 0,
        committed: committedTotal ?? 0,
        committedCount: committedCount ?? 0,
        deployed: deployed?.total ?? 0,
        trancheCount: trancheStats?.total ?? 0,
        verifiedTranches: trancheStats?.verified ?? 0,
        dealStatus: latestDeal ? String(latestDeal.status) : null,
        agreementPending,
      },
      // The per-investor view of the money stages: one card per deal and the tranches under
      // each. The founder sees their own deals only, and never the internal terms.
      dealsPerInvestor: dealDetail.map((d) => ({
        id: String(d.id),
        investorName: String(d.investor_name ?? "Investor"),
        investorCategory: String(d.investor_category ?? ""),
        status: String(d.status),
        committed: Number(d.committed_amount ?? 0),
        valuation: String(d.valuation ?? ""),
        milestones: milestonePairs(d.milestone_dates),
        openDocuments: String(d.open_documents ?? ""),
        openConditions: String(d.open_conditions ?? ""),
        withdrawalReason: String(d.withdrawal_reason ?? ""),
        replacementName: String(d.replacement_name ?? ""),
        documents: dealDocuments
          .filter((doc) => String(doc.deal_id) === String(d.id))
          .map((doc) => ({
            purpose: String(doc.purpose ?? ""),
            type: String(doc.document_type ?? ""),
            status: String(doc.status ?? ""),
            receivedOn: doc.received_on ? String(doc.received_on) : null,
            signedOn: doc.signed_on ? String(doc.signed_on) : null,
          })),
      })),
      fundingPerDeal: dealDetail.map((d) => {
        const rows = trancheDetail.filter((t) => String(t.deal_id) === String(d.id));
        const received = rows.reduce((sum, t) => sum + (["verified", "part_verified"].includes(String(t.status)) ? Number(t.verified_amount ?? 0) : 0), 0);
        const committed = Number(d.committed_amount ?? 0);
        return {
          dealId: String(d.id),
          investorName: String(d.investor_name ?? "Investor"),
          committed,
          received,
          pending: Math.max(0, committed - received),
          tranches: rows.map((t) => ({
            id: String(t.id),
            seq: Number(t.seq ?? 1),
            scheduledAmount: Number(t.scheduled_amount ?? 0),
            scheduledOn: t.scheduled_on ? String(t.scheduled_on) : null,
            reportedAmount: Number(t.reported_amount ?? 0),
            reportedOn: t.reported_on ? String(t.reported_on) : null,
            startupConfirmedOn: t.startup_confirmed_on ? String(t.startup_confirmed_on) : null,
            verifiedAmount: Number(t.verified_amount ?? 0),
            verifiedOn: t.verified_on ? String(t.verified_on) : null,
            status: String(t.status ?? "scheduled"),
            reversalReason: String(t.reversal_reason ?? ""),
          })),
        };
      }),
      meta: { needsFinancials: needsFinancials(startup) },
    });
  } catch (error) {
    return fail(error);
  }
}

function publicStartup(row: Row) {
  return {
    id: String(row.id),
    name: String(row.name),
    legal_entity: String(row.legal_entity ?? ""),
    entity_type: String(row.entity_type ?? ""),
    sector: String(row.sector ?? ""),
    stage: String(row.stage ?? ""),
    geography: String(row.geography ?? ""),
    business_model: String(row.business_model ?? ""),
    website: String(row.website ?? ""),
    cin: String(row.cin ?? ""),
    gstin: String(row.gstin ?? ""),
    pan: String(row.pan ?? ""),
    incorporated_on: String(row.incorporated_on ?? ""),
    category: String(row.category ?? ""),
    pitch: String(row.pitch ?? ""),
    logo_ref: String(row.logo_ref ?? ""),
    product_stage: String(row.product_stage ?? ""),
    revenue_stage: String(row.revenue_stage ?? ""),
    target_fundraise: Number(row.target_fundraise ?? 0),
    technologies: String(row.technologies ?? ""),
    industries: String(row.industries ?? ""),
    monthly_revenue: Number(row.monthly_revenue ?? 0),
    customer_count: Number(row.customer_count ?? 0),
    traction: String(row.traction ?? ""),
    funding_raised: Number(row.funding_raised ?? 0),
    pitch_deck_ref: String(row.pitch_deck_ref ?? ""),
    video_pitch_ref: String(row.video_pitch_ref ?? ""),
    profile_status: String(row.profile_status ?? ""),
    profile_review_notes: String(row.profile_review_notes ?? ""),
    origin_country: String(row.origin_country ?? ""),
    registered: Number(row.registered ?? 0),
  };
}

function publicApplication(row: Row) {
  return {
    id: String(row.id),
    reference_no: String(row.reference_no),
    season_id: row.season_id ? String(row.season_id) : null,
    season_code: row.season_code ? String(row.season_code) : null,
    season_name: row.season_name ? String(row.season_name) : null,
    program_id: row.program_id ? String(row.program_id) : null,
    status: String(row.status),
    stage_at_application: String(row.stage_at_application ?? ""),
    completion_pct: Number(row.completion_pct ?? 0),
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
    acknowledged_at: row.acknowledged_at ? String(row.acknowledged_at) : null,
    linked_to: row.duplicate_of ? String(row.duplicate_of) : null,
    notes: String(row.notes ?? ""),
  };
}

function publicProgram(row: Row, applied: boolean) {
  return {
    id: String(row.id),
    title: String(row.title),
    status: String(row.status),
    opens_on: String(row.opens_on ?? ""),
    closes_on: String(row.closes_on ?? ""),
    description: String(row.description ?? ""),
    eligibility: String(row.eligibility ?? ""),
    season: seasonName(String(row.season_id)),
    applied,
  };
}

function publicDocumentRequest(row: Row) {
  return {
    id: String(row.id),
    stage_key: String(row.stage_key ?? ""),
    purpose: String(row.purpose ?? ""),
    title: String(row.title),
    instructions: String(row.instructions ?? ""),
    mandatory: Number(row.mandatory ?? 1),
    accepted_formats: String(row.accepted_formats ?? ""),
    max_size_mb: Number(row.max_size_mb ?? 10),
    status: String(row.status),
    document_id: row.document_id ? String(row.document_id) : null,
    clarification: String(row.clarification ?? ""),
    submitted_on: row.submitted_on ? String(row.submitted_on) : null,
    verified_on: row.verified_on ? String(row.verified_on) : null,
  };
}

function publicAgreement(row: Row, documents: Row[]) {
  const signed = documents.find((d) => String(d.purpose) === "signed_mou");
  return {
    id: String(row.id),
    status: String(row.status),
    shared_on: String(row.shared_on ?? ""),
    signing_deadline: String(row.signing_deadline ?? ""),
    legal_ama_on: row.legal_ama_on ? String(row.legal_ama_on) : null,
    signed_on: row.signed_on ? String(row.signed_on) : null,
    commercial_schedule: String(row.commercial_schedule ?? ""),
    approved_exceptions: String(row.approved_exceptions ?? ""),
    response: String(row.response ?? ""),
    document: signed
      ? { id: String(signed.id), title: String(signed.title), file_ref: String(signed.file_ref ?? ""), uploaded_on: String(signed.uploaded_on ?? "") }
      : null,
  };
}

function publicFee(row: Row) {
  return {
    id: String(row.id),
    financial_year: String(row.financial_year ?? ""),
    fee_amount: Number(row.fee_amount ?? 0),
    paid_amount: Number(row.paid_amount ?? 0),
    outstanding: Number(row.outstanding ?? 0),
    invoice_no: String(row.invoice_no ?? ""),
    invoice_date: row.invoice_date ? String(row.invoice_date) : null,
    due_date: row.due_date ? String(row.due_date) : null,
    status: String(row.status ?? ""),
    extension_approved: Number(row.extension_approved ?? 0),
    original_due_date: row.original_due_date ? String(row.original_due_date) : null,
    late_payment_reason: String(row.late_payment_reason ?? ""),
    management_decision: String(row.management_decision ?? ""),
  };
}
