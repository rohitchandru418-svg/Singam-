import type { Investor, Startup } from "./types";

/**
 * Startup-to-investor matching.
 *
 * The system recommends suitable investors using sector, stage, cheque size, geography,
 * thesis, investor grade and available allocation. Investor Relations approves circulation;
 * the system never circulates on its own.
 */

export interface MatchScore {
  score: number; // 0-100
  reasons: string[];
  blockers: string[];
}

const GRADE_WEIGHT: Record<string, number> = {
  l1: 20,
  l2: 15,
  l3: 10,
  l4: 5,
};

export interface MatchInputs {
  startup: Pick<Startup, "sector" | "stage" | "geography">;
  investor: Pick<
    Investor,
    "sector_focus" | "stage_focus" | "geography" | "thesis" | "ticket_min" | "ticket_max" | "grade" | "status"
  >;
  /** Funds still unallocated for this investor, in paise. */
  availableAllocationPaise: number;
  /** The startup's funding ask, in paise. */
  fundingAskPaise: number;
}

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function overlap(a: string, b: string): number {
  const setB = new Set(tokens(b));
  return tokens(a).filter((t) => setB.has(t)).length;
}

export function scoreMatch(inputs: MatchInputs): MatchScore {
  const { startup, investor } = inputs;
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 0;

  // Sector fit - 25 points.
  if (overlap(startup.sector, investor.sector_focus) > 0) {
    score += 25;
    reasons.push(`Sector fit: ${startup.sector} is in the investor's focus`);
  } else {
    reasons.push(`Sector mismatch: investor focuses on ${investor.sector_focus}`);
  }

  // Stage fit - 15 points.
  if (overlap(startup.stage, investor.stage_focus) > 0) {
    score += 15;
    reasons.push(`Stage fit: ${startup.stage}`);
  } else {
    reasons.push(`Stage mismatch: investor targets ${investor.stage_focus}`);
  }

  // Geography - 10 points.
  if (overlap(startup.geography, investor.geography) > 0) {
    score += 10;
    reasons.push(`Geography fit: ${startup.geography}`);
  }

  // Thesis overlap - 10 points.
  const thesisOverlap = overlap(startup.sector, investor.thesis);
  if (thesisOverlap > 0) {
    score += 10;
    reasons.push("Investment thesis overlaps the startup's sector");
  }

  // Cheque size - 20 points.
  const ask = inputs.fundingAskPaise;
  if (ask > 0 && ask >= investor.ticket_min && ask <= investor.ticket_max) {
    score += 20;
    reasons.push("Funding ask sits inside the investor's ticket range");
  } else if (ask > 0 && ask < investor.ticket_min) {
    reasons.push("Funding ask is below the investor's minimum ticket");
  } else if (ask > 0) {
    reasons.push("Funding ask exceeds the investor's maximum ticket");
  }

  // Grade - 20 points.
  score += GRADE_WEIGHT[investor.grade ?? ""] ?? 0;
  if (investor.grade) reasons.push(`Investor grade ${investor.grade.toUpperCase()}`);

  // Hard blockers keep a pair out of circulation regardless of score.
  if (investor.status !== "onboarded") {
    blockers.push(`Investor is not onboarded (status: ${investor.status})`);
  }
  if (inputs.availableAllocationPaise <= 0) {
    blockers.push("No unallocated capital remains for this investor");
  } else if (ask > 0 && inputs.availableAllocationPaise < ask) {
    reasons.push("Only part of the funding ask fits the remaining allocation");
  }

  return { score: Math.max(0, Math.min(100, score)), reasons, blockers };
}

export function matchScoreLabel(score: number): string {
  if (score >= 75) return "Strong";
  if (score >= 55) return "Good";
  if (score >= 35) return "Possible";
  return "Weak";
}
