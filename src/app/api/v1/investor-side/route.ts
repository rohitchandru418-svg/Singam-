import { fail, ok, readBody } from "@/lib/server/api";
import { all, get, run } from "@/lib/db/client";
import { getOne, type Row } from "@/lib/server/repo";
import { actorFromRequest, HttpError, type Session } from "@/lib/server/session";
import { INVESTOR_JOURNEY } from "@/lib/domain/workflows";

export const dynamic = "force-dynamic";

/**
 * The investor side.
 *
 * One endpoint serves an investor's whole view. Every row is read with the session's
 * `investorId`, so an investor can never see another investor's record, and only the
 * startups Investor Relations has approved for circulation to them are ever included.
 * Internal scores, staff remarks, other investors' identities and other investors' terms
 * never leave the console.
 */

function requireInvestor(request: Request): Session {
  const session = actorFromRequest(request);
  if (session.actor.kind !== "investor") {
    throw new HttpError(403, "This endpoint is only available to an investor-side login");
  }
  return session;
}

/**
 * An investor login that has not yet been linked to a record (a brand-new sign-up, or a
 * record deleted underneath it) gets a valid but empty shape rather than a 403, so the
 * portal renders a clear "not linked yet" step instead of a broken page.
 */
function emptyWorkspace(session: Session) {
  return {
    investor: null,
    agreements: [],
    opportunities: [],
    pitches: [],
    pitchDaySlots: [],
    commitments: [],
    deals: [],
    documents: [],
    tasks: [],
    notices: all<Row>(
      "SELECT id, title, body, created_at FROM notifications WHERE recipient_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 10",
      session.actor.id,
    ),
    journey: { steps: [], currentKey: null, currentLabel: "" },
    summary: {
      verified: false,
      onboarded: false,
      allocation: 0,
      maxPerStartup: 0,
      commitmentConfirmed: false,
      committed: 0,
      committedCount: 0,
      deployed: 0,
      available: 0,
      openOpportunities: 0,
    },
  };
}

