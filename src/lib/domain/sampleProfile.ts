/**
 * Demo-only auto-fill for the founder's startup profile.
 *
 * A reviewer demonstrating the portal should not have to hand-type a dozen fields before the
 * profile can be submitted, so the form offers a one-click fill. It is a pure helper: it takes
 * the startup record, works out which required fields are still blank, and returns plausible
 * answers in both the form's units (rupees) and the record's units (paise).
 *
 * Only blank fields are filled, so a founder's real answers are never overwritten. The values
 * are generic on purpose — no client name appears in the sample data.
 */

import { applicationFields, type ApplicationField } from "./applicationForm";
import { toPaise, toRupees } from "./money";

type Row = Record<string, unknown>;
export type FormValues = Record<string, string | number | boolean>;

const SAMPLE_TEXT: Record<string, string> = {
  legal_entity: "Private Limited",
  entity_type: "Private Limited",
  category: "startup",
  sector: "SaaS",
  geography: "Chennai, Tamil Nadu",
  origin_country: "India",
  pitch: "A software platform that helps small businesses run their operations and grow.",
  product_stage: "prototype",
  revenue_stage: "pre_revenue",
  technologies: "Web, Cloud",
  industries: "Software",
  business_model: "SaaS subscription",
  traction: "Pilot customers onboarded with early usage and repeat interest.",
  incorporated_on: "2024-04-01",
  cin: "U72900TN2024PTC100001",
  pan: "ABCDE1234F",
  gstin: "33ABCDE1234F1Z5",
  website: "example.com",
  pitch_deck_ref: "pitch-deck.pdf",
  logo_ref: "logo.png",
  video_pitch_ref: "pitch-video.mp4",
};
/** Money answers in rupees, the unit the form shows. */
const SAMPLE_MONEY: Record<string, number> = {
  target_fundraise: 10000000,
  monthly_revenue: 100000,
  funding_raised: 0,
};
const SAMPLE_COUNT: Record<string, number> = { customer_count: 25 };

const isBlank = (v: unknown): boolean => v === undefined || v === null || v === "" || v === 0;

/** The form's editable values for a startup, in the units the form shows. */
export function buildFormValues(startup: Row): FormValues {
  const keys = applicationFields(startup)
    .map((f) => f.key)
    .filter((k) => k !== "founder" && k !== "founder_role" && k !== "founder_phone");
  const out: FormValues = {};
  for (const key of keys) {
    const value = startup[key];
    if (key === "registered") out[key] = Number(value ?? 0) === 1;
    else if (["target_fundraise", "monthly_revenue", "funding_raised"].includes(key)) out[key] = toRupees(Number(value ?? 0));
    else if (key === "customer_count") out[key] = Number(value ?? 0);
    else out[key] = value === null || value === undefined ? "" : String(value);
  }
  return out;
}

/** The record payload for a set of form values, with money converted back to paise. */
export function formValuesToPayload(fields: ApplicationField[], values: FormValues): Row {
  const out: Row = {};
  for (const field of fields) {
    const value = values[field.key];
    if (value === undefined) continue;
    if (field.type === "money") out[field.key] = toPaise(Number(value) || 0);
    else if (field.type === "number") out[field.key] = Number(value) || 0;
    else if (field.type === "checkbox") out[field.key] = value ? 1 : 0;
    else if (field.type !== "founder") out[field.key] = value;
  }
  return out;
}

/**
 * Fill every blank field with a sample answer. Returns the updated form values, the matching
 * record payload, and how many fields were filled.
 */
export function autofillProfile(
  startup: Row,
  current?: FormValues,
): { values: FormValues; payload: Row; filled: number } {
  const fields = applicationFields(startup);
  const values = current ? { ...current } : buildFormValues(startup);
  let filled = 0;
  for (const field of fields) {
    if (field.type === "founder" || !isBlank(values[field.key])) continue;
    if (field.key in SAMPLE_MONEY) values[field.key] = SAMPLE_MONEY[field.key];
    else if (field.key in SAMPLE_COUNT) values[field.key] = SAMPLE_COUNT[field.key];
    else if (field.key in SAMPLE_TEXT) values[field.key] = SAMPLE_TEXT[field.key];
    else continue;
    filled += 1;
  }
  return { values, payload: formValuesToPayload(fields, values), filled };
}
