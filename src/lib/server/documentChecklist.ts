import { create, type Actor, type Row } from "./repo";

/**
 * The standard document checklist a startup is asked for after the MoU.
 *
 * The titles match the SOP's readiness pack. The founder supplies each item from their own
 * workspace and the team verifies it; nothing is auto-filled, so the checklist starts empty
 * and the founder's upload is what moves an item forward.
 */
export const STANDARD_CHECKLIST: {
  purpose: string;
  title: string;
  instructions: string;
  mandatory: number;
  accepted: string;
  maxMb: number;
}[] = [
  {
    purpose: "pitch_deck",
    title: "Pitch deck (latest version)",
    instructions: "The deck the panel will read. Upload the current version as a PDF.",
    mandatory: 1,
    accepted: "pdf",
    maxMb: 20,
  },
  {
    purpose: "financial_statements",
    title: "Audited or provisional financial statements",
    instructions: "The last completed financial year. Provisional statements are accepted at idea stage.",
    mandatory: 1,
    accepted: "pdf,xlsx",
    maxMb: 10,
  },
  {
    purpose: "cap_table",
    title: "Cap table and funding history",
    instructions: "A current cap table and the details of any earlier funding.",
    mandatory: 1,
    accepted: "pdf,xlsx",
    maxMb: 10,
  },
  {
    purpose: "founder_kyc",
    title: "Founder KYC (PAN and address proof)",
    instructions: "PAN and address proof for each founder on the cap table.",
    mandatory: 1,
    accepted: "pdf,jpg,jpeg,png",
    maxMb: 5,
  },
  {
    purpose: "incorporation",
    title: "Certificate of incorporation and PAN",
    instructions: "The registration certificate and the company PAN.",
    mandatory: 1,
    accepted: "pdf",
    maxMb: 10,
  },
  {
    purpose: "ip",
    title: "Trademark or IP certificate",
    instructions: "Optional, but it strengthens the readiness report.",
    mandatory: 0,
    accepted: "pdf",
    maxMb: 10,
  },
];

/**
 * Create the standard checklist for a startup, each item `not_uploaded`.
 *
 * A pre-revenue business is asked for provisional statements rather than audited accounts.
 * The items are the founder's to supply; the team verifies each one when it arrives.
 */
export function provideStandardChecklist(startup: Row, actor: Actor, applicationId: string | null): number {
  const startupId = String(startup.id);
  const preRevenue = String(startup.revenue_stage ?? "") === "pre_revenue" || String(startup.stage ?? "") === "idea";

  let created = 0;
  for (const item of STANDARD_CHECKLIST) {
    create(
      "document_requests",
      {
        startup_id: startupId,
        application_id: applicationId,
        stage_key: "document_verification",
        purpose: item.purpose,
        title: item.purpose === "financial_statements" && preRevenue ? "Provisional financial statements" : item.title,
        instructions: item.instructions,
        mandatory: item.mandatory,
        accepted_formats: item.accepted,
        max_size_mb: item.maxMb,
        status: "not_uploaded",
        clarification: "",
      },
      actor,
    );
    created += 1;
  }
  return created;
}
