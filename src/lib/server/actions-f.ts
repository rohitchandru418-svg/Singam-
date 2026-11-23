import { all, get, run } from "../db/client";
import { today } from "../domain/dates";
import { applicationCompleteness } from "../domain/applicationForm";
import { create, getOne, notify, notifyFounder, update, type Row } from "./repo";
import { HttpError, type Session } from "./session";
import type { ActionHandler } from "./actions";

/**
 * Founder-side actions for the revamped portal.
 *
 * These are the moves a founder makes from their own workspace: signing the agreement,
 * answering the team in a stage thread, uploading a requested document, confirming Pitch Day
 * availability, and sharing payment proof. Every handler is scoped to the acting founder's own
 * `startupId`; none of them can touch another startup or a record that is not theirs.
 *
 * They are deliberately narrow: a founder confirms and supplies, the internal team verifies
 * and decides. A payment proof never marks an invoice paid, a Golden Pass is never created
 * here, and a founder can never set an internal status.
 */

function founderStartup(session: Session): string {
  const id = session.actor.startupId;
  if (session.actor.kind !== "founder" || !id) {
    throw new HttpError(403, "Only a startup-side login can run this action");
  }
  return id;
}

/** The founder's current, non-withdrawn application in the acting season, if any. */
function currentApplication(startupId: string, seasonId?: string): Row | undefined {
  return get<Row>(
    "SELECT * FROM applications WHERE startup_id = ? AND status <> 'withdrawn' AND (? = '' OR season_id = ?) ORDER BY submitted_at DESC LIMIT 1",
    startupId,
    seasonId ?? "",
    seasonId ?? "",
  );
}

/* ------------------------------------------------------------------ */
/* Application: save draft with real completeness                      */
/* ------------------------------------------------------------------ */

