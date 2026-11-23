import { all, get, run } from "../db/client";
import { addDays, financialYearFor, nowISO, today } from "../domain/dates";
import { calculateSuccessFee, upfrontFeeFor, UPFRONT_FEE_SCHEDULE } from "../domain/policies";
import { DOCUMENT_PURPOSE_MAP } from "../domain/documents";
import { create, getOne, nextId, notify, notifyFounder, update, type Actor, type Row } from "./repo";
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

function policyValue<T>(code: string): T {
  const row = get<{ value: string }>("SELECT value FROM policies WHERE code = ?", code);
  if (!row) throw new HttpError(500, `policy ${code} not found`);
  return JSON.parse(row.value) as T;
}

/* ================================================================== */
/* Finance: upfront fee                                                */
/* ================================================================== */

const upfrontInitiate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const committeeId = body.committee_decision_id ? String(body.committee_decision_id) : null;
  const decision = committeeId ? getOne("committee_decisions", committeeId) : null;
  if (decision && decision.outcome !== "proceed") {
    throw new HttpError(409, "The upfront fee workflow starts only from a Proceed committee decision");
  }

  const announced = body.initial_interest_announced_on ? String(body.initial_interest_announced_on) : today();
  const turnover = Number(body.turnover ?? 0);
  const policy = policyValue<{ scheduleCode: string; paymentDaysFromAnnouncement: number; basis: string }>("POL-UPFRONT-FEE");
  const schedule = UPFRONT_FEE_SCHEDULE[policy.scheduleCode];
  const feeAmount = upfrontFeeFor(turnover, policy.scheduleCode);
  const dueDate = addDays(announced, policy.paymentDaysFromAnnouncement ?? 15);

  const record = create(
    "upfront_fees",
    {
      startup_id: startupId,
      season_id: body.season_id ?? session.seasonId,
      committee_decision_id: committeeId,
      initial_interest_announced_on: announced,
      financial_year: body.financial_year ?? financialYearFor(announced),
      turnover,
      turnover_evidence: body.turnover_evidence ?? "",
      fee_schedule_code: policy.scheduleCode,
      fee_schedule_version: schedule?.version ?? "",
      fee_amount: feeAmount,
      outstanding: feeAmount,
      due_date: dueDate,
      status: feeAmount > 0 ? "under_calculation" : "not_initiated",
    },
    a,
  );

  notify(
    "production",
    "Advance notification: selection and fee initiation recorded",
    "Production is notified in advance. The AV shoot handover follows completed payment only.",
    "startup",
    startupId,
  );

  return {
    ok: true,
    message: `Upfront fee calculated from turnover on schedule ${policy.scheduleCode} (${schedule?.version ?? "?"}); payment due ${dueDate} (${policy.paymentDaysFromAnnouncement} days from announcement).`,
    data: record,
  };
};

const upfrontApprove: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  if (a.role !== "management" && a.role !== "admin") {
    throw new HttpError(403, "Fee approval requires Management or Administrator");
  }
  const id = requireString(body, "fee_id");
  const exception = body.approved_exception ?? "";
  // An approval without an explicit override keeps the calculated amount; writing `undefined`
  // through the sanitiser would store NULL and break the NOT NULL column.
  const patch: Row = {
    approved_exception: exception,
    approved_by_id: a.id,
    status: "invoiced",
  };
  if (body.fee_amount !== undefined) {
    const overrideAmount = Number(body.fee_amount);
    patch.fee_amount = overrideAmount;
    patch.outstanding = overrideAmount;
  }

  const record = update("upfront_fees", id, patch, a, "Applicable fee approved");
  return { ok: true, message: "Fee approved and the invoice is ready to issue", data: record };
};

