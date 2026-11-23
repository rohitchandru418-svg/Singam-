import { all, run } from "../db/client";
import { today } from "../domain/dates";
import { create, getOne, notify, update, type Row } from "./repo";
import { HttpError, type Session } from "./session";
import type { ActionHandler } from "./actions";

/**
 * Investor-side actions.
 *
 * These run for an investor login and are scoped to that investor's own record: the acting
 * session carries `investorId`, and every handler refuses to touch any other investor or any
 * record not circulated to them. The console keeps the authoritative actions; these are the
 * narrow moves an investor is allowed to make from their own workspace.
 */

function ownInvestor(session: Session): string {
  const id = session.actor.investorId;
  if (session.actor.kind !== "investor" || !id) {
    throw new HttpError(403, "Only an investor-side login can run this action");
  }
  return id;
}

/** A match the acting investor may see: theirs, and released for circulation. */
function ownMatch(session: Session, matchId: string): Row {
  const investorId = ownInvestor(session);
  const match = getOne("matches", matchId);
  if (!match || String(match.investor_id) !== investorId) {
    throw new HttpError(404, "Match not found");
  }
  if (!match.approved_for_circulation_by_id || ["suggested", "withdrawn"].includes(String(match.status))) {
    throw new HttpError(403, "This startup has not been shared with you");
  }
  return match;
}

const investorProfileSave: ActionHandler = ({ session, body }) => {
  const investorId = ownInvestor(session);
  // An investor may keep their own thesis and preferences current. Commercial terms that the
  // show sets — grade, status, season allocation, relationship owner — are staff-owned and
  // are silently ignored if supplied.
  const editable = new Set([
    "thesis", "sector_focus", "stage_focus", "geography", "ticket_min", "ticket_max",
    "availability", "expected_decision_timeline", "decision_maker", "authorised_representative",
    "portfolio",
  ]);
  const patch: Row = {};
  for (const [key, value] of Object.entries(body)) {
    if (editable.has(key)) patch[key] = value;
  }
  if (Object.keys(patch).length === 0) throw new HttpError(422, "No editable fields were supplied");
  const updated = update("investors", investorId, patch, session.actor, "Investor updated their own thesis and preferences");
  return { ok: true, message: "Your details are saved", data: { investor: updated } };
};

const investorRespond: ActionHandler = ({ session, body }) => {
  const matchId = String(body.match_id ?? "");
  if (!matchId) throw new HttpError(422, "field match_id is required");
  const match = ownMatch(session, matchId);

  const response = String(body.response ?? "");
  const allowed = ["Ready to Invest", "Ready to Proceed to the Next Stage", "Information Requested", "Pass", "No Response"];
  if (!allowed.includes(response)) {
    throw new HttpError(422, `response must be one of: ${allowed.join(", ")}`);
  }
  if (response === "Pass" && !String(body.pass_reason ?? "").trim()) {
    throw new HttpError(422, "A reason is required when you pass");
  }

  const status =
    response === "Pass" ? "passed"
      : response === "Ready to Invest" ? "advanced"
        : response === "No Response" ? "shared"
          : "responded";

  const record = update(
    "matches",
    matchId,
    {
      status,
      response,
      questions: body.questions ?? match.questions,
      documents_requested: body.documents_requested ?? match.documents_requested,
      indicative_amount: body.indicative_amount !== undefined && body.indicative_amount !== ""
        ? Number(body.indicative_amount)
        : match.indicative_amount,
      pass_reason: response === "Pass" ? String(body.pass_reason) : "",
    },
    session.actor,
    `Investor response recorded: ${response}`,
  );

  notify(
    "investor_relations",
    `Investor response: ${response}`,
    response === "Ready to Invest"
      ? "Confirm amount, terms and conditions. This is not deployed or contractually committed capital."
      : `The investor recorded "${response}" on a circulated startup.`,
    "match",
    matchId,
  );
  return {
    ok: true,
    message:
      response === "Ready to Invest"
        ? "Thank you. Ready to Invest confirms interest in amount and terms; it is not yet committed or deployed capital."
        : `Response recorded: ${response}`,
    data: record,
  };
};

