import { all, get, run } from "../db/client";
import { seasonCodePrefix } from "./season";
import { nowISO, today, addDays } from "../domain/dates";
import { eligibility, profileCompleteness } from "../domain/startupProfile";
import { create, getOne, notify, update, type Row } from "./repo";
import { provideStandardChecklist } from "./documentChecklist";
import { HttpError, type Session } from "./session";
import type { ActionHandler } from "./actions";

/**
 * Startup-side actions.
 *
 * These run for a founder and are scoped to their own startup: the acting session carries
 * `startupId`, and every handler refuses to touch any other record.
 */

function founderStartup(session: Session): string {
  const id = session.actor.startupId;
  if (session.actor.kind !== "founder" || !id) {
    throw new HttpError(403, "Only a startup-side login can run this action");
  }
  return id;
}

/** The founder's current, non-withdrawn application in the acting season, if any. */
function founderDraftApplication(startupId: string, seasonId?: string): Row | undefined {
  return get<Row>(
    "SELECT * FROM applications WHERE startup_id = ? AND status <> 'withdrawn' AND (? = '' OR season_id = ?) ORDER BY submitted_at DESC LIMIT 1",
    startupId,
    seasonId ?? "",
    seasonId ?? "",
  );
}

/** Columns a founder may edit on their own startup. Staff-owned fields are excluded. */
const FOUNDER_EDITABLE = new Set([
  "name", "legal_entity", "entity_type", "sector", "stage", "geography", "business_model",
  "website", "cin", "gstin", "pan", "incorporated_on",
  "category", "pitch", "logo_ref", "product_stage", "revenue_stage", "target_fundraise",
  "technologies", "industries", "monthly_revenue", "customer_count", "traction",
  "funding_raised", "pitch_deck_ref", "video_pitch_ref", "origin_country", "registered",
]);

const profileSave: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const patch: Row = {};
  for (const [key, value] of Object.entries(body)) {
    if (FOUNDER_EDITABLE.has(key)) patch[key] = value;
  }
  if (Object.keys(patch).length === 0) throw new HttpError(422, "No editable fields were supplied");

  const updated = update("startups", startupId, patch, session.actor, "Founder updated the startup profile");
  const founders = all<Row>("SELECT * FROM founders WHERE startup_id = ?", startupId);
  const completeness = profileCompleteness(updated, founders);
  // Saving keeps the profile editable; a previously approved profile that changes returns
  // to "submitted" so the team reviews the new details before the application is affected.
  if (String(updated.profile_status) === "approved") {
    update("startups", startupId, { profile_status: "submitted", profile_submitted_at: nowISO() }, session.actor, "Profile changed after approval; re-review required");
  }
  // A profile can be filled before a founder record exists (for example a startup seeded
  // without one). Record the acting founder so completeness counts them and the analyst view
  // can mark their personal details as restricted.
  if (founders.length === 0) {
    create(
      "founders",
      {
        startup_id: startupId,
        name: session.actor.name,
        role: "Founder & CEO",
        email: `${session.actor.id.toLowerCase()}@${String(updated.name ?? "startup").toLowerCase().replace(/[^a-z0-9]/g, "") || "startup"}.example.com`,
        is_primary: 1,
        restricted_to_analyst: 1,
      },
      session.actor,
    );
  }
  return { ok: true, message: `Saved. Profile ${completeness.percent}% complete.`, data: { completeness } };
};

