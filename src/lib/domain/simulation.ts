/**
 * The live simulation script.
 *
 * This is *not* a mock of the application. Each step points at a real route and, where the
 * step does work, at a real business action from the action catalogue. The runner navigates
 * the real router and fires the real action through the real API, so the screens and the
 * records behind them actually move as the run proceeds. Nothing here draws a screen of its
 * own.
 *
 * A step names the persona that owns it. A run acts as the signed-in persona, so a step owned
 * by someone else is shown on its real screen but not executed from this session.
 */

import type { Persona } from "./personas";

export type SimJourney = "startup" | "investor" | "content" | "investment" | "finance" | "community";

export interface SimStep {
  id: string;
  journey: SimJourney;
  /** Short title for the coach bar. */
  title: string;
  /** The real route this step opens. */
  route: string;
  /** The real action this step runs, if it does work. */
  action?: string;
  /** The persona that owns this step. */
  owner: Persona["key"];
  /** One line on what to look at on the real screen. */
  lookAt: string;
}

export interface SimJourneyMeta {
  key: SimJourney;
  label: string;
  blurb: string;
}

export const SIM_JOURNEYS: SimJourneyMeta[] = [
  { key: "startup", label: "Startup journey", blurb: "Application draft through post-shoot documentation." },
  { key: "investor", label: "Investor journey", blurb: "Sourcing through shoot-day deal confirmation." },
  { key: "content", label: "Content", blurb: "Editing, approvals, telecast, promotions and founder feedback." },
  { key: "investment", label: "Investment", blurb: "Deal confirmation through fund transfer, deployment and portfolio engagement." },
  { key: "finance", label: "Finance", blurb: "Upfront fee collection and post-funding success fee collection and reconciliation." },
  { key: "community", label: "Community", blurb: "Membership, events, referrals, founder support and outcomes." },
];

