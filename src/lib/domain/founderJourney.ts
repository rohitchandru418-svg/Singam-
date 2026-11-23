/**
 * Founder-facing journey.
 *
 * This is the founder's own view of the show lifecycle. It is written to match the
 * "Founder journey" sheet the business signed off: twenty stages (0-19), each with the
 * name the founder sees, the internal stage behind it, what the founder is shown, the
 * action open to them, the deadline shown, the track it belongs to and the department that
 * coordinates it.
 *
 * The internal console works from the SOP stage list in `workflows.ts` and the status
 * registries in `statuses.ts`. A founder must never see those internal names or the raw
 * operational statuses: "Internal screening (100 marks)" is the team's word, not the
 * founder's, so the founder sees "Internal review" and a verdict, never a score.
 *
 * This module is a *presentation mapping* only. It never renames or deletes an internal
 * status and it never becomes an independent workflow. Each founder-facing stage is derived
 * from the same records the console reads, so the founder view and the internal view can
 * never disagree. The mapping is declared as data (title, what it means, the next step) so a
 * future season can reword it without touching a handler.
 */

export type FounderStageStatus =
  | "completed"
  | "in_progress"
  | "action_required"
  | "upcoming"
  | "on_hold"
  | "not_selected";

/**
 * The track a stage runs on, straight from the sheet: steps 0-14 are sequential, then the
 * telecast runs in parallel with the money stages, and community is ongoing throughout.
 */
export type FounderStageTrack = "sequential" | "parallel_content" | "parallel_money" | "ongoing";

export const TRACK_LABEL: Record<FounderStageTrack, string> = {
  sequential: "Sequential",
  parallel_content: "Parallel – content",
  parallel_money: "Parallel – money",
  ongoing: "Ongoing",
};

/** The order tracks appear when the journey is grouped. */
export const TRACK_ORDER: FounderStageTrack[] = ["sequential", "parallel_content", "parallel_money", "ongoing"];

export interface FounderStageContent {
  /** Founder-friendly title, exactly as the sheet names the stage. */
  title: string;
  /** One line under the title. */
  summary: string;
  /** "What this means", in plain language. */
  whatThisMeans: string;
  /** "Latest update", a dated line. */
  latestUpdate: string;
  /** The deadline the founder is shown for this stage, when there is one. */
  deadline?: string;
  /** "Your next step", when the founder has one. */
  nextStep?: string;
}

export interface FounderStage {
  key: string;
  order: number;
  status: FounderStageStatus;
  /** A short label shown on the timeline dot. */
  label: string;
  /** The track this stage runs on. */
  track: FounderStageTrack;
  /** The internal stage(s) this maps from, for the audit trail and the console. */
  mapsFrom: string[];
  /** The department that owns the underlying work, for an internal-only tooltip. */
  owner: string;
  content: FounderStageContent;
  /** True when the founder has something to do at this stage. */
  needsYou: boolean;
}

/* ------------------------------------------------------------------ */
/* Inputs                                                              */
/* ------------------------------------------------------------------ */

export interface FounderJourneyInput {
  /** The startup record's own profile status: incomplete / submitted / approved. */
  profileStatus: string;
  /** The startup profile's field-completeness, from the same field list the form uses. */
  profile: { complete: number; total: number; percent: number; missing: string[] };
  application: {
    id: string;
    referenceNo: string;
    status: string;
    submittedAt: string | null;
    acknowledgedAt: string | null;
    relationshipManager: string | null;
    completionPct: number;
  } | null;
  /** Application fields-completeness, from the same field list the profile form uses. */
  draft: { complete: number; total: number; percent: number; missingSections: string[]; closeInDays: number | null };
  screening: { outcome: string; decidedOn: string | null; replyBy: string | null; informationRequested: string } | null;
  bootcamp: {
    status: string;
    invitedOn: string;
    attendedOn: string | null;
    sessionDates: string;
    meetLink?: string;
    preparationCompleted: number;
    acknowledgement?: string;
    acknowledgedOn?: string | null;
  } | null;
  analyst: { recommendation: string; evaluatedAt: string | null } | null;
  mou: {
    status: string;
    sharedOn: string;
    signingDeadline: string;
    signedOn: string | null;
    legalAmaOn: string | null;
    response: string;
  } | null;
  irr: { status: string; version: number; approvedOn: string | null; sharedWithIrOn: string | null } | null;
  documentRequests: {
    id: string;
    stageKey: string;
    title: string;
    mandatory: number;
    status: string;
    clarification: string;
    dueDate: string | null;
  }[];
  matching: {
    /** How many investors the startup has been matched with. */
    matched: number;
    /** The verdict per investor, kept free of identities. */
    responses: { response: string }[];
    /** When the earliest slot is, for the "slot dates" line. */
    nextSlotOn: string | null;
  };
  virtualPitch: {
    id?: string;
    scheduledAt: string;
    attended: number;
    missed?: number;
    rescheduleReason?: string;
    meetLink: string;
    response: string;
  } | null;
  /** Every virtual pitch scheduled for the startup this season (the founder sees the schedule, never the identity). */
  virtualPitches?: {
    id: string;
    scheduledAt: string;
    attended: number;
    missed: number;
    meetLink: string;
    response: string;
    materialShared: string;
    pitchMin: number;
    qaMin: number;
  }[];
  pitchDayOptions: {
    id: string;
    optionDate: string;
    slotTime?: string;
    status: string;
    founderAvailable: number;
    approval?: string;
    reviewNote?: string;
    investorName?: string;
    investorCategory?: string;
  }[];
  pitchDay: { scheduledAt: string; outcome: string; goldenPasses: number } | null;
  committee: { outcome: string; decidedOn: string | null; conditions: string; reReviewDate: string } | null;
  fee: {
    status: string;
    invoiceNo: string;
    feeAmount: number;
    paidAmount: number;
    outstanding: number;
    turnoverBasis: string;
    financialYear: string;
    dueDate: string | null;
    invoiceDate: string | null;
    bankDetails: string;
    extensionApproved: boolean;
    /** The fee schedule code and version the amount was calculated from. */
    feeScheduleCode?: string;
    feeScheduleVersion?: string;
    turnover?: number;
  } | null;
  paymentProof: { status: string; submittedOn: string } | null;
  handover: { status: string; acceptedOn: string | null } | null;
  av: { status: string; scheduledOn: string | null; location: string; prepare: string } | null;
  mock: {
    status: string;
    scheduledOn: string | null;
    productDemoReady: number;
    stageMovementRehearsed: number;
    finalReadinessApprovedOn: string | null;
    openActions: string;
  } | null;
  main: {
    status: string;
    scheduledOn: string | null;
    completedOn: string | null;
    signingDeadline: string | null;
    signatureCompletedOn: string | null;
    dealAcceptanceSigned: boolean;
    outstandingActions: string;
  } | null;
  episode: { status: string; episodeNo: string } | null;
  telecast: {
    status: string;
    telecastDate: string | null;
    promoRequirements: string;
    promoAssetsApproved: number;
    founderPostingDone: number;
    founderFeedback: string;
    publicAnnouncement: string;
    promoPosts?: string;
    announcementWording?: string;
    episodeNo?: string;
  } | null;
  deals: {
    /** One deal per investor; the founder sees counts and milestones, never identities. */
    count: number;
    committed: number;
    milestoneDates: string;
    openDocuments: string;
    openConditions: string;
    withdrawalReason: string;
    hasReplacement: boolean;
    /** One entry per investor conversation, for the per-investor deal cards. */
    perInvestor?: {
      id: string;
      investorName: string;
      investorCategory: string;
      status: string;
      committed: number;
      valuation: string;
      milestones: { label: string; date: string }[];
      openDocuments: string;
      openConditions: string;
      withdrawalReason: string;
      replacementName: string;
      documents: { purpose: string; type: string; status: string; receivedOn: string | null; signedOn: string | null }[];
    }[];
  };
  funding: {
    committed: number;
    received: number;
    pending: number;
    trancheCount: number;
    verifiedTranches: number;
    nextTrancheOn: string | null;
    /** Tranche-by-tranche detail, grouped under each investor deal. */
    perDeal?: {
      dealId: string;
      investorName: string;
      committed: number;
      received: number;
      pending: number;
      tranches: {
        id: string;
        seq: number;
        scheduledAmount: number;
        scheduledOn: string | null;
        reportedAmount: number;
        reportedOn: string | null;
        startupConfirmedOn: string | null;
        verifiedAmount: number;
        verifiedOn: string | null;
        status: string;
        reversalReason: string;
      }[];
    }[];
  };
  successFee: {
    status: string;
    invoiceNo: string;
    feeDue: number;
    collected: number;
    outstanding: number;
    dueDate: string | null;
    /** Base, rate and structure the fee was calculated from. */
    base?: number;
    ratePercent?: number;
    structure?: string;
    cap?: number;
    invoiced?: number;
  } | null;
  successFeeProof: { status: string; submittedOn: string } | null;
  community: {
    isMember: boolean;
    memberType: string;
    eventsRegistered: number;
    eventsAttended: number;
    supportOpen: number;
    supportResolved: number;
    referrals: number;
  };
  today: string;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const submitted = (s: string): boolean => s !== "" && s !== "draft";

/** Format an ISO date as "12 Nov 2026", or return a fallback phrase. */
function on(iso: string | null | undefined, fallback = ""): string {
  if (!iso) return fallback;
  const datePart = iso.split("T")[0];
  const [y, m, d] = datePart.split("-").map(Number);
  if (!y || !m || !d) return fallback;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[m - 1]} ${y}`;
}

const money = (paise: number): string => {
  const rupees = paise / 100;
  if (rupees >= 1_00_00_000) return `Rs ${Math.round((rupees / 1_00_00_000) * 100) / 100} crore`;
  if (rupees >= 1_00_000) return `Rs ${Math.round((rupees / 1_00_000) * 100) / 100} lakh`;
  return `Rs ${rupees.toLocaleString("en-IN")}`;
};

/** Whole days from today to an ISO date; null when there is no date. */
function daysUntil(iso: string | null, today: string): number | null {
  if (!iso) return null;
  const a = Date.parse(`${iso.split("T")[0]}T00:00:00Z`);
  const b = Date.parse(`${today.split("T")[0]}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / 86_400_000);
}