export async function GET(request: Request) {
  try {
    const session = requireInvestor(request);
    if (!session.actor.investorId) return ok(emptyWorkspace(session));
    const investorId = session.actor.investorId as string;
    const investor = getOne("investors", investorId);
    if (!investor) return ok(emptyWorkspace(session));

    // The investor's own record, with the relationship owner named for context.
    const owner = investor.relationship_owner_id
      ? get<{ name: string }>("SELECT name FROM users WHERE id = ?", String(investor.relationship_owner_id))
      : undefined;

    const agreements = all<Row>(
      "SELECT id, document_type, status, signed_on, reference, notes FROM investor_agreements WHERE investor_id = ? ORDER BY document_type",
      investorId,
    );

    // The investor's L1-L4 grade is internal (00_Master_Brief §9, §11.3; doc 02 §7 "grade is
    // internal; strip from every API response used by this portal"). It is never queried here,
    // so it cannot leak into this response.

    // Only matches Investor Relations has released to the investor, and only while the
    // conversation is live — a withdrawn match stays in the console's history, not here.
    const matches = all<Row>(
      `SELECT m.*, s.name AS startup_name, s.sector AS startup_sector, s.stage AS startup_stage,
              s.geography AS startup_geography, s.pitch AS startup_pitch,
              s.target_fundraise AS startup_target, s.logo_ref AS startup_logo
         FROM matches m JOIN startups s ON s.id = m.startup_id
        WHERE m.investor_id = ?
          AND m.approved_for_circulation_by_id IS NOT NULL
          AND m.status NOT IN ('suggested','withdrawn')
        ORDER BY m.score DESC, s.name`,
      investorId,
    );

    const meetings = all<Row>(
      `SELECT id, startup_id, meeting_type, scheduled_at, held_at, minutes, minutes_acknowledged
         FROM meetings WHERE investor_id = ? ORDER BY scheduled_at DESC`,
      investorId,
    );

    const pitches = all<Row>(
      `SELECT v.*, s.name AS startup_name FROM virtual_pitches v
         JOIN startups s ON s.id = v.startup_id
        WHERE v.investor_id = ? ORDER BY v.scheduled_at DESC`,
      investorId,
    );

    const pitchDaySlots = all<Row>(
      `SELECT ps.*, pd.episode_no, pd.scheduled_at AS pitch_day_on, s.name AS startup_name
         FROM pitch_day_slots ps
         JOIN pitch_days pd ON pd.id = ps.pitch_day_id
         JOIN startups s ON s.id = pd.startup_id
        WHERE ps.investor_id = ? ORDER BY pd.scheduled_at DESC`,
      investorId,
    );

    // The investor's own commitments only, with the startup they concern. This investor's
    // own terms are visible; other investors' commitments on the same startup are not.
    const commitments = all<Row>(
      `SELECT c.*, s.name AS startup_name FROM commitments c
         JOIN startups s ON s.id = c.startup_id
        WHERE c.investor_id = ? ORDER BY c.written_on DESC, c.created_at DESC`,
      investorId,
    );

    // Deals this investor is party to, with the tranches it has funded. Another investor's
    // deal on the same startup never appears.
    const deals = all<Row>(
      `SELECT d.*, s.name AS startup_name, fr.name AS round_name, fr.target_amount AS round_target,
              u.name AS owner_name
         FROM deals d
         JOIN startups s ON s.id = d.startup_id
         LEFT JOIN funding_rounds fr ON fr.id = d.funding_round_id
         LEFT JOIN users u ON u.id = d.responsible_id
        WHERE d.investor_id = ? ORDER BY d.created_at DESC`,
      investorId,
    );
    const dealIds = deals.map((d) => String(d.id));
    const inList = (ids: string[]) => (ids.length ? `(${ids.map(() => "?").join(", ")})` : "(NULL)");
    const tranches = dealIds.length
      ? all<Row>(`SELECT * FROM tranches WHERE deal_id IN ${inList(dealIds)} ORDER BY seq`, ...dealIds)
      : [];
    const tranchesByDeal = new Map<string, Row[]>();
    for (const t of tranches) {
      const key = String(t.deal_id);
      const list = tranchesByDeal.get(key) ?? [];
      list.push(t);
      tranchesByDeal.set(key, list);
    }

    const documents = all<Row>(
      `SELECT id, title, purpose, category, version, status, file_ref, uploaded_on
         FROM documents WHERE entity_type = 'investor' AND entity_id = ? ORDER BY uploaded_on DESC`,
      investorId,
    );

    const openTasks = all<Row>(
      `SELECT id, title, required_output, due_date, status, next_action FROM tasks
        WHERE entity_type = 'investor' AND entity_id = ? AND status NOT IN ('completed','done','cancelled')
        ORDER BY due_date`,
      investorId,
    );

    // Totals the investor may see: their own committed capital and verified deployment.
    const committed = commitments
      .filter((c) => ["confirmed", "shoot_day_confirmed"].includes(String(c.status)))
      .reduce((s, c) => s + Number(c.amount ?? 0), 0);
    const committedCount = commitments.filter((c) =>
      ["confirmed", "shoot_day_confirmed"].includes(String(c.status)),
    ).length;
    const deployed = tranches
      .filter((t) => ["verified", "part_verified"].includes(String(t.status)))
      .reduce((s, t) => s + Number(t.verified_amount ?? 0), 0);

    const agreementsSigned = agreements.length > 0 && agreements.every((a) => String(a.status) === "verified");

    const journey = investorJourney({
      status: String(investor.status),
      // Whether a grade exists is a status fact the investor may know; the L1-L4 value is not.
      graded: Boolean(investor.grade),
      agreementsSigned,
      matchCount: matches.length,
      pitchCount: pitches.length,
      pitchDayCount: pitchDaySlots.length,
      commitmentCount: commitments.length,
      confirmedCount: commitments.filter((c) =>
        ["confirmed", "shoot_day_confirmed"].includes(String(c.status)),
      ).length,
      dealCount: deals.length,
    });

    const notices = all<Row>(
      "SELECT id, title, body, created_at FROM notifications WHERE recipient_id = ? AND read_at IS NULL ORDER BY created_at DESC LIMIT 10",
      session.actor.id,
    );

    return ok({
      investor: {
        id: String(investor.id),
        name: String(investor.name),
        category: String(investor.category ?? ""),
        investing_entity: String(investor.investing_entity ?? ""),
        source: String(investor.source ?? ""),
        referral_relationship: String(investor.referral_relationship ?? ""),
        decision_maker: String(investor.decision_maker ?? ""),
        authorised_representative: String(investor.authorised_representative ?? ""),
        sector_focus: String(investor.sector_focus ?? ""),
        stage_focus: String(investor.stage_focus ?? ""),
        geography: String(investor.geography ?? ""),
        thesis: String(investor.thesis ?? ""),
        ticket_min: Number(investor.ticket_min ?? 0),
        ticket_max: Number(investor.ticket_max ?? 0),
        proposed_season_allocation: Number(investor.proposed_season_allocation ?? 0),
        max_per_startup: Number(investor.max_per_startup ?? 0),
        season_commitment_confirmed: Number(investor.season_commitment_confirmed ?? 0),
        portfolio: String(investor.portfolio ?? ""),
        reference_checks: String(investor.reference_checks ?? ""),
        verification_evidence: String(investor.verification_evidence ?? ""),
        availability: String(investor.availability ?? ""),
        expected_decision_timeline: String(investor.expected_decision_timeline ?? ""),
        status: String(investor.status ?? ""),
        relationship_owner: owner?.name ?? "",
      },
      agreements: agreements.map((a) => ({
        id: String(a.id),
        document_type: String(a.document_type),
        status: String(a.status),
        signed_on: a.signed_on ? String(a.signed_on) : null,
        reference: String(a.reference ?? ""),
        notes: String(a.notes ?? ""),
      })),
      opportunities: matches.map((m) => {
        const startupId = String(m.startup_id);
        return {
          matchId: String(m.id),
          startupId,
          startupName: String(m.startup_name),
          sector: String(m.startup_sector ?? ""),
          stage: String(m.startup_stage ?? ""),
          geography: String(m.startup_geography ?? ""),
          pitch: String(m.startup_pitch ?? ""),
          targetFundraise: Number(m.startup_target ?? 0),
          logo: String(m.startup_logo ?? ""),
          status: String(m.status),
          // The match percentage the brief asks for on each match card (doc 02 §5). It is the
          // pairing score, not the investor's internal grade.
          matchPct: Number(m.match_pct ?? 0) || Number(m.score ?? 0),
          information_shared: String(m.information_shared ?? ""),
          info_version: String(m.info_version ?? ""),
          shared_on: m.shared_on ? String(m.shared_on) : null,
          response: String(m.response ?? ""),
          questions: String(m.questions ?? ""),
          documents_requested: String(m.documents_requested ?? ""),
          indicative_amount: Number(m.indicative_amount ?? 0),
          next_action: String(m.next_action ?? ""),
          next_action_due: m.next_action_due ? String(m.next_action_due) : null,
          meetings: meetings
            .filter((mt) => String(mt.startup_id) === startupId)
            .map((mt) => ({
              id: String(mt.id),
              meeting_type: String(mt.meeting_type),
              scheduled_at: String(mt.scheduled_at ?? ""),
              held_at: mt.held_at ? String(mt.held_at) : null,
              minutes: String(mt.minutes ?? ""),
              minutes_acknowledged: Number(mt.minutes_acknowledged ?? 0),
            })),
        };
      }),
      pitches: pitches.map((p) => ({
        id: String(p.id),
        startupName: String(p.startup_name),
        scheduled_at: String(p.scheduled_at ?? ""),
        duration_pitch_min: Number(p.duration_pitch_min ?? 0),
        duration_qa_min: Number(p.duration_qa_min ?? 0),
        attended: Number(p.attended ?? 0),
        material_shared: String(p.material_shared ?? ""),
        investor_questions: String(p.investor_questions ?? ""),
        responses: String(p.responses ?? ""),
        response: String(p.response ?? ""),
        amount_confirmed: Number(p.amount_confirmed ?? 0),
        terms_confirmed: String(p.terms_confirmed ?? ""),
      })),
      pitchDaySlots: pitchDaySlots.map((s) => ({
        id: String(s.id),
        startupName: String(s.startup_name),
        episode_no: String(s.episode_no ?? ""),
        pitch_day_on: String(s.pitch_day_on ?? ""),
        slot_time: String(s.slot_time ?? ""),
        held: Number(s.held ?? 0),
        outcome: String(s.outcome ?? ""),
        notes: String(s.notes ?? ""),
      })),
      commitments: commitments.map((c) => ({
        id: String(c.id),
        startupName: String(c.startup_name),
        status: String(c.status),
        amount: Number(c.amount ?? 0),
        valuation: String(c.valuation ?? ""),
        terms: String(c.terms ?? ""),
        evidence: String(c.evidence ?? ""),
        is_golden_pass: Number(c.is_golden_pass ?? 0),
        written_on: c.written_on ? String(c.written_on) : null,
        confirmed_on: c.confirmed_on ? String(c.confirmed_on) : null,
        revision_reason: String(c.revision_reason ?? ""),
      })),
      deals: deals.map((d) => ({
        id: String(d.id),
        startupName: String(d.startup_name),
        round_name: String(d.round_name ?? ""),
        status: String(d.status),
        committed_amount: Number(d.committed_amount ?? 0),
        valuation: String(d.valuation ?? ""),
        agreed_terms: String(d.agreed_terms ?? ""),
        owner_name: String(d.owner_name ?? ""),
        communication_thread_opened_at: d.communication_thread_opened_at
          ? String(d.communication_thread_opened_at)
          : null,
        next_action: String(d.next_action ?? ""),
        open_conditions: String(d.open_conditions ?? ""),
        blocker: String(d.blocker ?? ""),
        tranches: (tranchesByDeal.get(String(d.id)) ?? []).map((t) => ({
          id: String(t.id),
          seq: Number(t.seq ?? 0),
          scheduled_amount: Number(t.scheduled_amount ?? 0),
          scheduled_on: t.scheduled_on ? String(t.scheduled_on) : null,
          reported_amount: Number(t.reported_amount ?? 0),
          verified_amount: Number(t.verified_amount ?? 0),
          verified_on: t.verified_on ? String(t.verified_on) : null,
          status: String(t.status ?? ""),
          reversal_reason: String(t.reversal_reason ?? ""),
        })),
      })),
      documents: documents.map((d) => ({
        id: String(d.id),
        title: String(d.title),
        purpose: String(d.purpose ?? ""),
        category: String(d.category ?? ""),
        version: String(d.version ?? ""),
        status: String(d.status ?? ""),
        file_ref: String(d.file_ref ?? ""),
        uploaded_on: d.uploaded_on ? String(d.uploaded_on) : null,
      })),
      tasks: openTasks,
      notices,
      journey,
      summary: {
        verified: ["verified", "agreement_pending", "onboarded"].includes(String(investor.status)),
        onboarded: String(investor.status) === "onboarded",
        allocation: Number(investor.proposed_season_allocation ?? 0),
        maxPerStartup: Number(investor.max_per_startup ?? 0),
        commitmentConfirmed: Number(investor.season_commitment_confirmed ?? 0) === 1,
        committed,
        committedCount,
        deployed,
        // The season meter the brief asks for on every screen: available = allocation - committed,
        // and deployed counts verified tranches only (00_Master_Brief §11.3; doc 02 §3, §7).
        available: Math.max(0, Number(investor.proposed_season_allocation ?? 0) - committed),
        openOpportunities: matches.filter((m) => !["passed", "withdrawn"].includes(String(m.status))).length,
      },
    });
  } catch (error) {
    return fail(error);
  }
}

