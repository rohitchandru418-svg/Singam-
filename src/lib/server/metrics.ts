import { all, get } from "../db/client";
import { seasonScopeSql } from "./season";
import { ENTITY_MAP } from "./registry";
import { addDays, ageInDays, daysBetween, today } from "../domain/dates";
import { compactINR, sum } from "../domain/money";

/**
 * Derived figures.
 *
 * Everything the management dashboard shows is computed here from the stored records, so
 * the numbers on screen always agree with the underlying rows. Selection, shoot
 * completion, investment commitment, deployment and fee collection are each calculated
 * separately, never merged into a single "progress" figure.
 */

export interface StartupBoardRow {
  startup_id: string;
  startup: string;
  sector: string;
  stage: string;
  application_ref: string | null;
  application_status: string | null;
  screening_outcome: string | null;
  analyst_recommendation: string | null;
  mou_status: string | null;
  irr_status: string | null;
  committee_outcome: string | null;
  upfront_fee_status: string | null;
  upfront_fee_amount: number;
  upfront_fee_paid: number;
  upfront_fee_outstanding: number;
  shoot_status: string | null;
  av_status: string | null;
  mock_status: string | null;
  episode_status: string | null;
  telecast_status: string | null;
  /** The date the episode airs (or aired), so a milestone can say when, not just whether. */
  air_date: string | null;
  committed_amount: number;
  deal_status: string | null;
  deployed_amount: number;
  outstanding_commitment: number;
  success_fee_status: string | null;
  success_fee_due: number;
  success_fee_invoiced: number;
  success_fee_collected: number;
  success_fee_outstanding: number;
  open_tasks: number;
  overdue_tasks: number;
  sentence: string;
}

/** `AND <season scope>` for a table, or an empty string when the table is season free. */
function scopeAnd(table: string, seasonId?: string): { sql: string; params: unknown[] } {
  const scope = seasonId ? seasonScopeSql(table, seasonId) : null;
  return scope ? { sql: ` AND ${scope.sql}`, params: scope.params } : { sql: "", params: [] };
}

/** One scoped row: `WHERE <column> = ? [AND season scope] [ORDER BY ...] LIMIT 1`. */
function getScoped(
  table: string,
  column: string,
  value: unknown,
  order: string,
  seasonId?: string,
): Record<string, unknown> | undefined {
  const scope = scopeAnd(table, seasonId);
  const orderSql = order ? ` ORDER BY ${order}` : "";
  return get<Record<string, unknown>>(
    `SELECT * FROM ${table} WHERE ${column} = ?${scope.sql}${orderSql} LIMIT 1`,
    value,
    ...scope.params,
  );
}

function scalar<T>(sql: string, ...params: unknown[]): T {
  const row = get<{ v: T }>(sql, ...params);
  return (row?.v ?? (0 as unknown)) as T;
}

export function startupBoard(seasonId?: string): StartupBoardRow[] {
  const t = today();
  const scope = seasonId ? seasonScopeSql("startups", seasonId) : null;
  const startups = scope
    ? all<Record<string, unknown>>(`SELECT * FROM startups WHERE ${scope.sql} ORDER BY name`, ...scope.params)
    : all<Record<string, unknown>>("SELECT * FROM startups ORDER BY name");
  return startups.map((s) => buildBoardRow(s, t, seasonId));
}