const upfrontInvoice: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "fee_id");
  const fee = getOne("upfront_fees", id);
  if (!fee) throw new HttpError(404, "Upfront fee not found");
  if (Number(fee.fee_amount) <= 0) throw new HttpError(409, "The fee must be approved before an invoice is issued");

  const invoiceNo = String(body.invoice_no ?? `INV-UP-${Date.now().toString().slice(-6)}`);
  const record = update(
    "upfront_fees",
    id,
    {
      invoice_no: invoiceNo,
      invoice_date: today(),
      due_date: body.due_date ?? fee.due_date ?? addDays(today(), 15),
      status: "invoiced",
    },
    a,
    "Invoice issued",
  );

  run(
    `INSERT INTO ledger_entries (id, startup_id, season_id, entry_type, reference, amount, currency, occurred_on,
      source_type, source_id, memo, created_by_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    nextId({ key: "ledger_entries", table: "ledger_entries", label: "x", plural: "x", module: "x", searchable: [], orderBy: "id" }),
    String(fee.startup_id),
    String(fee.season_id ?? a.seasonId ?? ""),
    "upfront_charge",
    invoiceNo,
    Number(fee.fee_amount),
    "INR",
    today(),
    "upfront_fee",
    id,
    "Turnover-based upfront fee invoice raised",
    a.id,
    nowISO(),
  );

  const startup = getOne("startups", String(fee.startup_id));
  notify("startup_relationships", `Upfront fee invoice issued for ${startup?.name ?? fee.startup_id}`, `Invoice ${invoiceNo}; the founder has been notified.`, "upfront_fee", id);
  notifyFounder(
    String(fee.startup_id),
    "Your programme fee invoice is ready",
    `Invoice ${invoiceNo} is ready for your programme fee. Please pay within the stated window; the AV shoot handover follows completed payment.`,
    "upfront_fee",
    id,
  );

  return { ok: true, message: `Invoice ${invoiceNo} issued and the founder notified`, data: record };
};

const upfrontRecordReceipt: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "fee_id");
  const fee = getOne("upfront_fees", id);
  if (!fee) throw new HttpError(404, "Upfront fee not found");

  const amount = Number(body.amount ?? 0);
  if (amount <= 0) throw new HttpError(422, "Receipt amount must be positive");

  // A payment screenshot never marks an invoice paid; Finance verifies and allocates the receipt.
  if (body.verified === false) {
    throw new HttpError(422, "Finance must verify the receipt before it is allocated against the invoice");
  }

  const paid = Number(fee.paid_amount) + amount;
  const feeAmount = Number(fee.fee_amount) - Number(fee.waiver_amount ?? 0);
  const outstanding = Math.max(0, feeAmount - paid);
  const status = outstanding === 0 ? "paid" : paid > 0 ? "part_paid" : String(fee.status);

  const record = update(
    "upfront_fees",
    id,
    {
      paid_amount: paid,
      outstanding,
      payment_reference: body.payment_reference ?? fee.payment_reference,
      status,
    },
    a,
    "Receipt verified and allocated",
  );

  run(
    `INSERT INTO ledger_entries (id, startup_id, season_id, entry_type, reference, amount, currency, occurred_on,
      source_type, source_id, memo, created_by_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    nextId({ key: "ledger_entries", table: "ledger_entries", label: "x", plural: "x", module: "x", searchable: [], orderBy: "id" }),
    String(fee.startup_id),
    String(fee.season_id ?? a.seasonId ?? ""),
    "receipt",
    String(body.payment_reference ?? fee.invoice_no),
    -amount,
    "INR",
    today(),
    "upfront_fee",
    id,
    "Verified receipt allocated against the upfront fee invoice",
    a.id,
    nowISO(),
  );

  if (outstanding === 0) {
    const handover = get<Row>(
      "SELECT * FROM production_handovers WHERE startup_id = ? AND season_id = ?",
      fee.startup_id,
      fee.season_id,
    );
    if (handover) {
      update("production_handovers", String(handover.id), { payment_cleared: 1 }, a, "Payment clearance recorded");
    }
    notify("production", "Upfront fee fully paid; AV shoot handover may proceed", `Startup ${fee.startup_id} is cleared for the AV shoot handover.`, "upfront_fee", id);
  }

  return { ok: true, message: outstanding === 0 ? "Payment complete; production clearance updated" : `Part payment recorded; ${outstanding} paise outstanding`, data: record };
};