const investorAcknowledgeMinutes: ActionHandler = ({ session, body }) => {
  const investorId = ownInvestor(session);
  const meetingId = String(body.meeting_id ?? "");
  if (!meetingId) throw new HttpError(422, "field meeting_id is required");
  const meeting = getOne("meetings", meetingId);
  if (!meeting || String(meeting.investor_id) !== investorId) throw new HttpError(404, "Meeting not found");
  const updated = update("meetings", meetingId, { minutes_acknowledged: 1 }, session.actor, "Investor acknowledged the minutes");
  return { ok: true, message: "Minutes acknowledged", data: updated };
};

const investorConfirmSlot: ActionHandler = ({ session, body }) => {
  const investorId = ownInvestor(session);
  const slotId = String(body.slot_id ?? "");
  if (!slotId) throw new HttpError(422, "field slot_id is required");
  const slot = getOne("pitch_day_slots", slotId);
  if (!slot || String(slot.investor_id) !== investorId) throw new HttpError(404, "Pitch Day slot not found");

  const outcome = String(body.outcome ?? "one_to_one_held");
  const allowed = ["one_to_one_held", "golden_pass_issued", "follow_on_interest", "no_interest"];
  if (!allowed.includes(outcome)) throw new HttpError(422, `outcome must be one of: ${allowed.join(", ")}`);

  const updated = update(
    "pitch_day_slots",
    slotId,
    { outcome, held: body.held === false ? 0 : 1, notes: body.notes ?? slot.notes },
    session.actor,
    `Investor recorded a Pitch Day slot outcome: ${outcome}`,
  );

  // A Golden Pass is initial interest only. It is recorded as a Golden Pass commitment so it
  // stays distinct from a written commitment, never as confirmed or deployed capital.
  if (outcome === "golden_pass_issued") {
    const pitchDay = getOne("pitch_days", String(slot.pitch_day_id));
    if (pitchDay) {
      const existing = all<Row>(
        "SELECT id FROM commitments WHERE startup_id = ? AND investor_id = ? AND is_golden_pass = 1",
        String(pitchDay.startup_id),
        investorId,
      );
      if (existing.length === 0) {
        create(
          "commitments",
          {
            startup_id: String(pitchDay.startup_id),
            investor_id: investorId,
            status: "golden_pass",
            amount: Number(body.amount ?? 0),
            valuation: String(body.valuation ?? "To be finalised"),
            terms: String(body.terms ?? "Initial interest expressed at Pitch Day."),
            evidence: "Golden Pass recorded by the investor from the investor workspace.",
            is_golden_pass: 1,
          },
          session.actor,
        );
      }
      notify(
        "investor_relations",
        "Golden Pass recorded by an investor",
        "Initial interest only. Follow up to convert it into a written commitment with amount and terms.",
        "pitch_day",
        String(pitchDay.id),
      );
    }
  }
  return { ok: true, message: "Pitch Day outcome recorded", data: updated };
};

const investorConfirmCommitment: ActionHandler = ({ session, body }) => {
  const investorId = ownInvestor(session);
  const id = String(body.commitment_id ?? "");
  if (!id) throw new HttpError(422, "field commitment_id is required");
  const commitment = getOne("commitments", id);
  if (!commitment || String(commitment.investor_id) !== investorId) throw new HttpError(404, "Commitment not found");
  if (String(commitment.status) === "withdrawn") throw new HttpError(409, "A withdrawn commitment cannot be confirmed");

  // Confirming turns a written proposal into a confirmed commitment. It is still not deployed
  // capital: deployment is only ever verified by Finance against a tranche.
  const record = update(
    "commitments",
    id,
    {
      status: "confirmed",
      confirmed_on: today(),
      evidence: body.evidence ?? commitment.evidence,
    },
    session.actor,
    "Investor confirmed the written commitment",
  );
  notify(
    "investor_relations",
    "Investor confirmed a written commitment",
    "A written commitment is now confirmed. It is not deployed capital until Finance verifies a tranche.",
    "commitment",
    id,
  );
  return {
    ok: true,
    message: "Commitment confirmed. Deployment is verified separately by Finance once funds move.",
    data: record,
  };
};