export function buildBoardRow(s: Record<string, unknown>, t: string, seasonId?: string): StartupBoardRow {
  const id = String(s.id);

  const app = seasonId
    ? get<Record<string, unknown>>(
        "SELECT * FROM applications WHERE startup_id = ? AND season_id = ? ORDER BY submitted_at DESC LIMIT 1",
        id,
        seasonId,
      )
    : get<Record<string, unknown>>(
        "SELECT * FROM applications WHERE startup_id = ? ORDER BY submitted_at DESC LIMIT 1",
        id,
      );
  const screening = app
    ? get<Record<string, unknown>>("SELECT * FROM screenings WHERE application_id = ? LIMIT 1", app.id)
    : undefined;
  const analyst = app
    ? get<Record<string, unknown>>("SELECT * FROM analyst_evaluations WHERE application_id = ? LIMIT 1", app.id)
    : undefined;
  const mou = app
    ? get<Record<string, unknown>>("SELECT * FROM mous WHERE application_id = ? LIMIT 1", app.id)
    : undefined;
  const irr = app
    ? get<Record<string, unknown>>("SELECT * FROM irr_reports WHERE application_id = ? ORDER BY version DESC LIMIT 1", app.id)
    : undefined;

  const committee = getScoped("committee_decisions", "startup_id", id, "created_at DESC", seasonId);
  const upfront = getScoped("upfront_fees", "startup_id", id, "created_at DESC", seasonId);
  const av = getScoped("av_shoots", "startup_id", id, "", seasonId);
  const mock = getScoped("mock_shoots", "startup_id", id, "", seasonId);
  const main = getScoped("main_shoots", "startup_id", id, "scheduled_on DESC", seasonId);
  const episode = getScoped("episodes", "startup_id", id, "", seasonId);
  const telecast = getScoped("telecasts", "startup_id", id, "", seasonId);
  const successFee = getScoped("success_fees", "startup_id", id, "created_at DESC", seasonId);
  const deal = getScoped("deals", "startup_id", id, "created_at DESC", seasonId);

  const deployed = scalar<number>(
    `SELECT COALESCE(SUM(t.verified_amount), 0) AS v FROM tranches t
      JOIN deals d ON d.id = t.deal_id WHERE d.startup_id = ?${seasonId ? " AND t.season_id = ?" : ""}`,
    ...(seasonId ? [id, seasonId] : [id]),
  );

  const dealCommitted = scalar<number>(
    `SELECT COALESCE(SUM(committed_amount), 0) AS v FROM deals WHERE startup_id = ? AND status NOT IN ('withdrawn','failed')${
      seasonId ? " AND season_id = ?" : ""
    }`,
    ...(seasonId ? [id, seasonId] : [id]),
  );

  // Committed capital is read from the deals, the same source the Investment column and the
  // balance use. Reading it from the commitments table let a row show "Committed Rs 3 crore"
  // beside a milestone track that said no commitment existed, because the deal existed but no
  // commitment row did.
  const committed = dealCommitted;

  const openTasks = scalar<number>(
    "SELECT COUNT(*) AS v FROM tasks WHERE entity_type = 'startup' AND entity_id = ? AND status NOT IN ('done','cancelled')",
    id,
  );
  const overdueTasks = scalar<number>(
    "SELECT COUNT(*) AS v FROM tasks WHERE entity_type = 'startup' AND entity_id = ? AND status NOT IN ('done','cancelled') AND due_date < ?",
    id,
    t,
  );

  const upfrontAmount = Number(upfront?.fee_amount ?? 0);
  const upfrontPaid = Number(upfront?.paid_amount ?? 0);
  const row: StartupBoardRow = {
    startup_id: id,
    startup: String(s.name),
    sector: String(s.sector),
    stage: String(s.stage),
    application_ref: app ? String(app.reference_no) : null,
    application_status: app ? String(app.status) : null,
    screening_outcome: screening ? String(screening.outcome) : null,
    analyst_recommendation: analyst ? String(analyst.recommendation) : null,
    mou_status: mou ? String(mou.status) : null,
    irr_status: irr ? String(irr.status) : null,
    committee_outcome: committee ? String(committee.outcome) : null,
    upfront_fee_status: upfront ? String(upfront.status) : null,
    upfront_fee_amount: upfrontAmount,
    upfront_fee_paid: upfrontPaid,
    upfront_fee_outstanding: Number(upfront?.outstanding ?? 0),
    shoot_status: main ? String(main.status) : null,
    av_status: av ? String(av.status) : null,
    mock_status: mock ? String(mock.status) : null,
    episode_status: episode ? String(episode.status) : null,
    telecast_status: telecast ? String(telecast.status) : null,
    air_date: telecast && telecast.telecast_date ? String(telecast.telecast_date) : null,
    committed_amount: committed,
    deal_status: deal ? String(deal.status) : null,
    deployed_amount: deployed,
    outstanding_commitment: Math.max(0, dealCommitted - deployed),
    success_fee_status: successFee ? String(successFee.status) : null,
    success_fee_due: Number(successFee?.fee_due ?? 0),
    success_fee_invoiced: Number(successFee?.invoiced_amount ?? 0),
    success_fee_collected: Number(successFee?.collected_amount ?? 0),
    success_fee_outstanding: Number(successFee?.outstanding ?? 0),
    open_tasks: openTasks,
    overdue_tasks: overdueTasks,
    sentence: "",
  };
  row.sentence = buildSentence(row);
  return row;
}

/** The status sentence the brief asks for, e.g. "Shoot completed; telecast pending; Rs 75 lakh deployed; success fee partly collected." */
export function buildSentence(row: StartupBoardRow): string {
  const parts: string[] = [];
  if (row.shoot_status) parts.push(`Shoot ${label(row.shoot_status)}`);
  else if (row.av_status === "completed") parts.push("AV completed, shoot pending");
  else parts.push("Not yet selected for shoot");

  parts.push(telecastPhrase(row.telecast_status));
  parts.push(`${compact(row.deployed_amount)} deployed`);
  if (row.outstanding_commitment > 0) parts.push(`${compact(row.outstanding_commitment)} commitment outstanding`);
  parts.push(row.success_fee_status ? `success fee ${label(row.success_fee_status)}` : "success fee not triggered");
  return parts.join("; ") + ".";
}

/** The telecast status keys already name the stage, so "telecast " + label would read "telecast telecast". */
const TELECAST_PHRASE: Record<string, string> = {
  not_scheduled: "telecast not scheduled",
  scheduled: "telecast scheduled",
  founder_notified: "founder notified for telecast",
  promo_pending: "telecast promo pending",
  promo_done: "telecast promo completed",
  telecast: "telecast done",
  feedback_pending: "telecast feedback pending",
  completed: "telecast completed",
};

function telecastPhrase(status: string | null): string {
  if (!status) return "telecast not scheduled";
  return TELECAST_PHRASE[status] ?? `telecast ${label(status)}`;
}

function label(value: string): string {
  return value.replace(/_/g, " ");
}

function compact(paise: number): string {
  const value = paise / 100;
  if (value >= 1_00_00_000) return `Rs ${Math.round((value / 1_00_00_000) * 100) / 100} crore`;
  if (value >= 1_00_000) return `Rs ${Math.round((value / 1_00_000) * 100) / 100} lakh`;
  return `Rs ${value}`;
}

/* ------------------------------------------------------------------ */
/* Dashboard aggregates                                                */
/* ------------------------------------------------------------------ */

export interface DashboardKpis {
  applications: { total: number; submitted: number; inScreening: number; proceeded: number; rejected: number; conversionPct: number };
  stageBacklog: { stage: string; department: string; count: number; oldestDays: number; stageKey?: string }[];
  investors: { total: number; onboarded: number; verificationPending: number; agreementPending: number; gradeMix: Record<string, number> };
  matching: { suggested: number; approved: number; shared: number; advanced: number; passed: number; coveragePct: number };
  upfront: { due: number; collected: number; overdue: number; overdueCount: number };
  shoot: { paidAwaitingAv: number; avCompleted: number; mockReady: number; shootCompleted: number; telecastReady: number; telecastDone: number };
  commitments: { committed: number; signedDeals: number; deployed: number; outstanding: number; atRiskDeals: number };
  successFees: { due: number; invoiced: number; collected: number; overdue: number; overdueCount: number };
  community: { members: number; events: number; registrations: number; attendance: number; qualifiedReferrals: number; convertedReferrals: number; supportOpen: number; supportResolved: number; referralFunding: number };
  overdueByDepartment: { department: string; count: number }[];
  exceptions: { id: string; title: string; department: string; severity: string; detail: string }[];
}

