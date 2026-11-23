/**
 * The startup application form.
 *
 * One field model drives three things, so they can never disagree:
 *   - the Season 3 application form the founder fills in,
 *   - the completeness percentage on the dashboard banner,
 *   - the "23 of 43 required fields" line on the Application stage.
 *
 * The SOP rule that idea-stage startups may skip financial and traction sections is encoded
 * here: those fields are required only once the business is past pre-revenue, exactly as the
 * application SOP describes. Fields are grouped into the sections the form shows.
 */

export interface ApplicationField {
  key: string;
  label: string;
  /** How the form renders it. */
  type: "text" | "textarea" | "select" | "number" | "money" | "checkbox" | "founder";
  section: string;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Filled when this returns true. */
  filled: (startup: Row, founders: Row[]) => boolean;
  /** False for fields that are shown but optional (e.g. video pitch, website). */
  required: boolean;
  /** Financial / traction fields drop out for a pre-revenue business. */
  financial?: boolean;
}

export type Row = Record<string, unknown>;

const hasText = (v: unknown): boolean => typeof v === "string" && v.trim().length > 0;
const hasNumber = (v: unknown): boolean => Number(v ?? 0) > 0;
/** A field whose valid answers include zero, so presence rather than a positive value counts. */
const hasAmount = (v: unknown): boolean => v !== undefined && v !== null && String(v).trim() !== "" && !Number.isNaN(Number(v));

/** The choices behind the form's dropdowns, so the field model and the form cannot drift. */
export const ENTITY_TYPES = ["Private Limited", "LLP", "Partnership", "Proprietorship", "Public Limited", "One Person Company", "Other"];
export const APPLICANT_CATEGORIES = ["startup", "MSME", "individual", "other"];
export const PRODUCT_STAGES = ["idea", "prototype", "launched", "scaling"];
export const REVENUE_STAGES = ["pre_revenue", "early_revenue", "growth"];

const opts = (values: string[]) => values.map((v) => ({ value: v, label: v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) }));

export const APPLICATION_SECTIONS = [
  "Startup basics",
  "Founders",
  "Product & market",
  "Business model & financials",
  "Traction",
  "Funding",
  "Documents",
] as const;

export type ApplicationSection = (typeof APPLICATION_SECTIONS)[number];

/** Whether the financial and traction sections apply to this startup. */
export function needsFinancials(startup: Row): boolean {
  const revenueStage = String(startup.revenue_stage ?? "");
  const stage = String(startup.stage ?? "");
  if (revenueStage === "pre_revenue" || stage === "idea") return false;
  // Unknown stage: keep them, since the form is filled top-down and the stage is set early.
  return revenueStage !== "" || stage !== "";
}