const investorReportTransfer: ActionHandler = ({ session, body }) => {
  const investorId = ownInvestor(session);
  const trancheId = String(body.tranche_id ?? "");
  if (!trancheId) throw new HttpError(422, "field tranche_id is required");
  const tranche = getOne("tranches", trancheId);
  if (!tranche) throw new HttpError(404, "Tranche not found");
  const deal = getOne("deals", String(tranche.deal_id));
  if (!deal || String(deal.investor_id) !== investorId) throw new HttpError(404, "Tranche not found");

  const amount = Number(body.reported_amount ?? tranche.scheduled_amount ?? 0);
  if (!(amount > 0)) throw new HttpError(422, "reported_amount must be greater than zero");

  // An investor-reported transfer is a report, not verified deployment. Finance verifies the
  // receipt and sets the verified amount; this only records what the investor says it sent.
  const record = update(
    "tranches",
    trancheId,
    {
      reported_on: today(),
      reported_amount: amount,
      status: "reported",
      evidence: body.evidence ?? tranche.evidence ?? "",
    },
    session.actor,
    "Investor reported a transfer; awaiting Finance verification",
  );
  notify(
    "finance",
    "Investor reported a fund transfer",
    `Verify the receipt for tranche ${String(tranche.seq)} of the deal before recording verified deployment.`,
    "deal",
    String(deal.id),
  );
  return {
    ok: true,
    message: "Transfer reported to Finance. Deployment is recorded only after Finance verifies the receipt.",
    data: record,
  };
};

const investorWithdrawCommitment: ActionHandler = ({ session, body }) => {
  const investorId = ownInvestor(session);
  const id = String(body.commitment_id ?? "");
  if (!id) throw new HttpError(422, "field commitment_id is required");
  const commitment = getOne("commitments", id);
  if (!commitment || String(commitment.investor_id) !== investorId) throw new HttpError(404, "Commitment not found");
  const reason = String(body.reason ?? "").trim();
  if (!reason) throw new HttpError(422, "A reason is required to withdraw a commitment");
  const record = update(
    "commitments",
    id,
    { status: "withdrawn", revision_reason: reason },
    session.actor,
    "Investor withdrew the commitment",
  );
  notify("investor_relations", "Investor withdrew a commitment", reason.slice(0, 160), "commitment", id);
  return { ok: true, message: "Commitment withdrawn with the reason recorded", data: record };
};

/** Mark the investor's own unread notices as read. */
const investorReadNotices: ActionHandler = ({ session }) => {
  const investorId = ownInvestor(session);
  run("UPDATE notifications SET read_at = ? WHERE recipient_id = ? AND read_at IS NULL", today(), session.actor.id);
  return { ok: true, message: "Notices cleared", data: { investor_id: investorId } };
};

export const ACTIONS_E: Record<string, ActionHandler> = {
  "investor_side.profile_save": investorProfileSave,
  "investor_side.respond": investorRespond,
  "investor_side.acknowledge_minutes": investorAcknowledgeMinutes,
  "investor_side.confirm_slot": investorConfirmSlot,
  "investor_side.confirm_commitment": investorConfirmCommitment,
  "investor_side.report_transfer": investorReportTransfer,
  "investor_side.withdraw_commitment": investorWithdrawCommitment,
  "investor_side.read_notices": investorReadNotices,
};