/** "in 6 days" / "3 days overdue" / "today", for a countdown line. */
function countdown(iso: string | null, today: string): string {
  const days = daysUntil(iso, today);
  if (days === null) return "";
  if (days === 0) return "due today";
  if (days === 1) return "1 day left";
  if (days > 1) return `${days} days left`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} overdue`;
}

/* ------------------------------------------------------------------ */
/* The journey                                                         */
/* ------------------------------------------------------------------ */

/**
 * Build the founder's twenty-stage journey.
 *
 * Order matters: a later stage is only ever "in progress" or "action required" once the
 * stage before it has completed. A stage the founder has not reached stays "upcoming", so
 * the timeline never implies work that has not begun. After the main shoot the content and
 * money tracks run in parallel and community is ongoing throughout, exactly as the sheet
 * describes.
 */
export function founderJourney(input: FounderJourneyInput): {
  stages: FounderStage[];
  currentKey: string | null;
  currentLabel: string;
  completedCount: number;
} {
  const app = input.application;
  const appStatus = app ? app.status : "";
  const today = input.today;
  const stages: FounderStage[] = [];

  /* Which stages have a record behind them, and which are done or need the founder. ------
   *
   * A stage is only "upcoming" when the startup has not reached it at all. Once a later
   * stage has a record, every earlier stage counts as reached, because a startup cannot be
   * at the main shoot without having cleared the review. This keeps the timeline honest for
   * a real journey where an older item (say a document clarification) is still outstanding
   * while the shoot has already happened.
   */
  const profileApproved = input.profileStatus === "approved";
  const profileSubmitted = input.profileStatus === "submitted";
  const applicationSubmitted = submitted(appStatus);
  const screeningOutcome = input.screening?.outcome ?? "";
  const screeningDone = screeningOutcome !== "" && screeningOutcome !== "pending";
  const bootcampReady = Boolean(input.bootcamp) && Number(input.bootcamp?.preparationCompleted) === 1;
  const recommendation = input.analyst?.recommendation ?? "";
  const analystDone = recommendation !== "" && recommendation !== "pending";
  const mouStatus = input.mou?.status ?? "";
  const reqs = input.documentRequests;
  const mandatory = reqs.filter((r) => Number(r.mandatory) === 1);
  const verified = mandatory.filter((r) => r.status === "verified").length;
  const anyClarification = reqs.some((r) => r.status === "info_required" || r.status === "resubmission_required");
  const nextQueryDue = mandatory.find((r) => r.status !== "verified" && r.dueDate)?.dueDate ?? null;
  const irrShared = Boolean(input.irr) && ["approved", "shared_with_ir", "shared"].includes(String(input.irr?.status));
  const docsDone = mandatory.length > 0 && verified === mandatory.length;
  const vp = input.virtualPitch;
  const vpAttended = vp ? Number(vp.attended) === 1 : false;
  const vpMissed = vp ? Number(vp.missed ?? 0) === 1 : false;
  const matchedCount = input.matching.matched;
  const pd = input.pitchDay;
  const options = input.pitchDayOptions;
  const unchosenOptions = options.filter((o) => o.status !== "chosen");
  const committeeOutcome = input.committee?.outcome ?? "";
  const committeeDone = committeeOutcome !== "" && committeeOutcome !== "pending";
  const fee = input.fee;
  const feeStatus = fee?.status ?? "";
  const av = input.av;
  const avDone = Boolean(av) && ["completed", "done"].includes(String(av?.status ?? ""));
  const mock = input.mock;
  const mockReady = Boolean(mock) && Number(mock?.productDemoReady) === 1 && Number(mock?.stageMovementRehearsed) === 1;
  const mockApproved = Boolean(mock?.finalReadinessApprovedOn);
  const main = input.main;
  const mainDone = Boolean(main) && ["completed", "exceptions"].includes(String(main?.status));
  const telecast = input.telecast;
  const telecastDone = Boolean(telecast) && ["telecast", "completed"].includes(String(telecast?.status));
  const deals = input.deals;
  const funding = input.funding;
  const sf = input.successFee;
  const sfStatus = sf?.status ?? "";
  const community = input.community;

  // Evidence that the startup has reached each stage. The sequential steps (0-14) advance
  // together: a later record proves every earlier step was reached, so a step is "upcoming"
  // only when nothing at or beyond it exists yet. The parallel content and money stages and
  // the ongoing community stage stand on their own record, so community membership cannot
  // imply that the sequential steps were cleared.
  const evidenced: boolean[] = [
    true, // 0 profile - the startup record itself
    Boolean(app) || applicationSubmitted, // 1 application draft
    applicationSubmitted, // 2 submitted
    applicationSubmitted || screeningDone, // 3 internal review
    Boolean(input.bootcamp), // 4 pre-bootcamp
    Boolean(input.analyst), // 5 investment fit check
    Boolean(input.mou), // 6 MoU
    // Registration hands every founder the standard document checklist, so a document
    // request exists from day one and is never evidence of reaching this stage. The
    // scrutiny stage starts when the MoU is signed and the IRR handover opens.
    irrShared || mouStatus === "signed", // 7 document scrutiny
    Boolean(vp) || matchedCount > 0, // 8 matching / virtual pitch
    Boolean(pd) || options.length > 0, // 9 pitch day
    Boolean(input.committee), // 10 final selection
    Boolean(fee), // 11 upfront fee
    Boolean(av), // 12 AV shoot
    Boolean(mock), // 13 mock shoot
    Boolean(main) || Boolean(input.episode), // 14 main shoot
    Boolean(telecast), // 15 telecast (parallel - content)
    deals.count > 0, // 16 deal closure (parallel - money)
    funding.committed > 0 || funding.trancheCount > 0, // 17 funds received (parallel - money)
    Boolean(sf), // 18 success fee (parallel - money)
    community.isMember, // 19 community (ongoing)
  ];
  const SEQUENTIAL_LAST = 14;
  const sequentialMax = evidenced.slice(0, SEQUENTIAL_LAST + 1).reduce((max, has, i) => (has ? i : max), 0);
  const reached = (order: number) => (order <= SEQUENTIAL_LAST ? order <= sequentialMax : evidenced[order]);

  /**
   * A stage's status from three facts: whether the startup has reached it, whether it is done,
   * and whether the founder must act. A terminal outcome (not selected, on hold) wins over
   * everything, so the timeline never shows a rejected startup as merely "in progress".
   */
  const statusOf = (order: number, done: boolean, action: boolean, terminal?: FounderStageStatus): FounderStageStatus => {
    if (terminal) return terminal;
    if (!reached(order)) return "upcoming";
    if (done) return "completed";
    return action ? "action_required" : "in_progress";
  };

  /* Stage 0 - Profile --------------------------------------------------- */
  // The profile is the startup record itself. Once an application has been submitted the
  // profile was necessarily complete enough, so it stops asking the founder to act.
  const profileDone = profileApproved || applicationSubmitted;
  stages.push({
    key: "profile",
    order: 0,
    label: "Profile",
    track: "sequential",
    mapsFrom: ["startup_record"],
    owner: "Startup Relationships",
    status: statusOf(0, profileDone, !profileSubmitted && !profileApproved),
    needsYou: !profileDone && !profileSubmitted,
    content: {
      title: "Profile",
      summary: profileApproved
        ? "Profile complete"
        : profileSubmitted || applicationSubmitted
          ? "With your relationship manager"
          : "Complete your startup profile",
      whatThisMeans:
        "Your company, founders, sector, stage, financials and documents live here. This profile is reused every season, so you complete it once and update it between seasons.",
      latestUpdate: `Profile ${input.profile.complete} of ${input.profile.total} fields complete (${input.profile.percent}%).`,
      nextStep: profileDone
        ? undefined
        : profileSubmitted
          ? "No action needed - your relationship manager is reviewing your profile."
          : "Register your startup and complete the profile so you can apply to the season.",
    },
  });

  /* Stage 1 - Application - draft --------------------------------------- */
  stages.push({
    key: "application_draft",
    order: 1,
    label: "Draft",
    track: "sequential",
    mapsFrom: ["application_draft"],
    owner: "Startup Relationships",
    status: statusOf(1, applicationSubmitted, !applicationSubmitted),
    needsYou: !applicationSubmitted,
    content: {
      title: "Application - draft",
      summary: applicationSubmitted ? `Application ${app?.referenceNo ?? ""} submitted` : "Your application is not complete yet",
      whatThisMeans:
        "Fill in your application and save it as you go. You can see how complete it is and what is still missing - for example a pitch deck that has not been uploaded. An idea-stage business skips the financial sections.",
      latestUpdate: applicationSubmitted
        ? `Submitted on ${on(app?.submittedAt)}.`
        : `You have completed ${input.draft.complete} of ${input.draft.total} required fields. Your application is ${input.draft.percent}% complete.`,
      deadline: !applicationSubmitted && input.draft.closeInDays !== null ? `Applications close in ${input.draft.closeInDays} days` : undefined,
      nextStep: applicationSubmitted ? undefined : "Continue your application and submit it when every required field is filled in.",
    },
  });

  /* Stage 2 - Application - submitted ----------------------------------- */
  stages.push({
    key: "application_submitted",
    order: 2,
    label: "Submitted",
    track: "sequential",
    mapsFrom: ["application_submitted"],
    owner: "Startup Relationships",
    status: statusOf(2, applicationSubmitted, false),
    needsYou: false,
    content: {
      title: "Application - submitted",
      summary: applicationSubmitted ? `Reference ${app?.referenceNo ?? ""}` : "Not submitted yet",
      whatThisMeans:
        "Your application is complete, acknowledged and locked. A relationship manager is assigned to you and will coordinate your journey from here.",
      latestUpdate: applicationSubmitted
        ? `Received on ${on(app?.submittedAt)}${app?.relationshipManager ? `; relationship manager ${app.relationshipManager}` : ""}.`
        : "Awaiting your submission.",
    },
  });

  /* Stage 3 - Internal review (internal screening) ---------------------- */
  const reviewTerminal: FounderStageStatus | undefined =
    screeningOutcome === "reject" ? "not_selected" : screeningOutcome === "hold" ? "on_hold" : undefined;
  const reviewNeedsInfo = screeningOutcome === "info_required" || appStatus === "info_required";
  stages.push({
    key: "application_review",
    order: 3,
    label: "Review",
    track: "sequential",
    mapsFrom: ["internal_screening"],
    owner: "Startup Relationships",
    status: statusOf(3, screeningOutcome === "proceed", reviewNeedsInfo, reviewTerminal),
    needsYou: reviewNeedsInfo,
    content: reviewMessage(screeningOutcome, appStatus, screeningDone, input.screening),
  });

  /* Stage 4 - Pre-bootcamp ---------------------------------------------- */
  const bootcampInvited = Boolean(input.bootcamp) && input.bootcamp!.status !== "not_invited";
  stages.push({
    key: "pre_bootcamp",
    order: 4,
    label: "Pre-bootcamp",
    track: "sequential",
    mapsFrom: ["prep_bootcamp"],
    owner: "Startup Relationships",
    status: statusOf(4, bootcampReady, bootcampInvited && !bootcampReady),
    needsYou: bootcampInvited && !bootcampReady,
    content: bootcampReady
      ? {
          title: "Pre-bootcamp",
          summary: "Preparation completed",
          whatThisMeans:
            "You completed the Startup Singam Pre-bootcamp and its preparation sessions. Preparation is recorded as done only when every session and action item is complete - attending alone is not enough.",
          latestUpdate: input.bootcamp?.attendedOn ? `Completed on ${on(input.bootcamp.attendedOn)}.` : "Preparation marked complete.",
        }
      : bootcampInvited
        ? {
            title: "Pre-bootcamp",
            summary: "You are invited to the Pre-bootcamp",
            whatThisMeans:
              "You are invited to the Startup Singam Pre-bootcamp. The programme briefing, founder readiness, investment readiness and the MoU and fee briefing are covered here, and your preparation is what moves you forward.",
            latestUpdate: `Invited on ${on(input.bootcamp?.invitedOn)}.`,
            deadline: input.bootcamp?.sessionDates ? `Sessions: ${input.bootcamp.sessionDates}` : undefined,
            nextStep: "Accept the invitation, attend the sessions and complete the action items your relationship manager lists.",
          }
        : {
            title: "Pre-bootcamp",
            summary: "Not invited yet",
            whatThisMeans:
              "Once your application clears the internal review, you will be invited to the Pre-bootcamp. The programme briefing, founder readiness and investment readiness sessions are covered there.",
            latestUpdate: "Waiting for your application review to complete.",
          },
  });

  /* Stage 5 - Investment fit check (analyst) ---------------------------- */
  const fitTerminal: FounderStageStatus | undefined =
    recommendation === "reject" ? "not_selected" : recommendation === "hold" ? "on_hold" : undefined;
  stages.push({
    key: "funding_fit",
    order: 5,
    label: "Fit check",
    track: "sequential",
    mapsFrom: ["analyst_screening"],
    owner: "Startup Relationships",
    status: statusOf(5, recommendation === "proceed", recommendation === "conditional", fitTerminal),
    needsYou: recommendation === "conditional",
    content: fundingFitMessage(recommendation, analystDone, input.analyst?.evaluatedAt ?? null),
  });

  /* Stage 6 - MoU ------------------------------------------------------- */
  const mouTerminal: FounderStageStatus | undefined = mouStatus === "negotiation" ? "on_hold" : undefined;
  const mouAwaitingSignature = ["shared", "under_review", "legal_ama_done"].includes(mouStatus);
  stages.push({
    key: "agreement",
    order: 6,
    label: "MoU",
    track: "sequential",
    mapsFrom: ["mou_signing"],
    owner: "Startup Relationships & Legal",
    status: statusOf(6, mouStatus === "signed", mouAwaitingSignature, mouTerminal),
    needsYou: mouAwaitingSignature,
    content: agreementMessage(mouStatus, input.mou, today),
  });

  /* Stage 7 - Document scrutiny (IRR) ----------------------------------- */
  stages.push({
    key: "document_verification",
    order: 7,
    label: "Documents",
    track: "sequential",
    mapsFrom: ["irr_handover"],
    owner: "Startup Relationships & Finance / IRR",
    status: statusOf(7, docsDone || (mandatory.length === 0 && irrShared), anyClarification),
    needsYou: anyClarification,
    content: documentMessage(mandatory.length, verified, anyClarification, irrShared, nextQueryDue, today),
  });

  /* Stage 8 - Investor matching and virtual pitch ----------------------- */
  stages.push({
    key: "virtual_pitch",
    order: 8,
    label: "Matching",
    track: "sequential",
    mapsFrom: ["matching", "virtual_pitch"],
    owner: "Investor Relations",
    status: statusOf(8, vpAttended, vpMissed || (Boolean(vp) && !vpAttended)),
    needsYou: vpMissed,
    content: matchingPitchMessage(vp, vpAttended, vpMissed, matchedCount, input.matching),
  });

  /* Stage 9 - Pitch Day (+ Golden Pass) --------------------------------- */
  stages.push({
    key: "pitch_day",
    order: 9,
    label: "Pitch Day",
    track: "sequential",
    mapsFrom: ["pitch_day", "golden_pass"],
    owner: "Investor Relations",
    status: statusOf(9, Boolean(pd), options.length > 0),
    needsYou: options.length > 0 && !pd,
    content: pitchDayMessage(pd, options, unchosenOptions, pd?.goldenPasses ?? 0),
  });

  /* Stage 10 - Final selection (committee) ------------------------------ */
  const selectionTerminal: FounderStageStatus | undefined =
    committeeOutcome === "rejected" ? "not_selected" : committeeOutcome === "on_hold" ? "on_hold" : undefined;
  stages.push({
    key: "final_selection",
    order: 10,
    label: "Selection",
    track: "sequential",
    mapsFrom: ["final_selection"],
    owner: "Management",
    status: statusOf(10, committeeOutcome === "proceed", false, selectionTerminal),
    needsYou: false,
    content: finalSelectionMessage(committeeOutcome, committeeDone, input.committee),
  });

  /* Stage 11 - Upfront fee ---------------------------------------------- */
  stages.push({
    key: "programme_fee",
    order: 11,
    label: "Fee",
    track: "sequential",
    mapsFrom: ["upfront_fee"],
    owner: "Finance",
    status: statusOf(11, ["paid", "waived"].includes(feeStatus), ["invoiced", "overdue", "disputed"].includes(feeStatus)),
    needsYou: ["invoiced", "overdue", "disputed"].includes(feeStatus),
    content: feeMessage(fee, input.paymentProof, today),
  });

  /* Stage 12 - AV shoot ------------------------------------------------- */
  stages.push({
    key: "av_shoot",
    order: 12,
    label: "AV shoot",
    track: "sequential",
    mapsFrom: ["av_shoot"],
    owner: "Production",
    status: statusOf(12, avDone, Boolean(av) && Boolean(av?.scheduledOn)),
    needsYou: Boolean(av?.scheduledOn) && !avDone,
    content: {
      title: "AV shoot",
      summary: avDone ? "AV shoot completed" : av?.scheduledOn ? `Scheduled for ${on(av.scheduledOn)}` : "Being scheduled",
      whatThisMeans:
        "Your AV shoot tells your startup's story before the main episode. Production confirms the date, time and location with you, and tells you what to prepare.",
      latestUpdate:
        avDone
          ? "Your AV shoot is complete."
          : av?.scheduledOn
            ? `Scheduled for ${on(av.scheduledOn)}${av.location ? ` at ${av.location}` : ""}.`
            : "Production is preparing your shoot schedule.",
      deadline: av?.scheduledOn && !avDone ? `Shoot date ${on(av.scheduledOn)}` : undefined,
      nextStep: av?.scheduledOn && !avDone ? "Confirm your availability for the shoot date and follow the preparation instructions Production shares." : undefined,
    },
  });

  /* Stage 13 - Mock shoot ----------------------------------------------- */
  stages.push({
    key: "mock_shoot",
    order: 13,
    label: "Mock shoot",
    track: "sequential",
    mapsFrom: ["mock_shoot"],
    owner: "Production",
    status: statusOf(13, mockApproved || mockReady, Boolean(mock) && !mockReady && !mockApproved),
    needsYou: Boolean(mock) && !mockReady && !mockApproved,
    content: mockMessage(mock, mockReady, mockApproved),
  });

  /* Stage 14 - Main shoot ----------------------------------------------- */
  stages.push({
    key: "main_shoot",
    order: 14,
    label: "Main shoot",
    track: "sequential",
    mapsFrom: ["pre_shoot_documentation", "main_shoot", "post_shoot_documentation"],
    owner: "Production & Investor Relations",
    status: statusOf(14, mainDone, Boolean(main) && !main?.dealAcceptanceSigned),
    needsYou: Boolean(main) && !main?.dealAcceptanceSigned,
    content: mainMessage(main, mainDone, today),
  });

  /* Stage 15 - Telecast and promotion (parallel - content) -------------- */
  stages.push({
    key: "telecast",
    order: 15,
    label: "Telecast",
    track: "parallel_content",
    mapsFrom: ["editing", "approvals", "telecast", "promotions", "founder_feedback"],
    owner: "Marketing",
    status: statusOf(15, telecastDone, Boolean(telecast) && !telecastDone),
    needsYou: Boolean(telecast) && !telecastDone && Number(telecast?.founderPostingDone ?? 0) === 0,
    content: telecastMessage(telecast, input.episode, today),
  });

  /* Stage 16 - Deal closure (parallel - money) -------------------------- */
  const dealsClosed = deals.count > 0 && deals.committed > 0 && !deals.openDocuments && !deals.openConditions;
  stages.push({
    key: "deal_closure",
    order: 16,
    label: "Deal closure",
    track: "parallel_money",
    mapsFrom: ["deal_confirmation", "term_sheet", "due_diligence", "definitive_agreements", "pre_funding_conditions"],
    owner: "Investor Relations & Legal",
    status: statusOf(16, dealsClosed, deals.count > 0, deals.withdrawalReason && deals.committed === 0 ? "on_hold" : undefined),
    needsYou: deals.count > 0 && !deals.withdrawalReason,
    content: dealClosureMessage(deals),
  });

  /* Stage 17 - Funds received (parallel - money) ------------------------ */
  const fullyReceived = funding.committed > 0 && funding.received >= funding.committed;
  stages.push({
    key: "funds_received",
    order: 17,
    label: "Funds",
    track: "parallel_money",
    mapsFrom: ["fund_transfer", "receipt_verification", "allotment"],
    owner: "Investor Relations & Finance",
    status: statusOf(17, fullyReceived, funding.committed > 0 && !fullyReceived),
    needsYou: funding.committed > 0 && !fullyReceived,
    content: fundsMessage(funding, today),
  });

  /* Stage 18 - Success fee (parallel - money) --------------------------- */
  stages.push({
    key: "success_fee",
    order: 18,
    label: "Success fee",
    track: "parallel_money",
    mapsFrom: ["success_fee"],
    owner: "Finance",
    status: statusOf(18, ["collected", "waived"].includes(sfStatus), ["part_collected"].includes(sfStatus)),
    needsYou: ["invoiced", "overdue", "disputed", "part_collected"].includes(sfStatus),
    content: successFeeMessage(sf, input.successFeeProof, today),
  });

  /* Stage 19 - Community (ongoing) -------------------------------------- */
  stages.push({
    key: "community",
    order: 19,
    label: "Community",
    track: "ongoing",
    mapsFrom: ["member_onboarding", "event_engagement", "referral_chain", "founder_support"],
    owner: "Community",
    status: community.isMember ? "in_progress" : "upcoming",
    needsYou: false,
    content: communityMessage(community),
  });

  // A terminal outcome stops the journey there: once a stage is on hold or the startup was
  // not selected, nothing later can be in progress, however much seed data sits behind it.
  const terminalAt = stages.find((s) => s.status === "not_selected" || s.status === "on_hold");
  if (terminalAt) {
    for (const s of stages) {
      if (s.order > terminalAt.order && s.status !== "not_selected" && s.status !== "on_hold") {
        s.status = "upcoming";
        s.needsYou = false;
      }
    }
  }

  // The current stage is the first the founder can act on or that is in progress, unless a
  // terminal outcome comes earlier. Failing both, the last completed stage, so a finished
  // journey still points somewhere sensible.
  const active = stages.find((s) => s.status === "action_required" || s.status === "in_progress");
  const terminal = stages.find((s) => s.status === "not_selected" || s.status === "on_hold");
  const current =
    terminal && (!active || terminal.order < active.order)
      ? terminal
      : active ?? [...stages].reverse().find((s) => s.status === "completed") ?? stages[0];

  return {
    stages,
    currentKey: current?.key ?? null,
    currentLabel: current?.content.title ?? "",
    completedCount: stages.filter((s) => s.status === "completed").length,
  };
}

/* ------------------------------------------------------------------ */
/* Per-stage content                                                   */
/* ------------------------------------------------------------------ */

function reviewMessage(
  outcome: string,
  appStatus: string,
  done: boolean,
  screening: FounderJourneyInput["screening"],
): FounderStageContent {
  if (appStatus === "info_required" || outcome === "info_required") {
    return {
      title: "Internal review",
      summary: "We need something from you",
      whatThisMeans:
        "Our review team needs a little more information before the review can continue. You will see exactly which items are needed, and you respond from the document checklist.",
      latestUpdate: screening?.informationRequested
        ? `Requested: ${screening.informationRequested}`
        : "Information requested.",
      deadline: screening?.replyBy ? `Reply by ${on(screening.replyBy)}` : undefined,
      nextStep: "Open the Documents step and provide the information requested.",
    };
  }
  if (!done) {
    return {
      title: "Internal review",
      summary: "In progress",
      whatThisMeans:
        "Your application is being reviewed against our internal framework. You will see the verdict only — never the score — once the review is complete.",
      latestUpdate: "No action is required from you right now.",
    };
  }
  switch (outcome) {
    case "proceed":
      return {
        title: "Internal review",
        summary: "Cleared",
        whatThisMeans:
          "Your application has cleared the internal review. You are now eligible to move forward to the next stage of Startup Singam.",
        latestUpdate: "Review complete.",
      };
    case "reject":
      return {
        title: "Internal review",
        summary: "Not selected",
        whatThisMeans:
          "Thank you for your interest in Startup Singam. After careful consideration, your application has not been selected to progress to the next stage of this programme.",
        latestUpdate: "Review complete.",
        nextStep:
          "You can apply again in a future season — your record is kept, and you can ask the team for feedback to strengthen a later application.",
      };
    case "hold":
      return {
        title: "Internal review",
        summary: "On hold",
        whatThisMeans:
          "Your application is temporarily on hold. Our team will share an update if any additional information or action is required.",
        latestUpdate: "Review paused.",
        nextStep:
          "No action is required right now. If the team needs anything to resume the review, it will appear here and in your notices.",
      };
    default:
      return {
        title: "Internal review",
        summary: "In progress",
        whatThisMeans:
          "Your application is being reviewed against our internal framework. You will see the verdict only — never the score — once the review is complete.",
        latestUpdate: "No action is required from you right now.",
      };
  }
}

function fundingFitMessage(recommendation: string, done: boolean, evaluatedAt: string | null): FounderStageContent {
  if (!done) {
    return {
      title: "Investment fit check",
      summary: "In progress",
      whatThisMeans:
        "Your startup is being checked for investment fit. You will see the outcome as 'in progress' and then 'fit check done' — no scores, no willingness and no indicative amount are shown to you.",
      latestUpdate: "No action is required from you right now.",
    };
  }
  switch (recommendation) {
    case "proceed":
      return {
        title: "Investment fit check",
        summary: "Fit check done",
        whatThisMeans:
          "Your fit check is done and your startup is moving forward to the next stage. The team's internal notes stay internal.",
        latestUpdate: `Assessment complete${evaluatedAt ? ` on ${on(evaluatedAt)}` : ""}.`,
      };
    case "conditional":
      return {
        title: "Investment fit check",
        summary: "Additional information required",
        whatThisMeans:
          "We need some additional information to continue evaluating your startup. Please review the request and submit the required details.",
        latestUpdate: "Information requested.",
        nextStep: "Open the Documents step and provide the information requested.",
      };
    case "hold":
      return {
        title: "Investment fit check",
        summary: "On hold",
        whatThisMeans:
          "Your fit check is temporarily on hold. Our team will share an update if any additional information or action is required.",
        latestUpdate: "Assessment paused.",
      };
    case "reject":
      return {
        title: "Investment fit check",
        summary: "Not selected",
        whatThisMeans:
          "Thank you for participating in the assessment process. Your startup has not been selected to progress further at this stage.",
        latestUpdate: "Assessment complete.",
      };
    default:
      return {
        title: "Investment fit check",
        summary: "In progress",
        whatThisMeans:
          "Your startup is being checked for investment fit. You will see the outcome as 'in progress' and then 'fit check done'.",
        latestUpdate: "No action is required from you right now.",
      };
  }
}

function agreementMessage(
  status: string,
  mou: FounderJourneyInput["mou"],
  today: string,
): FounderStageContent {
  if (!mou || status === "not_started") {
    return {
      title: "MoU",
      summary: "Not started",
      whatThisMeans:
        "Once you clear the investment fit check, we share your MoU here for you to review and sign.",
      latestUpdate: "Waiting for the investment fit check.",
    };
  }
  switch (status) {
    case "signed":
      return {
        title: "MoU",
        summary: "Signed",
        whatThisMeans: "Your MoU is signed and on record. A copy is available below.",
        latestUpdate: `Signed on ${on(mou.signedOn)}.`,
      };
    case "negotiation":
      return {
        title: "MoU",
        summary: "Under negotiation",
        whatThisMeans:
          "Your MoU is being negotiated with the Startup Singam team. Management is involved, and you will see the updated MoU here once it is ready.",
        latestUpdate: "Negotiation in progress.",
      };
    case "under_review":
    case "legal_ama_done":
      return {
        title: "MoU",
        summary: "Under review",
        whatThisMeans:
          "Your MoU is shared and under review. You can read it, download it, ask a question at the Legal AMA on working day 4, or sign it. Signing by working day 7 keeps your journey on schedule.",
        latestUpdate: `Shared on ${on(mou.sharedOn)}; signing deadline ${on(mou.signingDeadline)}.`,
        deadline: `Day 7 countdown: ${countdown(mou.signingDeadline, today)}`,
        nextStep: "Review the MoU and sign it, or ask a question if something is unclear.",
      };
    default:
      return {
        title: "MoU",
        summary: "Awaiting your review",
        whatThisMeans:
          "Your MoU is ready for review. Read it and sign it to continue. If you want to negotiate, tell the team why; if you are not proceeding, tell us and your reason is kept on record.",
        latestUpdate: `Shared on ${on(mou.sharedOn)}; please sign by ${on(mou.signingDeadline)}.`,
        deadline: `Day 7 countdown: ${countdown(mou.signingDeadline, today)}`,
        nextStep: "Read the MoU, then sign it or raise a question.",
      };
  }
}

function documentMessage(
  mandatoryCount: number,
  verifiedCount: number,
  clarification: boolean,
  irrShared: boolean,
  nextDue: string | null,
  today: string,
): FounderStageContent {
  const deadline = nextDue ? `Next reply by ${on(nextDue)} (${countdown(nextDue, today)})` : undefined;
  if (mandatoryCount === 0) {
    return {
      title: "Document scrutiny",
      summary: irrShared ? "Documents verified" : "Preparing",
      whatThisMeans:
        "Our team verifies your startup information and prepares your Investment Readiness Report. If anything more is needed, you will see it here with the team's query word for word.",
      latestUpdate: irrShared ? "Your documents are verified." : "The team is preparing your document checklist.",
    };
  }
  if (clarification) {
    return {
      title: "Document scrutiny",
      summary: "Clarification requested",
      whatThisMeans:
        "The team has asked a question about one of your documents, word for word. Please read the note and respond so verification can continue.",
      latestUpdate: `${verifiedCount} of ${mandatoryCount} required documents verified.`,
      deadline,
      nextStep: "Open the checklist, read the team's query and upload the corrected document.",
    };
  }
  if (verifiedCount === mandatoryCount) {
    return {
      title: "Document scrutiny",
      summary: "All documents verified",
      whatThisMeans:
        "Every required document has been verified and your Investment Readiness Report is being prepared for the investors.",
      latestUpdate: `${verifiedCount} of ${mandatoryCount} required documents verified.`,
    };
  }
  return {
    title: "Document scrutiny",
    summary: `${verifiedCount} of ${mandatoryCount} verified`,
    whatThisMeans:
      "Please submit the required documents so our team can verify your startup information and prepare your Investment Readiness Report. Each request shows exactly what to upload.",
    latestUpdate: `${verifiedCount} of ${mandatoryCount} required documents verified.`,
    deadline,
    nextStep: "Upload the remaining documents from the checklist below.",
  };
}

function matchingPitchMessage(
  vp: FounderJourneyInput["virtualPitch"],
  attended: boolean,
  missed: boolean,
  matchedCount: number,
  matching: FounderJourneyInput["matching"],
): FounderStageContent {
  const verdicts = summarizeVerdicts(matching.responses);
  if (vp) {
    if (missed) {
      return {
        title: "Investor matching and virtual pitch",
        summary: "Pitch missed",
        whatThisMeans:
          "The team recorded that you could not attend your virtual pitch. A pitch is rescheduled, not lost — ask for a new date and Investor Relations will offer one.",
        latestUpdate: vp.rescheduleReason ? `Your reschedule request: ${vp.rescheduleReason}` : "No new date has been set yet.",
        nextStep: "Ask to reschedule from this stage and the team will confirm a new slot with you.",
      };
    }
    return {
      title: "Investor matching and virtual pitch",
      summary: attended ? "Pitch completed" : `Scheduled for ${on(vp.scheduledAt)}`,
      whatThisMeans:
        "You are matched with the investors whose thesis fits your startup. Each pitch is five minutes of pitch and five minutes of questions, and you then see a verdict per investor: ready to invest, ready to proceed to the next stage, information requested, on hold, pass or no response.",
      latestUpdate: attended
        ? `Your pitch was held.${verdicts ? ` Verdicts: ${verdicts}.` : ""}`
        : `Scheduled for ${on(vp.scheduledAt)}.`,
      deadline: matching.nextSlotOn ? `Slot dates from ${on(matching.nextSlotOn)}` : undefined,
      nextStep: attended
        ? undefined
        : vp.rescheduleReason
          ? `Your request for a new date is with the team: ${vp.rescheduleReason}`
          : "Join using the meeting link below at the scheduled time.",
    };
  }
  if (matchedCount > 0) {
    return {
      title: "Investor matching and virtual pitch",
      summary: `Matched with ${matchedCount} investor${matchedCount === 1 ? "" : "s"}`,
      whatThisMeans:
        "We have matched you with the investors whose sector, stage, cheque size and thesis fit your startup. Investor Relations approves the circulation, and then we schedule your virtual pitches.",
      latestUpdate: `Matched with ${matchedCount} investor${matchedCount === 1 ? "" : "s"}; slots are being arranged.`,
      deadline: matching.nextSlotOn ? `Slot dates from ${on(matching.nextSlotOn)}` : undefined,
      nextStep: "Pick the slots you can attend and answer any information requests.",
    };
  }
  return {
    title: "Investor matching and virtual pitch",
    summary: "Not scheduled yet",
    whatThisMeans:
      "Once your documents are verified, we match you with the investors whose thesis fits your startup and arrange your virtual pitches. We will tell you when they are arranged.",
    latestUpdate: "Waiting for your documents to be verified.",
  };
}

/** Turn the per-investor responses into a short, identity-free tally. */
function summarizeVerdicts(responses: { response: string }[]): string {
  const counts = new Map<string, number>();
  for (const r of responses) {
    const label = r.response || "No response";
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, n]) => `${n} ${label}`).join(", ");
}

function pitchDayMessage(
  pd: FounderJourneyInput["pitchDay"],
  options: FounderJourneyInput["pitchDayOptions"],
  unchosen: FounderJourneyInput["pitchDayOptions"],
  goldenPasses: number,
): FounderStageContent {
  if (pd) {
    const gp =
      goldenPasses > 0
        ? `${goldenPasses} Golden Pass${goldenPasses === 1 ? "" : "es"} received.`
        : "No Golden Pass was awarded.";
    return {
      title: "Pitch Day",
      summary: "Pitch Day completed",
      whatThisMeans:
        "Your Pitch Day is complete. A Golden Pass is initial interest from an investor; it is not yet a written commitment, and the team will tell you where each conversation stands.",
      latestUpdate: `${gp} Held on ${on(pd.scheduledAt)}.`,
      deadline: `Pitch Day ${on(pd.scheduledAt)}`,
    };
  }
  if (options.length > 0) {
    return {
      title: "Pitch Day",
      summary: unchosen.length > 0 ? `${unchosen.length} date${unchosen.length === 1 ? "" : "s"} to confirm` : "Dates confirmed",
      whatThisMeans:
        "Investors who are interested have given their available dates. Please confirm which of the dates below you can attend; we match them with the panel and confirm your one-to-one slots.",
      latestUpdate: unchosen.length > 0 ? "The team has released dates for you to confirm." : "Your availability has been received.",
      nextStep: unchosen.length > 0 ? "Confirm the dates you can attend." : undefined,
    };
  }
  return {
    title: "Pitch Day",
    summary: "Not scheduled yet",
    whatThisMeans:
      "After your virtual pitches, the interested investors give their available dates and the team confirms which can be offered to you. You will see the dates here to choose from.",
    latestUpdate: "Waiting for your virtual pitch to complete.",
  };
}

function finalSelectionMessage(
  outcome: string,
  done: boolean,
  committee: FounderJourneyInput["committee"],
): FounderStageContent {
  if (!done) {
    return {
      title: "Final selection",
      summary: "Decision in progress",
      whatThisMeans:
        "The Final Shortlisting Committee is reviewing your Pitch Day outcome. You will see the decision here: proceed, on hold or not selected.",
      latestUpdate: "Decision pending.",
    };
  }
  switch (outcome) {
    case "proceed":
      return {
        title: "Final selection",
        summary: "Selected",
        whatThisMeans: "Congratulations! Your startup has been selected to move forward in Startup Singam.",
        latestUpdate: "Selected by the committee.",
      };
    case "on_hold":
      return {
        title: "Final selection",
        summary: "On hold",
        whatThisMeans:
          "The committee has placed your selection on hold. The team will come back to you if anything further is needed.",
        latestUpdate: committee?.reReviewDate ? `Re-review on ${on(committee.reReviewDate)}.` : "Decision on hold.",
      };
    case "rejected":
      return {
        title: "Final selection",
        summary: "Not selected",
        whatThisMeans:
          "Thank you for participating in Startup Singam. Following the final review, your startup has not been selected to progress to the next stage. We appreciate the time and effort you invested in this journey.",
        latestUpdate: "Final review complete.",
        nextStep:
          "You can apply again in a future season — your record is kept, and the team is happy to share feedback on the pitch.",
      };
    default:
      return {
        title: "Final selection",
        summary: "Decision in progress",
        whatThisMeans:
          "The Final Shortlisting Committee is reviewing your Pitch Day outcome. You will see the decision here: proceed, on hold or not selected.",
        latestUpdate: "Decision pending.",
      };
  }
}

function feeMessage(
  fee: FounderJourneyInput["fee"],
  proof: FounderJourneyInput["paymentProof"],
  today: string,
): FounderStageContent {
  if (!fee || fee.status === "not_initiated") {
    return {
      title: "Upfront fee",
      summary: "Not raised yet",
      whatThisMeans:
        "Once you are selected, Finance raises your upfront fee. It is based on your turnover for the relevant financial year and is payable within 15 days of the announcement of initial investor interest.",
      latestUpdate: "Waiting for selection to be confirmed.",
    };
  }
  const basis = fee.turnoverBasis ? ` Based on turnover ${fee.turnoverBasis}${fee.financialYear ? ` for FY ${fee.financialYear}` : ""}.` : "";
  switch (fee.status) {
    case "paid":
      return {
        title: "Upfront fee",
        summary: "Paid",
        whatThisMeans: "Your upfront fee is paid and your receipt is allocated. Your journey continues to production.",
        latestUpdate: `Invoice ${fee.invoiceNo} settled.`,
      };
    case "waived":
      return {
        title: "Upfront fee",
        summary: "Waived",
        whatThisMeans: "The upfront fee has been waived by Management. Your journey continues.",
        latestUpdate: "Fee waived.",
      };
    case "part_paid":
      return {
        title: "Upfront fee",
        summary: "Partly paid",
        whatThisMeans: `Part of your upfront fee has been received. ${money(fee.outstanding)} is still outstanding.${basis}`,
        latestUpdate: `${money(fee.paidAmount)} of ${money(fee.feeAmount)} received.`,
        deadline: fee.dueDate ? `Due ${on(fee.dueDate)} (${countdown(fee.dueDate, today)})` : undefined,
        nextStep: "Pay the outstanding balance, or share your payment proof below.",
      };
    case "overdue":
      return {
        title: "Upfront fee",
        summary: "Overdue",
        whatThisMeans: `Your upfront fee is past its due date of ${on(fee.dueDate)}. ${money(fee.outstanding)} is outstanding. If you need longer, request an extension with a reason and Management will decide — an approved extension keeps the original due date on record.`,
        latestUpdate: "Payment overdue.",
        deadline: fee.dueDate ? `Due ${on(fee.dueDate)} (${countdown(fee.dueDate, today)})` : undefined,
        nextStep: "Pay the outstanding balance, share your payment proof, or request an extension with a reason.",
      };
    case "extension_approved":
      return {
        title: "Upfront fee",
        summary: "Extension approved",
        whatThisMeans: `Management has approved an extension. ${money(fee.outstanding)} is outstanding, and the original due date of ${on(fee.dueDate)} stays on record.`,
        latestUpdate: "Extension approved.",
        nextStep: "Pay the outstanding balance and share your payment proof.",
      };
    case "disputed":
      return {
        title: "Upfront fee",
        summary: "Disputed",
        whatThisMeans: "Your upfront fee is under discussion with the team. Finance will contact you about the next step.",
        latestUpdate: "Dispute recorded.",
      };
    default:
      return {
        title: "Upfront fee",
        summary: proof?.status === "submitted" ? "Payment verification in progress" : "Invoice received",
        whatThisMeans:
          `Your upfront fee is due.${basis} Review the invoice, pay using the instructions below, and share your payment proof. Sharing a screenshot does not mark the invoice paid — Finance verifies and allocates the receipt first.`,
        latestUpdate: `Invoice ${fee.invoiceNo || ""} dated ${on(fee.invoiceDate)}; due ${on(fee.dueDate)}.`,
        deadline: fee.dueDate ? `15-day countdown: ${countdown(fee.dueDate, today)}` : undefined,
        nextStep: proof?.status === "submitted" ? "Finance is verifying your payment proof." : "Pay the fee and share your payment proof.",
      };
  }
}

function mockMessage(
  mock: FounderJourneyInput["mock"],
  ready: boolean,
  approved: boolean,
): FounderStageContent {
  if (!mock) {
    return {
      title: "Mock shoot",
      summary: "Being planned",
      whatThisMeans:
        "After your AV shoot, Production schedules the mock shoot — your rehearsal. You will see the date and a readiness checklist here.",
      latestUpdate: "Production planning in progress.",
    };
  }
  const deadline = mock.scheduledOn ? `Shoot date ${on(mock.scheduledOn)}` : undefined;
  if (approved || ready) {
    return {
      title: "Mock shoot",
      summary: approved ? "Readiness approved" : "Readiness complete",
      whatThisMeans:
        "Your mock shoot readiness is complete — pitch, product demo, props and stage movement are all in place. Production has approved you for the main shoot.",
      latestUpdate: approved
        ? `Final readiness approved${mock.finalReadinessApprovedOn ? ` on ${on(mock.finalReadinessApprovedOn)}` : ""}.`
        : "Checklist complete.",
      deadline,
    };
  }
  return {
    title: "Mock shoot",
    summary: mock.scheduledOn ? `Mock shoot on ${on(mock.scheduledOn)}` : "Checklist to complete",
    whatThisMeans:
      "The mock shoot is your rehearsal: pitch revisions, product demo, costumes and properties, stage movement and your final ask and valuation. Completing the checklist makes the main shoot smoother.",
    latestUpdate: mock.scheduledOn ? `Mock shoot scheduled for ${on(mock.scheduledOn)}.` : "Production is preparing your mock shoot.",
    deadline,
    nextStep: mock.openActions
      ? `Complete the checklist items: ${mock.openActions}`
      : "Complete the readiness checklist Production lists.",
  };
}

function mainMessage(
  main: FounderJourneyInput["main"],
  done: boolean,
  today: string,
): FounderStageContent {
  if (!main) {
    return {
      title: "Main shoot",
      summary: "Not scheduled yet",
      whatThisMeans:
        "Once your mock shoot readiness is approved, Production schedules the main shoot. On the day, the accepted offers, lead and co-investors and conditions are recorded.",
      latestUpdate: "Waiting for your mock shoot readiness to be approved.",
    };
  }
  if (done) {
    const docs = main.dealAcceptanceSigned ? "Your Startup Deal Acceptance Letter is signed." : "";
    return {
      title: "Main shoot",
      summary: "Main shoot completed",
      whatThisMeans: `Your main shoot is complete. The accepted offers, lead and co-investors and conditions are on record. ${docs}`.trim(),
      latestUpdate: main.completedOn ? `Main shoot completed on ${on(main.completedOn)}.` : "Shoot complete.",
      deadline: main.signingDeadline ? `Signing deadline ${on(main.signingDeadline)}` : undefined,
    };
  }
  return {
    title: "Main shoot",
    summary: main.scheduledOn ? `Main shoot on ${on(main.scheduledOn)}` : "Being scheduled",
    whatThisMeans:
      "Your main shoot is where the live ask and offers, the accepted deal terms, the lead and co-investor allocations and the conditions are recorded, and the Investment Commitment Letter and Startup Deal Acceptance Letter are signed.",
    latestUpdate: main.scheduledOn ? `Main shoot scheduled for ${on(main.scheduledOn)}.` : "Production is scheduling your main shoot.",
    deadline: main.signingDeadline ? `Signing deadline ${on(main.signingDeadline)} (${countdown(main.signingDeadline, today)})` : undefined,
    nextStep: main.dealAcceptanceSigned
      ? "Keep the shoot day free and follow the attendance instructions Production shares."
      : "Sign the Startup Deal Acceptance Letter to complete the shoot-day documentation.",
  };
}

function telecastMessage(
  telecast: FounderJourneyInput["telecast"],
  episode: FounderJourneyInput["episode"],
  today: string,
): FounderStageContent {
  if (!telecast) {
    return {
      title: "Telecast and promotion",
      summary: "Not scheduled yet",
      whatThisMeans:
        "After your main shoot, the episode is edited and approved, then scheduled for telecast. You will see the episode and air date here, along with the approved posts to share.",
      latestUpdate: episode?.episodeNo ? `Episode ${episode.episodeNo} is being prepared.` : "Waiting for your main shoot to complete.",
    };
  }
  const airDate = telecast.telecastDate ? `Episode ${episode?.episodeNo ?? ""} airs on ${on(telecast.telecastDate)}.`.trim() : "";
  if (["telecast", "completed"].includes(telecast.status)) {
    return {
      title: "Telecast and promotion",
      summary: "Telecast completed",
      whatThisMeans:
        "Your episode has been telecast. Thank you for sharing your journey — your feedback helps us improve the programme.",
      latestUpdate: telecast.founderFeedback ? `Your feedback: ${telecast.founderFeedback}` : airDate || "Telecast complete.",
    };
  }
  return {
    title: "Telecast and promotion",
    summary: telecast.telecastDate ? `Airs ${on(telecast.telecastDate)}` : "Being prepared",
    whatThisMeans:
      "Your episode is edited and approved, then scheduled. Marketing shares the approved posts and the approved announcement wording for you to use, and any public claim distinguishes amounts announced, committed and verified as deployed.",
    latestUpdate: airDate || "Your episode is being prepared for telecast.",
    deadline: telecast.telecastDate ? `Air date ${on(telecast.telecastDate)} (${countdown(telecast.telecastDate, today)})` : undefined,
    nextStep: Number(telecast.founderPostingDone) === 0
      ? "Post the approved content, mark it done and give your feedback."
      : "Give your feedback on the telecast once it has aired.",
  };
}

function dealClosureMessage(deals: FounderJourneyInput["deals"]): FounderStageContent {
  if (deals.count === 0) {
    return {
      title: "Deal closure",
      summary: "No deals to close yet",
      whatThisMeans:
        "After the main shoot, each investor conversation becomes its own deal to close: term sheet, due diligence, agreements and conditions. You will see one card per investor here.",
      latestUpdate: "Waiting for confirmed investor interest.",
    };
  }
  if (deals.withdrawalReason && deals.committed === 0) {
    return {
      title: "Deal closure",
      summary: "Deal withdrawn",
      whatThisMeans:
        "An investor conversation has been withdrawn and the reason is on record. If a replacement investor is being brought in, you will see it here.",
      latestUpdate: `Withdrawal reason: ${deals.withdrawalReason}${deals.hasReplacement ? " A replacement investor is being arranged." : ""}`,
    };
  }
  return {
    title: "Deal closure",
    summary: `${deals.count} deal${deals.count === 1 ? "" : "s"} in progress`,
    whatThisMeans:
      "Each investor has their own deal record: term sheet, due diligence, agreements and conditions, with an expected date for every milestone. You upload due-diligence documents and sign agreements here.",
    latestUpdate: [
      deals.committed > 0 ? `${money(deals.committed)} committed.` : "",
      deals.milestoneDates ? `Milestones: ${deals.milestoneDates}.` : "",
      deals.openDocuments ? `Open documents: ${deals.openDocuments}.` : "",
      deals.openConditions ? `Open conditions: ${deals.openConditions}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    deadline: deals.milestoneDates || undefined,
    nextStep: "Upload the due-diligence documents and sign the agreements the team requests.",
  };
}

