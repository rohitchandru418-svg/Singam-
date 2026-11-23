import { d, type Row } from "./seed-data";

/**
 * Founder-portal seed data: the document checklist, the stage threads, the Pitch Day dates
 * and any payment proof. These back the founder workspace, and the internal console reads the
 * same rows, so a founder and the team are looking at one record.
 */

export const DOCUMENT_REQUESTS: Row[] = [
  // S-01, AgriNova: the checklist has been worked through; two verified, one awaiting a reply.
  { id: "DR-01", startup_id: "S-01", application_id: "A-0001", stage_key: "document_verification", purpose: "financial_statements", title: "Audited financial statements (FY25)", instructions: "Upload the audited statements for the last completed financial year.", mandatory: 1, accepted_formats: "pdf", max_size_mb: 10, status: "verified", document_id: null, clarification: "", submitted_on: d(-74), verified_on: d(-72) },
  { id: "DR-02", startup_id: "S-01", application_id: "A-0001", stage_key: "document_verification", purpose: "funding_history", title: "Cap table and funding history", instructions: "A current cap table and the details of any earlier funding.", mandatory: 1, accepted_formats: "pdf,xlsx", max_size_mb: 10, status: "verified", document_id: null, clarification: "", submitted_on: d(-74), verified_on: d(-71) },
  { id: "DR-03", startup_id: "S-01", application_id: "A-0001", stage_key: "document_verification", purpose: "founder_kyc", title: "Founder KYC (PAN and address proof)", instructions: "PAN and address proof for each founder on the cap table.", mandatory: 1, accepted_formats: "pdf,jpg,png", max_size_mb: 5, status: "info_required", document_id: null, clarification: "The address proof for the co-founder is blurred. Please upload a clear copy.", submitted_on: d(-70), verified_on: null },
  { id: "DR-04", startup_id: "S-01", application_id: "A-0001", stage_key: "document_verification", purpose: "application_pack", title: "Trademark or IP certificate", instructions: "Optional, but it strengthens the readiness report.", mandatory: 0, accepted_formats: "pdf", max_size_mb: 10, status: "not_uploaded", document_id: null, clarification: "", submitted_on: null, verified_on: null },

  // S-02, MediTrack: everything verified, moving to the pre-shoot panel.
  { id: "DR-05", startup_id: "S-02", application_id: "A-0003", stage_key: "document_verification", purpose: "financial_statements", title: "Audited financial statements (FY25)", instructions: "Upload the audited statements for the last completed financial year.", mandatory: 1, accepted_formats: "pdf", max_size_mb: 10, status: "verified", document_id: null, clarification: "", submitted_on: d(-66), verified_on: d(-64) },
  { id: "DR-06", startup_id: "S-02", application_id: "A-0003", stage_key: "document_verification", purpose: "founder_kyc", title: "Founder KYC (PAN and address proof)", instructions: "PAN and address proof for each founder.", mandatory: 1, accepted_formats: "pdf,jpg,png", max_size_mb: 5, status: "verified", document_id: null, clarification: "", submitted_on: d(-66), verified_on: d(-64) },

  // S-03, FinLit: waiting on the founder.
  { id: "DR-07", startup_id: "S-03", application_id: "A-0004", stage_key: "document_verification", purpose: "financial_statements", title: "Provisional financial statements", instructions: "Pre-revenue: upload your provisional statements instead of audited accounts.", mandatory: 1, accepted_formats: "pdf", max_size_mb: 10, status: "not_uploaded", document_id: null, clarification: "", submitted_on: null, verified_on: null },
  { id: "DR-08", startup_id: "S-03", application_id: "A-0004", stage_key: "document_verification", purpose: "founder_kyc", title: "Founder KYC (PAN and address proof)", instructions: "PAN and address proof for each founder.", mandatory: 1, accepted_formats: "pdf,jpg,png", max_size_mb: 5, status: "uploaded", document_id: null, clarification: "", submitted_on: d(-40), verified_on: null },

  // S-05, GreenLoop: awaiting the payment, so the checklist has not been started.
  { id: "DR-09", startup_id: "S-05", application_id: "A-0006", stage_key: "document_verification", purpose: "financial_statements", title: "Audited financial statements (FY25)", instructions: "Upload the audited statements for the last completed financial year.", mandatory: 1, accepted_formats: "pdf", max_size_mb: 10, status: "not_uploaded", document_id: null, clarification: "", submitted_on: null, verified_on: null },
];

