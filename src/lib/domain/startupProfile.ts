/**
 * Startup-side profile rules.
 *
 * The founder maintains their own profile. Completeness and eligibility are pure
 * functions of the record, so the same numbers drive the founder's progress bar and
 * the review queue on the internal console.
 */

export interface ProfileRow {
  name?: unknown;
  legal_entity?: unknown;
  sector?: unknown;
  geography?: unknown;
  origin_country?: unknown;
  registered?: unknown;
  category?: unknown;
  pitch?: unknown;
  logo_ref?: unknown;
  product_stage?: unknown;
  revenue_stage?: unknown;
  technologies?: unknown;
  target_fundraise?: unknown;
  monthly_revenue?: unknown;
  customer_count?: unknown;
  traction?: unknown;
  pitch_deck_ref?: unknown;
  video_pitch_ref?: unknown;
}

export interface FounderRow {
  name?: unknown;
  email?: unknown;
}

export interface CompletenessField {
  key: string;
  label: string;
  /** Filled when this returns true. */
  filled: (row: ProfileRow, founders: FounderRow[]) => boolean;
}

const hasText = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
const hasNumber = (v: unknown): boolean => Number(v ?? 0) > 0;

/**
 * The fields a founder must supply, in the order the profile form shows them. Financial and
 * traction fields drop out for a pre-revenue business, matching the SOP rule that idea-stage
 * startups may skip them.
 */
export function profileFields(row: ProfileRow): CompletenessField[] {
  const revenueStage = String(row.revenue_stage ?? "");
  const needsFinancials = revenueStage !== "" && revenueStage !== "pre_revenue";

  const fields: CompletenessField[] = [
    { key: "name", label: "Company name", filled: (r) => hasText(r.name) },
    { key: "legal_entity", label: "Registered legal name", filled: (r) => hasText(r.legal_entity) },
    { key: "sector", label: "Sector", filled: (r) => hasText(r.sector) },
    { key: "geography", label: "Geography", filled: (r) => hasText(r.geography) },
    { key: "origin_country", label: "Country", filled: (r) => hasText(r.origin_country) },
    { key: "registered", label: "Registered business", filled: (r) => Number(r.registered ?? 0) === 1 },
    { key: "logo_ref", label: "Company logo", filled: (r) => hasText(r.logo_ref) },
    { key: "pitch", label: "Elevator pitch", filled: (r) => hasText(r.pitch) },
    { key: "product_stage", label: "Product stage", filled: (r) => hasText(r.product_stage) },
    { key: "revenue_stage", label: "Revenue stage", filled: (r) => hasText(r.revenue_stage) },
    { key: "technologies", label: "Technologies", filled: (r) => hasText(r.technologies) },
    { key: "target_fundraise", label: "Target fundraise", filled: (r) => hasNumber(r.target_fundraise) },
    { key: "pitch_deck_ref", label: "Pitch deck", filled: (r) => hasText(r.pitch_deck_ref) },
    { key: "founder", label: "At least one founder", filled: (_r, f) => f.some((x) => hasText(x.name) && hasText(x.email)) },
  ];

  if (needsFinancials) {
    fields.push(
      { key: "monthly_revenue", label: "Monthly revenue", filled: (r) => hasNumber(r.monthly_revenue) },
      { key: "customer_count", label: "Customers", filled: (r) => hasNumber(r.customer_count) },
      { key: "traction", label: "Traction", filled: (r) => hasText(r.traction) },
    );
  }

  return fields;
}

export interface Completeness {
  percent: number;
  complete: number;
  total: number;
  missing: string[];
}

export function profileCompleteness(row: ProfileRow, founders: FounderRow[] = []): Completeness {
  const fields = profileFields(row);
  const missing: string[] = [];
  let complete = 0;
  for (const field of fields) {
    if (field.filled(row, founders)) complete += 1;
    else missing.push(field.label);
  }
  const total = fields.length || 1;
  return { percent: Math.round((complete / total) * 100), complete, total, missing };
}

export interface EligibilityResult {
  ok: boolean;
  /** Hard blocks: the founder cannot submit until these are fixed. */
  blocking: string[];
  /** Advisory only, shown but not enforced. */
  advisories: string[];
}

const SOUTH_INDIA = ["tamil nadu", "karnataka", "kerala", "telangana", "andhra pradesh", "puducherry"];
const ALLOWED_CATEGORIES = ["startup", "sme"];
const ALLOWED_SECTORS = ["hardware", "deeptech", "robotics", "manufacturing", "saas", "technology", "tech", "fintech", "agritech", "mobility", "healthtech", "cleantech", "edtech", "d2c", "b2c", "retail", "logistics", "proptech"];

/**
 * The FAQ's stated eligibility rules. Only registration is a hard block; geography and
 * sector are advisories, because the show also admits Tamil-origin founders worldwide and
 * new sectors appear each season.
 */
export function eligibility(row: ProfileRow): EligibilityResult {
  const blocking: string[] = [];
  const advisories: string[] = [];

  if (Number(row.registered ?? 0) !== 1) {
    blocking.push("The business must be registered before you can apply.");
  }
  const category = String(row.category ?? "").toLowerCase();
  if (category && !ALLOWED_CATEGORIES.includes(category)) {
    blocking.push("Applicant category must be Startup or SME.");
  }

  const geography = String(row.geography ?? "").toLowerCase();
  const country = String(row.origin_country ?? "").toLowerCase();
  const southIndia = SOUTH_INDIA.some((s) => geography.includes(s));
  const abroad = country !== "" && country !== "india";
  if (geography && !southIndia && !abroad) {
    advisories.push("Startup Singam is for South India-based startups or those founded by Tamil-origin entrepreneurs worldwide. Confirm your eligibility with the team.");
  }

  const sector = String(row.sector ?? "").toLowerCase();
  if (sector && !ALLOWED_SECTORS.some((s) => sector.includes(s))) {
    advisories.push("Your sector is outside the usual Hardware, SaaS/Tech and B2C/D2C groups. The team will review it.");
  }

  return { ok: blocking.length === 0, blocking, advisories };
}