export function dashboardKpis(seasonId?: string): DashboardKpis {
  const t = today();

  const appScope = scopeAnd("applications", seasonId);
  const apps = get<Record<string, number>>(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status='submitted' THEN 1 ELSE 0 END) AS submitted,
       SUM(CASE WHEN status='in_screening' THEN 1 ELSE 0 END) AS inScreening,
       SUM(CASE WHEN status='proceeded' THEN 1 ELSE 0 END) AS proceeded,
       SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) AS rejected
     FROM applications WHERE 1=1${appScope.sql}`,
    ...appScope.params,
  ) ?? { total: 0, submitted: 0, inScreening: 0, proceeded: 0, rejected: 0 };

  const applications = {
    total: apps.total ?? 0,
    submitted: apps.submitted ?? 0,
    inScreening: apps.inScreening ?? 0,
    proceeded: apps.proceeded ?? 0,
    rejected: apps.rejected ?? 0,
    conversionPct: apps.total ? Math.round(((apps.proceeded ?? 0) / apps.total) * 1000) / 10 : 0,
  };

  const stageBacklog = buildStageBacklog(t, seasonId);

  const inv = get<Record<string, number>>(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status='onboarded' THEN 1 ELSE 0 END) AS onboarded,
       SUM(CASE WHEN status='verification_pending' THEN 1 ELSE 0 END) AS verificationPending,
       SUM(CASE WHEN status IN ('agreement_pending','verified') THEN 1 ELSE 0 END) AS agreementPending
     FROM investors`,
  ) ?? { total: 0, onboarded: 0, verificationPending: 0, agreementPending: 0 };
  const gradeMix = Object.fromEntries(
    all<{ grade: string; n: number }>(
      "SELECT COALESCE(grade,'ungraded') AS grade, COUNT(*) AS n FROM investors GROUP BY grade",
    ).map((r) => [r.grade, r.n]),
  );

  const matchScope = scopeAnd("matches", seasonId);
  const m = get<Record<string, number>>(
    `SELECT COUNT(*) AS total,
       SUM(CASE WHEN status='suggested' THEN 1 ELSE 0 END) AS suggested,
       SUM(CASE WHEN status='approved_for_circulation' THEN 1 ELSE 0 END) AS approved,
       SUM(CASE WHEN status IN ('shared','responded','meeting_scheduled') THEN 1 ELSE 0 END) AS shared,
       SUM(CASE WHEN status='advanced' THEN 1 ELSE 0 END) AS advanced,
       SUM(CASE WHEN status IN ('passed','withdrawn') THEN 1 ELSE 0 END) AS passed
     FROM matches WHERE 1=1${matchScope.sql}`,
    ...matchScope.params,
  ) ?? { total: 0, suggested: 0, approved: 0, shared: 0, advanced: 0, passed: 0 };

  const ufScope = scopeAnd("upfront_fees", seasonId);
  const upfrontDue = scalar<number>(
    `SELECT COALESCE(SUM(fee_amount),0) AS v FROM upfront_fees WHERE status NOT IN ('waived','refunded')${ufScope.sql}`,
    ...ufScope.params,
  );
  const upfrontCollected = scalar<number>(
    `SELECT COALESCE(SUM(paid_amount),0) AS v FROM upfront_fees WHERE 1=1${ufScope.sql}`,
    ...ufScope.params,
  );
  const upfrontOverdue = scalar<number>(
    `SELECT COALESCE(SUM(outstanding),0) AS v FROM upfront_fees WHERE status IN ('overdue','part_paid','extension_approved') AND outstanding > 0${ufScope.sql}`,
    ...ufScope.params,
  );
  const upfrontOverdueCount = scalar<number>(
    `SELECT COUNT(*) AS v FROM upfront_fees WHERE (status = 'overdue' OR (due_date < ? AND outstanding > 0))${ufScope.sql}`,
    t,
    ...ufScope.params,
  );

  const avScope = scopeAnd("av_shoots", seasonId);
  const msScope = scopeAnd("mock_shoots", seasonId);
  const mainScope = scopeAnd("main_shoots", seasonId);
  const epScope = scopeAnd("episodes", seasonId);
  const tcScope = scopeAnd("telecasts", seasonId);
  const startupSet = "SELECT DISTINCT startup_id FROM applications WHERE season_id = ?";
  const shoot = {
    paidAwaitingAv: seasonId
      ? scalar<number>(
          `SELECT COUNT(*) AS v FROM upfront_fees uf JOIN av_shoots av ON av.startup_id = uf.startup_id
            WHERE uf.status = 'paid' AND av.status IN ('not_started','planned')
              AND av.startup_id IN (${startupSet})`,
          seasonId,
        )
      : scalar<number>(
          `SELECT COUNT(*) AS v FROM upfront_fees uf JOIN av_shoots av ON av.startup_id = uf.startup_id
            WHERE uf.status = 'paid' AND av.status IN ('not_started','planned')`,
        ),
    avCompleted: scalar<number>(
      `SELECT COUNT(*) AS v FROM av_shoots WHERE status = 'completed'${avScope.sql}`,
      ...avScope.params,
    ),
    mockReady: scalar<number>(
      `SELECT COUNT(*) AS v FROM mock_shoots WHERE status = 'ready'${msScope.sql}`,
      ...msScope.params,
    ),
    shootCompleted: scalar<number>(
      `SELECT COUNT(*) AS v FROM main_shoots WHERE status IN ('completed','exceptions')${mainScope.sql}`,
      ...mainScope.params,
    ),
    telecastReady: scalar<number>(
      `SELECT COUNT(*) AS v FROM episodes WHERE status IN ('approved','edited')${epScope.sql}`,
      ...epScope.params,
    ),
    telecastDone: scalar<number>(
      `SELECT COUNT(*) AS v FROM telecasts WHERE status IN ('telecast','feedback_pending','completed')${tcScope.sql}`,
      ...tcScope.params,
    ),
  };

  const comScope = scopeAnd("commitments", seasonId);
  const dealScope = scopeAnd("deals", seasonId);
  const trancheScope = scopeAnd("tranches", seasonId);
  const committed = scalar<number>(
    `SELECT COALESCE(SUM(amount),0) AS v FROM commitments WHERE status IN ('confirmed','shoot_day_confirmed','written_proposed')${comScope.sql}`,
    ...comScope.params,
  );
  const signedDeals = scalar<number>(
    `SELECT COUNT(*) AS v FROM deals WHERE status IN ('definitive_agreements','pre_funding_conditions','fund_transfer','receipt_verification','allotment','closed')${dealScope.sql}`,
    ...dealScope.params,
  );
  const deployed = scalar<number>(
    `SELECT COALESCE(SUM(verified_amount),0) AS v FROM tranches WHERE 1=1${trancheScope.sql}`,
    ...trancheScope.params,
  );
  const dealCommitted = scalar<number>(
    `SELECT COALESCE(SUM(committed_amount),0) AS v FROM deals WHERE status NOT IN ('withdrawn','failed')${dealScope.sql}`,
    ...dealScope.params,
  );
  const atRisk = scalar<number>(
    `SELECT COUNT(*) AS v FROM deals WHERE status NOT IN ('closed','withdrawn','failed')
       AND (blocker <> '' OR open_conditions <> '' OR open_documents <> '')${dealScope.sql}`,
    ...dealScope.params,
  );

  const sfScope = scopeAnd("success_fees", seasonId);
  const sf = get<Record<string, number>>(
    `SELECT COALESCE(SUM(fee_due),0) AS due, COALESCE(SUM(invoiced_amount),0) AS invoiced,
       COALESCE(SUM(collected_amount),0) AS collected,
       COALESCE(SUM(CASE WHEN status='overdue' OR (due_date < '${t}' AND outstanding > 0) THEN outstanding ELSE 0 END),0) AS overdue,
       SUM(CASE WHEN status='overdue' OR (due_date < '${t}' AND outstanding > 0) THEN 1 ELSE 0 END) AS overdueCount
     FROM success_fees WHERE 1=1${sfScope.sql}`,
    ...sfScope.params,
  ) ?? { due: 0, invoiced: 0, collected: 0, overdue: 0, overdueCount: 0 };

  const ev = get<Record<string, number>>(
    "SELECT COUNT(*) AS events, COALESCE(SUM(registrations),0) AS registrations, COALESCE(SUM(attendance),0) AS attendance FROM community_events",
  ) ?? { events: 0, registrations: 0, attendance: 0 };

  const refScope = scopeAnd("referrals", seasonId);
  const supScope = scopeAnd("support_requests", seasonId);
  const community = {
    members: scalar<number>("SELECT COUNT(*) AS v FROM community_members"),
    events: ev.events ?? 0,
    registrations: ev.registrations ?? 0,
    attendance: ev.attendance ?? 0,
    qualifiedReferrals: scalar<number>(
      `SELECT COUNT(*) AS v FROM referrals WHERE status IN ('qualified','engaged','converted')${refScope.sql}`,
      ...refScope.params,
    ),
    convertedReferrals: scalar<number>(
      `SELECT COUNT(*) AS v FROM referrals WHERE status = 'converted'${refScope.sql}`,
      ...refScope.params,
    ),
    supportOpen: scalar<number>(
      `SELECT COUNT(*) AS v FROM support_requests WHERE status IN ('open','in_progress')${supScope.sql}`,
      ...supScope.params,
    ),
    supportResolved: scalar<number>(
      `SELECT COUNT(*) AS v FROM support_requests WHERE status IN ('resolved','closed')${supScope.sql}`,
      ...supScope.params,
    ),
    referralFunding: scalar<number>(
      `SELECT COALESCE(SUM(outcome_amount),0) AS v FROM referrals WHERE status = 'converted'${refScope.sql}`,
      ...refScope.params,
    ),
  };

  const overdueByDepartment = all<{ department: string; count: number }>(
    `SELECT department, COUNT(*) AS count FROM tasks
      WHERE status NOT IN ('done','cancelled') AND due_date < ? GROUP BY department ORDER BY count DESC`,
    t,
  );

  return {
    applications,
    stageBacklog,
    investors: {
      total: inv.total ?? 0,
      onboarded: inv.onboarded ?? 0,
      verificationPending: inv.verificationPending ?? 0,
      agreementPending: inv.agreementPending ?? 0,
      gradeMix,
    },
    matching: {
      suggested: m.suggested ?? 0,
      approved: m.approved ?? 0,
      shared: m.shared ?? 0,
      advanced: m.advanced ?? 0,
      passed: m.passed ?? 0,
      coveragePct:
        (m.total ?? 0) > 0
          ? Math.round((((m.shared ?? 0) + (m.advanced ?? 0)) / (m.total ?? 1)) * 1000) / 10
          : 0,
    },
    upfront: {
      due: upfrontDue,
      collected: upfrontCollected,
      overdue: upfrontOverdue,
      overdueCount: upfrontOverdueCount,
    },
    shoot,
    commitments: {
      committed,
      signedDeals,
      deployed,
      outstanding: Math.max(0, dealCommitted - deployed),
      atRiskDeals: atRisk,
    },
    successFees: {
      due: sf.due ?? 0,
      invoiced: sf.invoiced ?? 0,
      collected: sf.collected ?? 0,
      overdue: sf.overdue ?? 0,
      overdueCount: sf.overdueCount ?? 0,
    },
    community,
    overdueByDepartment,
    exceptions: buildExceptions(t, seasonId),
  };
}