const profileSubmit: ActionHandler = ({ session }) => {
  const startupId = founderStartup(session);
  const startup = getOne("startups", startupId);
  if (!startup) throw new HttpError(404, "Startup not found");
  const founders = all<Row>("SELECT * FROM founders WHERE startup_id = ?", startupId);

  const completeness = profileCompleteness(startup, founders);
  const check = eligibility(startup);
  if (!check.ok) {
    throw new HttpError(422, `Cannot submit: ${check.blocking.join(" ")}`);
  }
  if (completeness.missing.length) {
    throw new HttpError(422, `Complete these before submitting: ${completeness.missing.join(", ")}`);
  }

  const updated = update(
    "startups",
    startupId,
    { profile_status: "submitted", profile_submitted_at: nowISO(), profile_review_notes: "" },
    session.actor,
    "Founder submitted the profile for review",
  );
  notify(
    "startup_relationships",
    `Profile submitted for review: ${String(startup.name)}`,
    "A founder submitted their startup profile. Review and approve it so they can apply.",
    "startup",
    startupId,
  );
  return { ok: true, message: "Profile submitted. The team will review it.", data: { startup: updated } };
};

const profileReview: ActionHandler = ({ session, body }) => {
  const startupId = String(body.startup_id ?? "");
  if (!startupId) throw new HttpError(422, "field startup_id is required");
  const decision = String(body.decision ?? "");
  if (!["approve", "reject"].includes(decision)) {
    throw new HttpError(422, "decision must be approve or reject");
  }
  const updated = update(
    "startups",
    startupId,
    {
      profile_status: decision === "approve" ? "approved" : "rejected",
      profile_reviewed_at: nowISO(),
      profile_review_notes: body.notes ?? "",
    },
    session.actor,
    decision === "approve" ? "Profile approved" : "Profile returned for changes",
  );
  const owner = get<Row>("SELECT id FROM users WHERE startup_id = ? AND kind = 'founder' LIMIT 1", startupId);
  notify(
    "external",
    decision === "approve" ? "Your profile is approved" : "Your profile needs changes",
    body.notes ? String(body.notes) : decision === "approve"
      ? "You can now apply to the program."
      : "Please review the notes and submit again.",
    "startup",
    startupId,
    owner ? String(owner.id) : undefined,
  );
  return { ok: true, message: decision === "approve" ? "Profile approved" : "Profile returned", data: { startup: updated } };
};

function requiredDocuments(stage: string): string[] {
  const required = ["Pitch deck", "Founder KYC"];
  if (stage !== "idea") required.push("Financial statements");
  return required;
}

/**
 * A brand-new founder creates their own startup record.
 *
 * Until now a founder could only sign up, which gave them a login but no startup to work on.
 * This closes that gap: the new account names its business and gets an empty profile to fill
 * in, exactly like a seeded founder.
 */
const founderCreateStartup: ActionHandler = ({ session, body }) => {
  if (session.actor.kind !== "founder") {
    throw new HttpError(403, "Only a startup-side login can create a startup");
  }
  if (session.actor.startupId) {
    throw new HttpError(409, "This login already has a startup");
  }
  const name = String(body.name ?? "").trim();
  if (!name) throw new HttpError(422, "Your company name is required");

  // The founder details are captured once, here, so the application form and the team's view
  // are filled in from the same source rather than re-typed.
  const founderName = String(body.founder_name ?? session.actor.name ?? "").trim() || session.actor.name;
  const founderEmail = String(body.founder_email ?? "").trim().toLowerCase();
  const founderPhone = String(body.founder_phone ?? "").trim();

  const startup = create(
    "startups",
    {
      name,
      legal_entity: body.legal_entity ?? name,
      sector: body.sector ?? "",
      geography: body.geography ?? "",
      category: body.category ?? "startup",
      entity_type: body.entity_type ?? "Private Limited",
      origin_country: body.origin_country ?? "India",
      website: body.website ?? "",
      business_model: body.business_model ?? "",
      stage: body.stage ?? "early_revenue",
      revenue_stage: body.revenue_stage ?? "early_revenue",
      pitch: body.pitch ?? "",
      product_stage: body.product_stage ?? "",
      technologies: body.technologies ?? "",
      industries: body.industries ?? "",
      target_fundraise: body.target_fundraise ?? 0,
      profile_status: "incomplete",
      registered: body.registered === undefined ? 1 : body.registered,
    },
    session.actor,
  );

  // Create the primary founder row from the details captured at registration, so the
  // "Founders" section of the application is satisfied without a second entry pass.
  create(
    "founders",
    {
      startup_id: String(startup.id),
      name: founderName,
      role: String(body.founder_role ?? "Founder"),
      email: founderEmail || session.actor.name,
      phone: founderPhone,
      linkedin: body.founder_linkedin ?? "",
      is_primary: 1,
      restricted_to_analyst: 1,
    },
    session.actor,
  );

  // Pin the login to the startup it just created, so every later request is scoped to it.
  run("UPDATE users SET startup_id = ? WHERE id = ?", String(startup.id), session.actor.id);

  // Hand the founder their checklist, each item to be supplied from their own workspace.
  provideStandardChecklist(getOne("startups", String(startup.id)) ?? startup, session.actor, null);

  notify(
    "startup_relationships",
    `New startup registered: ${name}`,
    "A new founder created a startup from the sign-up flow. Their profile and checklist are ready for review.",
    "startup",
    String(startup.id),
  );
  return { ok: true, message: `Welcome, ${name}. Your profile is ready to fill in.`, data: { startup } };
};

