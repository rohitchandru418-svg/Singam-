/**
 * The tables a startup owns, grouped by how the startup is reached.
 *
 * Both the founder-journey reset (which clears one startup) and the boot-time cleanup of the
 * throwaway startups earlier test runs left behind need the same picture of what a startup's
 * data touches, so it lives here rather than being written twice.
 */

/** Tables keyed directly by `startup_id`: the founder's records and the team's work. */
export const STARTUP_KEYED: string[] = [
  "founders",
  "applications",
  "document_requests",
  "founder_messages",
  "pitch_day_options",
  "payment_proofs",
  "support_requests",
  "matches",
  "meetings",
  "virtual_pitches",
  "pitch_days",
  "committee_decisions",
  "pre_shoot_confirmations",
  "commitments",
  "funding_rounds",
  "deals",
  "upfront_fees",
  "success_fees",
  "ledger_entries",
  "production_handovers",
  "av_shoots",
  "mock_shoots",
  "main_shoots",
  "episodes",
  "telecasts",
  "community_members",
  "referrals",
  "shoot_exceptions",
  "signing_events",
  "announcements",
  "tds_entries",
  "credit_notes",
];

/** Tables reached through an application the startup owns. */
export const VIA_APPLICATION: string[] = ["screenings", "bootcamp_attendance", "analyst_evaluations", "mous", "irr_reports"];
/** Tables reached through a deal the startup owns. */
export const VIA_DEAL: string[] = ["deal_documents", "tranches"];
/** Tables reached through a Pitch Day the startup owns. */
export const VIA_PITCH_DAY: string[] = ["pitch_day_slots"];
/** Tables reached through a community member record the startup owns. */
export const VIA_MEMBER: string[] = ["event_registrations", "community_member_roles"];
/** Tables keyed by `entity_type` / `entity_id`, where the startup is the entity. */
export const POLYMORPHIC: string[] = ["documents", "tasks", "handovers", "audit_events", "notifications"];