export interface StageSource {
  stage: string;
  department: string;
  table: string;
  statusColumn: string;
  openStatuses: string[];
  dateColumn: string;
  scope?: string;
  /** The SOP stage key this backlog row answers to, when it maps to one. */
  stageKey?: string;
}

export const STAGE_SOURCES: StageSource[] = [
  { stage: "Applications awaiting screening", department: "startup_relationships", table: "applications", statusColumn: "status", openStatuses: ["submitted"], dateColumn: "submitted_at", stageKey: "application_submitted" },
  { stage: "Applications in screening", department: "startup_relationships", table: "applications", statusColumn: "status", openStatuses: ["in_screening"], dateColumn: "submitted_at", stageKey: "internal_screening" },
  { stage: "Information required from founders", department: "startup_relationships", table: "applications", statusColumn: "status", openStatuses: ["info_required"], dateColumn: "updated_at", stageKey: "internal_screening" },
  { stage: "Analyst evaluations pending", department: "startup_relationships", table: "analyst_evaluations", statusColumn: "recommendation", openStatuses: ["pending", "conditional", "hold"], dateColumn: "created_at", stageKey: "analyst_screening" },
  { stage: "Unsigned MoUs", department: "legal", table: "mous", statusColumn: "status", openStatuses: ["shared", "under_review", "legal_ama_done", "negotiation"], dateColumn: "signing_deadline", stageKey: "mou_signing" },
  { stage: "IRRs pending", department: "finance", table: "irr_reports", statusColumn: "status", openStatuses: ["requested", "handover_accepted", "checklist_sent", "docs_pending", "in_preparation", "under_review", "approved"], dateColumn: "requested_on", stageKey: "irr_handover" },
  { stage: "Committee decisions pending", department: "management", table: "committee_decisions", statusColumn: "outcome", openStatuses: ["pending", "on_hold"], dateColumn: "created_at", stageKey: "final_selection" },
  { stage: "Investors awaiting verification", department: "investor_relations", table: "investors", statusColumn: "status", openStatuses: ["sourced", "exploratory", "verification_pending", "agreement_pending"], dateColumn: "created_at", stageKey: "verification_agreement" },
  { stage: "Matches awaiting circulation", department: "investor_relations", table: "matches", statusColumn: "status", openStatuses: ["suggested", "approved_for_circulation"], dateColumn: "created_at", stageKey: "investor_analyst_evaluation" },
  { stage: "Pitches without a response", department: "investor_relations", table: "virtual_pitches", statusColumn: "response", openStatuses: ["no_response", "info_requested"], dateColumn: "scheduled_at", stageKey: "virtual_pitch" },
  { stage: "Upfront fees outstanding", department: "finance", table: "upfront_fees", statusColumn: "status", openStatuses: ["under_calculation", "invoiced", "part_paid", "overdue", "extension_approved", "disputed"], dateColumn: "due_date", stageKey: "upfront_fee" },
  { stage: "Deals in progress", department: "investor_relations", table: "deals", statusColumn: "status", openStatuses: ["deal_confirmed", "communication_thread", "term_sheet", "due_diligence", "findings_resolution", "definitive_agreements", "pre_funding_conditions", "fund_transfer", "receipt_verification", "allotment"], dateColumn: "created_at", stageKey: "deal_confirmation" },
  { stage: "Tranches awaiting verification", department: "finance", table: "tranches", statusColumn: "status", openStatuses: ["scheduled", "reported_by_investor", "receipt_confirmed", "part_verified"], dateColumn: "scheduled_on", stageKey: "receipt_verification" },
  { stage: "Success fees outstanding", department: "finance", table: "success_fees", statusColumn: "status", openStatuses: ["calculation_triggered", "under_review", "invoiced", "part_collected", "overdue", "disputed"], dateColumn: "due_date", stageKey: "success_fee" },
  { stage: "Shoots awaiting completion", department: "production", table: "main_shoots", statusColumn: "status", openStatuses: ["not_started", "scheduled", "shooting"], dateColumn: "scheduled_on", stageKey: "main_shoot" },
  { stage: "Telecasts pending", department: "marketing", table: "telecasts", statusColumn: "status", openStatuses: ["not_scheduled", "scheduled", "founder_notified", "promo_pending", "promo_done", "telecast", "feedback_pending"], dateColumn: "telecast_date", stageKey: "telecast" },
  { stage: "Support requests open", department: "community", table: "support_requests", statusColumn: "status", openStatuses: ["open", "in_progress"], dateColumn: "due_date", stageKey: "founder_support" },
  { stage: "Referrals in progress", department: "community", table: "referrals", statusColumn: "status", openStatuses: ["new", "qualified", "engaged"], dateColumn: "created_at", stageKey: "referral_chain" },
  { stage: "Events open for registration", department: "community", table: "community_events", statusColumn: "status", openStatuses: ["planned", "open_for_registration"], dateColumn: "scheduled_on", stageKey: "event_engagement" },
];