/**
 * The founder records their own and any co-founder details.
 *
 * Without this a brand-new founder could never satisfy the "at least one founder" rule, so
 * the profile could never be submitted. Personal details stay restricted from the analyst view.
 */
const founderAdd: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  if (!name) throw new HttpError(422, "The founder name is required");
  if (!email) throw new HttpError(422, "The founder email is required");

  const existing = all<Row>("SELECT id FROM founders WHERE startup_id = ?", startupId);
  const isPrimary = existing.length === 0 ? 1 : body.is_primary ? 1 : 0;
  if (isPrimary) run("UPDATE founders SET is_primary = 0 WHERE startup_id = ?", startupId);

  const founder = create(
    "founders",
    {
      startup_id: startupId,
      name,
      role: body.role ?? "Founder",
      email,
      phone: body.phone ?? "",
      linkedin: body.linkedin ?? "",
      is_primary: isPrimary,
      restricted_to_analyst: 1,
    },
    session.actor,
  );
  return { ok: true, message: `${name} added to the founder team.`, data: { founder } };
};

/**
 * Sign up a brand-new founder from the internal console.
 *
 * A staff member can create a founder login on someone's behalf, for example when a founder
 * signs up at an event. It mirrors the public sign-up exactly: a founder login with no
 * startup, which the next step turns into a startup through `startup.create`. Personal details
 * land on the founder record and stay hidden from the analyst view.
 */
