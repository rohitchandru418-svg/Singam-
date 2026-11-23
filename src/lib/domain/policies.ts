/**
 * Configurable policies.
 *
 * Section 11 of the brief lists the SOP points that must be resolved before the rules
 * are locked. Each is modelled here as a policy with a value, an effective date and an
 * approval history, so a future season can change the process without losing earlier
 * records.
 */

export type PolicyCategory =
  | "selection"
  | "finance"
  | "legal"
  | "investor"
  | "community"
  | "operations";

export interface PolicyDefinition {
  code: string;
  title: string;
  category: PolicyCategory;
  /** The open question from the SOP that this policy closes. */
  question: string;
  defaultValue: Record<string, unknown>;
  /** Plain-language description of the allowed values. */
  valueSchema: string;
  requiresApproval: boolean;
}

export const POLICY_DEFINITIONS: PolicyDefinition[] = [
  {
    code: "POL-CLOSE-TIMING",
    title: "Investment closure timing",
    category: "legal",
    question:
      "The application SOP starts term sheets after telecast; the investor documents start deal execution after the shoot.",
    defaultValue: {
      closureTrigger: "deal_confirmation",
      telecastTrackedIndependently: true,
      allowParallelClosure: true,
    },
    valueSchema: "closureTrigger: deal_confirmation | shoot_completed | telecast_completed",
    requiresApproval: true,
  },
  {
    code: "POL-MOU-TIMING",
    title: "Pre-shoot and post-shoot MoU",
    category: "legal",
    question:
      "The application SOP describes MoU signing after the stage pitch; the unified flow separates pre-shoot and post-shoot documents.",
    defaultValue: {
      preShootDocument: "Startup Participation MoU",
      preShootSigningPoint: "after_analyst_screening",
      postShootDocument: "Startup Deal Acceptance Letter",
      postShootSigningPoint: "main_shoot_day",
      legalAmaWorkingDay: 4,
      signingDeadlineWorkingDay: 7,
    },
    valueSchema:
      "preShootSigningPoint / postShootSigningPoint: any stage key; legalAmaWorkingDay, signingDeadlineWorkingDay: integers",
    requiresApproval: true,
  },
  {
    code: "POL-GOLDEN-PASS",
    title: "Golden Pass evidence and status",
    category: "investor",
    question:
      "The application SOP treats a Golden Pass as initial interest; the IR SOP also requires a minimum commitment before issuance.",
    defaultValue: {
      minimumIndicativeAmount: 500_000_00, // Rs 5,00,000 in paise
      requiresWrittenEvidence: true,
      countsAsWrittenCommitment: false,
      statusRegistryValue: "golden_pass",
      issuableGrades: ["l1", "l2", "l3"],
    },
    valueSchema:
      "minimumIndicativeAmount: paise; countsAsWrittenCommitment must remain false to keep interest separate from commitment",
    requiresApproval: true,
  },
  {
    code: "POL-INVESTOR-DOCS",
    title: "Mandatory investor document set",
    category: "investor",
    question:
      "The IR SOP uses both 'IPA or NDA or MoU' and an exit gate requiring all three signed.",
    defaultValue: {
      byCategory: {
        HNI: ["Participation agreement", "Confidentiality agreement"],
        "Family office": ["Participation agreement", "Confidentiality agreement", "MoU"],
        VC: ["Participation agreement", "Confidentiality agreement", "MoU"],
        "Angel network": ["Participation agreement", "Confidentiality agreement"],
        Corporate: ["Participation agreement", "Confidentiality agreement", "MoU"],
        Syndicate: ["Participation agreement", "Confidentiality agreement"],
      },
      exitGateRequiresAll: true,
    },
    valueSchema: "byCategory maps investor category -> required document titles; exitGateRequiresAll: boolean",
    requiresApproval: true,
  },
  {
    code: "POL-SHOOT-SIGNATURES",
    title: "Shoot-day signature target and deadline",
    category: "operations",
    question:
      "The IR SOP says immediate execution and also specifies a 24-hour sign-off control.",
    defaultValue: {
      target: "immediate_at_shoot",
      finalDeadlineHours: 24,
      escalateOnBreach: true,
    },
    valueSchema: "target: immediate_at_shoot | same_day; finalDeadlineHours: integer",
    requiresApproval: true,
  },
  {
    code: "POL-SCREEN-QUALIFY",
    title: "Screening qualifying score and non-applicable criteria",
    category: "selection",
    question:
      "Marks are defined, but the qualifying score and the treatment of non-applicable criteria are not.",
    defaultValue: {
      qualifyingPercent: 60,
      nonApplicableTreatment: "exclude_from_denominator",
      ideaStageSkipsFinancials: true,
    },
    valueSchema:
      "qualifyingPercent: 0-100; nonApplicableTreatment: exclude_from_denominator | award_full_marks | award_zero",
    requiresApproval: true,
  },
  {
    code: "POL-UPFRONT-FEE",
    title: "Upfront fee schedule and adjustment rules",
    category: "finance",
    question:
      "The turnover basis and 15-day timeline are defined; the complete fee slabs and adjustment rules are not supplied.",
    defaultValue: {
      scheduleCode: "UPFRONT-FY26-V1",
      basis: "turnover_previous_financial_year",
      paymentDaysFromAnnouncement: 15,
      adjustableAgainstSuccessFee: false,
      adjustmentRequiresAgreementClause: true,
      extensionRequiresManagementApproval: true,
      preserveOriginalDueDateOnExtension: true,
    },
    valueSchema:
      "basis: turnover_previous_financial_year | turnover_current_year; adjustableAgainstSuccessFee only when the signed agreement says so",
    requiresApproval: true,
  },
  {
    code: "POL-SUCCESS-FEE",
    title: "Success fee structure",
    category: "finance",
    question:
      "The SOP triggers a success fee after deployment under the signed MoU; the structure is not fully specified.",
    defaultValue: {
      structure: "percentage",
      defaultPercent: 2,
      capPaise: 50_00_000_00, // Rs 50,00,000 cap
      trancheWiseBilling: true,
      excludeBridgeAndDebt: true,
      partnerSettlementPercent: 10,
    },
    valueSchema: "structure: percentage | fixed | slab; defaultPercent: number; capPaise: paise",
    requiresApproval: true,
  },
  {
    code: "POL-INV-ELIGIBILITY",
    title: "Investor eligibility and verification",
    category: "investor",
    question: "Eligibility requirements are described but not fully configurable.",
    defaultValue: {
      minimumTicketPaise: 250_000_00,
      requireReferenceChecks: true,
      requireVerificationEvidence: true,
      reGradeIntervalMonths: 12,
    },
    valueSchema: "minimumTicketPaise: paise; reGradeIntervalMonths: integer",
    requiresApproval: true,
  },
  {
    code: "POL-COMMUNITY",
    title: "Community membership, engagement, referral and support",
    category: "community",
    question: "Detailed community operating rules were not supplied.",
    defaultValue: {
      membershipRequiresConsent: true,
      confidentialAccessByDefault: false,
      referralQualificationDays: 14,
      supportRequestSlaWorkingDays: 5,
      allowMultipleRolesPerPerson: true,
    },
    valueSchema:
      "confidentialAccessByDefault must remain false: membership never grants deal information access",
    requiresApproval: true,
  },
  {
    code: "POL-COMM-48H",
    title: "48-hour communication thread after a deal discussion",
    category: "operations",
    question: "The IR SOP requires a thread within 48 hours of the discussion or show.",
    defaultValue: { hours: 48, escalateOnBreach: true },
    valueSchema: "hours: integer",
    requiresApproval: false,
  },
  {
    code: "POL-IRR-2WEEK",
    title: "IRR shared at least two weeks before shoot",
    category: "investor",
    question: "The IR SOP requires the IRR at least two weeks before the shoot.",
    defaultValue: { workingDaysBeforeShoot: 10, atRiskThresholdWorkingDays: 5, escalateOnRisk: true },
    valueSchema: "workingDaysBeforeShoot: integer",
    requiresApproval: false,
  },
  {
    code: "POL-INCENTIVE",
    title: "Incentive attribution and calculation",
    category: "operations",
    question:
      "Team performance must separate deployment, startup funding conversion and fee collection.",
    defaultValue: {
      attributionRule: "verified_results_only",
      separateMeasures: ["deployment", "startup_funding_conversion", "fee_collection"],
      useVerifiedDeploymentOnly: true,
      excludeForecast: true,
    },
    valueSchema: "attributionRule: verified_results_only | approved_split",
    requiresApproval: true,
  },
];