export function buildStageBacklog(t: string, seasonId?: string): DashboardKpis["stageBacklog"] {
  const out: DashboardKpis["stageBacklog"] = [];
  for (const src of STAGE_SOURCES) {
    const placeholders = src.openStatuses.map(() => "?").join(", ");
    const scope = scopeAnd(src.table, seasonId);
    const row = get<{ n: number; oldest: string | null }>(
      `SELECT COUNT(*) AS n, MIN(${src.dateColumn}) AS oldest FROM ${src.table}
        WHERE ${src.statusColumn} IN (${placeholders})${scope.sql}`,
      ...src.openStatuses,
      ...scope.params,
    );
    const count = row?.n ?? 0;
    if (count === 0) continue;
    // A future-dated milestone (for example a shoot scheduled next month) has not aged yet;
    // clamp so ageing never reports a negative number.
    const oldest = row?.oldest ? Math.max(0, ageInDays(row.oldest, t)) : 0;
    out.push({ stage: src.stage, department: src.department, count, oldestDays: oldest, stageKey: src.stageKey });
  }
  return out.sort((a, b) => b.oldestDays - a.oldestDays);
}

export interface ExceptionItem {
  id: string;
  title: string;
  department: string;
  severity: "critical" | "high" | "medium";
  detail: string;
  /** Entity type plus id let the dashboard link straight to the record concerned. */
  entityType: string;
  entityId: string;
  /** Human label of the record the exception concerns (a startup name where one exists). */
  entityLabel: string;
  /** How long the exception has been open, in days. Drives "oldest first" ordering. */
  ageDays: number;
  /** Number of identical escalations collapsed into this row (1 when not collapsed). */
  count: number;
}

