/**
 * Policy presentation and editing model.
 *
 * A policy's value is stored as JSON because each policy answers a different question, but a
 * reader should never have to read JSON and an editor should never have to type it. These
 * helpers turn a value into labelled rows, and derive a typed form from the policy's own
 * default value so the editor matches the shape the policy actually holds.
 *
 * Pure functions, no I/O.
 */

import type { PolicyDefinition } from "./policies";
import { formatINR } from "./money";
import { humanise } from "./format";

/**
 * Free text stays as written; an identifier-shaped value ("deal_confirmation") is humanised.
 * Without this, a label such as "Startup Participation MoU" would be split into "Mo U".
 */
function displayString(value: string): string {
  return /^[a-z0-9_]+$/.test(value) ? humanise(value) : value;
}

export type ValueKind = "boolean" | "money" | "number" | "list" | "text" | "json";

export interface ValueEntry {
  key: string;
  label: string;
  display: string;
  kind: ValueKind;
}

/**
 * A value key is money when it is stored in paise. Most keys say so with a `Paise` suffix;
 * `minimumIndicativeAmount` is the one that spells it out in its comment instead.
 */
export function isMoneyKey(key: string): boolean {
  return key.endsWith("Paise") || key.endsWith("Amount");
}

export function labelForKey(key: string): string {
  return humanise(key.replace(/Paise$/, ""));
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeScalar(key: string, value: unknown): { display: string; kind: ValueKind } {
  if (typeof value === "boolean") return { display: value ? "Yes" : "No", kind: "boolean" };
  if (typeof value === "number") {
    if (isMoneyKey(key)) return { display: formatINR(value / 100), kind: "money" };
    return { display: value.toLocaleString("en-IN"), kind: "number" };
  }
  if (Array.isArray(value)) {
    return { display: value.map((v) => displayString(String(v))).join(", "), kind: "list" };
  }
  if (isPlainObject(value)) return { display: JSON.stringify(value), kind: "json" };
  return { display: displayString(String(value)), kind: "text" };
}

/**
 * Flatten a policy value into labelled rows. `byCategory` is the one nested shape in the
 * catalogue, so it is expanded one row per category rather than dumped as JSON.
 */
export function describePolicyValue(value: unknown): ValueEntry[] {
  if (!isPlainObject(value)) return [];
  const rows: ValueEntry[] = [];
  for (const [key, raw] of Object.entries(value)) {
    if (key === "byCategory" && isPlainObject(raw)) {
      for (const [category, docs] of Object.entries(raw)) {
        rows.push({
          key: `byCategory.${category}`,
          label: `${category} documents`,
          display: Array.isArray(docs) ? docs.join(", ") : String(docs),
          kind: "list",
        });
      }
      continue;
    }
    const { display, kind } = describeScalar(key, raw);
    rows.push({ key, label: labelForKey(key), display, kind });
  }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Structured editing                                                  */
/* ------------------------------------------------------------------ */

export type PolicyFieldKind = "boolean" | "number" | "money" | "text" | "select" | "json";

export interface PolicyFieldSpec {
  name: string;
  label: string;
  kind: PolicyFieldKind;
  options?: { value: string; label: string }[];
}

/**
 * Read the allowed values for a key out of the policy's `valueSchema`, which states them as
 * `key: a | b | c`. Falls back to a free-text field when the schema does not spell them out.
 */
function enumFor(def: PolicyDefinition, key: string): string[] | null {
  const pattern = new RegExp(`(?:^|[;.]\\s*)${key}\\s*:\\s*([a-z_0-9]+(?:\\s*\\|\\s*[a-z_0-9]+)+)`, "i");
  const match = def.valueSchema.match(pattern);
  if (!match) return null;
  return match[1].split("|").map((s) => s.trim()).filter(Boolean);
}

/** Derive the editor's fields from the shape of the policy's own default value. */
export function policyFields(def: PolicyDefinition): PolicyFieldSpec[] {
  return Object.entries(def.defaultValue).map(([name, raw]) => {
    const label = labelForKey(name);
    if (typeof raw === "boolean") return { name, label, kind: "boolean" as const };
    if (typeof raw === "number") {
      return { name, label, kind: isMoneyKey(name) ? ("money" as const) : ("number" as const) };
    }
    if (Array.isArray(raw)) {
      return { name, label, kind: "text" as const };
    }
    if (isPlainObject(raw)) {
      return { name, label, kind: "json" as const };
    }
    const options = enumFor(def, name);
    if (options) {
      return {
        name,
        label,
        kind: "select" as const,
        options: options.map((o) => ({ value: o, label: humanise(o) })),
      };
    }
    return { name, label, kind: "text" as const };
  });
}

export interface PolicyDiffRow {
  key: string;
  label: string;
  from: string;
  to: string;
}

/** Key-by-key comparison of two versions, for the revision history. */
export function diffPolicyValues(previous: unknown, next: unknown): PolicyDiffRow[] {
  const before = isPlainObject(previous) ? previous : {};
  const after = isPlainObject(next) ? next : {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  const rows: PolicyDiffRow[] = [];
  for (const key of keys) {
    const from = describeScalar(key, before[key]).display;
    const to = describeScalar(key, after[key]).display;
    if (from !== to) rows.push({ key, label: labelForKey(key), from, to });
  }
  return rows;
}

export function parsePolicyValue(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}
