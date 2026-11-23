import { restrictedFieldsFor } from "../domain/rbac";
import type { Row } from "./repo";

/**
 * Field-level redaction.
 *
 * Applied to every API response, so the restriction holds for screens, exports and shared
 * documents alike. An analyst never receives founder or co-founder personal and contact
 * details; Marketing never receives confidential investor remarks or deal documents.
 */

const FOUNDER_PERSONAL_FIELDS = ["email", "phone", "linkedin"];

export function redactRow(entityKey: string, row: Row, role: string): Row {
  const restrictions = restrictedFieldsFor(role);
  if (restrictions.length === 0) return row;

  if (restrictions.includes("founder_personal_details") && entityKey === "founders") {
    const out = { ...row };
    for (const field of FOUNDER_PERSONAL_FIELDS) {
      if (field in out) out[field] = "[restricted]";
    }
    out.personal_details_restricted = 1;
    return out;
  }

  if (restrictions.includes("confidential_investor_remarks")) {
    const out = { ...row };
    if (entityKey === "meetings" && "minutes" in out) out.minutes = "[restricted]";
    if (entityKey === "matches") {
      if ("questions" in out) out.questions = "[restricted]";
      if ("response" in out) out.response = "[restricted]";
    }
    return out;
  }

  if (restrictions.includes("investor_terms") && entityKey === "commitments") {
    const out = { ...row };
    if ("terms" in out) out.terms = "[restricted]";
    if ("valuation" in out) out.valuation = "[restricted]";
    return out;
  }

  if (restrictions.includes("deal_documents") && (entityKey === "deal_documents" || entityKey === "documents")) {
    const out = { ...row };
    if ("notes" in out) out.notes = "[restricted]";
    if ("file_ref" in out) out.file_ref = "[restricted]";
    return out;
  }

  return row;
}

export function redactRows(entityKey: string, rows: Row[], role: string): Row[] {
  if (restrictedFieldsFor(role).length === 0) return rows;
  return rows.map((r) => redactRow(entityKey, r, role));
}

export interface RedactionNotice {
  role: string;
  restricted: string[];
}

export function redactionNotice(role: string): RedactionNotice | null {
  const restricted = restrictedFieldsFor(role);
  return restricted.length ? { role, restricted } : null;
}