const founderSaveDraft: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const startup = getOne("startups", startupId);
  if (!startup) throw new HttpError(404, "Startup not found");

  // Save whatever profile fields the form sent, so a draft is a real record, not a local one.
  const editable = new Set([
    "name", "legal_entity", "entity_type", "sector", "stage", "geography", "business_model",
    "website", "cin", "gstin", "pan", "incorporated_on", "category", "pitch", "logo_ref",
    "product_stage", "revenue_stage", "target_fundraise", "technologies", "industries",
    "monthly_revenue", "customer_count", "traction", "funding_raised", "pitch_deck_ref",
    "video_pitch_ref", "origin_country", "registered",
  ]);
  const patch: Row = {};
  for (const [key, value] of Object.entries(body)) if (editable.has(key)) patch[key] = value;
  const updated = Object.keys(patch).length ? update("startups", startupId, patch, session.actor, "Founder saved the application draft") : startup;

  const founders = all<Row>("SELECT * FROM founders WHERE startup_id = ?", startupId);
  const completeness = applicationCompleteness(updated, founders);

  // An application record is created lazily the moment a founder starts filling the form, so
  // the dashboard can show "Continue application" and the reference number exists.
  const program = get<Row>("SELECT * FROM programs WHERE season_id = ? AND status = 'open' ORDER BY opens_on DESC LIMIT 1", session.seasonId);
  let application = currentApplication(startupId, session.seasonId);
  if (!application && program) {
    application = create(
      "applications",
      {
        season_id: String(program.season_id),
        startup_id: startupId,
        program_id: String(program.id),
        reference_no: `${String(program.code ?? "S3")}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        source: "Startup side",
        campaign: String(program.title),
        relationship_manager_id: "U-SR1",
        stage_at_application: String(updated.revenue_stage || updated.stage || "early_revenue"),
        status: "draft",
        completion_pct: completeness.percent,
        notes: "Draft started from the founder portal.",
      },
      session.actor,
    );
  } else if (application) {
    application = update("applications", String(application.id), { completion_pct: completeness.percent }, session.actor, "Draft progress saved");
  }

  return {
    ok: true,
    message: `Saved. ${completeness.complete} of ${completeness.total} required fields complete (${completeness.percent}%).`,
    data: { completeness, application, startup: updated },
  };
};

/* ------------------------------------------------------------------ */
/* Agreement (MoU): sign, or ask a question                            */
/* ------------------------------------------------------------------ */

const founderMouSign: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const id = String(body.mou_id ?? "");
  const mou = getOne("mous", id);
  if (!mou) throw new HttpError(404, "Agreement not found");
  const application = getOne("applications", String(mou.application_id));
  if (!application || String(application.startup_id) !== startupId) {
    throw new HttpError(403, "This agreement is not yours to sign");
  }
  if (String(mou.status) === "signed") throw new HttpError(409, "This agreement is already signed");

  const record = update(
    "mous",
    id,
    { status: "signed", signed_on: today(), response: "Proceed", founder_email: String(mou.founder_email ?? "") },
    session.actor,
    "Founder accepted and signed the agreement from the founder portal",
  );

  // Record the signed copy the founder saw, so the console and the founder agree on the version.
  const existing = all<Row>(
    "SELECT id FROM documents WHERE entity_type = 'startup' AND entity_id = ? AND purpose = 'signed_mou'",
    startupId,
  );
  create(
    "documents",
    {
      entity_type: "startup",
      entity_id: startupId,
      title: "Signed participation agreement",
      purpose: "signed_mou",
      category: "Agreement",
      version: existing.length + 1,
      status: "verified",
      file_ref: String(mou.commercial_schedule ?? "").slice(0, 60) || "MOU-SIGNED.pdf",
      uploaded_by_id: session.actor.id,
      uploaded_on: today(),
      notes: "Signed by the founder from the founder portal.",
    },
    session.actor,
  );

  notify(
    "startup_relationships",
    "Founder signed the agreement",
    "The founder signed the participation agreement from the founder portal. Finance may proceed with the readiness checklist.",
    "startup",
    startupId,
  );
  return { ok: true, message: "Agreement signed. A signed copy is now in your documents.", data: record };
};

const founderMouClarify: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const id = String(body.mou_id ?? "");
  const mou = getOne("mous", id);
  if (!mou) throw new HttpError(404, "Agreement not found");
  const application = getOne("applications", String(mou.application_id));
  if (!application || String(application.startup_id) !== startupId) {
    throw new HttpError(403, "This agreement is not yours to query");
  }
  const question = String(body.question ?? "").trim();
  if (!question) throw new HttpError(422, "Describe what you would like clarified");

  // A clarification request opens a thread on the agreement stage and moves the MoU into
  // review, which is a real internal status, not a new one invented here.
  if (["shared", "not_started"].includes(String(mou.status))) {
    update("mous", id, { status: "under_review" }, session.actor, "Founder requested clarification");
  }
  create(
    "founder_messages",
    {
      startup_id: startupId,
      application_id: String(application.id),
      stage_key: "agreement",
      author_side: "founder",
      author_id: session.actor.id,
      author_name: session.actor.name,
      body: question,
    },
    session.actor,
  );
  notify(
    "legal",
    "Founder asked about the agreement",
    question.slice(0, 160),
    "startup",
    startupId,
  );
  return { ok: true, message: "Your question is with the team. You will see the reply here.", data: { ok: true } };
};

/* ------------------------------------------------------------------ */
/* Two-way communication                                               */
/* ------------------------------------------------------------------ */

const ALLOWED_STAGES = new Set([
  "profile",
  "application_draft",
  "application_submitted",
  "application_review",
  "pre_bootcamp",
  "funding_fit",
  "agreement",
  "document_verification",
  "virtual_pitch",
  "pitch_day",
  "final_selection",
  "programme_fee",
  "av_shoot",
  "mock_shoot",
  "main_shoot",
  "telecast",
  "deal_closure",
  "funds_received",
  "success_fee",
  "community",
]);

const founderMessageSend: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const stageKey = String(body.stage_key ?? "").trim();
  if (!ALLOWED_STAGES.has(stageKey)) throw new HttpError(422, "unknown stage for a message");
  const text = String(body.body ?? "").trim();
  if (!text) throw new HttpError(422, "Write a message first");
  const application = currentApplication(startupId, session.seasonId);

  const message = create(
    "founder_messages",
    {
      startup_id: startupId,
      application_id: application ? String(application.id) : null,
      stage_key: stageKey,
      author_side: "founder",
      author_id: session.actor.id,
      author_name: session.actor.name,
      body: text,
      attachment_document_id: body.document_id ? String(body.document_id) : null,
    },
    session.actor,
  );
  notify("startup_relationships", "New message from a founder", text.slice(0, 160), "startup", startupId);
  return { ok: true, message: "Message sent to the team", data: message };
};

/* ------------------------------------------------------------------ */
/* Document checklist                                                  */
/* ------------------------------------------------------------------ */

const founderDocumentUpload: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const requestId = String(body.request_id ?? "");
  const request = getOne("document_requests", requestId);
  if (!request || String(request.startup_id) !== startupId) throw new HttpError(404, "Document request not found");
  if (String(request.status) === "verified") throw new HttpError(409, "This document is already verified");

  const fileRef = String(body.file_ref ?? "").trim();
  if (!fileRef) throw new HttpError(422, "Upload a file before submitting");
  const application = currentApplication(startupId, session.seasonId);

  const existing = all<Row>(
    "SELECT id FROM documents WHERE entity_type = 'startup' AND entity_id = ? AND purpose = ?",
    startupId,
    String(request.purpose),
  );
  const document = create(
    "documents",
    {
      entity_type: "startup",
      entity_id: startupId,
      title: String(body.title ?? request.title),
      purpose: String(request.purpose),
      category: "General",
      version: existing.length + 1,
      status: "received",
      file_ref: fileRef,
      uploaded_by_id: session.actor.id,
      uploaded_on: today(),
      notes: String(body.notes ?? "Uploaded by the founder from the founder portal."),
    },
    session.actor,
  );
  const updated = update(
    "document_requests",
    requestId,
    {
      status: "under_verification",
      document_id: String(document.id),
      submitted_on: today(),
      clarification: "",
    },
    session.actor,
    "Founder uploaded the requested document; awaiting verification",
  );
  notify(
    "startup_relationships",
    "Founder uploaded a requested document",
    `${String(request.title)} is ready for verification.`,
    "startup",
    startupId,
  );
  return { ok: true, message: "Document uploaded. The team will verify it and reply here.", data: { request: updated, document, application_id: application ? String(application.id) : null } };
};

const founderDocumentRespond: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const requestId = String(body.request_id ?? "");
  const request = getOne("document_requests", requestId);
  if (!request || String(request.startup_id) !== startupId) throw new HttpError(404, "Document request not found");
  const text = String(body.message ?? "").trim();
  if (!text) throw new HttpError(422, "Write your response first");

  create(
    "founder_messages",
    {
      startup_id: startupId,
      application_id: request.application_id ? String(request.application_id) : null,
      stage_key: "document_verification",
      author_side: "founder",
      author_id: session.actor.id,
      author_name: session.actor.name,
      body: `Re: ${String(request.title)} — ${text}`,
      attachment_document_id: body.document_id ? String(body.document_id) : null,
    },
    session.actor,
  );
  if (["info_required", "resubmission_required"].includes(String(request.status))) {
    update("document_requests", requestId, { status: "under_verification", clarification: "" }, session.actor, "Founder responded to the clarification");
  }
  notify("startup_relationships", "Founder replied on a document", text.slice(0, 160), "startup", startupId);
  return { ok: true, message: "Response sent to the team", data: { ok: true } };
};

/* ------------------------------------------------------------------ */
/* Pitch Day availability                                              */
/* ------------------------------------------------------------------ */

const founderPitchDayConfirm: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const ids = Array.isArray(body.option_ids) ? (body.option_ids as unknown[]).map(String) : [];
  if (ids.length === 0) throw new HttpError(422, "Select the slot you can attend");

  const options = all<Row>("SELECT * FROM pitch_day_options WHERE startup_id = ?", startupId);
  const mine = options.filter((o) => ids.includes(String(o.id)));
  if (mine.length !== ids.length) throw new HttpError(403, "One or more of those slots is not yours");

  for (const option of options) {
    const available = ids.includes(String(option.id)) ? 1 : 0;
    // A founder's pick goes to the team for approval, not straight to a confirmed slot.
    const patch: Row = { founder_available: available };
    if (available === 1) patch.approval = "requested";
    else if (String(option.approval) === "requested") patch.approval = "pending";
    if (available !== Number(option.founder_available) || Object.keys(patch).length > 1) {
      update("pitch_day_options", String(option.id), patch, session.actor, "Founder picked a Pitch Day slot");
    }
  }
  const chosen = mine.map((o) => String(o.option_date)).sort().join(", ");
  notify(
    "investor_relations",
    "Founder picked Pitch Day slots",
    `The founder can attend: ${chosen}. Verify, validate and approve, or ask for a change.`,
    "startup",
    startupId,
  );
  return { ok: true, message: "Your slots are with the team. They will verify and confirm the schedule.", data: { ok: true } };
};

/* ------------------------------------------------------------------ */
/* Programme fee: share payment proof                                  */
/* ------------------------------------------------------------------ */

const founderFeeProofSubmit: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const feeId = String(body.fee_id ?? "");
  const fee = getOne("upfront_fees", feeId);
  if (!fee || String(fee.startup_id) !== startupId) throw new HttpError(404, "Invoice not found");
  if (["paid", "waived", "refunded"].includes(String(fee.status))) throw new HttpError(409, "This invoice is already settled");

  const amount = Number(body.amount ?? 0);
  if (!(amount > 0)) throw new HttpError(422, "Enter the amount you paid");
  const reference = String(body.reference ?? "").trim();
  if (!reference) throw new HttpError(422, "Enter the payment reference or UTR");

  const proof = create(
    "payment_proofs",
    {
      startup_id: startupId,
      fee_id: feeId,
      amount,
      reference,
      note: String(body.note ?? ""),
      file_ref: String(body.file_ref ?? ""),
      status: "submitted",
    },
    session.actor,
  );
  // Finance verifies and allocates the receipt; a proof alone never marks the invoice paid.
  notify(
    "finance",
    "Founder shared payment proof",
    `Verify the receipt for invoice ${String(fee.invoice_no || feeId)} before allocating the payment.`,
    "upfront_fee",
    feeId,
  );
  return {
    ok: true,
    message: "Payment proof shared. Finance will verify the receipt and update your invoice.",
    data: proof,
  };
};

/* ------------------------------------------------------------------ */
/* Success fee: share payment proof                                    */
/* ------------------------------------------------------------------ */

const founderSuccessFeeProof: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const feeId = String(body.fee_id ?? "");
  const fee = getOne("success_fees", feeId);
  if (!fee || String(fee.startup_id) !== startupId) throw new HttpError(404, "Success fee invoice not found");
  if (["collected", "reconciled"].includes(String(fee.status))) throw new HttpError(409, "This invoice is already settled");

  const amount = Number(body.amount ?? 0);
  if (!(amount > 0)) throw new HttpError(422, "Enter the amount you paid");
  const reference = String(body.reference ?? "").trim();
  if (!reference) throw new HttpError(422, "Enter the payment reference or UTR");

  const proof = create(
    "payment_proofs",
    {
      startup_id: startupId,
      season_id: String(fee.season_id ?? session.seasonId),
      fee_id: feeId,
      amount,
      reference,
      note: String(body.note ?? ""),
      file_ref: String(body.file_ref ?? ""),
      status: "submitted",
    },
    session.actor,
  );
  // Finance verifies and allocates the receipt; a proof alone never marks the fee collected.
  notify("finance", "Founder shared a success-fee payment proof", `Verify the receipt for invoice ${String(fee.invoice_no || feeId)} before allocating the payment.`, "success_fee", feeId);
  return { ok: true, message: "Payment proof shared. Finance will verify the receipt and update your invoice.", data: proof };
};

/* ------------------------------------------------------------------ */
/* Shoot confirmation                                                  */
/* ------------------------------------------------------------------ */

const founderShootConfirm: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const avId = String(body.av_id ?? "");
  const av = getOne("av_shoots", avId);
  if (!av || String(av.startup_id) !== startupId) throw new HttpError(404, "Shoot not found");
  const note = String(body.availability ?? "").trim();
  update(
    "av_shoots",
    avId,
    { founder_availability: note || String(av.founder_availability ?? "Confirmed by the founder") },
    session.actor,
    "Founder confirmed shoot availability",
  );
  notify("production", "Founder confirmed shoot availability", note.slice(0, 160) || "Founder confirmed the shoot date.", "startup", startupId);
  return { ok: true, message: "Thanks — your availability is with the production team.", data: { ok: true } };
};

/* ------------------------------------------------------------------ */
/* MoU: sign, or upload a printed and signed copy                      */
/* ------------------------------------------------------------------ */

const founderMouUploadSigned: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const id = String(body.mou_id ?? "");
  const mou = getOne("mous", id);
  if (!mou) throw new HttpError(404, "Agreement not found");
  const application = getOne("applications", String(mou.application_id));
  if (!application || String(application.startup_id) !== startupId) {
    throw new HttpError(403, "This agreement is not yours to sign");
  }
  const fileRef = String(body.file_ref ?? "").trim();
  if (!fileRef) throw new HttpError(422, "Upload the signed copy first");

  // A printed, signed and scanned copy is the same signing event as a digital signature, so
  // it moves the MoU to signed and records the uploaded copy against the startup.
  const record = update(
    "mous",
    id,
    { status: "signed", signed_on: today(), response: "Proceed", founder_email: String(mou.founder_email ?? "") },
    session.actor,
    "Founder uploaded a printed and signed agreement copy",
  );
  create(
    "documents",
    {
      entity_type: "startup",
      entity_id: startupId,
      title: "Signed participation agreement (uploaded copy)",
      purpose: "signed_mou",
      category: "Agreement",
      version: 1,
      status: "received",
      file_ref: fileRef,
      uploaded_by_id: session.actor.id,
      uploaded_on: today(),
      notes: String(body.note ?? "Printed, signed and uploaded by the founder."),
    },
    session.actor,
  );
  notify(
    "startup_relationships",
    "Founder uploaded a signed agreement",
    "The founder printed, signed and uploaded the participation agreement. Legal can validate and approve.",
    "startup",
    startupId,
  );
  return { ok: true, message: "Signed copy uploaded. The team will validate and approve it.", data: record };
};

/* ------------------------------------------------------------------ */
/* Deal closure: upload due-diligence documents, sign agreements       */
/* ------------------------------------------------------------------ */

const founderDealDocument: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const dealId = String(body.deal_id ?? "");
  const deal = getOne("deals", dealId);
  if (!deal || String(deal.startup_id) !== startupId) throw new HttpError(404, "Deal not found");
  const purpose = String(body.purpose ?? "due_diligence_report");
  const fileRef = String(body.file_ref ?? "").trim();
  if (!fileRef) throw new HttpError(422, "Upload a file first");

  const existing = all<Row>("SELECT id FROM deal_documents WHERE deal_id = ? AND purpose = ?", dealId, purpose);
  const record = create(
    "deal_documents",
    {
      deal_id: dealId,
      season_id: String(deal.season_id ?? ""),
      purpose,
      document_type: String(body.document_type ?? purpose.replace(/_/g, " ")),
      status: String(body.status ?? "received"),
      version: existing.length + 1,
      received_on: today(),
      signer: String(body.signer ?? session.actor.name),
      notes: String(body.notes ?? "Uploaded by the founder from the founder portal."),
    },
    session.actor,
  );
  notify("investor_relations", "Founder uploaded deal documentation", `${purpose.replace(/_/g, " ")} for deal ${dealId}.`, "deal", dealId);
  return { ok: true, message: "Document uploaded for the deal.", data: record };
};

/* ------------------------------------------------------------------ */
/* Funds received: confirm a tranche was received                      */
/* ------------------------------------------------------------------ */

const founderTrancheConfirm: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const trancheId = String(body.tranche_id ?? "");
  const tranche = getOne("tranches", trancheId);
  if (!tranche) throw new HttpError(404, "Tranche not found");
  const deal = getOne("deals", String(tranche.deal_id));
  if (!deal || String(deal.startup_id) !== startupId) throw new HttpError(403, "This tranche is not yours to confirm");

  // The founder confirms they received the money; Finance still verifies against bank evidence
  // before it counts as deployment, so this never becomes verified deployment on its own.
  const record = update(
    "tranches",
    trancheId,
    {
      startup_confirmed_on: today(),
      evidence: String(body.evidence ?? tranche.evidence ?? ""),
      status: ["scheduled", "reported_by_investor"].includes(String(tranche.status)) ? "startup_confirmed" : String(tranche.status),
    },
    session.actor,
    "Founder confirmed the tranche was received; Finance verifies before it counts as deployment",
  );
  notify("finance", "Founder confirmed a tranche receipt", `Verify the receipt for tranche ${tranche.seq} of deal ${String(tranche.deal_id)} before it counts as deployment.`, "deal", String(tranche.deal_id));
  return { ok: true, message: "Thank you — Finance will verify the receipt before it counts as deployment.", data: record };
};

/* ------------------------------------------------------------------ */
/* Telecast and promotion: post done, feedback                         */
/* ------------------------------------------------------------------ */

const founderTelecastUpdate: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const telecast = get<Row>("SELECT * FROM telecasts WHERE startup_id = ? AND season_id = ? ORDER BY created_at DESC LIMIT 1", startupId, session.seasonId);
  if (!telecast) throw new HttpError(404, "No telecast is scheduled for you yet");
  const patch: Row = {};
  if (body.posting_done !== undefined) patch.founder_posting_done = Number(body.posting_done) === 1 || body.posting_done === true ? 1 : 0;
  if (body.feedback !== undefined) patch.founder_feedback = String(body.feedback);
  if (Object.keys(patch).length === 0) throw new HttpError(422, "Nothing to update");
  const record = update("telecasts", String(telecast.id), patch, session.actor, "Founder updated telecast promotion");
  notify("marketing", "Founder updated the telecast promotion step", String(body.feedback ?? "").slice(0, 160) || "Founder marked the approved posts as done.", "startup", startupId);
  return { ok: true, message: "Thank you — the team can see your update.", data: record };
};

/* ------------------------------------------------------------------ */
/* Notices                                                             */
/* ------------------------------------------------------------------ */

const founderReadNotices: ActionHandler = ({ session }) => {
  founderStartup(session);
  run("UPDATE notifications SET read_at = ? WHERE recipient_id = ? AND read_at IS NULL", today(), session.actor.id);
  return { ok: true, message: "Notices cleared", data: { ok: true } };
};

/* ------------------------------------------------------------------ */
/* The team's side of the same conversation                            */
/* ------------------------------------------------------------------ */

/**
 * These are the internal actions that *drive* the founder's steps. They live beside the
 * founder actions on purpose: the checklist item a founder uploads against, the thread they
 * reply in and the dates they choose from are all created and answered from the console, so
 * the two sides cannot drift into two different sets of records.
 */

function founderUserOf(startupId: string): string | undefined {
  return get<Row>("SELECT id FROM users WHERE startup_id = ? AND kind = 'founder' ORDER BY id LIMIT 1", startupId)?.id as string | undefined;
}

const documentRequestCreate: ActionHandler = ({ session, body }) => {
  const startupId = String(body.startup_id ?? "");
  if (!startupId) throw new HttpError(422, "field startup_id is required");
  const title = String(body.title ?? "").trim();
  if (!title) throw new HttpError(422, "Give the document a title");
  const purpose = String(body.purpose ?? "application_pack");
  const stageKey = String(body.stage_key ?? "document_verification");

  const record = create(
    "document_requests",
    {
      startup_id: startupId,
      application_id: body.application_id ? String(body.application_id) : null,
      stage_key: stageKey,
      purpose,
      title,
      instructions: String(body.instructions ?? ""),
      mandatory: body.mandatory === false ? 0 : 1,
      accepted_formats: String(body.accepted_formats ?? "pdf,jpg,jpeg,png"),
      max_size_mb: Number(body.max_size_mb ?? 10),
      status: "not_uploaded",
    },
    session.actor,
  );
  notify(
    "external",
    `A document is needed: ${title}`,
    String(body.instructions ?? "Please upload this document from your documents step."),
    "startup",
    startupId,
    founderUserOf(startupId),
  );
  return { ok: true, message: "Document requested; the founder has been notified", data: record };
};

const documentRequestVerify: ActionHandler = ({ session, body }) => {
  const id = String(body.request_id ?? "");
  const request = getOne("document_requests", id);
  if (!request) throw new HttpError(404, "Document request not found");
  const decision = String(body.decision ?? "verify");
  const note = String(body.note ?? "");
  const startupId = String(request.startup_id);

  const map: Record<string, Row> = {
    verify: { status: "verified", verified_on: today(), clarification: "" },
    clarify: { status: "info_required", clarification: note || "Please check this document and upload it again." },
    resubmit: { status: "resubmission_required", clarification: note || "This document needs to be replaced." },
  };
  const patch = map[decision];
  if (!patch) throw new HttpError(422, `decision must be one of: ${Object.keys(map).join(", ")}`);

  const record = update("document_requests", id, patch, session.actor, `Document request ${decision}`);
  if (decision === "verify" && request.document_id) {
    update("documents", String(request.document_id), { status: "verified" }, session.actor, "Document verified by the team");
  }
  notify(
    "external",
    decision === "verify" ? `Verified: ${String(request.title)}` : `Action needed: ${String(request.title)}`,
    decision === "verify" ? "Thank you — this document is verified." : note,
    "startup",
    startupId,
    founderUserOf(startupId),
  );
  return { ok: true, message: decision === "verify" ? "Document verified" : "Founder notified", data: record };
};

const founderMessageReply: ActionHandler = ({ session, body }) => {
  const startupId = String(body.startup_id ?? "");
  if (!startupId) throw new HttpError(422, "field startup_id is required");
  const stageKey = String(body.stage_key ?? "").trim();
  if (!stageKey) throw new HttpError(422, "field stage_key is required");
  const text = String(body.body ?? "").trim();
  if (!text) throw new HttpError(422, "Write a reply first");

  const record = create(
    "founder_messages",
    {
      startup_id: startupId,
      application_id: body.application_id ? String(body.application_id) : null,
      stage_key: stageKey,
      author_side: "team",
      author_id: session.actor.id,
      author_name: session.actor.name,
      body: text,
    },
    session.actor,
  );
  notify("external", "New message from the Startup Singam team", text.slice(0, 160), "startup", startupId, founderUserOf(startupId));
  return { ok: true, message: "Reply sent to the founder", data: record };
};

const pitchDayOptionOffer: ActionHandler = ({ session, body }) => {
  const startupId = String(body.startup_id ?? "");
  if (!startupId) throw new HttpError(422, "field startup_id is required");
  const optionDate = String(body.option_date ?? "");
  if (!optionDate) throw new HttpError(422, "Pick a date to offer");
  const record = create(
    "pitch_day_options",
    {
      startup_id: startupId,
      season_id: String(body.season_id ?? session.seasonId),
      option_date: optionDate,
      slot_time: String(body.slot_time ?? ""),
      investor_id: body.investor_id ? String(body.investor_id) : null,
      slot_note: String(body.slot_note ?? ""),
      status: "offered",
      founder_available: 0,
      approval: "pending",
    },
    session.actor,
  );
  notify("external", "Pitch Day slots to pick", `The team has released ${optionDate} for you to pick from.`, "startup", startupId, founderUserOf(startupId));
  return { ok: true, message: "Slot offered to the founder", data: record };
};

/** The team verifies, validates and approves the founder's Pitch Day picks, or asks for a change. */
const pitchDayConfirmSlots: ActionHandler = ({ session, body }) => {
  const startupId = String(body.startup_id ?? "");
  if (!startupId) throw new HttpError(422, "field startup_id is required");
  const decision = String(body.decision ?? "approve");
  if (!["approve", "change"].includes(decision)) throw new HttpError(422, "decision must be approve or change");
  const ids = Array.isArray(body.option_ids) ? (body.option_ids as unknown[]).map(String) : [];

  const options = all<Row>("SELECT * FROM pitch_day_options WHERE startup_id = ?", startupId);
  const targets = ids.length ? options.filter((o) => ids.includes(String(o.id))) : options.filter((o) => Number(o.founder_available) === 1);
  if (targets.length === 0) throw new HttpError(422, "The founder has not picked any slot yet");

  for (const option of targets) {
    if (decision === "approve") {
      update("pitch_day_options", String(option.id), { status: "chosen", approval: "approved", review_note: "" }, session.actor, "Pitch Day slot verified, validated and approved");
    } else {
      update("pitch_day_options", String(option.id), { founder_available: 0, approval: "change_requested", review_note: String(body.note ?? "") }, session.actor, "Pitch Day slot change requested");
    }
  }
  notify(
    "external",
    decision === "approve" ? "Your Pitch Day slots are confirmed" : "A Pitch Day slot needs a change",
    decision === "approve" ? "The team verified and approved your Pitch Day schedule. You can see it in your journey." : String(body.note ?? "The team has asked for a different slot."),
    "startup",
    startupId,
    founderUserOf(startupId),
  );
  return { ok: true, message: decision === "approve" ? "Pitch Day slots approved" : "Change requested from the founder", data: { ok: true } };
};

/** After the founder accepts, the team fixes the session dates and shares the meeting link. */
const bootcampSchedule: ActionHandler = ({ session, body }) => {
  const applicationId = String(body.application_id ?? "");
  const record = get<Row>("SELECT * FROM bootcamp_attendance WHERE application_id = ?", applicationId);
  if (!record) throw new HttpError(404, "No bootcamp invitation for this application");
  const sessionDates = String(body.session_dates ?? "").trim();
  if (!sessionDates) throw new HttpError(422, "Give the session date and time");
  const updated = update(
    "bootcamp_attendance",
    String(record.id),
    { session_dates: sessionDates, meet_link: String(body.meet_link ?? ""), status: String(record.status) === "invited" ? "scheduled" : String(record.status) },
    session.actor,
    "Prep Bootcamp session scheduled and the founder notified",
  );
  const appRow = getOne("applications", applicationId);
  if (appRow) {
    notifyFounder(
      String(appRow.startup_id),
      "Your Prep Bootcamp session is scheduled",
      `Your Prep Bootcamp is on ${sessionDates}.${body.meet_link ? ` Join here: ${String(body.meet_link)}` : ""}`,
      "application",
      applicationId,
    );
  }
  return { ok: true, message: "Session scheduled; the founder can see the date and the meeting link.", data: updated };
};

const paymentProofReview: ActionHandler = ({ session, body }) => {
  const id = String(body.proof_id ?? "");
  const proof = getOne("payment_proofs", id);
  if (!proof) throw new HttpError(404, "Payment proof not found");
  const decision = String(body.decision ?? "verify");
  if (!["verify", "reject"].includes(decision)) throw new HttpError(422, "decision must be verify or reject");
  const record = update(
    "payment_proofs",
    id,
    { status: decision === "verify" ? "verified" : "rejected", reviewed_by_id: session.actor.id, reviewed_on: today(), review_note: String(body.note ?? "") },
    session.actor,
    decision === "verify" ? "Payment proof verified" : "Payment proof rejected",
  );
  // Verifying a proof still does not mark the invoice paid: Finance allocates the receipt
  // through `upfront.record_receipt`, which is the only action that settles the fee.
  notify("external", decision === "verify" ? "Payment proof verified" : "Payment proof needs attention", String(body.note ?? "Finance will update your invoice shortly."), "startup", String(proof.startup_id), founderUserOf(String(proof.startup_id)));
  return { ok: true, message: decision === "verify" ? "Proof verified; allocate the receipt in Finance" : "Proof rejected", data: record };
};


/* ------------------------------------------------------------------ */
/* Bootcamp acknowledgement and pitch reschedule requests              */
/* ------------------------------------------------------------------ */

const founderBootcampRespond: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const application = currentApplication(startupId, session.seasonId);
  if (!application) throw new HttpError(404, "No bootcamp invitation is open for you");
  const record = get<Row>("SELECT * FROM bootcamp_attendance WHERE application_id = ?", String(application.id));
  if (!record) throw new HttpError(404, "No bootcamp invitation is open for you");
  const decision = String(body.decision ?? "");
  if (!["accept", "unavailable", "question"].includes(decision)) {
    throw new HttpError(422, "Choose accept, unavailable or question");
  }
  const note = String(body.note ?? "").trim();
  if (decision !== "accept" && !note) throw new HttpError(422, "Tell the team a little more so they can help");
  const acknowledgement = decision === "accept" ? "accepted" : decision === "unavailable" ? "unavailable" : "question";
  // Accepting the invitation is what "registered" means; the status follows the founder's
  // answer so the list, the badge and the stage all agree with the integer flag.
  const registrable = ["not_invited", "invited", "scheduled", "registered"].includes(String(record.status));

  const updated = update(
    "bootcamp_attendance",
    String(record.id),
    {
      acknowledgement,
      acknowledged_on: today(),
      registered: decision === "accept" ? 1 : Number(record.registered ?? 0),
      status: decision === "accept" && registrable ? "registered" : String(record.status),
      questions: note || String(record.questions ?? ""),
    },
    session.actor,
    decision === "accept" ? "Founder accepted the bootcamp invitation" : "Founder responded to the bootcamp invitation",
  );
  notify(
    "startup_relationships",
    decision === "accept" ? "Founder accepted the Prep Bootcamp invitation" : "Founder responded to the Prep Bootcamp invitation",
    note.slice(0, 200) || "The founder accepted the invitation.",
    "startup",
    startupId,
  );
  return {
    ok: true,
    message: decision === "accept" ? "Thank you — your place is confirmed." : "Thank you — the team will follow up with you.",
    data: updated,
  };
};

const founderPitchRescheduleRequest: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const pitchId = String(body.pitch_id ?? "");
  const pitch = getOne("virtual_pitches", pitchId);
  if (!pitch || String(pitch.startup_id) !== startupId) throw new HttpError(404, "Pitch not found");
  if (Number(pitch.attended) === 1) throw new HttpError(409, "This pitch has already taken place");
  const reason = String(body.reason ?? "").trim();
  if (!reason) throw new HttpError(422, "Tell the team why the date does not work");
  update(
    "virtual_pitches",
    pitchId,
    { reschedule_reason: reason },
    session.actor,
    "Founder asked to reschedule the virtual pitch",
  );
  notify(
    "investor_relations",
    "Founder asked to reschedule a virtual pitch",
    reason.slice(0, 200),
    "startup",
    startupId,
  );
  return { ok: true, message: "The team will confirm a new date with you.", data: { ok: true } };
};

/* ------------------------------------------------------------------ */
/* Founders                                                            */
/* ------------------------------------------------------------------ */

/**
 * Create or update a founder row from the founder portal.
 *
 * The founder's own details are captured at registration, so this is normally an edit. It is
 * also how a co-founder is added. Personal details stay marked analyst-restricted, and a
 * founder can only ever touch their own startup's rows.
 */
const founderSave: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name) throw new HttpError(422, "The founder name is required");
  if (!email) throw new HttpError(422, "The founder email is required");

  const id = String(body.id ?? "");
  if (id) {
    const existing = getOne("founders", id);
    if (!existing || String(existing.startup_id) !== startupId) throw new HttpError(403, "That founder record is not yours");
    const updated = update(
      "founders",
      id,
      {
        name,
        role: String(body.role ?? existing.role ?? "Founder"),
        email,
        phone: String(body.phone ?? ""),
        linkedin: String(body.linkedin ?? ""),
      },
      session.actor,
      "Founder updated their own details",
    );
    return { ok: true, message: `${name}'s details saved.`, data: { founder: updated } };
  }

  const rows = all<Row>("SELECT * FROM founders WHERE startup_id = ?", startupId);
  // Without an explicit id, treat a matching email as the same person rather than adding a
  // duplicate: the portal can save a row it never received an id for, and a repeat save must
  // not multiply the founder team.
  const byEmail = rows.find((r) => String(r.email ?? "").trim().toLowerCase() === email.toLowerCase());
  if (byEmail) {
    const updated = update(
      "founders",
      String(byEmail.id),
      {
        name,
        role: String(body.role ?? byEmail.role ?? "Founder"),
        email,
        phone: String(body.phone ?? ""),
        linkedin: String(body.linkedin ?? ""),
      },
      session.actor,
      "Founder updated their own details",
    );
    return { ok: true, message: `${name}'s details saved.`, data: { founder: updated } };
  }

  const founder = create(
    "founders",
    {
      startup_id: startupId,
      name,
      role: String(body.role ?? "Co-founder"),
      email,
      phone: String(body.phone ?? ""),
      linkedin: String(body.linkedin ?? ""),
      is_primary: rows.length === 0 ? 1 : 0,
      restricted_to_analyst: 1,
    },
    session.actor,
  );
  return { ok: true, message: `${name} added to the founder team.`, data: { founder } };
};

export const ACTIONS_F: Record<string, ActionHandler> = {
  "founder_side.save_draft": founderSaveDraft,
  "founder_side.mou_sign": founderMouSign,
  "founder_side.mou_clarify": founderMouClarify,
  "founder_side.mou_upload_signed": founderMouUploadSigned,
  "founder_side.message_send": founderMessageSend,
  "founder_side.document_upload": founderDocumentUpload,
  "founder_side.document_respond": founderDocumentRespond,
  "founder_side.deal_document": founderDealDocument,
  "founder_side.tranche_confirm": founderTrancheConfirm,
  "founder_side.telecast_update": founderTelecastUpdate,
  "founder_side.pitch_day_confirm": founderPitchDayConfirm,
  "founder_side.bootcamp_respond": founderBootcampRespond,
  "founder_side.pitch_reschedule_request": founderPitchRescheduleRequest,
  "founder_side.fee_proof_submit": founderFeeProofSubmit,
  "founder_side.success_fee_proof": founderSuccessFeeProof,
  "founder_side.shoot_confirm": founderShootConfirm,
  "founder_side.read_notices": founderReadNotices,
  "founder_side.save_founder": founderSave,

  "document.request_create": documentRequestCreate,
  "document.request_verify": documentRequestVerify,
  "founder.message_reply": founderMessageReply,
  "pitchday.option_offer": pitchDayOptionOffer,
  "pitchday.confirm_slots": pitchDayConfirmSlots,
  "bootcamp.schedule": bootcampSchedule,
  "payment_proof.review": paymentProofReview,
};