const upfrontExtension: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  if (a.role !== "management" && a.role !== "admin") {
    throw new HttpError(403, "Extension approval requires Management or Administrator");
  }
  const id = requireString(body, "fee_id");
  const fee = getOne("upfront_fees", id);
  if (!fee) throw new HttpError(404, "Upfront fee not found");

  const record = update(
    "upfront_fees",
    id,
    {
      extension_approved: 1,
      original_due_date: fee.original_due_date ?? fee.due_date,
      due_date: body.new_due_date ?? addDays(String(fee.due_date ?? today()), 15),
      late_payment_reason: body.late_payment_reason ?? fee.late_payment_reason,
      management_decision: body.management_decision ?? "Extension approved.",
      status: "extension_approved",
    },
    a,
    "Extension approved; the original due date is preserved for ageing",
  );
  return { ok: true, message: "Extension approved; the original due date is preserved", data: record };
};

const upfrontWaive: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  if (a.role !== "management" && a.role !== "admin") throw new HttpError(403, "Waivers require Management or Administrator");
  const id = requireString(body, "fee_id");
  const fee = getOne("upfront_fees", id);
  if (!fee) throw new HttpError(404, "Upfront fee not found");
  const waiver = Number(body.amount ?? 0);
  const record = update(
    "upfront_fees",
    id,
    {
      waiver_amount: waiver,
      outstanding: Math.max(0, Number(fee.fee_amount) - waiver - Number(fee.paid_amount)),
      management_decision: requireString(body, "reason"),
      status: "waived",
    },
    a,
    "Waiver approved with a recorded reason",
  );
  return { ok: true, message: "Waiver recorded", data: record };
};

const upfrontDispute: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "fee_id");
  return {
    ok: true,
    message: "Dispute recorded",
    data: update("upfront_fees", id, { status: "disputed", dispute_note: requireString(body, "reason") }, a, "Dispute raised"),
  };
};