function fundsMessage(funding: FounderJourneyInput["funding"], today: string): FounderStageContent {
  if (funding.committed === 0) {
    return {
      title: "Funds received",
      summary: "Nothing committed yet",
      whatThisMeans:
        "As each deal closes, funds are transferred tranche by tranche. You confirm receipt and upload the bank statement, and the team verifies each tranche.",
      latestUpdate: "Waiting for a confirmed commitment.",
    };
  }
  const fullyReceived = funding.received >= funding.committed;
  return {
    title: "Funds received",
    summary: fullyReceived ? "Fully received" : `${money(funding.received)} received of ${money(funding.committed)}`,
    whatThisMeans:
      "Each tranche is tracked on its own: the scheduled amount, the investor-reported transfer, your confirmation of receipt, the bank evidence and the verified amount. Only verified amounts count as received.",
    latestUpdate: `${money(funding.committed)} committed; ${money(funding.received)} verified as received; ${money(funding.pending)} pending across ${funding.trancheCount} tranche${funding.trancheCount === 1 ? "" : "s"} (${funding.verifiedTranches} verified).`,
    deadline: funding.nextTrancheOn ? `Next tranche ${on(funding.nextTrancheOn)} (${countdown(funding.nextTrancheOn, today)})` : undefined,
    nextStep: fullyReceived ? undefined : "Confirm the receipt of each tranche and upload the bank statement.",
  };
}