export const FOUNDER_MESSAGES: Row[] = [
  { id: "FM-01", startup_id: "S-01", application_id: "A-0001", stage_key: "document_verification", author_side: "team", author_id: "U-FIN1", author_name: "Lakshmi Subramanian", body: "The audited statements and the cap table are verified. We still need a clear address proof for your co-founder — the copy we received is blurred.", attachment_document_id: null, created_at: `${d(-70)}T10:15:00.000Z` },
  { id: "FM-02", startup_id: "S-01", application_id: "A-0001", stage_key: "document_verification", author_side: "founder", author_id: "U-F-S01", author_name: "Kavitha Raman", body: "Thank you. I will re-scan the co-founder's address proof and upload it today.", attachment_document_id: null, created_at: `${d(-69)}T09:02:00.000Z` },
  { id: "FM-03", startup_id: "S-01", application_id: "A-0001", stage_key: "agreement", author_side: "team", author_id: "U-SR1", author_name: "Arjun Patel", body: "Your participation agreement is ready for review. Please read Schedule A carefully and sign before the deadline.", attachment_document_id: null, created_at: `${d(-86)}T11:00:00.000Z` },
  { id: "FM-04", startup_id: "S-01", application_id: "A-0001", stage_key: "agreement", author_side: "founder", author_id: "U-F-S01", author_name: "Kavitha Raman", body: "Read and signed. Happy with the commercial schedule.", attachment_document_id: null, created_at: `${d(-78)}T15:30:00.000Z` },

  { id: "FM-05", startup_id: "S-03", application_id: "A-0004", stage_key: "agreement", author_side: "founder", author_id: "U-F-S03", author_name: "Neha Gupta", body: "Could you clarify whether the success fee cap applies across the whole season or to this round only?", attachment_document_id: null, created_at: `${d(-50)}T12:20:00.000Z` },
  { id: "FM-06", startup_id: "S-03", application_id: "A-0004", stage_key: "document_verification", author_side: "team", author_id: "U-FIN1", author_name: "Lakshmi Subramanian", body: "Welcome. Please upload your provisional statements and each founder's KYC so we can begin the readiness report.", attachment_document_id: null, created_at: `${d(-55)}T09:40:00.000Z` },

  { id: "FM-07", startup_id: "S-05", application_id: "A-0006", stage_key: "agreement", author_side: "team", author_id: "U-SR1", author_name: "Arjun Patel", body: "Your MoU is under negotiation with Management on the success-fee cap. We will share the updated schedule as soon as it is approved.", attachment_document_id: null, created_at: `${d(-46)}T14:05:00.000Z` },
];

export const PITCH_DAY_OPTIONS: Row[] = [
  // S-01: Pitch Day already happened, so the slot the founder picked is approved.
  { id: "PDO-01", startup_id: "S-01", option_date: d(-40), slot_time: "11:00", investor_id: "I-01", slot_note: "Panel available all day", status: "chosen", founder_available: 1, approval: "approved", review_note: "" },
  { id: "PDO-02", startup_id: "S-01", option_date: d(-39), slot_time: "", investor_id: null, slot_note: "Panel available after 2 pm", status: "withdrawn", founder_available: 0, approval: "pending", review_note: "" },
  // S-03: the team has released two slots and is waiting on the founder.
  { id: "PDO-03", startup_id: "S-03", option_date: d(9), slot_time: "10:30", investor_id: "I-02", slot_note: "Panel: Blue Harbour and one HNI", status: "offered", founder_available: 0, approval: "pending", review_note: "" },
  { id: "PDO-04", startup_id: "S-03", option_date: d(12), slot_time: "15:00", investor_id: "I-02", slot_note: "Panel: Blue Harbour only", status: "offered", founder_available: 0, approval: "pending", review_note: "" },
];

export const PAYMENT_PROOFS: Row[] = [
  // S-01 has paid in full, so its proof is verified.
  { id: "PP-01", startup_id: "S-01", fee_id: "UF-01", amount: 500000_00, reference: "NEFT-AGRINOVA-4417", note: "Paid from the company current account.", file_ref: "uploads/S-01/seed-agrinova-receipt.pdf", status: "verified", reviewed_by_id: "U-FIN1", reviewed_on: d(-30), review_note: "Receipt matched to the bank statement.", created_at: `${d(-31)}T10:00:00.000Z` },
];