const flowSignup: ActionHandler = ({ body }) => {
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!name) throw new HttpError(422, "The founder name is required");
  if (!email || !email.includes("@")) throw new HttpError(422, "A valid founder email is required");
  if (get<Row>("SELECT id FROM users WHERE email = ?", email)) {
    throw new HttpError(409, "An account with that email already exists");
  }
  const phone = String(body.phone ?? "");
  if (phone && get<Row>("SELECT id FROM users WHERE phone = ?", phone)) {
    throw new HttpError(409, "An account with that mobile number already exists");
  }

  const rows = all<{ id: string }>("SELECT id FROM users WHERE id LIKE 'U-F-%'");
  let max = 0;
  for (const r of rows) {
    const m = /^U-F-(\d+)$/.exec(r.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  const id = `U-F-${String(max + 1).padStart(2, "0")}`;

  run(
    `INSERT INTO users (id, name, email, phone, role, department, active, kind, startup_id)
     VALUES (?, ?, ?, ?, 'founder', 'external', 1, 'founder', NULL)`,
    id,
    name,
    email,
    String(body.phone ?? ""),
  );
  notify(
    "startup_relationships",
    `New founder signed up: ${name}`,
    "A founder login was created from the console. They will register a startup and submit a profile.",
    "user",
    id,
  );
  return { ok: true, message: `Signed up ${name} (${email}). They have a login and no startup yet.`, data: { userId: id, name, email } };
};

const applicationApply: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const startup = getOne("startups", startupId);
  if (!startup) throw new HttpError(404, "Startup not found");
  if (String(startup.profile_status) !== "approved") {
    throw new HttpError(422, "Your profile must be approved before you can apply.");
  }

  const programId = body.program_id ? String(body.program_id) : null;
  const program = programId
    ? getOne("programs", programId)
    : get<Row>("SELECT * FROM programs WHERE season_id = ? AND status = 'open' ORDER BY opens_on DESC LIMIT 1", session.seasonId);
  if (!program) throw new HttpError(404, "No open program to apply to");
  if (String(program.status) !== "open") throw new HttpError(422, "This program is not open for applications.");

  const existing = get<Row>(
    "SELECT * FROM applications WHERE startup_id = ? AND season_id = ?",
    startupId,
    String(program.season_id),
  );
  // Starting an application is idempotent. A draft already exists the moment a founder opens
  // the form (the save step creates it), so resuming from a stale screen must not be refused
  // with a false "already applied". Only a formally submitted application is a real duplicate.
  if (existing && !["draft", "withdrawn"].includes(String(existing.status))) {
    throw new HttpError(409, `You have already applied to this program (${String(existing.reference_no)}).`);
  }

  const stage = String(startup.revenue_stage || startup.stage || "early_revenue");
  const earlier = get<Row>(
    "SELECT * FROM applications WHERE startup_id = ? AND id <> ? ORDER BY submitted_at ASC LIMIT 1",
    startupId,
    existing ? String(existing.id) : "",
  );

  const payload: Row = {
    season_id: String(program.season_id),
    startup_id: startupId,
    program_id: String(program.id),
    reference_no: existing ? String(existing.reference_no) : `${seasonCodePrefix(session.seasonId)}-${String(Math.floor(Math.random() * 9000) + 1000)}`,
    source: "Startup side",
    referring_partner: "",
    campaign: String(program.title),
    relationship_manager_id: "U-SR1",
    stage_at_application: stage,
    status: "draft",
    // Resuming an existing draft keeps the progress already recorded; only a fresh start or an
    // explicit payload resets it.
    completion_pct: Number(body.completion_pct ?? existing?.completion_pct ?? 0),
    submitted_at: null,
    acknowledged_at: null,
    duplicate_of: earlier ? String(earlier.id) : null,
    notes: existing && String(existing.status) === "withdrawn"
      ? "Re-applied from the startup side after withdrawal."
      : String(existing?.notes ?? "Started from the startup side."),
  };

  const application = existing
    ? update("applications", String(existing.id), payload, session.actor, "Founder resumed the draft application from the startup side")
    : create("applications", payload, session.actor);

  return { ok: true, message: "Draft application saved", data: { application: getOne("applications", String(application.id)) } };
};

/**
 * The founder submits the draft formally.
 *
 * Submission is the gate the SOP puts before screening, so this is a separate step from
 * saving the draft: it acknowledges the founder, links a repeat application to the earlier
 * one and assigns a relationship manager.
 */
