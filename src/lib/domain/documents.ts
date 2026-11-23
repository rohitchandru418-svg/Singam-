/**
 * Document purposes.
 *
 * The brief is explicit that a document's title must not drive the workflow: the signing
 * event and the purpose decide when a document is required. Each purpose below maps to
 * the stage where it becomes mandatory and to the roles allowed to see it.
 */

export interface DocumentPurpose {
  key: string;
  label: string;
  stageKey: string;
  audience: string[];
  confidential: boolean;
}

export const DOCUMENT_PURPOSES: DocumentPurpose[] = [
  { key: "application_pack", label: "Application pack", stageKey: "application_submitted", audience: ["startup_relationships", "management"], confidential: false },
  { key: "financial_statements", label: "Financial statements", stageKey: "internal_screening", audience: ["startup_relationships", "finance", "management"], confidential: true },
  { key: "funding_history", label: "Funding history", stageKey: "internal_screening", audience: ["startup_relationships", "investor_relations", "management"], confidential: true },
  { key: "founder_kyc", label: "Founder KYC", stageKey: "mou_signing", audience: ["legal", "startup_relationships", "management"], confidential: true },
  { key: "signed_mou", label: "Signed MoU", stageKey: "mou_signing", audience: ["legal", "finance", "management", "investor_relations"], confidential: true },
  { key: "irr_report", label: "Investment Readiness Report", stageKey: "irr_handover", audience: ["finance", "investor_relations", "management", "production"], confidential: true },
  { key: "information_memorandum", label: "Information memorandum", stageKey: "pitch_day", audience: ["investor_relations", "management"], confidential: true },
  { key: "investor_participation", label: "Investor participation agreement", stageKey: "verification_agreement", audience: ["investor_relations", "legal", "management"], confidential: true },
  { key: "investor_confidentiality", label: "Investor confidentiality agreement", stageKey: "verification_agreement", audience: ["investor_relations", "legal", "management"], confidential: true },
  { key: "committee_pack", label: "Committee pack", stageKey: "final_selection", audience: ["management", "investor_relations", "startup_relationships"], confidential: true },
  { key: "upfront_invoice", label: "Upfront fee invoice", stageKey: "upfront_fee", audience: ["finance", "startup_relationships", "management"], confidential: true },
  { key: "upfront_receipt", label: "Upfront fee receipt", stageKey: "upfront_fee", audience: ["finance", "management", "production"], confidential: true },
  { key: "av_assets", label: "AV shoot assets", stageKey: "av_shoot", audience: ["production", "marketing", "management"], confidential: false },
  { key: "investment_commitment_letter", label: "Investment Commitment Letter", stageKey: "main_shoot", audience: ["legal", "investor_relations", "management", "production"], confidential: true },
  { key: "deal_acceptance_letter", label: "Startup Deal Acceptance Letter", stageKey: "main_shoot", audience: ["legal", "investor_relations", "management", "production"], confidential: true },
  { key: "term_sheet", label: "Term sheet", stageKey: "term_sheet", audience: ["legal", "investor_relations", "management"], confidential: true },
  { key: "due_diligence_report", label: "Due diligence report", stageKey: "due_diligence", audience: ["legal", "investor_relations", "management"], confidential: true },
  { key: "definitive_agreements", label: "Definitive agreements", stageKey: "definitive_agreements", audience: ["legal", "investor_relations", "management"], confidential: true },
  { key: "bank_evidence", label: "Bank evidence / transfer advice", stageKey: "receipt_verification", audience: ["finance", "investor_relations", "management"], confidential: true },
  { key: "success_fee_invoice", label: "Success fee invoice", stageKey: "success_fee", audience: ["finance", "management"], confidential: true },
  { key: "telecast_promo", label: "Approved telecast promotion assets", stageKey: "telecast", audience: ["marketing", "production", "management"], confidential: false },
];

export const DOCUMENT_PURPOSE_MAP: Record<string, DocumentPurpose> = Object.fromEntries(
  DOCUMENT_PURPOSES.map((d) => [d.key, d]),
) as Record<string, DocumentPurpose>;

export function documentsForStage(stageKey: string): DocumentPurpose[] {
  return DOCUMENT_PURPOSES.filter((d) => d.stageKey === stageKey);
}

export function mayViewDocument(roleDepartment: string, purposeKey: string): boolean {
  const purpose = DOCUMENT_PURPOSE_MAP[purposeKey];
  if (!purpose) return false;
  if (roleDepartment === "management") return true;
  return purpose.audience.includes(roleDepartment);
}