/** Severity ordering, worst first. */
const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 } as const;

/** Qualify the leading column of a scope clause with a table alias so a joined query stays unambiguous. */
function aliased(scope: { sql: string; params: unknown[] }, alias: string): string {
  return scope.sql.replace(/^([a-z_]+)\b/, `${alias}.$1`);
}

/** Name for a startup id, resolved in one pass so a page of exceptions costs one query. */
function startupNames(ids: string[]): Map<string, string> {
  const unique = [...new Set(ids.filter((v) => v && v !== ""))];
  if (unique.length === 0) return new Map();
  const placeholders = unique.map(() => "?").join(",");
  const rows = all<{ id: string; name: string }>(
    `SELECT id, name FROM startups WHERE id IN (${placeholders})`,
    ...unique,
  );
  return new Map(rows.map((r) => [String(r.id), String(r.name)]));
}

/**
 * The startup each task escalation concerns, keyed `<entity_type>::<entity_id>`. The task
 * stores a singular entity type, so it is mapped to the registry key and the startup is
 * reached through that entity's declared link (directly, or via its application). One query
 * per distinct type keeps a page of escalations cheap.
 */
function escalationStartupNames(rows: Record<string, unknown>[]): Map<string, string> {
  const byType = new Map<string, string[]>();
  for (const r of rows) {
    const type = String(r.entity_type ?? "");
    const id = String(r.entity_id ?? "");
    if (!type || !id) continue;
    const ids = byType.get(type) ?? [];
    ids.push(id);
    byType.set(type, ids);
  }

  const out = new Map<string, string>();
  for (const [type, ids] of byType) {
    const entity = ENTITY_MAP[type] ?? ENTITY_MAP[`${type}s`];
    if (!entity) continue;
    const placeholders = ids.map(() => "?").join(",");
    const direct = entity.relations?.find((rel) => rel.entity === "startups");
    const viaApp = entity.relations?.find((rel) => rel.entity === "applications");
    if (direct) {
      const linked = all<Record<string, unknown>>(
        `SELECT id, ${direct.column} AS sid FROM ${entity.table} WHERE id IN (${placeholders})`,
        ...ids,
      );
      const names = startupNames(linked.map((r) => String(r.sid ?? "")));
      for (const r of linked) out.set(`${type}::${String(r.id)}`, names.get(String(r.sid)) ?? "");
    } else if (viaApp) {
      const linked = all<Record<string, unknown>>(
        `SELECT m.id AS id, s.name AS name FROM ${entity.table} m
           LEFT JOIN applications a ON a.id = m.${viaApp.column}
           LEFT JOIN startups s ON s.id = a.startup_id
          WHERE m.id IN (${placeholders})`,
        ...ids,
      );
      for (const r of linked) out.set(`${type}::${String(r.id)}`, String(r.name ?? ""));
    }
  }
  return out;
}

/**
 * Everything that should reach a manager's attention today, each with the record it concerns
 * and how long it has been open. Identical open escalations (the same task title in the same
 * department, raised more than once) are collapsed into one row with a count, so a repeated
 * reminder does not crowd out the distinct problems beside it.
 */