/**
 * Record that an investor opened an Investment Readiness Report.
 *
 * The report is view-only and cannot be downloaded (00_Master_Brief §9; doc 02 §5), so the
 * only durable trace of "the investor has seen it" is this view log. Logging is best-effort:
 * a failure here must never stop the investor from reading their own report.
 */
export async function POST(request: Request) {
  try {
    const session = requireInvestor(request);
    if (!session.actor.investorId) throw new HttpError(403, "No investor record is linked to this login");
    const body = await readBody(request);
    const matchId = typeof body.matchId === "string" ? body.matchId : "";
    if (!matchId) throw new HttpError(400, "matchId is required");

    // The match must belong to this investor, so one investor cannot log a view against another.
    const match = get<Row>(
      "SELECT * FROM matches WHERE id = ? AND investor_id = ?",
      matchId,
      session.actor.investorId,
    );
    if (!match) throw new HttpError(404, "No such match for this investor");

    const report = get<Row>(
      "SELECT id, version FROM irr_reports WHERE application_id = (SELECT id FROM applications WHERE startup_id = ?) ORDER BY version DESC LIMIT 1",
      String(match.startup_id),
    );
    if (!report) throw new HttpError(404, "No Investment Readiness Report is available yet");

    const viewedAt = new Date().toISOString();
    run(
      `INSERT INTO irr_views (id, irr_report_id, startup_id, investor_id, match_id, version, viewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      `IV-${matchId}-${Date.now().toString(36)}`,
      String(report.id),
      String(match.startup_id),
      session.actor.investorId,
      matchId,
      Number(report.version ?? 1),
      viewedAt,
    );
    return ok({ viewedAt, version: Number(report.version ?? 1) });
  } catch (error) {
    return fail(error);
  }
}

interface InvestorJourneyInput {
  status: string;
  /** Whether the investor has been graded. The grade value itself is internal and not passed. */
  graded: boolean;
  agreementsSigned: boolean;
  matchCount: number;
  pitchCount: number;
  pitchDayCount: number;
  commitmentCount: number;
  confirmedCount: number;
  dealCount: number;
}

interface JourneyStep {
  key: string;
  label: string;
  status: "done" | "current" | "pending";
  detail: string;
  owner: string;
}

/**
 * The investor's own view of the 12-stage investor journey, using the same stage list the
 * console shows but reporting only what this investor may see.
 */
function investorJourney(input: InvestorJourneyInput) {
  const steps: JourneyStep[] = [];
  const push = (key: string, status: JourneyStep["status"], detail: string, owner: string) => {
    const def = INVESTOR_JOURNEY.find((s) => s.key === key);
    steps.push({ key, label: def?.label ?? key, status, detail, owner });
  };
  const state = (done: boolean, started: boolean): JourneyStep["status"] => (done ? "done" : started ? "current" : "pending");

  const sourced = input.status !== "";
  const discussed = ["exploratory", "verification_pending", "verified", "agreement_pending", "onboarded"].includes(input.status);
  const graded = input.graded;
  const matched = input.matchCount > 0;
  const pitched = input.pitchCount > 0;
  const pitchDay = input.pitchDayCount > 0;
  const committed = input.commitmentCount > 0;
  const confirmed = input.confirmedCount > 0;
  const closed = input.dealCount > 0;

  push("investor_sourcing", state(sourced, false), "Your record with source and relationship owner", "Investor Relations");
  push("exploratory_discussion", state(discussed, sourced), discussed ? "Thesis, ticket size and availability captured" : "Not yet held", "Investor Relations");
  push("verification_agreement", state(input.agreementsSigned, discussed), input.agreementsSigned ? "Participation and confidentiality documents signed" : "Awaiting verification and signatures", "Investor Relations");
  push("investor_grading", state(graded, input.agreementsSigned), graded ? "Verification complete" : "Awaiting verification", "Investor Relations");
  push("thesis_mapping", state(matched, graded), matched ? `${input.matchCount} startup${input.matchCount === 1 ? "" : "s"} mapped to your thesis` : "Awaiting matching", "Investor Relations");
  push("investor_analyst_evaluation", state(matched, graded), matched ? "Startups circulated with the analyst view" : "Follows matching", "Analyst");
  push("virtual_pitch_inv", state(pitched, matched), pitched ? `${input.pitchCount} virtual pitch${input.pitchCount === 1 ? "" : "es"}` : "Not yet scheduled", "Investor Relations");
  push("pitch_day_inv", state(pitchDay, pitched), pitchDay ? "One-to-one slots at Pitch Day" : "Follows the virtual pitch", "Investor Relations");
  push("golden_pass_followon", state(confirmed, committed), committed ? "Interest recorded" : "Follows Pitch Day", "Investor Relations");
  push("selection_coordination", state(confirmed, committed), confirmed ? "Selection coordination with the committee" : "Awaiting the committee", "Management");
  push("preshoot_confirmation", state(confirmed, committed), confirmed ? "Panel and commitment confirmation" : "Before the shoot", "Investor Relations");
  push("shoot_day_confirmation", state(closed, confirmed), closed ? "Deal confirmed and funded per the agreement" : "On the shoot day", "Investor Relations");

  const firstCurrent = steps.findIndex((s) => s.status === "current");
  // Several gates can be true at once (for example a commitment without a confirmed one), so
  // only the frontier step is "current"; anything after it is still pending.
  if (firstCurrent >= 0) {
    for (let i = firstCurrent + 1; i < steps.length; i += 1) {
      if (steps[i].status === "current") steps[i].status = "pending";
    }
  }
  const current = firstCurrent >= 0 ? steps[firstCurrent] : steps.find((s) => s.status === "pending") ?? steps[steps.length - 1];
  return { steps, currentKey: current?.key ?? null, currentLabel: current?.label ?? "" };
}