function baseFields(): ApplicationField[] {
  return [
    { key: "name", label: "Startup name", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.name) },
    { key: "legal_entity", label: "Registered legal name", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.legal_entity) },
    { key: "entity_type", label: "Entity type", type: "select", section: "Startup basics", required: true, options: opts(ENTITY_TYPES), filled: (s) => hasText(s.entity_type) },
    { key: "category", label: "Applicant category", type: "select", section: "Startup basics", required: true, options: opts(APPLICANT_CATEGORIES), filled: (s) => hasText(s.category) },
    { key: "sector", label: "Sector", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.sector) },
    { key: "geography", label: "City / State", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.geography) },
    { key: "origin_country", label: "Country", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.origin_country) },
    { key: "registered", label: "The business is registered", type: "checkbox", section: "Startup basics", required: true, filled: (s) => Number(s.registered ?? 0) === 1 },
    { key: "incorporated_on", label: "Incorporation date", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.incorporated_on) },
    { key: "cin", label: "CIN / registration number", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.cin) },
    { key: "pan", label: "PAN", type: "text", section: "Startup basics", required: true, filled: (s) => hasText(s.pan) },
    { key: "website", label: "Website", type: "text", section: "Startup basics", required: false, filled: (s) => hasText(s.website) },

    { key: "founder", label: "At least one founder with a name and email", type: "founder", section: "Founders", required: true, filled: (_s, f) => f.some((x) => hasText(x.name) && hasText(x.email)) },
    { key: "founder_role", label: "Founder role", type: "founder", section: "Founders", required: true, filled: (_s, f) => f.some((x) => hasText(x.role)) },
    { key: "founder_phone", label: "Founder contact number", type: "founder", section: "Founders", required: true, filled: (_s, f) => f.some((x) => hasText(x.phone)) },

    { key: "pitch", label: "Elevator pitch", type: "textarea", section: "Product & market", required: true, filled: (s) => hasText(s.pitch) },
    { key: "product_stage", label: "Product stage", type: "select", section: "Product & market", required: true, options: opts(PRODUCT_STAGES), filled: (s) => hasText(s.product_stage) },
    { key: "technologies", label: "Technologies", type: "text", section: "Product & market", required: true, filled: (s) => hasText(s.technologies) },
    { key: "industries", label: "Industries", type: "text", section: "Product & market", required: true, filled: (s) => hasText(s.industries) },

    { key: "business_model", label: "How you make money", type: "text", section: "Business model & financials", required: true, filled: (s) => hasText(s.business_model) },
    { key: "revenue_stage", label: "Revenue stage", type: "select", section: "Business model & financials", required: true, options: opts(REVENUE_STAGES), filled: (s) => hasText(s.revenue_stage) },
    { key: "monthly_revenue", label: "Monthly revenue", type: "money", section: "Business model & financials", required: true, financial: true, filled: (s) => hasNumber(s.monthly_revenue) },
    { key: "customer_count", label: "Customers", type: "number", section: "Business model & financials", required: true, financial: true, filled: (s) => hasNumber(s.customer_count) },

    { key: "traction", label: "Traction", type: "textarea", section: "Traction", required: true, financial: true, filled: (s) => hasText(s.traction) },

    { key: "target_fundraise", label: "Target fundraise", type: "money", section: "Funding", required: true, filled: (s) => hasNumber(s.target_fundraise) },
    { key: "funding_raised", label: "Funding raised so far", type: "money", section: "Funding", required: true, filled: (s) => hasAmount(s.funding_raised) },

    { key: "pitch_deck_ref", label: "Pitch deck", type: "text", section: "Documents", required: true, filled: (s) => hasText(s.pitch_deck_ref) },
    { key: "logo_ref", label: "Company logo", type: "text", section: "Documents", required: true, filled: (s) => hasText(s.logo_ref) },
    { key: "video_pitch_ref", label: "Video pitch", type: "text", section: "Documents", required: false, filled: (s) => hasText(s.video_pitch_ref) },
  ];
}

/** The fields that apply to this startup, in form order. */
export function applicationFields(startup: Row): ApplicationField[] {
  const includeFinancials = needsFinancials(startup);
  return baseFields().filter((f) => !f.financial || includeFinancials);
}

export interface ApplicationCompleteness {
  percent: number;
  complete: number;
  total: number;
  /** Labels of the required fields still empty. */
  missing: string[];
  /** Sections that still have at least one required field missing. */
  missingSections: string[];
  /** Per-section breakdown for the form's progress rail. */
  sections: { name: string; complete: number; total: number }[];
}

/**
 * Completeness is computed from the required fields that actually apply to this startup, so
 * the percentage is never hard-coded and never counts a field the founder cannot fill.
 */
export function applicationCompleteness(startup: Row, founders: Row[] = []): ApplicationCompleteness {
  const fields = applicationFields(startup).filter((f) => f.required);
  const missing: string[] = [];
  const missingSections = new Set<string>();
  const bySection = new Map<string, { complete: number; total: number }>();
  let complete = 0;

  for (const field of fields) {
    const bucket = bySection.get(field.section) ?? { complete: 0, total: 0 };
    bucket.total += 1;
    if (field.filled(startup, founders)) {
      complete += 1;
      bucket.complete += 1;
    } else {
      missing.push(field.label);
      missingSections.add(field.section);
    }
    bySection.set(field.section, bucket);
  }

  const total = fields.length || 1;
  return {
    percent: Math.round((complete / total) * 100),
    complete,
    total: fields.length,
    missing,
    missingSections: [...missingSections],
    sections: APPLICATION_SECTIONS.filter((s) => bySection.has(s)).map((name) => ({
      name,
      complete: bySection.get(name)?.complete ?? 0,
      total: bySection.get(name)?.total ?? 0,
    })),
  };
}