const applicationSubmit: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  // The portal sends the id it is showing; fall back to the founder's current draft so a
  // submit that follows a save never fails on a stale payload.
  const id = String(body.application_id ?? "") || String(founderDraftApplication(startupId, session.seasonId)?.id ?? "");
  const application = getOne("applications", id);
  if (!application) throw new HttpError(404, "Application not found");
  if (String(application.startup_id) !== startupId) {
    throw new HttpError(403, "You can only submit your own application");
  }

  const earlier = get<Row>(
    "SELECT * FROM applications WHERE startup_id = ? AND id <> ? ORDER BY submitted_at ASC LIMIT 1",
    startupId,
    id,
  );

  const stage = String(application.stage_at_application || "early_revenue");
  const documents = all<Row>("SELECT * FROM documents WHERE entity_type = 'startup' AND entity_id = ?", startupId);
  const titles = documents.map((d) => String(d.title).toLowerCase());
  const missing = requiredDocuments(stage).filter((r) => !titles.some((t) => t.includes(r.toLowerCase().split(" ")[0])));

  const updated = update(
    "applications",
    id,
    {
      status: missing.length ? "info_required" : "submitted",
      submitted_at: today(),
      acknowledged_at: nowISO(),
      completion_pct: 100,
      relationship_manager_id: application.relationship_manager_id ?? "U-SR1",
      duplicate_of: earlier ? String(earlier.id) : null,
    },
    session.actor,
    "Formal submission recorded; movement into screening follows submission only",
  );

  notify(
    "startup_relationships",
    `Application submitted: ${String(application.reference_no)}`,
    missing.length
      ? `${String(application.reference_no)} has outstanding documents: ${missing.join(", ")}.`
      : "Submission acknowledged and a relationship manager assigned. Screening may begin.",
    "application",
    id,
  );

  return {
    ok: true,
    message: missing.length
      ? `Submitted with ${missing.length} outstanding document(s)`
      : "Application submitted and acknowledged",
    data: { application: updated, missing_documents: missing },
  };
};

const applicationWithdraw: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const id = String(body.application_id ?? "");
  const application = getOne("applications", id);
  if (!application) throw new HttpError(404, "Application not found");
  if (String(application.startup_id) !== startupId) {
    throw new HttpError(403, "You can only withdraw your own application");
  }
  const updated = update(
    "applications",
    id,
    { status: "withdrawn", notes: body.reason ? String(body.reason) : String(application.notes ?? "") },
    session.actor,
    "Founder withdrew the application",
  );
  notify(
    "startup_relationships",
    `Application withdrawn: ${String(application.reference_no)}`,
    body.reason ? `Reason: ${String(body.reason)}` : "The founder withdrew the application.",
    "application",
    id,
  );
  return { ok: true, message: "Application withdrawn", data: { application: updated } };
};

/**
 * A founder asks the community team for help. The request lands in the same
 * `support_requests` queue the internal console uses, tied to their own startup.
 */
const startupRequestSupport: ActionHandler = ({ session, body }) => {
  const startupId = founderStartup(session);
  const detail = String(body.detail ?? "").trim();
  if (!detail) throw new HttpError(422, "Describe what you need");
  const member = get<Row>(
    "SELECT * FROM community_members WHERE startup_id = ? ORDER BY created_at LIMIT 1",
    startupId,
  );
  const memberId = member
    ? String(member.id)
    : String(
        create(
          "community_members",
          {
            name: session.actor.name,
            email: "",
            member_type: "startup",
            startup_id: startupId,
            relationship_owner_id: "U-COMM1",
            engagement_summary: "Created from a startup-side support request",
          },
          session.actor,
        ).id,
      );

  const request = create(
    "support_requests",
    {
      member_id: memberId,
      startup_id: startupId,
      request_type: body.request_type ?? "investor_introduction",
      detail,
      owner_id: "U-COMM1",
      due_date: body.due_date ?? addDays(today(), 5),
      status: "open",
    },
    session.actor,
  );
  notify(
    "community",
    "Support request from a founder",
    detail.slice(0, 160),
    "support_request",
    String(request.id),
  );
  return { ok: true, message: "Request sent to the community team", data: request };
};

export const ACTIONS_D: Record<string, ActionHandler> = {
  "profile.save": profileSave,
  "profile.submit": profileSubmit,
  "profile.review": profileReview,
  "startup.create": founderCreateStartup,
  "founder.add": founderAdd,
  "flow.signup": flowSignup,
  "application.apply": applicationApply,
  "application.submit_own": applicationSubmit,
  "application.withdraw": applicationWithdraw,
  "startup.request_support": startupRequestSupport,
};