export const POLICY_DEFINITION_MAP: Record<string, PolicyDefinition> = Object.fromEntries(
  POLICY_DEFINITIONS.map((p) => [p.code, p]),
) as Record<string, PolicyDefinition>;

export interface FeeSlabDefinition {
  turnoverMinPaise: number;
  turnoverMaxPaise: number | null;
  feePaise: number;
}

/** Turnover-based upfront fee schedule, versioned so earlier seasons are preserved. */
export const UPFRONT_FEE_SCHEDULE: Record<
  string,
  { version: string; effectiveFrom: string; slabs: FeeSlabDefinition[] }
> = {
  "UPFRONT-FY26-V1": {
    version: "V1",
    effectiveFrom: "2026-04-01",
    slabs: [
      { turnoverMinPaise: 0, turnoverMaxPaise: 1_00_00_000_00, feePaise: 2_00_000_00 },
      { turnoverMinPaise: 1_00_00_000_00, turnoverMaxPaise: 5_00_00_000_00, feePaise: 5_00_000_00 },
      { turnoverMinPaise: 5_00_00_000_00, turnoverMaxPaise: 25_00_00_000_00, feePaise: 12_50_000_00 },
      { turnoverMinPaise: 25_00_00_000_00, turnoverMaxPaise: null, feePaise: 25_00_000_00 },
    ],
  },
};

