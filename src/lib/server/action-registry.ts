import { ACTIONS_A, type ActionContext, type ActionHandler } from "./actions";
import { ACTIONS_B } from "./actions-b";
import { ACTIONS_C } from "./actions-c";
import { ACTIONS_D } from "./actions-d";
import { ACTIONS_E } from "./actions-e";
import { ACTIONS_F } from "./actions-f";
import { ACTIONS_G } from "./actions-g";
import { HttpError } from "./session";

/**
 * Action registry.
 *
 * Every named business action lives here. The API route looks an action up by name and
 * runs it, which keeps the workflows out of the transport layer.
 */

export const ACTIONS: Record<string, ActionHandler> = {
  ...ACTIONS_A,
  ...ACTIONS_B,
  ...ACTIONS_C,
  ...ACTIONS_D,
  ...ACTIONS_E,
  ...ACTIONS_F,
  ...ACTIONS_G,
};

export interface ActionDescriptor {
  name: string;
  group: string;
  label: string;
  description: string;
  /** Roles allowed to run the action. Management and Admin always may. */
  roles: string[];
}

export const ACTION_CATALOG: ActionDescriptor[] = [
  { name: "application.draft", group: "Startup journey", label: "Create draft application", description: "Save-and-resume draft with stage-appropriate mandatory fields.", roles: ["startup_relationship_manager", "community"] },
  { name: "application.submit", group: "Startup journey", label: "Submit application", description: "Acknowledgement, duplicate link and relationship-manager assignment; moves into screening.", roles: ["startup_relationship_manager"] },
  { name: "screening.score", group: "Startup journey", label: "Score screening (100 marks)", description: "Applies the qualifying rule and records the outcome.", roles: ["startup_relationship_manager", "analyst"] },
  { name: "bootcamp.invite", group: "Startup journey", label: "Invite to Prep Bootcamp", description: "Records the invitation and starts the attendance clock.", roles: ["startup_relationship_manager"] },
  { name: "bootcamp.record", group: "Startup journey", label: "Record bootcamp preparation", description: "Records attendance and session completion; readiness requires every session.", roles: ["startup_relationship_manager"] },
  { name: "analyst.evaluate", group: "Startup journey", label: "Record analyst evaluation", description: "Indicative willingness to invest stays separate from a commitment.", roles: ["analyst", "startup_relationship_manager"] },
  { name: "mou.share", group: "Startup journey", label: "Share MoU", description: "Starts the review clock and sets the AMA and signing deadlines.", roles: ["startup_relationship_manager", "legal"] },
  { name: "mou.record_ama", group: "Startup journey", label: "Record Legal AMA", description: "Marks the fourth-working-day Legal AMA as done.", roles: ["legal", "startup_relationship_manager"] },
  { name: "mou.respond", group: "Startup journey", label: "Record MoU response", description: "Proceed, Negotiate or Discontinue; negotiation escalates to Management.", roles: ["startup_relationship_manager", "legal"] },
  { name: "irr.request", group: "Startup journey", label: "Request IRR", description: "Startup Relationships initiates the IRR request after MoU signing.", roles: ["startup_relationship_manager"] },
  { name: "irr.advance", group: "Startup journey", label: "Advance IRR", description: "Accept the handover, send the checklist, prepare, review, approve or share with IR.", roles: ["finance", "management"] },

  { name: "investor.create", group: "Investor journey", label: "Create investor", description: "Investor record with category, source, thesis and allocation.", roles: ["investor_relations", "community"] },
  { name: "investor.verify", group: "Investor journey", label: "Verify investor", description: "Checks the eligibility policy before marking verified.", roles: ["investor_relations"] },
  { name: "investor.grade", group: "Investor journey", label: "Grade investor (L1-L4)", description: "Records dimension scores, evidence, permitted engagement and panel role.", roles: ["investor_relations", "management"] },
  { name: "investor.agreement", group: "Investor journey", label: "Record investor agreement", description: "Checks the mandatory document set for the investor category.", roles: ["investor_relations", "legal"] },
  { name: "match.suggest", group: "Investor journey", label: "Suggest matches", description: "Scores every eligible investor; the system recommends only.", roles: ["investor_relations"] },
  { name: "match.approve", group: "Investor journey", label: "Approve for circulation", description: "Investor Relations approves circulation.", roles: ["investor_relations"] },
  { name: "match.share", group: "Investor journey", label: "Share information", description: "Records the version shared with the investor.", roles: ["investor_relations"] },
  { name: "match.respond", group: "Investor journey", label: "Record investor response", description: "Ready to Invest, Ready to Proceed, Information Requested, Pass or No Response.", roles: ["investor_relations"] },
  { name: "pitch.schedule", group: "Investor journey", label: "Schedule virtual pitch", description: "Five minutes of pitch and five minutes of Q&A.", roles: ["investor_relations"] },
  { name: "pitch.record", group: "Investor journey", label: "Record pitch response", description: "Attendance, questions, responses and the SOP response option.", roles: ["investor_relations"] },
  { name: "pitchday.record", group: "Investor journey", label: "Record Pitch Day", description: "One-to-one slots, IRR and IM distribution, follow-on interest.", roles: ["investor_relations"] },
  { name: "pitchday.golden_pass", group: "Investor journey", label: "Issue Golden Pass", description: "Initial interest only; never treated as a written commitment.", roles: ["investor_relations"] },
  { name: "committee.decide", group: "Investor journey", label: "Record committee outcome", description: "Compiles the pack and records Proceed, On Hold or Rejected.", roles: ["management"] },
  { name: "preshoot.confirm", group: "Investor journey", label: "Confirm pre-shoot panel", description: "Raises an alert when the two-week IRR deadline is at risk.", roles: ["investor_relations"] },
  { name: "commitment.confirm", group: "Investor journey", label: "Confirm commitment", description: "Marks a written commitment as confirmed.", roles: ["investor_relations"] },
  { name: "commitment.revise", group: "Investor journey", label: "Revise commitment", description: "Creates a revised record and preserves the original with the reason.", roles: ["investor_relations"] },
  { name: "commitment.withdraw", group: "Investor journey", label: "Withdraw commitment", description: "Records the withdrawal with a reason.", roles: ["investor_relations"] },

  { name: "upfront.initiate", group: "Finance", label: "Initiate upfront fee", description: "Calculates the fee from turnover on the approved schedule.", roles: ["finance", "startup_relationship_manager"] },
  { name: "upfront.approve", group: "Finance", label: "Approve applicable fee", description: "Management approves the fee and any exception.", roles: ["management"] },
  { name: "upfront.invoice", group: "Finance", label: "Issue invoice", description: "Raises the invoice and notifies the founder.", roles: ["finance"] },
  { name: "upfront.record_receipt", group: "Finance", label: "Verify and allocate receipt", description: "A payment screenshot alone never marks an invoice paid.", roles: ["finance"] },
  { name: "upfront.extension", group: "Finance", label: "Approve extension", description: "Preserves the original due date for ageing.", roles: ["management"] },
  { name: "upfront.waive", group: "Finance", label: "Waive fee", description: "Waiver with a recorded reason.", roles: ["management"] },
  { name: "upfront.dispute", group: "Finance", label: "Mark disputed", description: "Records a dispute and the reason.", roles: ["finance"] },
  { name: "upfront.refund", group: "Finance", label: "Process refund", description: "Refund with a credit note reference.", roles: ["management", "finance"] },

  { name: "deal.open", group: "Deal closure", label: "Open deal", description: "Deal confirmation, one closure owner and the 48-hour communication thread.", roles: ["investor_relations"] },
  { name: "deal.advance", group: "Deal closure", label: "Advance deal", description: "Term sheet, diligence, agreements, conditions, transfer, verification, allotment.", roles: ["investor_relations", "legal"] },
  { name: "deal.document", group: "Deal closure", label: "Record deal document", description: "The purpose drives the requirement, not the document title.", roles: ["legal", "investor_relations"] },
  { name: "tranche.schedule", group: "Deal closure", label: "Schedule tranche", description: "Adds a tranche to the funding round.", roles: ["investor_relations", "finance"] },
  { name: "tranche.report", group: "Deal closure", label: "Record investor-reported transfer", description: "Reported is not verified.", roles: ["investor_relations", "finance"] },
  { name: "tranche.confirm_receipt", group: "Deal closure", label: "Record startup confirmation", description: "Startup confirms the receipt.", roles: ["finance"] },
  { name: "tranche.verify", group: "Deal closure", label: "Verify tranche", description: "Verifies the amount, names the verifier and triggers the success fee.", roles: ["finance"] },
  { name: "tranche.reverse", group: "Deal closure", label: "Reverse tranche", description: "Links the reversal to the original tranche instead of editing it.", roles: ["finance"] },
  { name: "successfee.calculate", group: "Finance", label: "Calculate success fee", description: "Recomputes from verified deployment only.", roles: ["finance"] },
  { name: "successfee.invoice", group: "Finance", label: "Invoice success fee", description: "Applies discounts, waivers, partner settlements and any contractual upfront adjustment.", roles: ["finance"] },
  { name: "successfee.collect", group: "Finance", label: "Collect success fee", description: "Closure means the account reconciles.", roles: ["finance"] },
  { name: "ledger.add", group: "Finance", label: "Add ledger entry", description: "Manual charge, credit, tax, withholding or adjustment.", roles: ["finance"] },

  { name: "production.handover", group: "Production", label: "Raise production handover", description: "Advance notification is separate from the payment-cleared handover.", roles: ["production", "management", "startup_relationship_manager"] },
  { name: "production.accept", group: "Production", label: "Accept handover", description: "Blocked until payment is cleared.", roles: ["production"] },
  { name: "av.update", group: "Production", label: "Update AV shoot", description: "Story research, location, crew, schedule, shot requirements and assets.", roles: ["production"] },
  { name: "mock.update", group: "Production", label: "Update mock shoot", description: "Costumes, pitch revisions, demo readiness, rehearsal and final readiness.", roles: ["production"] },
  { name: "mainshoot.update", group: "Production", label: "Update main shoot", description: "Attendance, live ask and offers, accepted terms, allocations and signatures.", roles: ["production"] },

  { name: "episode.update", group: "Content", label: "Update episode", description: "Editing and approvals.", roles: ["production", "marketing"] },
  { name: "telecast.update", group: "Content", label: "Update telecast", description: "Notification, promotions, telecast, feedback and the public announcement.", roles: ["marketing"] },

  { name: "community.member_create", group: "Community", label: "Create community member", description: "One person record with several roles; confidential access is withheld.", roles: ["community"] },
  { name: "community.member_add_role", group: "Community", label: "Add member role", description: "Adds a role to the same person record.", roles: ["community"] },
  { name: "event.create", group: "Community", label: "Create event", description: "Purpose, owner and budget.", roles: ["community"] },
  { name: "event.register", group: "Community", label: "Register or record attendance", description: "Recalculates the event counts.", roles: ["community"] },
  { name: "event.complete", group: "Community", label: "Complete event", description: "Outcomes, follow-up tasks and feedback.", roles: ["community"] },
  { name: "referral.create", group: "Community", label: "Record referral", description: "Links to the existing startup record; keeps source and contributors separate.", roles: ["community"] },
  { name: "referral.advance", group: "Community", label: "Advance referral", description: "Qualified, engaged, converted or dropped with an outcome.", roles: ["community"] },
  { name: "support.create", group: "Community", label: "Create support request", description: "Owner, deadline and SLA from the community policy.", roles: ["community"] },
  { name: "support.resolve", group: "Community", label: "Close support request", description: "Outcome and founder feedback.", roles: ["community"] },

  { name: "task.create", group: "Platform", label: "Create task", description: "Owner, due date, required output, evidence, approver and next action.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "task.update", group: "Platform", label: "Update task", description: "Progress, evidence and completion.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "task.escalate", group: "Platform", label: "Escalate task", description: "Escalates to Management with a reason.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "handover.create", group: "Platform", label: "Raise handover", description: "Accepted handovers between teams.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "handover.accept", group: "Platform", label: "Accept or reject handover", description: "Rejection requires a reason.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "document.create", group: "Platform", label: "Record document", description: "Purpose-driven versioning; earlier versions are preserved.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "document.verify", group: "Platform", label: "Verify document", description: "Marks a document verified.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "legal"] },
  { name: "policy.revise", group: "Platform", label: "Revise policy", description: "Creates a new version with an effective date and approval history.", roles: ["management"] },
  { name: "integration.sync", group: "Platform", label: "Run integration sync", description: "Failed syncs raise an alert instead of stopping work silently.", roles: ["management", "finance"] },
  { name: "import.run", group: "Platform", label: "Run import", description: "Existing records are linked, not replaced.", roles: ["management"] },
  { name: "notification.read", group: "Platform", label: "Mark notifications read", description: "Clears the notification tray.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },

  { name: "profile.save", group: "Startup side", label: "Save startup profile", description: "The founder saves their own profile; stage-appropriate financial fields are optional.", roles: ["founder"] },
  { name: "profile.submit", group: "Startup side", label: "Submit profile for review", description: "Checks completeness and the registration rule before the profile goes to the team.", roles: ["founder"] },
  { name: "profile.review", group: "Startup side", label: "Review startup profile", description: "Approve the profile or return it with notes.", roles: ["startup_relationship_manager"] },
  { name: "startup.create", group: "Startup side", label: "Register a new startup", description: "A brand-new founder creates their own startup and is linked to it.", roles: ["founder"] },
  { name: "founder.add", group: "Startup side", label: "Add a founder", description: "The founder records their own or a co-founder's details; hidden from the analyst view.", roles: ["founder"] },
  { name: "flow.signup", group: "Startup journey", label: "Sign up a founder", description: "Creates a real founder login with no startup, for a founder who signs up at an event.", roles: [] },
  { name: "application.apply", group: "Startup side", label: "Start an application", description: "The founder starts a draft application; the record links to the existing startup and reports missing documents.", roles: ["founder"] },
  { name: "application.submit_own", group: "Startup side", label: "Submit the application", description: "The founder submits the draft formally; acknowledgement, duplicate link and manager assignment follow.", roles: ["founder"] },
  { name: "application.withdraw", group: "Startup side", label: "Withdraw application", description: "The founder withdraws their own application with a reason.", roles: ["founder"] },
  { name: "startup.request_support", group: "Startup side", label: "Request community support", description: "Investor introductions, mentoring, customer connections, hiring or follow-on funding.", roles: ["founder"] },

  { name: "investor_side.profile_save", group: "Investor side", label: "Save thesis and preferences", description: "The investor keeps their own thesis, ticket range and availability current; commercial terms stay staff-owned.", roles: ["investor"] },
  { name: "investor_side.respond", group: "Investor side", label: "Respond to a circulated startup", description: "Ready to Invest, Ready to Proceed, Information Requested, Pass or No Response.", roles: ["investor"] },
  { name: "investor_side.acknowledge_minutes", group: "Investor side", label: "Acknowledge meeting minutes", description: "The investor acknowledges the minutes of a meeting they attended.", roles: ["investor"] },
  { name: "investor_side.confirm_slot", group: "Investor side", label: "Record Pitch Day slot outcome", description: "A Golden Pass stays initial interest and never becomes a written commitment on its own.", roles: ["investor"] },
  { name: "investor_side.confirm_commitment", group: "Investor side", label: "Confirm a written commitment", description: "Confirms amount and terms; deployment is verified separately by Finance.", roles: ["investor"] },
  { name: "investor_side.report_transfer", group: "Investor side", label: "Report a fund transfer", description: "An investor-reported transfer is not verified deployment until Finance verifies the receipt.", roles: ["investor"] },
  { name: "investor_side.withdraw_commitment", group: "Investor side", label: "Withdraw a commitment", description: "Withdraws the investor's own commitment with a recorded reason.", roles: ["investor"] },
  { name: "investor_side.read_notices", group: "Investor side", label: "Mark notices read", description: "Clears the investor's notification tray.", roles: ["investor"] },

  { name: "founder_side.save_draft", group: "Founder portal", label: "Save the application draft", description: "Saves the founder's own profile fields and reports real completeness against the required fields.", roles: ["founder"] },
  { name: "founder_side.mou_sign", group: "Founder portal", label: "Sign the participation agreement", description: "The founder accepts and signs the agreement; a signed copy is recorded against the startup.", roles: ["founder"] },
  { name: "founder_side.success_fee_proof", group: "Founder portal", label: "Share success-fee payment proof", description: "The founder shares proof of a success-fee payment; Finance still verifies and allocates the receipt.", roles: ["founder"] },
  { name: "founder_side.mou_upload_signed", group: "Founder portal", label: "Upload a printed and signed agreement", description: "The founder prints, signs and uploads the agreement copy; it is recorded as the signing event.", roles: ["founder"] },
  { name: "founder_side.deal_document", group: "Founder portal", label: "Upload deal documentation", description: "The founder supplies a due-diligence or agreement document for one investor deal.", roles: ["founder"] },
  { name: "founder_side.tranche_confirm", group: "Founder portal", label: "Confirm a tranche was received", description: "The founder confirms a tranche landed; Finance still verifies before it counts as deployment.", roles: ["founder"] },
  { name: "founder_side.telecast_update", group: "Founder portal", label: "Update the telecast promotion step", description: "The founder marks the approved posts done and leaves feedback on the episode.", roles: ["founder"] },
  { name: "founder_side.mou_clarify", group: "Founder portal", label: "Ask about the agreement", description: "The founder raises a question on the agreement; the MoU moves to review and a thread opens.", roles: ["founder"] },
  { name: "founder_side.message_send", group: "Founder portal", label: "Send a message to the team", description: "Posts a message on one founder-facing stage thread, scoped to the founder's own startup.", roles: ["founder"] },
  { name: "founder_side.document_upload", group: "Founder portal", label: "Upload a requested document", description: "The founder supplies a document the team asked for; it goes to verification.", roles: ["founder"] },
  { name: "founder_side.document_respond", group: "Founder portal", label: "Respond on a document", description: "The founder answers a clarification on a requested document.", roles: ["founder"] },
  { name: "founder_side.pitch_day_confirm", group: "Founder portal", label: "Confirm Pitch Day availability", description: "The founder confirms which released dates they can attend; the team confirms the slot.", roles: ["founder"] },
  { name: "founder_side.fee_proof_submit", group: "Founder portal", label: "Share payment proof", description: "The founder shares payment proof; Finance still verifies and allocates the receipt.", roles: ["founder"] },
  { name: "founder_side.shoot_confirm", group: "Founder portal", label: "Confirm shoot availability", description: "The founder confirms their availability for the AV or main shoot.", roles: ["founder"] },
  { name: "founder_side.bootcamp_respond", group: "Founder portal", label: "Respond to the Prep Bootcamp invitation", description: "The founder accepts, flags that they cannot attend or asks a question; the team is notified.", roles: ["founder"] },
  { name: "founder_side.pitch_reschedule_request", group: "Founder portal", label: "Ask to reschedule a virtual pitch", description: "The founder asks for a new pitch date with a reason; Investor Relations is notified.", roles: ["founder"] },
  { name: "founder_side.read_notices", group: "Founder portal", label: "Mark notices read", description: "Clears the founder's notification tray.", roles: ["founder"] },
  { name: "founder_side.save_founder", group: "Founder portal", label: "Save founder details", description: "The founder records or edits their own and any co-founder's details; personal details stay hidden from the analyst view.", roles: ["founder"] },

  { name: "document.request_create", group: "Founder portal", label: "Request a document", description: "Adds a checklist item the founder must supply; the founder is notified.", roles: ["startup_relationship_manager", "finance", "legal", "investor_relations"] },
  { name: "document.request_verify", group: "Founder portal", label: "Verify or clarify a document", description: "Marks a supplied document verified, or asks the founder for a clarification.", roles: ["startup_relationship_manager", "finance", "legal", "investor_relations"] },
  { name: "founder.message_reply", group: "Founder portal", label: "Reply to a founder", description: "Posts the team's reply on a founder-facing stage thread.", roles: ["startup_relationship_manager", "finance", "legal", "investor_relations", "production"] },
  { name: "pitchday.option_offer", group: "Founder portal", label: "Offer a Pitch Day date", description: "Releases a date to the founder to confirm.", roles: ["investor_relations"] },
  { name: "pitchday.confirm_slots", group: "Founder portal", label: "Approve the founder's Pitch Day slots", description: "The team verifies, validates and approves the founder's picks, or asks for a change.", roles: ["investor_relations"] },
  { name: "bootcamp.schedule", group: "Startup journey", label: "Schedule the Prep Bootcamp session", description: "Fixes the session date and time and shares the meeting link with the founder.", roles: ["startup_relationship_manager"] },
  { name: "payment_proof.review", group: "Founder portal", label: "Review a payment proof", description: "Verifies or rejects a founder's payment proof; the invoice is still settled by Finance allocating the receipt.", roles: ["finance"] },

  { name: "approval.raise", group: "Platform", label: "Raise an approval", description: "Puts an item into the one approvals inbox with a two-working-day deadline.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "approval.decide", group: "Platform", label: "Decide an approval", description: "Approve or reject with a reason; the decision records which super admin decided. Bulk approval is limited to low-risk types.", roles: ["management"] },
  { name: "approval.withdraw", group: "Platform", label: "Withdraw an approval", description: "The requester withdraws an item that is no longer needed.", roles: ["management", "startup_relationship_manager", "investor_relations", "finance", "production", "community", "marketing", "legal"] },
  { name: "legal.template_create", group: "Legal", label: "Create a legal template version", description: "A new version supersedes the old one; the live version is never edited.", roles: ["legal"] },
  { name: "legal.template_approve", group: "Legal", label: "Send a template for approval", description: "Raises the template into the super-admin inbox.", roles: ["legal"] },
  { name: "legal.template_activate", group: "Legal", label: "Activate a template for the season", description: "Makes one approved version the active template for its type.", roles: ["legal", "management"] },
  { name: "legal.dd_finding_raise", group: "Legal", label: "Log a due-diligence finding", description: "A finding with a severity, owner and due date inside the IR-owned deal.", roles: ["legal"] },
  { name: "legal.dd_finding_resolve", group: "Legal", label: "Resolve a due-diligence finding", description: "A finding cannot close without resolution notes.", roles: ["legal"] },
  { name: "legal.condition_create", group: "Legal", label: "Add a pre-funding condition", description: "A blocker condition visibly blocks tranche scheduling.", roles: ["legal"] },
  { name: "legal.condition_clear", group: "Legal", label: "Clear a pre-funding condition", description: "Marks a condition met or waived with evidence.", roles: ["legal"] },
  { name: "shoot.exception_log", group: "Production", label: "Log a shoot-day exception", description: "One of the five typed exceptions; each notifies the right team automatically.", roles: ["production", "investor_relations"] },
  { name: "signing.event_create", group: "Production", label: "Record a signing event", description: "The signing event, not the document title, decides which document is required and by when.", roles: ["production", "legal", "investor_relations"] },
  { name: "signing.event_complete", group: "Production", label: "Complete a signing event", description: "Records the signature and its document; a refusal escalates to IR and the super admin.", roles: ["production", "legal", "investor_relations"] },
  { name: "announcement.draft", group: "Marketing", label: "Draft a public announcement", description: "Pulls the announced, committed and verified-deployed figures and flags any overstatement.", roles: ["marketing"] },
  { name: "announcement.submit", group: "Marketing", label: "Send an announcement for approval", description: "Sends the wording to the investor; the investor's approval is mandatory.", roles: ["marketing"] },
  { name: "announcement.investor_approve", group: "Marketing", label: "Record investor approval of wording", description: "The investor approves or rejects the public wording; founder approval is not needed.", roles: ["investor_relations", "management"] },
  { name: "announcement.publish", group: "Marketing", label: "Publish an announcement", description: "Publishing is refused until the investor has approved the wording.", roles: ["marketing"] },
  { name: "finance.tds_record", group: "Finance", label: "Record a TDS entry", description: "Records tax deducted at source; the Form 16A certificate is still pending.", roles: ["finance"] },
  { name: "finance.form16a_receive", group: "Finance", label: "Record a Form 16A certificate", description: "Marks the TDS certificate received, which reconciliation requires.", roles: ["finance"] },
  { name: "finance.reconciliation_check", group: "Finance", label: "Check reconciliation readiness", description: "The account closes only when it balances and every TDS certificate is in.", roles: ["finance"] },
  { name: "admin.reassign", group: "Platform", label: "Reassign a startup or investor", description: "Super admin only; updates ownership everywhere with a reason and an audit trail.", roles: ["management"] },
  { name: "admin.season_setup", group: "Platform", label: "Run season setup", description: "Window, fee schedule, episodes, expert panel and templates; the season cannot open until each step is complete.", roles: ["management"] },
  { name: "community.member_merge", group: "Community", label: "Merge duplicate members", description: "Folds a duplicate into the surviving person record, preserving roles and history.", roles: ["community", "management"] },
  { name: "community.event_budget_approve", group: "Community", label: "Send an event budget for approval", description: "Raises the event budget into the super-admin inbox.", roles: ["community"] },
];

export const ACTION_CATALOG_MAP: Record<string, ActionDescriptor> = Object.fromEntries(
  ACTION_CATALOG.map((a) => [a.name, a]),
) as Record<string, ActionDescriptor>;

export function runAction(name: string, ctx: ActionContext) {
  const handler = ACTIONS[name];
  if (!handler) throw new HttpError(404, `unknown action: ${name}`);
  const descriptor = ACTION_CATALOG_MAP[name];
  const role = ctx.session.actor.role;
  if (descriptor && role !== "admin" && role !== "management" && !descriptor.roles.includes(role)) {
    throw new HttpError(403, `Role ${role} may not run ${name}`);
  }
  if (!ctx.session.canWrite) throw new HttpError(403, "This role has read-only access");
  // Carry the acting season on the actor so `create()` can stamp a new row with it.
  if (!ctx.session.actor.seasonId) ctx.session.actor.seasonId = ctx.session.seasonId;
  return handler(ctx);
}

export function actionsForRole(role: string): ActionDescriptor[] {
  if (role === "admin" || role === "management") return ACTION_CATALOG;
  return ACTION_CATALOG.filter((a) => a.roles.includes(role));
}