export function buildExceptions(t: string, seasonId?: string): ExceptionItem[] {
  const out: ExceptionItem[] = [];
  const push = (e: Omit<ExceptionItem, "ageDays" | "count"> & { ageDays?: number; count?: number }) =>
    out.push({ ageDays: e.ageDays ?? 0, count: e.count ?? 1, ...e });

  const startup = (id: unknown) => String(id ?? "");

  const ufScope = scopeAnd("upfront_fees", seasonId);
  const ufRows = all<Record<string, unknown>>(
    `SELECT * FROM upfront_fees WHERE due_date IS NOT NULL AND due_date < ? AND outstanding > 0${ufScope.sql} ORDER BY due_date`,
    t,
    ...ufScope.params,
  );
  const ufNames = startupNames(ufRows.map((r) => startup(r.startup_id)));
  for (const r of ufRows) {
    const overdue = daysBetween(String(r.due_date), t);
    const name = ufNames.get(startup(r.startup_id)) ?? startup(r.startup_id);
    push({
      id: String(r.id),
      entityType: "upfront_fee",
      entityId: String(r.id),
      entityLabel: name,
      title: `Upfront fee overdue (${overdue} days)`,
      department: "finance",
      severity: overdue > 30 ? "critical" : "high",
      ageDays: overdue,
      detail: `${name} · Invoice ${r.invoice_no || "not issued"} · ${compactINR(Number(r.outstanding))} outstanding, recorded against ${r.original_due_date ? "the preserved original due date" : "the invoice due date"}.`,
    });
  }

  const mouScope = scopeAnd("mous", seasonId);
  const mouRows = all<Record<string, unknown>>(
    `SELECT m.*, a.startup_id AS app_startup_id, s.name AS startup_name FROM mous m
       LEFT JOIN applications a ON a.id = m.application_id
       LEFT JOIN startups s ON s.id = a.startup_id
      WHERE m.status IN ('shared','under_review','legal_ama_done','negotiation') AND m.signing_deadline < ?${aliased(mouScope, "m")}`,
    t,
    ...mouScope.params,
  );
  for (const r of mouRows) {
    const overdue = daysBetween(String(r.signing_deadline), t);
    const name = String(r.startup_name ?? r.app_startup_id ?? r.application_id);
    push({
      id: String(r.id),
      entityType: "mou",
      entityId: String(r.id),
      entityLabel: name,
      title: `MoU signing deadline breached (${overdue} days)`,
      department: "legal",
      severity: r.escalated_to_management ? "critical" : "high",
      ageDays: overdue,
      detail: `${name} · Application ${r.application_id} · response recorded: ${r.response || "none"}.`,
    });
  }

  // Pre-shoot panel: the IR SOP requires the IRR shared with the panel at least two weeks
  // before the shoot. Flag a shoot whose two-week IRR window has opened without the share.
  const psScope = scopeAnd("pre_shoot_confirmations", seasonId);
  const psRows = all<Record<string, unknown>>(
    `SELECT ps.*, s.name AS startup_name FROM pre_shoot_confirmations ps
       LEFT JOIN startups s ON s.id = ps.startup_id
      WHERE ps.shoot_date IS NOT NULL AND ps.irr_shared_on IS NULL${aliased(psScope, "ps")}`,
    ...psScope.params,
  );
  for (const r of psRows) {
    const deadline = addDays(String(r.shoot_date), -14);
    if (deadline >= t) continue; // the two-week window has not opened yet
    const late = daysBetween(deadline, t);
    const name = String(r.startup_name ?? r.startup_id);
    push({
      id: String(r.id),
      entityType: "pre_shoot_confirmation",
      entityId: String(r.id),
      entityLabel: name,
      title: `IRR not shared with the pre-shoot panel (${late} days late)`,
      department: "investor_relations",
      severity: late > 7 ? "critical" : "high",
      ageDays: late,
      detail: `${name} · episode ${r.episode_no} · the shoot is on ${r.shoot_date}; the IRR was due by ${deadline}.`,
    });
  }

  const sfScope = scopeAnd("success_fees", seasonId);
  const sfRows = all<Record<string, unknown>>(
    `SELECT sf.*, s.name AS startup_name FROM success_fees sf
       LEFT JOIN startups s ON s.id = sf.startup_id
      WHERE sf.due_date IS NOT NULL AND sf.due_date < ? AND sf.outstanding > 0${aliased(sfScope, "sf")}`,
    t,
    ...sfScope.params,
  );
  for (const r of sfRows) {
    const overdue = daysBetween(String(r.due_date), t);
    const name = String(r.startup_name ?? r.startup_id);
    push({
      id: String(r.id),
      entityType: "success_fee",
      entityId: String(r.id),
      entityLabel: name,
      title: `Success fee overdue (${overdue} days)`,
      department: "finance",
      severity: overdue > 30 ? "critical" : "high",
      ageDays: overdue,
      detail: `${name} · Invoice ${r.invoice_no || "not issued"} · ${compactINR(Number(r.outstanding))} outstanding after approved adjustments.`,
    });
  }

  const dealScope = scopeAnd("deals", seasonId);
  const dealRows = all<Record<string, unknown>>(
    `SELECT d.*, s.name AS startup_name FROM deals d
       LEFT JOIN startups s ON s.id = d.startup_id
      WHERE d.status NOT IN ('closed','withdrawn','failed') AND d.blocker <> ''${aliased(dealScope, "d")}`,
    ...dealScope.params,
  );
  for (const r of dealRows) {
    const name = String(r.startup_name ?? r.startup_id);
    push({
      id: String(r.id),
      entityType: "deal",
      entityId: String(r.id),
      entityLabel: name,
      title: "Deal at risk",
      department: "investor_relations",
      severity: "high",
      detail: `${name} · ${String(r.blocker)}`,
    });
  }

  for (const r of all<Record<string, unknown>>(
    "SELECT * FROM integrations WHERE failed_sync_alerts > 0 OR status = 'degraded'",
  )) {
    push({
      id: String(r.id),
      entityType: "integration",
      entityId: String(r.id),
      entityLabel: String(r.name),
      title: `Integration degraded: ${r.name}`,
      department: "management",
      severity: "medium",
      detail: String(r.last_error || "Failed-sync alert open so the error does not silently stop work."),
    });
  }

  // Open escalations, resolved to a startup name where the task points at a startup-linked
  // record, and collapsed when the same reminder has been raised more than once.
  const escalationRows = all<Record<string, unknown>>(
    `SELECT * FROM tasks WHERE escalation_status = 'escalated' AND status NOT IN ('done','cancelled')`,
  );
  const escalationNames = escalationStartupNames(escalationRows);
  const escalations = new Map<string, ExceptionItem>();
  for (const r of escalationRows) {
    const name = escalationNames.get(`${String(r.entity_type)}::${String(r.entity_id)}`) ?? "";
    const key = `${String(r.department)}::${String(r.title)}::${name}`;
    const existing = escalations.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    escalations.set(key, {
      id: String(r.id),
      entityType: "task",
      entityId: String(r.id),
      entityLabel: name || String(r.title),
      title: `Escalation open: ${r.title}`,
      department: String(r.department),
      severity: "critical",
      ageDays: r.escalated_on ? ageInDays(String(r.escalated_on), t) : 0,
      count: 1,
      detail: name ? `${name} · ${String(r.escalation_reason)}` : String(r.escalation_reason),
    });
  }
  out.push(...escalations.values());

  const phScope = scopeAnd("production_handovers", seasonId);
  const phRows = all<Record<string, unknown>>(
    `SELECT ph.*, s.name AS startup_name FROM production_handovers ph
       LEFT JOIN startups s ON s.id = ph.startup_id
      WHERE ph.advance_notified = 1 AND ph.payment_cleared = 0${aliased(phScope, "ph")}`,
    ...phScope.params,
  );
  for (const r of phRows) {
    const name = String(r.startup_name ?? r.startup_id);
    push({
      id: String(r.id),
      entityType: "production_handover",
      entityId: String(r.id),
      entityLabel: name,
      title: "Production advance notification without payment clearance",
      department: "production",
      severity: "medium",
      detail: `${name} · advance notification is recorded separately; the AV shoot handover must follow completed payment.`,
    });
  }

  // Approvals past their two-working-day deadline (doc 11 §1.1).
  const approvalRows = all<Record<string, unknown>>(
    "SELECT * FROM approval_requests WHERE status = 'pending' AND due_on IS NOT NULL AND due_on < ? ORDER BY due_on",
    t,
  );
  for (const r of approvalRows) {
    const late = daysBetween(String(r.due_on), t);
    push({
      id: String(r.id),
      entityType: "approval_request",
      entityId: String(r.id),
      entityLabel: String(r.title),
      title: `Approval overdue (${late} days): ${r.title}`,
      department: "management",
      severity: late > 5 ? "critical" : "high",
      ageDays: late,
      detail: `${String(r.approval_type).replace(/_/g, " ")} raised by ${r.raised_by_id}; two working days is the standard.`,
    });
  }

  // Blocker pre-funding conditions holding up a tranche (doc 07 §7).
  const conditionRows = all<Record<string, unknown>>(
    `SELECT c.*, s.name AS startup_name FROM pre_funding_conditions c
       LEFT JOIN deals d ON d.id = c.deal_id
       LEFT JOIN startups s ON s.id = d.startup_id
      WHERE c.status = 'open' AND c.blocker = 1`,
  );
  for (const r of conditionRows) {
    const name = String(r.startup_name ?? r.deal_id);
    push({
      id: String(r.id),
      entityType: "pre_funding_condition",
      entityId: String(r.id),
      entityLabel: name,
      title: "Blocker condition open: tranche held",
      department: "legal",
      severity: "high",
      ageDays: r.due_date ? ageInDays(String(r.due_date), t) : 0,
      detail: `${name} · ${String(r.condition_text)} · due ${r.due_date || "not set"}.`,
    });
  }

  // Critical due-diligence findings still open (doc 07 §5).
  const findingRows = all<Record<string, unknown>>(
    `SELECT f.*, s.name AS startup_name FROM dd_findings f
       LEFT JOIN deals d ON d.id = f.deal_id
       LEFT JOIN startups s ON s.id = d.startup_id
      WHERE f.status <> 'resolved' AND f.severity IN ('high','critical')`,
  );
  for (const r of findingRows) {
    const name = String(r.startup_name ?? r.deal_id);
    push({
      id: String(r.id),
      entityType: "dd_finding",
      entityId: String(r.id),
      entityLabel: name,
      title: `Due-diligence finding (${r.severity}): ${r.title}`,
      department: "legal",
      severity: r.severity === "critical" ? "critical" : "high",
      detail: `${name} · owner ${r.owner_id} · due ${r.due_date || "not set"}.`,
    });
  }

  // Announcements still waiting on the investor, and drafts whose figures overstate deployment.
  const announcementRows = all<Record<string, unknown>>(
    "SELECT * FROM announcements WHERE status IN ('awaiting_approval','approved') OR mismatch_flag = 1",
  );
  for (const r of announcementRows) {
    const overstated = Number(r.mismatch_flag) === 1;
    push({
      id: String(r.id),
      entityType: "announcement",
      entityId: String(r.id),
      entityLabel: String(r.startup_id),
      title: overstated ? "Announcement figure exceeds verified deployment" : "Announcement awaiting investor approval",
      department: "marketing",
      severity: overstated ? "high" : "medium",
      detail: `${String(r.startup_id)} · announced ${compactINR(Number(r.announced_amount))}, committed ${compactINR(Number(r.committed_amount))}, verified deployed ${compactINR(Number(r.verified_deployed_amount))}.`,
    });
  }

  return out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.ageDays - a.ageDays);
}