export function upfrontFeeFor(turnoverPaise: number, scheduleCode: string): number {
  const schedule = UPFRONT_FEE_SCHEDULE[scheduleCode];
  if (!schedule) return 0;
  const slab = schedule.slabs.find(
    (s) =>
      turnoverPaise >= s.turnoverMinPaise &&
      (s.turnoverMaxPaise === null || turnoverPaise < s.turnoverMaxPaise),
  );
  return slab?.feePaise ?? 0;
}

/** Success fee calculation. Supports percentage, fixed and slab structures. */
export interface SuccessFeeInput {
  structure: "percentage" | "fixed" | "slab";
  eligibleFundingPaise: number;
  percent?: number;
  fixedPaise?: number;
  slabDefinition?: { upToPaise: number | null; percent: number }[];
  capPaise?: number;
}

export function calculateSuccessFee(input: SuccessFeeInput): number {
  let fee = 0;
  switch (input.structure) {
    case "percentage":
      fee = Math.round((input.eligibleFundingPaise * (input.percent ?? 0)) / 100);
      break;
    case "fixed":
      fee = input.fixedPaise ?? 0;
      break;
    case "slab": {
      let previous = 0;
      for (const slab of input.slabDefinition ?? []) {
        const ceiling = slab.upToPaise ?? Number.POSITIVE_INFINITY;
        // Each slab bills only the funding inside its own band, capped by the total eligible.
        const band = Math.max(0, Math.min(input.eligibleFundingPaise, ceiling - previous));
        fee += Math.round((band * slab.percent) / 100);
        previous = ceiling;
        if (previous >= input.eligibleFundingPaise) break;
      }
      break;
    }
  }
  if (input.capPaise !== undefined && input.capPaise > 0) {
    fee = Math.min(fee, input.capPaise);
  }
  return fee;
}
