/**
 * Internal screening framework (100 marks) and the configurable qualifying rules.
 *
 * The SOP defines the marks but not the qualifying score nor how non-applicable
 * criteria are treated. Those two decisions are policies (POL-SCREEN-QUALIFY) so a
 * season can change them without losing earlier records.
 */

export interface ScreeningCriterion {
  key: string;
  label: string;
  max: number;
  /** Whether the criterion can be marked "not applicable" for a given stage. */
  canBeNotApplicable: boolean;
  hint: string;
}

export const SCREENING_CRITERIA: ScreeningCriterion[] = [
  {
    key: "completeness",
    label: "Application completeness",
    max: 10,
    canBeNotApplicable: false,
    hint: "All mandatory fields for the applicant's stage are filled and consistent.",
  },
  {
    key: "documents",
    label: "Document submission and verification",
    max: 10,
    canBeNotApplicable: false,
    hint: "Required documents submitted and independently verified.",
  },
  {
    key: "unique_idea",
    label: "Unique idea",
    max: 20,
    canBeNotApplicable: false,
    hint: "Differentiation, originality and clarity of the problem being solved.",
  },
  {
    key: "revenue",
    label: "Revenue and financial performance",
    max: 10,
    canBeNotApplicable: true,
    hint: "Not applicable for idea-stage startups (SOP allows skipping financials).",
  },
  {
    key: "traction",
    label: "Traction",
    max: 10,
    canBeNotApplicable: true,
    hint: "Users, pilots, partnerships, retention. Not applicable for idea stage.",
  },
  {
    key: "past_funding",
    label: "Past funding details",
    max: 20,
    canBeNotApplicable: true,
    hint: "Source, structure and use of previous funding rounds.",
  },
  {
    key: "founder_capability",
    label: "Founder capability",
    max: 5,
    canBeNotApplicable: false,
    hint: "Domain experience, execution track record and team completeness.",
  },
  {
    key: "incubation",
    label: "Incubated / not incubated",
    max: 5,
    canBeNotApplicable: false,
    hint: "Incubation, accelerator or structured support history.",
  },
  {
    key: "ip_defensibility",
    label: "IP / defensibility",
    max: 10,
    canBeNotApplicable: true,
    hint: "Patents, proprietary data, regulatory moat or network effects.",
  },
];

export const SCREENING_MAX = SCREENING_CRITERIA.reduce((sum, c) => sum + c.max, 0);

export type NonApplicableTreatment = "exclude_from_denominator" | "award_full_marks" | "award_zero";

export interface QualifyingRule {
  /** Minimum percentage required to proceed. */
  qualifyingPercent: number;
  /** How a criterion marked "not applicable" is treated. */
  nonApplicableTreatment: NonApplicableTreatment;
  /** Idea-stage startups where the SOP allows skipping financial and traction. */
  ideaStageSkipsFinancials: boolean;
}

export const DEFAULT_QUALIFYING_RULE: QualifyingRule = {
  qualifyingPercent: 60,
  nonApplicableTreatment: "exclude_from_denominator",
  ideaStageSkipsFinancials: true,
};

export interface ScreeningScoreInput {
  completeness?: number | null;
  documents?: number | null;
  unique_idea?: number | null;
  revenue?: number | null;
  traction?: number | null;
  past_funding?: number | null;
  founder_capability?: number | null;
  incubation?: number | null;
  ip_defensibility?: number | null;
}

export interface ScreeningResult {
  total: number;
  maxApplicable: number;
  percent: number;
  qualifies: boolean;
  notApplicable: string[];
  perCriterion: { key: string; label: string; awarded: number; max: number; applicable: boolean }[];
}

export function scoreScreening(
  input: ScreeningScoreInput,
  rule: QualifyingRule = DEFAULT_QUALIFYING_RULE,
): ScreeningResult {
  const perCriterion: ScreeningResult["perCriterion"] = [];
  const notApplicable: string[] = [];
  let total = 0;
  let maxApplicable = 0;

  for (const c of SCREENING_CRITERIA) {
    const raw = input[c.key as keyof ScreeningScoreInput];
    const isNA = raw === null || raw === undefined;
    let applicable = !isNA;
    let awarded = 0;

    if (isNA && c.canBeNotApplicable) {
      notApplicable.push(c.key);
      if (rule.nonApplicableTreatment === "exclude_from_denominator") {
        applicable = false;
      } else {
        applicable = true;
        awarded = rule.nonApplicableTreatment === "award_full_marks" ? c.max : 0;
      }
    } else if (isNA) {
      // A mandatory criterion cannot be skipped; it simply scores zero and stays in the denominator.
      awarded = 0;
      applicable = true;
    } else {
      awarded = Math.max(0, Math.min(c.max, Number(raw)));
      applicable = true;
    }

    total += awarded;
    if (applicable) maxApplicable += c.max;
    perCriterion.push({ key: c.key, label: c.label, awarded, max: c.max, applicable });
  }

  const percent = maxApplicable === 0 ? 0 : round1((total / maxApplicable) * 100);
  return {
    total,
    maxApplicable,
    percent,
    qualifies: percent >= rule.qualifyingPercent,
    notApplicable,
    perCriterion,
  };
}

/** Criteria that the SOP lets an idea-stage startup skip. */
export const IDEA_STAGE_SKIPPABLE = ["revenue", "traction"] as const;

export function skippableForStage(stage: string): string[] {
  return stage === "idea" ? [...IDEA_STAGE_SKIPPABLE] : [];
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