/** Totals used by the department dashboards. */
export function departmentSummary(department: string, seasonId?: string): Record<string, number> {
  const t = today();
  // Tasks are season independent unless they point at a startup with an application in the
  // season, so the scope is applied through the startup link when one is supplied.
  const scope = seasonId
    ? { sql: " AND (entity_type <> 'startup' OR entity_id IN (SELECT DISTINCT startup_id FROM applications WHERE season_id = ?))", params: [seasonId] }
    : { sql: "", params: [] as unknown[] };
  const open = scalar<number>(
    `SELECT COUNT(*) AS v FROM tasks WHERE department = ? AND status NOT IN ('done','cancelled')${scope.sql}`,
    department,
    ...scope.params,
  );
  const overdue = scalar<number>(
    `SELECT COUNT(*) AS v FROM tasks WHERE department = ? AND status NOT IN ('done','cancelled') AND due_date < ?${scope.sql}`,
    department,
    t,
    ...scope.params,
  );
  const escalated = scalar<number>(
    `SELECT COUNT(*) AS v FROM tasks WHERE department = ? AND escalation_status = 'escalated'${scope.sql}`,
    department,
    ...scope.params,
  );
  const done = scalar<number>(
    `SELECT COUNT(*) AS v FROM tasks WHERE department = ? AND status = 'done'${scope.sql}`,
    department,
    ...scope.params,
  );
  return { open, overdue, escalated, done };
}

export function totalFeesCollected(): { upfront: number; success: number } {
  return {
    upfront: sum(all<{ paid_amount: number }>("SELECT paid_amount FROM upfront_fees").map((r) => r.paid_amount)),
    success: sum(all<{ collected_amount: number }>("SELECT collected_amount FROM success_fees").map((r) => r.collected_amount)),
  };
}