const upfrontRefund: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  if (a.role !== "management" && a.role !== "admin") throw new HttpError(403, "Refunds require Management or Administrator");
  const id = requireString(body, "fee_id");
  const fee = getOne("upfront_fees", id);
  if (!fee) throw new HttpError(404, "Upfront fee not found");
  const amount = Number(body.amount ?? 0);
  const record = update(
    "upfront_fees",
    id,
    { refund_amount: amount, credit_note_ref: body.credit_note_ref ?? "", status: "refunded" },
    a,
    "Refund processed with a credit note",
  );
  run(
    `INSERT INTO ledger_entries (id, startup_id, season_id, entry_type, reference, amount, currency, occurred_on,
      source_type, source_id, memo, created_by_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    nextId({ key: "ledger_entries", table: "ledger_entries", label: "x", plural: "x", module: "x", searchable: [], orderBy: "id" }),
    String(fee.startup_id),
    String(fee.season_id ?? a.seasonId ?? ""),
    "refund",
    String(body.credit_note_ref ?? fee.invoice_no),
    amount,
    "INR",
    today(),
    "upfront_fee",
    id,
    "Refund raised against the upfront fee",
    a.id,
    nowISO(),
  );
  return { ok: true, message: "Refund recorded", data: record };
};

/* ================================================================== */
/* Deal closure and deployment                                         */
/* ================================================================== */

const dealOpen: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const startupId = requireString(body, "startup_id");
  const investorId = requireString(body, "investor_id");
  const roundName = String(body.round_name ?? `${startupId} show round`);

  const round = create(
    "funding_rounds",
    {
      startup_id: startupId,
      name: roundName,
      target_amount: Number(body.target_amount ?? 0),
      status: "deal_confirmed",
      closure_owner_id: body.closure_owner_id ?? a.id,
      expected_close_on: body.expected_close_on ?? addDays(today(), 60),
    },
    a,
  );

  const deal = create(
    "deals",
    {
      funding_round_id: String(round.id),
      startup_id: startupId,
      investor_id: investorId,
      commitment_id: body.commitment_id ?? null,
      status: "communication_thread",
      committed_amount: Number(body.committed_amount ?? 0),
      agreed_terms: body.agreed_terms ?? "",
      valuation: body.valuation ?? "",
      communication_thread_opened_at: nowISO(),
      communication_thread_due: addDays(today(), 2),
      responsible_id: body.responsible_id ?? a.id,
      next_action: "Open the communication thread and agree milestone dates",
    },
    a,
  );

  // The IR SOP requires the communication thread within 48 hours of the discussion or the
  // show. It is a tracked task, so the deadline is not left to somebody's memory.
  const threadDue = addDays(today(), 2);
  create(
    "tasks",
    {
      title: `Open the 48-hour communication thread for ${startupId}`,
      description: "IR SOP: the communication thread must open within 48 hours of the investor discussion or the show.",
      department: "investor_relations",
      module: "deals",
      entity_type: "deal",
      entity_id: String(deal.id),
      owner_id: body.closure_owner_id ?? a.id,
      due_date: threadDue,
      required_output: "Communication thread opened with the investor and the founder",
      evidence: "Thread reference",
      approver_id: body.approver_id ?? null,
      next_action: "Post the first update on the thread",
      status: "open",
      priority: "high",
    },
    a,
  );
  update("deals", String(deal.id), { communication_thread_due: threadDue }, a, "Communication thread deadline set as a tracked task");

  return { ok: true, message: "Deal confirmed with one accountable closure owner; the 48-hour communication thread is a tracked task", data: { round, deal } };
};

const dealAdvance: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "deal_id");
  const step = requireString(body, "step");
  const allowed = [
    "term_sheet", "due_diligence", "findings_resolution", "definitive_agreements",
    "pre_funding_conditions", "fund_transfer", "receipt_verification", "allotment", "closed",
  ];
  if (!allowed.includes(step)) throw new HttpError(422, `unknown deal step: ${step}`);

  const patch: Row = { status: step };
  if (step === "closed") patch.closed_on = today();
  if (body.blocker !== undefined) patch.blocker = body.blocker;
  if (body.open_documents !== undefined) patch.open_documents = body.open_documents;
  if (body.open_conditions !== undefined) patch.open_conditions = body.open_conditions;
  if (body.next_action !== undefined) patch.next_action = body.next_action;

  const deal = getOne("deals", id);
  const record = update("deals", id, patch, a, `Deal advanced to ${step}`);
  if (deal) update("funding_rounds", String(deal.funding_round_id), { status: step }, a, "Funding round follows the deal status");
  return { ok: true, message: `Deal advanced to ${step}`, data: record };
};

const dealDocumentRecord: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const dealId = requireString(body, "deal_id");
  const purpose = requireString(body, "purpose");
  if (!DOCUMENT_PURPOSE_MAP[purpose]) throw new HttpError(422, `unknown document purpose: ${purpose}`);

  const existing = all<Row>(
    "SELECT * FROM deal_documents WHERE deal_id = ? AND purpose = ?",
    dealId,
    purpose,
  );
  const version = existing.length + 1;
  const status = body.status ?? "received";

  const record = create(
    "deal_documents",
    {
      deal_id: dealId,
      purpose,
      document_type: body.document_type ?? DOCUMENT_PURPOSE_MAP[purpose].label,
      status,
      version,
      received_on: today(),
      signed_on: status === "verified" ? today() : null,
      signer: body.signer ?? "",
      notes: body.notes ?? "",
    },
    a,
  );

  if (status === "verified" && (purpose === "investment_commitment_letter" || purpose === "deal_acceptance_letter")) {
    const deal = getOne("deals", dealId);
    const main = deal
      ? get<Row>(
          "SELECT * FROM main_shoots WHERE startup_id = ? AND season_id = ? ORDER BY scheduled_on DESC LIMIT 1",
          deal.startup_id,
          deal.season_id,
        )
      : undefined;
    if (main) {
      update(
        "main_shoots",
        String(main.id),
        purpose === "investment_commitment_letter"
          ? { investment_commitment_letter_ref: String(record.id), signature_completed_on: today() }
          : { startup_deal_acceptance_letter_ref: String(record.id), signature_completed_on: today() },
        a,
        "Signing event recorded; the document purpose drove the requirement, not the title",
      );
    }
  }

  return { ok: true, message: `Document recorded: ${DOCUMENT_PURPOSE_MAP[purpose].label} (version ${version})`, data: record };
};

const trancheSchedule: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const dealId = requireString(body, "deal_id");
  // A blocker pre-funding condition visibly stops a tranche being scheduled (doc 07 §7).
  const blockers = all<Row>(
    "SELECT * FROM pre_funding_conditions WHERE deal_id = ? AND status = 'open' AND blocker = 1",
    dealId,
  );
  if (blockers.length) {
    throw new HttpError(
      409,
      `Blocked by Legal: ${blockers.length} pre-funding condition(s) are still open. Clear them before scheduling a tranche.`,
    );
  }
  const existing = all<Row>("SELECT * FROM tranches WHERE deal_id = ?", dealId);
  const record = create(
    "tranches",
    {
      deal_id: dealId,
      seq: existing.length + 1,
      scheduled_amount: Number(body.amount ?? 0),
      scheduled_on: body.scheduled_on ?? addDays(today(), 30),
      status: "scheduled",
    },
    a,
  );
  return { ok: true, message: `Tranche ${existing.length + 1} scheduled`, data: record };
};

const trancheReport: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "tranche_id");
  const record = update(
    "tranches",
    id,
    {
      reported_on: today(),
      reported_amount: Number(body.amount ?? 0),
      evidence: body.evidence ?? "",
      status: "reported_by_investor",
    },
    a,
    "Investor-reported transfer recorded",
  );
  return { ok: true, message: "Investor-reported transfer recorded. Deployment is not yet verified.", data: record };
};

const trancheConfirmReceipt: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "tranche_id");
  return {
    ok: true,
    message: "Startup-confirmed receipt recorded",
    data: update("tranches", id, { startup_confirmed_on: today(), status: "receipt_confirmed" }, a, "Startup confirmed receipt"),
  };
};

const trancheVerify: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "tranche_id");
  const tranche = getOne("tranches", id);
  if (!tranche) throw new HttpError(404, "Tranche not found");
  if (tranche.status === "reversed") throw new HttpError(409, "A reversed tranche cannot be verified");
  if (!tranche.startup_confirmed_on && !body.evidence) {
    throw new HttpError(422, "A receipt is not proof; record bank evidence or the startup's confirmation before verifying");
  }

  const amount = Number(body.verified_amount ?? tranche.reported_amount ?? tranche.scheduled_amount);
  const record = update(
    "tranches",
    id,
    {
      verified_amount: amount,
      verified_on: today(),
      verifier_id: a.id,
      evidence: body.evidence ?? tranche.evidence,
      status: amount >= Number(tranche.scheduled_amount) ? "verified" : "part_verified",
    },
    a,
    "Receipt verified and allocated",
  );

  const deal = getOne("deals", String(tranche.deal_id));
  if (deal) {
    notifyFounder(
      String(deal.startup_id),
      "A tranche of your funding is confirmed received",
      `${amount} paise has been verified as received. Your dashboard shows the deployed total and the remaining commitment.`,
      "startup",
      String(deal.startup_id),
    );
    triggerSuccessFee(String(deal.startup_id), String(deal.id), a);
  }

  return { ok: true, message: `Verified ${amount} paise received; deployment updated`, data: record };
};

const trancheReverse: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "tranche_id");
  const tranche = getOne("tranches", id);
  if (!tranche) throw new HttpError(404, "Tranche not found");

  const record = update(
    "tranches",
    id,
    {
      status: "reversed",
      reversal_of_id: body.reversal_of_id ?? tranche.reversal_of_id ?? id,
      reversal_reason: requireString(body, "reason"),
      verified_amount: 0,
    },
    a,
    "Funds returned; the reversal is linked to the original tranche rather than edited away",
  );

  // When a reversal follows an already-invoiced success fee, the money is returned through a
  // credit note rather than by editing the invoice (doc 05 §7). The credit note keeps its own
  // link to the original tranche, so the returned amount stays visible.
  const deal = getOne("deals", String(tranche.deal_id));
  const startupId = deal ? String(deal.startup_id ?? "") : "";
  if (startupId) {
    const fee = get<Row>(
      "SELECT * FROM success_fees WHERE startup_id = ? ORDER BY created_at DESC LIMIT 1",
      startupId,
    );
    if (fee && Number(fee.invoiced_amount ?? 0) > 0) {
      const credit = create(
        "credit_notes",
        {
          startup_id: startupId,
          invoice_ref: String(fee.invoice_ref ?? fee.id ?? ""),
          reversal_ref: id,
          amount: Number(tranche.verified_amount ?? tranche.scheduled_amount ?? 0),
          reason: requireString(body, "reason"),
          status: "issued",
          issued_on: today(),
        },
        a,
      );
      return { ok: true, message: "Reversal recorded, linked to the original tranche, and a credit note was raised against the issued invoice", data: { ...record, credit_note_id: credit.id } };
    }
  }
  return { ok: true, message: "Reversal recorded and linked to the original tranche", data: record };
};

/* ================================================================== */
/* Finance: post-funding success fee                                   */
/* ================================================================== */

export function triggerSuccessFee(startupId: string, dealId: string, a: Actor): Row | undefined {
  const deal = getOne("deals", dealId);
  if (!deal) return undefined;

  const verified = Number(
    get<{ v: number }>(
      "SELECT COALESCE(SUM(verified_amount),0) AS v FROM tranches WHERE deal_id = ? AND status <> 'reversed'",
      dealId,
    )?.v ?? 0,
  );
  const reversed = Number(
    get<{ v: number }>(
      "SELECT COALESCE(SUM(scheduled_amount),0) AS v FROM tranches WHERE deal_id = ? AND status = 'reversed'",
      dealId,
    )?.v ?? 0,
  );

  const existing = get<Row>("SELECT * FROM success_fees WHERE deal_id = ?", dealId);
  const policy = policyValue<{ structure: string; defaultPercent: number; capPaise: number; excludeBridgeAndDebt: boolean }>("POL-SUCCESS-FEE");
  const agreementRef = get<Row>(
    "SELECT m.commercial_schedule AS cs, m.id FROM mous m JOIN applications ap ON ap.id = m.application_id WHERE ap.startup_id = ?",
    startupId,
  );
  // A recalculation recomputes the amounts; it must never rewrite the agreed commercial terms.
  // The percentage and structure come from the agreement and are Management-only fields, so an
  // existing row keeps its own terms and the policy only seeds a first calculation.
  const structure = (existing ? String(existing.fee_structure) : policy.structure) as
    | "percentage"
    | "fixed"
    | "slab";
  const percent = existing ? Number(existing.fee_percent) : policy.defaultPercent;
  const cap = existing ? Number(existing.fee_cap) : policy.capPaise;
  const upfrontAdjustable = existing ? Boolean(existing.upfront_adjustable) : false;
  const feeDue = calculateSuccessFee({
    structure,
    eligibleFundingPaise: verified,
    percent,
    capPaise: cap,
  });

  const forecastBase = Number(deal.committed_amount ?? 0);
  const forecast = calculateSuccessFee({
    structure: "percentage",
    eligibleFundingPaise: forecastBase,
    percent,
    capPaise: cap,
  });

  const payload: Row = {
    startup_id: startupId,
    deal_id: dealId,
    funding_round_id: deal.funding_round_id,
    agreement_ref: agreementRef ? `MoU ${agreementRef.id}` : "",
    eligible_funding: verified,
    excluded_funding: reversed,
    fee_structure: structure,
    fee_percent: percent,
    fee_cap: cap,
    forecast_fee: forecast,
    fee_due: feeDue,
    upfront_adjustable: upfrontAdjustable ? 1 : 0,
    triggered_on: today(),
    status: "calculation_triggered",
  };

  const record = existing
    ? update("success_fees", String(existing.id), payload, a, "Success fee recalculated after verified deployment")
    : create("success_fees", payload, a);

  notify(
    "finance",
    "Deployment verified; success fee calculation triggered",
    "Startup Relationships has been copied on the founder coordination task. Closure means the account reconciles, not merely that an invoice was sent.",
    "deal",
    dealId,
  );

  return record;
}

const successFeeCalculate: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const dealId = requireString(body, "deal_id");
  const deal = getOne("deals", dealId);
  if (!deal) throw new HttpError(404, "Deal not found");
  const record = triggerSuccessFee(String(deal.startup_id), dealId, a);
  return { ok: true, message: "Success fee calculated from verified deployment", data: record ?? {} };
};

const successFeeInvoice: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "success_fee_id");
  const fee = getOne("success_fees", id);
  if (!fee) throw new HttpError(404, "Success fee not found");

  const discount = Number(body.discount ?? fee.discount ?? 0);
  const waiver = Number(body.waiver_amount ?? fee.waiver_amount ?? 0);
  const partner = Number(body.partner_settlement ?? fee.partner_settlement ?? 0);
  const tax = Number(body.tax_amount ?? Math.round(Number(fee.fee_due) * 0.18));
  const upfrontAdjustment = Boolean(fee.upfront_adjustable) ? Number(fee.upfront_adjustment ?? 0) : 0;
  const invoiced = Math.max(
    0,
    Number(fee.fee_due) - discount - waiver - partner - upfrontAdjustment,
  );
  const invoiceNo = String(body.invoice_no ?? `INV-SF-${Date.now().toString().slice(-6)}`);

  const record = update(
    "success_fees",
    id,
    {
      discount,
      waiver_amount: waiver,
      partner_settlement: partner,
      tax_amount: tax,
      upfront_adjustment: upfrontAdjustment,
      invoiced_amount: invoiced,
      outstanding: invoiced - Number(fee.collected_amount ?? 0),
      invoice_no: invoiceNo,
      invoice_date: today(),
      due_date: body.due_date ?? addDays(today(), 15),
      status: "invoiced",
    },
    a,
    "Invoice issued; the upfront adjustment applies only because the agreement says so",
  );

  run(
    `INSERT INTO ledger_entries (id, startup_id, season_id, entry_type, reference, amount, currency, occurred_on,
      source_type, source_id, memo, created_by_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    nextId({ key: "ledger_entries", table: "ledger_entries", label: "x", plural: "x", module: "x", searchable: [], orderBy: "id" }),
    String(fee.startup_id),
    String(fee.season_id ?? a.seasonId ?? ""),
    "success_fee",
    invoiceNo,
    invoiced,
    "INR",
    today(),
    "success_fee",
    id,
    `Success fee invoice on ${fee.eligible_funding} paise eligible verified deployment`,
    a.id,
    nowISO(),
  );

  notifyFounder(
    String(fee.startup_id),
    "A success-fee invoice has been raised",
    `Invoice ${invoiceNo} for the success fee on your verified funding is ready. It is payable under your signed agreement.`,
    "success_fee",
    id,
  );

  return { ok: true, message: `Invoice ${invoiceNo} issued for ${invoiced} paise`, data: record };
};