function successFeeMessage(
  sf: FounderJourneyInput["successFee"],
  proof: FounderJourneyInput["successFeeProof"],
  today: string,
): FounderStageContent {
  if (!sf || sf.status === "not_triggered") {
    return {
      title: "Success fee",
      summary: "Not triggered yet",
      whatThisMeans:
        "Your success fee is calculated only on the money actually received, under your signed MoU. It is triggered once a deployment is verified, and you will see the base, the rate and the invoice here.",
      latestUpdate: "Waiting for a verified deployment.",
    };
  }
  switch (sf.status) {
    case "collected":
      return {
        title: "Success fee",
        summary: "Collected",
        whatThisMeans: "Your success fee is fully collected and the account is reconciled.",
        latestUpdate: `Invoice ${sf.invoiceNo} settled.`,
      };
    case "part_collected":
      return {
        title: "Success fee",
        summary: "Partly collected",
        whatThisMeans: `Part of your success fee has been received. ${money(sf.outstanding)} is still outstanding.`,
        latestUpdate: `${money(sf.collected)} of ${money(sf.feeDue)} collected.`,
        deadline: sf.dueDate ? `Due ${on(sf.dueDate)} (${countdown(sf.dueDate, today)})` : undefined,
        nextStep: "Pay the outstanding balance and share your payment proof.",
      };
    case "overdue":
      return {
        title: "Success fee",
        summary: "Overdue",
        whatThisMeans: `Your success fee is past its due date of ${on(sf.dueDate)}. ${money(sf.outstanding)} is outstanding.`,
        latestUpdate: "Payment overdue.",
        deadline: sf.dueDate ? `Due ${on(sf.dueDate)} (${countdown(sf.dueDate, today)})` : undefined,
        nextStep: "Pay the outstanding balance and share your payment proof.",
      };
    case "disputed":
      return {
        title: "Success fee",
        summary: "Disputed",
        whatThisMeans: "Your success fee is under discussion with the team. Finance will contact you about the next step.",
        latestUpdate: "Dispute recorded.",
      };
    default:
      return {
        title: "Success fee",
        summary: proof?.status === "submitted" ? "Payment verification in progress" : "Invoice received",
        whatThisMeans:
          "Your success fee is due, calculated only on the money actually received. Pay using the instructions on the invoice and share your payment proof; Finance verifies and allocates the receipt before it is marked collected.",
        latestUpdate: `Invoice ${sf.invoiceNo || ""}; due ${on(sf.dueDate)}.`,
        deadline: sf.dueDate ? `Invoice due ${on(sf.dueDate)} (${countdown(sf.dueDate, today)})` : undefined,
        nextStep: proof?.status === "submitted" ? "Finance is verifying your payment proof." : "Pay the fee and share your payment proof.",
      };
  }
}