export const SIM_STEPS: SimStep[] = [
  /* Startup journey -------------------------------------------------- */
  { id: "app-draft", journey: "startup", title: "Application draft", route: "/applications", action: "application.draft", owner: "startup_relationship", lookAt: "Save-and-resume draft; mandatory fields follow the applicant's stage." },
  { id: "app-submit", journey: "startup", title: "Completed submission", route: "/applications", action: "application.submit", owner: "startup_relationship", lookAt: "Submission acknowledgement, duplicate link and relationship-manager assignment." },
  { id: "screening", journey: "startup", title: "Internal screening", route: "/screening", action: "screening.score", owner: "startup_relationship", lookAt: "The 100-mark framework and the qualifying rule the policy sets." },
  { id: "bootcamp-invite", journey: "startup", title: "Prep Bootcamp invitation", route: "/bootcamp", action: "bootcamp.invite", owner: "startup_relationship", lookAt: "Invitation, attendance and the session clock." },
  { id: "bootcamp-record", journey: "startup", title: "Prep Bootcamp readiness", route: "/bootcamp", action: "bootcamp.record", owner: "startup_relationship", lookAt: "Readiness requires every session, not just attendance." },
  { id: "analyst", journey: "startup", title: "Analyst screening", route: "/analyst", action: "analyst.evaluate", owner: "analyst", lookAt: "Founder contact details are withheld; willingness to invest is not a commitment." },
  { id: "mou-share", journey: "startup", title: "MoU signing", route: "/mou", action: "mou.share", owner: "startup_relationship", lookAt: "The review clock, the fourth-day Legal AMA and the seventh-day deadline." },
  { id: "irr", journey: "startup", title: "Investment Readiness Report", route: "/irr", action: "irr.request", owner: "startup_relationship", lookAt: "Handover, checklist, preparation, review and approval; the version shared is kept." },
  { id: "virtual-pitch", journey: "startup", title: "Virtual pitch", route: "/pitches", action: "pitch.schedule", owner: "investor_relations", lookAt: "Five minutes of pitch and five minutes of Q&A." },
  { id: "pitchday", journey: "startup", title: "Pitch Day & Golden Pass", route: "/pitchday", action: "pitchday.golden_pass", owner: "investor_relations", lookAt: "A Golden Pass is initial interest, never a written commitment." },
  { id: "committee", journey: "startup", title: "Final selection committee", route: "/committee", action: "committee.decide", owner: "super_admin", lookAt: "The committee pack and the Proceed / On Hold / Rejected outcome." },
  { id: "upfront", journey: "startup", title: "Upfront fee collection", route: "/upfront-fees", action: "upfront.initiate", owner: "finance", lookAt: "Turnover basis, schedule version and the 15-day clock from interest." },
  { id: "av", journey: "startup", title: "AV shoot", route: "/production", action: "av.update", owner: "production", lookAt: "Story research, location, crew, schedule and asset links." },
  { id: "mock", journey: "startup", title: "Mock shoot", route: "/production", action: "mock.update", owner: "production", lookAt: "Costumes, pitch revisions, demo readiness and final readiness approval." },
  { id: "mainshoot", journey: "startup", title: "Main shoot", route: "/production", action: "mainshoot.update", owner: "production", lookAt: "Live ask and offers, accepted terms, allocations and the signing events." },
  { id: "postshoot", journey: "startup", title: "Post-shoot documentation", route: "/documents", owner: "production", lookAt: "The document register, versioned by purpose." },

  /* Investor journey ------------------------------------------------- */
  { id: "inv-source", journey: "investor", title: "Investor sourcing", route: "/investors", action: "investor.create", owner: "investor_relations", lookAt: "Category, investing entity, thesis, ticket size and proposed season allocation." },
  { id: "inv-verify", journey: "investor", title: "Verification and agreement signing", route: "/investors", action: "investor.verify", owner: "investor_relations", lookAt: "The eligibility policy and the signed participation and confidentiality documents." },
  { id: "inv-grade", journey: "investor", title: "Investor grading", route: "/investors", action: "investor.grade", owner: "investor_relations", lookAt: "L1-L4 against each dimension, with evidence, reviewer and review date." },
  { id: "inv-match", journey: "investor", title: "Thesis mapping and matching", route: "/matching", action: "match.suggest", owner: "investor_relations", lookAt: "Sector, stage, cheque size, geography, thesis, grade and available allocation." },
  { id: "inv-share", journey: "investor", title: "Analyst evaluation and circulation", route: "/matching", action: "match.share", owner: "investor_relations", lookAt: "The information version shared and the date it was shared." },
  { id: "inv-pitch", journey: "investor", title: "Virtual pitch response", route: "/pitches", action: "pitch.record", owner: "investor_relations", lookAt: "Ready to Invest, Ready to Proceed, Information Requested, Pass or No Response." },
  { id: "inv-pitchday", journey: "investor", title: "Pitch Day", route: "/pitchday", action: "pitchday.record", owner: "investor_relations", lookAt: "One-to-one slots, IRR and IM distribution, and follow-on interest." },
  { id: "inv-golden", journey: "investor", title: "Golden Pass and follow-on interest", route: "/pitchday", action: "pitchday.golden_pass", owner: "investor_relations", lookAt: "Initial interest kept apart from a written commitment." },
  { id: "inv-select", journey: "investor", title: "Selection coordination", route: "/committee", owner: "investor_relations", lookAt: "The committee pack the decision is taken from." },
  { id: "inv-preshoot", journey: "investor", title: "Pre-shoot panel and commitment", route: "/commitments", action: "preshoot.confirm", owner: "investor_relations", lookAt: "Episode-wise panel, valuation boundaries and the two-week IRR deadline." },
  { id: "inv-shootday", journey: "investor", title: "Shoot-day deal confirmation", route: "/commitments", action: "commitment.confirm", owner: "investor_relations", lookAt: "The written proposed investment commitment." },

  /* Content ---------------------------------------------------------- */
  { id: "content-edit", journey: "content", title: "Editing", route: "/episodes", action: "episode.update", owner: "production", lookAt: "The edit version the founder approves against." },
  { id: "content-approve", journey: "content", title: "Approvals", route: "/episodes", owner: "marketing", lookAt: "Founder, Legal and Management approvals against the locked version." },
  { id: "content-telecast", journey: "content", title: "Telecast", route: "/telecast", action: "telecast.update", owner: "marketing", lookAt: "The episode and telecast date, and the founder notification." },
  { id: "content-promote", journey: "content", title: "Promotions", route: "/telecast", owner: "marketing", lookAt: "Approved assets and founder posting completion." },
  { id: "content-feedback", journey: "content", title: "Founder feedback", route: "/support", owner: "community", lookAt: "Feedback routed to the owning department as a tracked action." },

  /* Investment ------------------------------------------------------- */
  { id: "deal-open", journey: "investment", title: "Deal confirmation", route: "/deals", action: "deal.open", owner: "investor_relations", lookAt: "One funding round, separate allocations, and the 48-hour thread." },
  { id: "deal-advance", journey: "investment", title: "Term sheet and diligence", route: "/deals", action: "deal.advance", owner: "investor_relations", lookAt: "Term sheet, findings and the milestone plan." },
  { id: "deal-agreements", journey: "investment", title: "Definitive agreements", route: "/legal", action: "deal.document", owner: "legal", lookAt: "The mandatory document set for the investor category." },
  { id: "deal-schedule", journey: "investment", title: "Fund transfer and receipt", route: "/deployment", action: "tranche.schedule", owner: "finance", lookAt: "Scheduled, reported, confirmed, verified and the remaining commitment." },
  { id: "deal-verify", journey: "investment", title: "Deployment verification", route: "/deployment", action: "tranche.verify", owner: "finance", lookAt: "A reported transfer is not verified deployment." },
  { id: "deal-allot", journey: "investment", title: "Allotment and portfolio engagement", route: "/deals", owner: "investor_relations", lookAt: "Allotment and the post-funding obligations with owners and deadlines." },

  /* Finance ---------------------------------------------------------- */
  { id: "fin-upfront", journey: "finance", title: "Upfront fee collection", route: "/upfront-fees", action: "upfront.invoice", owner: "finance", lookAt: "Invoice, due date and the turnover basis behind the fee." },
  { id: "fin-receipt", journey: "finance", title: "Receipt verification", route: "/upfront-fees", action: "upfront.record_receipt", owner: "finance", lookAt: "A screenshot does not mark an invoice paid; Finance allocates the receipt." },
  { id: "fin-successfee", journey: "finance", title: "Success fee calculation", route: "/success-fees", action: "successfee.calculate", owner: "finance", lookAt: "Forecast, fee due, invoiced, collected and outstanding kept apart." },
  { id: "fin-collect", journey: "finance", title: "Collection", route: "/success-fees", action: "successfee.collect", owner: "finance", lookAt: "Closure means the account reconciles." },
  { id: "fin-reconcile", journey: "finance", title: "Reconciliation and TDS", route: "/reconciliation", action: "finance.reconciliation_check", owner: "finance", lookAt: "Charges, receipts, tax and withholding, credits and partner settlements." },

  /* Community -------------------------------------------------------- */
  { id: "com-member", journey: "community", title: "Community membership", route: "/community", action: "community.member_create", owner: "community", lookAt: "One person record with several roles." },
  { id: "com-event", journey: "community", title: "Events and engagement", route: "/events", action: "event.create", owner: "community", lookAt: "Purpose, owner, budget, attendance, feedback and follow-up tasks." },
  { id: "com-referral", journey: "community", title: "Referrals and introductions", route: "/referrals", action: "referral.create", owner: "community", lookAt: "Source and later contributors preserved separately." },
  { id: "com-support", journey: "community", title: "Founder support", route: "/support", action: "support.create", owner: "community", lookAt: "Owner, deadline, outcome and founder feedback." },
  { id: "com-outcomes", journey: "community", title: "Outcomes", route: "/community", owner: "community", lookAt: "Funding outcomes traced through the referral chain." },
];

export function stepsFor(journey: SimJourney): SimStep[] {
  return SIM_STEPS.filter((s) => s.journey === journey);
}