const successFeeCollect: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const id = requireString(body, "success_fee_id");
  const fee = getOne("success_fees", id);
  if (!fee) throw new HttpError(404, "Success fee not found");
  if (body.verified === false) throw new HttpError(422, "Finance must verify the receipt before allocation");

  const amount = Number(body.amount ?? 0);
  if (amount <= 0) throw new HttpError(422, "Receipt amount must be positive");
  const allocatedSoFar = Number(fee.collected_amount ?? 0);
  const invoiced = Number(fee.invoiced_amount ?? 0);
  if (allocatedSoFar + amount > invoiced) {
    throw new HttpError(422, `Allocation exceeds the invoiced amount; ${invoiced - allocatedSoFar} paise remains outstanding`);
  }
  const collected = allocatedSoFar + amount;
  const outstanding = Math.max(0, invoiced - collected);
  const record = update(
    "success_fees",
    id,
    {
      collected_amount: collected,
      outstanding,
      withholding_amount: Number(body.withholding_amount ?? fee.withholding_amount ?? 0),
      status: outstanding === 0 ? "collected" : "part_collected",
      reconciled_on: outstanding === 0 ? today() : fee.reconciled_on,
    },
    a,
    "Receipt verified and allocated; the account reconciles when the balance reaches zero",
  );

  run(
    `INSERT INTO ledger_entries (id, startup_id, season_id, entry_type, reference, amount, currency, occurred_on,
      source_type, source_id, memo, created_by_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    nextId({ key: "ledger_entries", table: "ledger_entries", label: "x", plural: "x", module: "x", searchable: [], orderBy: "id" }),
    String(fee.startup_id),
    String(fee.season_id ?? a.seasonId ?? ""),
    "receipt",
    String(body.reference ?? fee.invoice_no),
    -amount,
    "INR",
    today(),
    "success_fee",
    id,
    "Verified success fee receipt allocated",
    a.id,
    nowISO(),
  );

  return { ok: true, message: outstanding === 0 ? "Success fee collected; the account reconciles" : `Part collection recorded; ${outstanding} paise outstanding`, data: record };
};

const ledgerAdd: ActionHandler = ({ session, body }) => {
  const a = actor({ session, body });
  const record = create(
    "ledger_entries",
    {
      startup_id: requireString(body, "startup_id"),
      entry_type: requireString(body, "entry_type"),
      reference: body.reference ?? "",
      amount: Number(body.amount ?? 0),
      occurred_on: body.occurred_on ?? today(),
      source_type: body.source_type ?? "manual",
      source_id: body.source_id ?? null,
      memo: body.memo ?? "",
      created_by_id: a.id,
    },
    a,
  );
  return { ok: true, message: "Ledger entry recorded", data: record };
};

export const ACTIONS_B: Record<string, ActionHandler> = {
  "upfront.initiate": upfrontInitiate,
  "upfront.approve": upfrontApprove,
  "upfront.invoice": upfrontInvoice,
  "upfront.record_receipt": upfrontRecordReceipt,
  "upfront.extension": upfrontExtension,
  "upfront.waive": upfrontWaive,
  "upfront.dispute": upfrontDispute,
  "upfront.refund": upfrontRefund,
  "deal.open": dealOpen,
  "deal.advance": dealAdvance,
  "deal.document": dealDocumentRecord,
  "tranche.schedule": trancheSchedule,
  "tranche.report": trancheReport,
  "tranche.confirm_receipt": trancheConfirmReceipt,
  "tranche.verify": trancheVerify,
  "tranche.reverse": trancheReverse,
  "successfee.calculate": successFeeCalculate,
  "successfee.invoice": successFeeInvoice,
  "successfee.collect": successFeeCollect,
  "ledger.add": ledgerAdd,
};