function communityMessage(community: FounderJourneyInput["community"]): FounderStageContent {
  if (!community.isMember) {
    return {
      title: "Community",
      summary: "Not joined yet",
      whatThisMeans:
        "Startup Singam's community brings together founders, alumni, mentors, investors and ecosystem partners. Once you join, your events, mentoring and support requests live here.",
      latestUpdate: "You will be added to the community as your journey progresses.",
    };
  }
  return {
    title: "Community",
    summary: `${community.eventsAttended} of ${community.eventsRegistered} events attended`,
    whatThisMeans:
      "You are part of the Startup Singam community: alumni, mentors, events, referrals and support requests. You can join events and ask for support — investor introductions, mentoring, customer connections, hiring help or follow-on funding.",
    latestUpdate: [
      community.memberType ? `Member type: ${community.memberType.replace(/_/g, " ")}.` : "",
      `${community.eventsRegistered} event${community.eventsRegistered === 1 ? "" : "s"} registered, ${community.eventsAttended} attended.`,
      community.supportOpen > 0 ? `${community.supportOpen} open support request${community.supportOpen === 1 ? "" : "s"}.` : "",
      community.supportResolved > 0 ? `${community.supportResolved} resolved.` : "",
      community.referrals > 0 ? `${community.referrals} referral${community.referrals === 1 ? "" : "s"}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    nextStep: community.supportOpen > 0 ? "Track your open support requests and join upcoming events." : "Join the upcoming events and ask for support when you need it.",
  };
}
