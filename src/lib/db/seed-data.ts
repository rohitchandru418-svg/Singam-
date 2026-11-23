/**
 * Seed data for the current season.
 *
 * Every table is an array of plain row objects keyed by column name, so the insert
 * helper in `seed.ts` can derive the column list and never mis-align a value.
 *
 * Money is in paise. Dates are ISO strings relative to TODAY.
 */

export const TODAY = "2026-11-10";
export const NOW = "2026-11-10T09:00:00.000Z";

export function d(daysFromToday: number): string {
  const date = new Date(`${TODAY}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

export type Row = Record<string, unknown>;

export const SEASONS: Row[] = [
  { id: "S-2024", code: "S01", name: "Season 1", status: "closed", starts_on: "2024-04-01", ends_on: "2025-03-31" },
  { id: "S-2025", code: "S02", name: "Season 2", status: "closed", starts_on: "2025-04-01", ends_on: "2026-03-31" },
  { id: "S-2026", code: "S03", name: "Season 3", status: "live", starts_on: d(-120), ends_on: d(240) },
];

/** The call for applications a founder applies to. */
export const PROGRAMS: Row[] = [
  {
    id: "PG-01", season_id: "S-2026", slug: "startup-singam-season-3",
    title: "Startup Singam Season 3", code: "SS-S3", status: "open",
    opens_on: d(-120), closes_on: d(30),
    description:
      "South India's first startup reality show. Apply to pitch on national television, get mentored, and raise from our investor panel.",
    eligibility:
      "Registered businesses in South India, or founded by Tamil-origin entrepreneurs worldwide. Idea stage to growth. Hardware, SaaS/Tech and B2C/D2C brands. No application fee.",
  },
];

export const USERS: Row[] = [
  { id: "U-ADMIN", name: "System Administrator", email: "admin@show.example", role: "admin", department: "management" },
  { id: "U-MGMT", name: "Meera Raghavan", email: "meera@show.example", role: "management", department: "management" },
  { id: "U-SR1", name: "Arjun Patel", email: "arjun@show.example", role: "startup_relationship_manager", department: "startup_relationships" },
  { id: "U-SR2", name: "Divya Krishnan", email: "divya@show.example", role: "startup_relationship_manager", department: "startup_relationships" },
  { id: "U-AN1", name: "Rahul Nair", email: "rahul@show.example", role: "analyst", department: "startup_relationships" },
  { id: "U-IR1", name: "Sneha Iyer", email: "sneha@show.example", role: "investor_relations", department: "investor_relations" },
  { id: "U-IR2", name: "Karthik Menon", email: "karthik@show.example", role: "investor_relations", department: "investor_relations" },
  { id: "U-FIN1", name: "Lakshmi Subramanian", email: "lakshmi@show.example", role: "finance", department: "finance" },
  { id: "U-FIN2", name: "Vivek Joshi", email: "vivek@show.example", role: "finance", department: "finance" },
  { id: "U-PROD1", name: "Ganesh Kumar", email: "ganesh@show.example", role: "production", department: "production" },
  { id: "U-PROD2", name: "Priya Sharma", email: "priya@show.example", role: "production", department: "production" },
  { id: "U-COMM1", name: "Anita Desai", email: "anita@show.example", role: "community", department: "community" },
  { id: "U-MKT1", name: "Rohit Verma", email: "rohit@show.example", role: "marketing", department: "marketing" },
  { id: "U-LEGAL1", name: "Sanjay Bhatt", email: "sanjay@show.example", role: "legal", department: "legal" },
  { id: "U-AUDIT", name: "Auditor (read-only)", email: "auditor@show.example", role: "auditor", department: "management" },
  // External startup-side logins. Each founder sees only their own startup.
  { id: "U-F-S01", name: "Kavitha Raman", email: "kavitha@agrinova.example", role: "founder", department: "external", kind: "founder", startup_id: "S-01" },
  { id: "U-F-S02", name: "Dr. Anand Rao", email: "anand@meditrack.example", role: "founder", department: "external", kind: "founder", startup_id: "S-02" },
  { id: "U-F-S03", name: "Neha Kulkarni", email: "neha@finlit.example", role: "founder", department: "external", kind: "founder", startup_id: "S-03" },
  { id: "U-F-S04", name: "Vikram Reddy", email: "vikram@eduspark.example", role: "founder", department: "external", kind: "founder", startup_id: "S-04" },
  { id: "U-F-S05", name: "Thomas Mathew", email: "thomas@greenloop.example", role: "founder", department: "external", kind: "founder", startup_id: "S-05" },
  { id: "U-F-S09", name: "Deepak Sundar", email: "deepak@urbannest.example", role: "founder", department: "external", kind: "founder", startup_id: "S-09" },
  { id: "U-F-S10", name: "Anand Krishnan", email: "anand@anandprecision.example", role: "founder", department: "external", kind: "founder", startup_id: "S-10" },
  // External investor-side logins. Each investor sees only their own record and the
  // startups Investor Relations has circulated to them.
  { id: "U-I-01", name: "R. Sundaram", email: "sundaram@sundaramfo.example", role: "investor", department: "external", kind: "investor", investor_id: "I-01" },
  { id: "U-I-02", name: "K. Raghavan", email: "raghavan@blueharbour.example", role: "investor", department: "external", kind: "investor", investor_id: "I-02" },
  { id: "U-I-03", name: "S. Venkatesh", email: "venkatesh@angel.example", role: "investor", department: "external", kind: "investor", investor_id: "I-03" },
  { id: "U-I-05", name: "R. Krishnan", email: "krishnan@kaveriangels.example", role: "investor", department: "external", kind: "investor", investor_id: "I-05" },
  { id: "U-I-08", name: "T. Balaji", email: "balaji@nilaimpact.example", role: "investor", department: "external", kind: "investor", investor_id: "I-08" },
];

export const STARTUPS: Row[] = [
  { id: "S-01", name: "AgriNova", legal_entity: "AgriNova Technologies Pvt Ltd", entity_type: "Private Limited", sector: "Agritech", stage: "early_revenue", geography: "Tamil Nadu", business_model: "B2B SaaS + marketplace", website: "agrinova.example", cin: "U01100TN2021PTC012345", gstin: "33AABCA1234B1Z5", pan: "AABCA1234B", incorporated_on: "2021-06-14",
    category: "startup", pitch: "Farm-to-mill agri supply chain platform connecting 12,000 farmers to 40 mills with same-week settlement.",
    product_stage: "launched", revenue_stage: "early_revenue", target_fundraise: 12500000_00, technologies: "Mobile app, IoT soil sensors, payments", industries: "Agritech, Supply chain",
    monthly_revenue: 1800000_00, customer_count: 52, traction: "12,000 farmers onboarded; 40 mills; Rs 18 lakh monthly revenue growing 12% month on month.",
    funding_raised: 4000000_00, pitch_deck_ref: "AGRINOVA-PITCH-S3.pdf", video_pitch_ref: "AGRINOVA-VIDEO-PITCH.mp4",
    profile_status: "approved", profile_submitted_at: d(-96), profile_reviewed_at: d(-95), origin_country: "India", registered: 1 },
  { id: "S-02", name: "MediTrack", legal_entity: "MediTrack Health Systems Pvt Ltd", entity_type: "Private Limited", sector: "Healthtech", stage: "growth", geography: "Karnataka", business_model: "Hospital SaaS", website: "meditrack.example", cin: "U85110KA2019PTC098765", gstin: "29AACCM5678D1Z2", pan: "AACCM5678D", incorporated_on: "2019-02-20" },
  { id: "S-03", name: "FinLit", legal_entity: "FinLit Learning Labs Pvt Ltd", entity_type: "Private Limited", sector: "Fintech", stage: "pre_revenue", geography: "Maharashtra", business_model: "Consumer subscription", website: "finlit.example", cin: "U72900MH2023PTC045678", gstin: "27AADCF9012E1Z8", pan: "AADCF9012E", incorporated_on: "2023-01-11",
    category: "startup", pitch: "Gamified financial literacy app that teaches money skills through 5-minute daily lessons, sold to schools and employers.",
    product_stage: "prototype", revenue_stage: "pre_revenue", target_fundraise: 8000000_00, technologies: "Mobile app, gamification engine", industries: "Fintech, Edtech",
    monthly_revenue: 0, customer_count: 0, traction: "8,000 app installs, 2 school pilot agreements, no revenue yet.",
    funding_raised: 0, pitch_deck_ref: "FINLIT-PITCH-S3.pdf", video_pitch_ref: "",
    profile_status: "submitted", profile_submitted_at: d(-6), origin_country: "India", registered: 1 },
  { id: "S-04", name: "EduSpark", legal_entity: "EduSpark Innovations LLP", entity_type: "LLP", sector: "Edtech", stage: "idea", geography: "Telangana", business_model: "School licensing", website: "eduspark.example", cin: "AAB-1234", gstin: "", pan: "AAFFE3456G", incorporated_on: "2026-08-01",
    category: "startup", pitch: "AI teaching assistant that adapts school curriculum to each child's pace.",
    product_stage: "idea", revenue_stage: "pre_revenue", target_fundraise: 3000000_00, technologies: "AI/ML", industries: "Edtech",
    monthly_revenue: 0, customer_count: 0, traction: "Idea stage: one college partner and a working curriculum prototype.",
    funding_raised: 0, pitch_deck_ref: "", video_pitch_ref: "",
    profile_status: "incomplete", origin_country: "India", registered: 1 },
  { id: "S-05", name: "GreenLoop", legal_entity: "GreenLoop Circular Solutions Pvt Ltd", entity_type: "Private Limited", sector: "Cleantech", stage: "early_revenue", geography: "Kerala", business_model: "Recycling as a service", website: "greenloop.example", cin: "U37200KL2022PTC078901", gstin: "32AABCG7890H1Z4", pan: "AABCG7890H", incorporated_on: "2022-03-30" },
  { id: "S-06", name: "RetailBoost", legal_entity: "RetailBoost Software Pvt Ltd", entity_type: "Private Limited", sector: "Retail SaaS", stage: "early_revenue", geography: "Gujarat", business_model: "SaaS per store", website: "retailboost.example", cin: "U72200GJ2020PTC033445", gstin: "24AABCR2345J1Z6", pan: "AABCR2345J", incorporated_on: "2020-11-05" },
  { id: "S-07", name: "LogiChain", legal_entity: "LogiChain Freight Tech Pvt Ltd", entity_type: "Private Limited", sector: "Logistics", stage: "growth", geography: "Delhi NCR", business_model: "Freight marketplace", website: "logichain.example", cin: "U63030DL2018PTC112233", gstin: "07AADCL3456K1Z1", pan: "AADCL3456K", incorporated_on: "2018-07-19" },
  { id: "S-08", name: "CraftKart", legal_entity: "CraftKart Handmade Pvt Ltd", entity_type: "Private Limited", sector: "D2C", stage: "pre_revenue", geography: "West Bengal", business_model: "D2C marketplace", website: "craftkart.example", cin: "U52300WB2023PTC099887", gstin: "19AACCC7890L1Z9", pan: "AACCC7890L", incorporated_on: "2023-09-02" },
  { id: "S-09", name: "UrbanNest", legal_entity: "UrbanNest Living Pvt Ltd", entity_type: "Private Limited", sector: "Proptech", stage: "pre_revenue", geography: "Tamil Nadu", business_model: "Rental management", website: "urbannest.example", cin: "U70200TN2022PTC055667", gstin: "33AADCU4567M1Z3", pan: "AADCU4567M", incorporated_on: "2022-12-01" },
  // SME applicant: the second category the FAQ describes.
  { id: "S-10", name: "Anand Precision Works", legal_entity: "Anand Precision Works Pvt Ltd", entity_type: "Private Limited", sector: "Manufacturing", stage: "growth", geography: "Tamil Nadu", business_model: "Contract manufacturing", website: "anandprecision.example", cin: "U28999TN2016PTC099001", gstin: "33AADCA9988N1Z7", pan: "AADCA9988N", incorporated_on: "2016-04-18",
    category: "sme", pitch: "Precision CNC components for EV and defence supply chains, with an in-house tool room.",
    product_stage: "scaling", revenue_stage: "growth", target_fundraise: 40000000_00, technologies: "CNC machining, tool room", industries: "Manufacturing, EV components",
    monthly_revenue: 9500000_00, customer_count: 34, traction: "Rs 9.5 lakh monthly revenue; 34 active customers; two EV OEM supply agreements.",
    funding_raised: 15000000_00, pitch_deck_ref: "ANAND-PRECISION-PITCH.pdf", video_pitch_ref: "",
    profile_status: "incomplete", origin_country: "India", registered: 1 },
];

export const FOUNDERS: Row[] = [
  { id: "F-01", startup_id: "S-01", name: "Kavitha Raman", role: "Founder & CEO", email: "kavitha@agrinova.example", phone: "+91 98400 11223", linkedin: "linkedin.com/in/kavitharaman", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-02", startup_id: "S-01", name: "Suresh Babu", role: "Co-founder & CTO", email: "suresh@agrinova.example", phone: "+91 98400 11224", linkedin: "linkedin.com/in/sureshbabu", is_primary: 0, restricted_to_analyst: 1 },
  { id: "F-03", startup_id: "S-02", name: "Dr. Anand Rao", role: "Founder & CEO", email: "anand@meditrack.example", phone: "+91 99001 22334", linkedin: "linkedin.com/in/dr-anand-rao", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-04", startup_id: "S-03", name: "Neha Kulkarni", role: "Founder", email: "neha@finlit.example", phone: "+91 98200 33445", linkedin: "linkedin.com/in/nehakulkarni", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-05", startup_id: "S-04", name: "Vikram Reddy", role: "Founder", email: "vikram@eduspark.example", phone: "+91 90000 55667", linkedin: "linkedin.com/in/vikramreddy", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-06", startup_id: "S-05", name: "Thomas Mathew", role: "Founder & CEO", email: "thomas@greenloop.example", phone: "+91 98950 66778", linkedin: "linkedin.com/in/thomasmathew", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-07", startup_id: "S-05", name: "Riya Menon", role: "Co-founder", email: "riya@greenloop.example", phone: "+91 98950 66779", linkedin: "linkedin.com/in/riyamenon", is_primary: 0, restricted_to_analyst: 1 },
  { id: "F-08", startup_id: "S-06", name: "Jignesh Shah", role: "Founder", email: "jignesh@retailboost.example", phone: "+91 97250 77889", linkedin: "linkedin.com/in/jigneshshah", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-09", startup_id: "S-07", name: "Harpreet Singh", role: "Founder & CEO", email: "harpreet@logichain.example", phone: "+91 98110 88990", linkedin: "linkedin.com/in/harpreetsingh", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-10", startup_id: "S-08", name: "Ananya Ghosh", role: "Founder", email: "ananya@craftkart.example", phone: "+91 98300 99001", linkedin: "linkedin.com/in/ananyaghosh", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-11", startup_id: "S-09", name: "Deepak Sundar", role: "Founder", email: "deepak@urbannest.example", phone: "+91 94440 11223", linkedin: "linkedin.com/in/deepaksundar", is_primary: 1, restricted_to_analyst: 1 },
  { id: "F-12", startup_id: "S-10", name: "Anand Krishnan", role: "Managing Director", email: "anand@anandprecision.example", phone: "+91 94440 55667", linkedin: "linkedin.com/in/anandkrishnan", is_primary: 1, restricted_to_analyst: 1 },
];

export const APPLICATIONS: Row[] = [
  { id: "A-0001", season_id: "S-2026", startup_id: "S-01", reference_no: "S26-0001", source: "Community event", referring_partner: "TN Startup Cell", campaign: "Founder Meetup Oct 2026", relationship_manager_id: "U-SR1", stage_at_application: "early_revenue", status: "proceeded", completion_pct: 100, submitted_at: d(-95), acknowledged_at: d(-95), duplicate_of: "A-0002", notes: "Repeat applicant; links to the Season 2025 record and preserves that history." },
  { id: "A-0002", season_id: "S-2025", startup_id: "S-01", reference_no: "S25-0042", source: "Referral", referring_partner: "IITM Incubation", campaign: "Season 2025", relationship_manager_id: "U-SR1", stage_at_application: "pre_revenue", status: "withdrawn", completion_pct: 100, submitted_at: "2025-07-04", acknowledged_at: "2025-07-04", duplicate_of: null, notes: "Withdrawn in 2025 to reapply after a product rebuild." },
  { id: "A-0003", season_id: "S-2026", startup_id: "S-02", reference_no: "S26-0002", source: "Direct", referring_partner: "", campaign: "Inbound", relationship_manager_id: "U-SR2", stage_at_application: "growth", status: "proceeded", completion_pct: 100, submitted_at: d(-88), acknowledged_at: d(-88), duplicate_of: null, notes: "" },
  { id: "A-0004", season_id: "S-2026", startup_id: "S-03", reference_no: "S26-0003", source: "Partner", referring_partner: "Fintech Foundry", campaign: "Partner programme", relationship_manager_id: "U-SR1", stage_at_application: "pre_revenue", status: "proceeded", completion_pct: 100, submitted_at: d(-70), acknowledged_at: d(-70), duplicate_of: null, notes: "" },
  { id: "A-0005", season_id: "S-2026", startup_id: "S-04", reference_no: "S26-0004", source: "College", referring_partner: "Anna University E-Cell", campaign: "Campus drive", relationship_manager_id: "U-SR2", stage_at_application: "idea", status: "in_screening", completion_pct: 100, submitted_at: d(-12), acknowledged_at: d(-12), duplicate_of: null, notes: "Idea stage: financial and traction sections skipped as the SOP allows." },
  { id: "A-0006", season_id: "S-2026", startup_id: "S-05", reference_no: "S26-0005", source: "Community event", referring_partner: "", campaign: "Cleantech Roundtable", relationship_manager_id: "U-SR1", stage_at_application: "early_revenue", status: "proceeded", completion_pct: 100, submitted_at: d(-60), acknowledged_at: d(-60), duplicate_of: null, notes: "" },
  { id: "A-0007", season_id: "S-2026", startup_id: "S-06", reference_no: "S26-0006", source: "Referral", referring_partner: "Sundaram Family Office", campaign: "Investor referral", relationship_manager_id: "U-SR2", stage_at_application: "early_revenue", status: "submitted", completion_pct: 100, submitted_at: d(-3), acknowledged_at: d(-3), duplicate_of: null, notes: "Awaiting screening assignment." },
  { id: "A-0008", season_id: "S-2026", startup_id: "S-07", reference_no: "S26-0007", source: "Direct", referring_partner: "", campaign: "Inbound", relationship_manager_id: "U-SR1", stage_at_application: "growth", status: "proceeded", completion_pct: 100, submitted_at: d(-80), acknowledged_at: d(-80), duplicate_of: null, notes: "" },
  { id: "A-0009", season_id: "S-2026", startup_id: "S-08", reference_no: "S26-0008", source: "Community event", referring_partner: "Bengal Handloom Co-op", campaign: "Founder Meetup Sep 2026", relationship_manager_id: "U-SR2", stage_at_application: "pre_revenue", status: "info_required", completion_pct: 92, submitted_at: d(-30), acknowledged_at: d(-30), duplicate_of: null, notes: "Awaiting updated traction data." },
  { id: "A-0010", season_id: "S-2026", startup_id: "S-09", reference_no: "S26-0009", source: "Direct", referring_partner: "", campaign: "Inbound", relationship_manager_id: "U-SR2", stage_at_application: "pre_revenue", status: "rejected", completion_pct: 100, submitted_at: d(-40), acknowledged_at: d(-40), duplicate_of: null, notes: "Below the qualifying score." },
];

export const SCREENINGS: Row[] = [
  { id: "SCR-01", application_id: "A-0001", reviewer_id: "U-SR1", completeness: 10, documents: 9, unique_idea: 17, revenue: 8, traction: 9, past_funding: 16, founder_capability: 5, incubation: 5, ip_defensibility: 8, total: 87, outcome: "proceed", comments: "Strong repeat applicant with verified revenue.", evidence: "GST filings, audited FY25 statements, three signed distribution agreements.", submitted_at: d(-92) },
  { id: "SCR-02", application_id: "A-0003", reviewer_id: "U-SR2", completeness: 10, documents: 10, unique_idea: 16, revenue: 9, traction: 9, past_funding: 18, founder_capability: 5, incubation: 5, ip_defensibility: 9, total: 91, outcome: "proceed", comments: "Best traction among hospital SaaS applicants.", evidence: "Audited statements, 42 hospital deployments, ISO 13485 certificate.", submitted_at: d(-85) },
  { id: "SCR-03", application_id: "A-0004", reviewer_id: "U-SR1", completeness: 9, documents: 8, unique_idea: 18, revenue: null, traction: null, past_funding: 15, founder_capability: 5, incubation: 5, ip_defensibility: 7, total: 67, outcome: "proceed", comments: "Pre-revenue but a genuinely differentiated curriculum engine.", evidence: "Registered trademark, product demo, two pilot LOIs.", submitted_at: d(-67) },
  { id: "SCR-04", application_id: "A-0005", reviewer_id: "U-SR2", completeness: 10, documents: 6, unique_idea: 19, revenue: null, traction: null, past_funding: null, founder_capability: 5, incubation: 5, ip_defensibility: 6, total: 51, outcome: "hold", comments: "Idea stage; financials and traction skipped per SOP. Requires an incubation plan.", evidence: "Product walkthrough, mentor recommendation.", submitted_at: d(-10) },
  { id: "SCR-05", application_id: "A-0006", reviewer_id: "U-SR1", completeness: 10, documents: 9, unique_idea: 15, revenue: 7, traction: 8, past_funding: 14, founder_capability: 5, incubation: 5, ip_defensibility: 9, total: 82, outcome: "proceed", comments: "Circular-economy model backed by municipal contracts.", evidence: "Municipal LOIs, EPR registration, audited statements.", submitted_at: d(-57) },
  { id: "SCR-06", application_id: "A-0008", reviewer_id: "U-SR1", completeness: 10, documents: 10, unique_idea: 14, revenue: 9, traction: 9, past_funding: 19, founder_capability: 5, incubation: 5, ip_defensibility: 7, total: 88, outcome: "proceed", comments: "Large freight network with strong repeat usage.", evidence: "Audited FY25 statements, Series A term sheet copy, 1,200 carrier agreements.", submitted_at: d(-77) },
  { id: "SCR-07", application_id: "A-0009", reviewer_id: "U-SR2", completeness: 9, documents: 7, unique_idea: 16, revenue: 6, traction: 7, past_funding: 10, founder_capability: 4, incubation: 4, ip_defensibility: 6, total: 69, outcome: "info_required", comments: "Good idea but the traction evidence is dated.", evidence: "Sales dashboard export requested.", submitted_at: d(-27) },
  { id: "SCR-08", application_id: "A-0010", reviewer_id: "U-SR2", completeness: 8, documents: 7, unique_idea: 9, revenue: 6, traction: 5, past_funding: 8, founder_capability: 4, incubation: 3, ip_defensibility: 5, total: 55, outcome: "reject", comments: "Crowded category with no defensible differentiation.", evidence: "Market study, competitor comparison.", submitted_at: d(-37) },
];

export const BOOTCAMP: Row[] = [
  { id: "BC-01", application_id: "A-0001", invited_on: d(-95), session_dates: "Session 1: 12 Oct 2026, 10:00; Session 2: 14 Oct 2026, 10:00", meet_link: "https://meet.startupsingam.example/bootcamp-bc01", registered: 1, attended_on: d(-90), process_briefing_done: 1, readiness_session_done: 1, mou_briefing_done: 1, fee_briefing_done: 1, questions: "Clarify the fee adjustment clause before signing.", actions_assigned: "Rework the financial model; attend the valuation clinic.", preparation_completed: 1, status: "prep_completed" },
  { id: "BC-02", application_id: "A-0003", invited_on: d(-88), registered: 1, attended_on: d(-83), process_briefing_done: 1, readiness_session_done: 1, mou_briefing_done: 1, fee_briefing_done: 1, questions: "Request for a sector-specific mentor.", actions_assigned: "Prepare hospital case studies.", preparation_completed: 1, status: "prep_completed" },
  { id: "BC-03", application_id: "A-0004", invited_on: d(-70), registered: 1, attended_on: d(-65), process_briefing_done: 1, readiness_session_done: 1, mou_briefing_done: 1, fee_briefing_done: 1, questions: "What documents count as traction for a pre-revenue company?", actions_assigned: "Compile pilot LOIs.", preparation_completed: 1, status: "prep_completed" },
  { id: "BC-04", application_id: "A-0005", invited_on: d(-12), registered: 1, attended_on: d(-8), process_briefing_done: 1, readiness_session_done: 1, mou_briefing_done: 0, fee_briefing_done: 0, questions: "When is the MoU signed for an idea-stage applicant?", actions_assigned: "Submit an incubation plan.", preparation_completed: 0, status: "attended" },
  { id: "BC-05", application_id: "A-0006", invited_on: d(-60), registered: 1, attended_on: d(-55), process_briefing_done: 1, readiness_session_done: 1, mou_briefing_done: 1, fee_briefing_done: 1, questions: "Confirm the turnover basis used for the fee.", actions_assigned: "Consolidate municipal contracts.", preparation_completed: 1, status: "prep_completed" },
  { id: "BC-06", application_id: "A-0008", invited_on: d(-80), registered: 1, attended_on: d(-75), process_briefing_done: 1, readiness_session_done: 1, mou_briefing_done: 1, fee_briefing_done: 1, questions: "Can the ask be revised after the mock shoot?", actions_assigned: "Finalise the valuation band.", preparation_completed: 1, status: "prep_completed" },
  { id: "BC-07", application_id: "A-0009", invited_on: d(-30), registered: 1, attended_on: d(-25), process_briefing_done: 1, readiness_session_done: 1, mou_briefing_done: 1, fee_briefing_done: 1, questions: "Is the founder available for the September meetup?", actions_assigned: "Refresh the traction dashboard.", preparation_completed: 0, status: "registered" },
  { id: "BC-08", application_id: "A-0010", invited_on: d(-42), registered: 0, attended_on: null, process_briefing_done: 0, readiness_session_done: 0, mou_briefing_done: 0, fee_briefing_done: 0, questions: "", actions_assigned: "", preparation_completed: 0, status: "not_attended" },
];

export const ANALYST_EVALUATIONS: Row[] = [
  { id: "AE-01", application_id: "A-0001", analyst_id: "U-AN1", thesis_fit: 5, market_opportunity: 4, traction: 5, business_model: 4, competitive_positioning: 5, willingness_to_invest: 4, indicative_amount: 7500000_00, recommendation: "proceed", decision_reason: "Clear unit economics and a repeatable distribution play.", outstanding_concern: "Customer concentration in two districts.", evaluated_at: d(-88) },
  { id: "AE-02", application_id: "A-0003", analyst_id: "U-AN1", thesis_fit: 4, market_opportunity: 5, traction: 5, business_model: 4, competitive_positioning: 4, willingness_to_invest: 5, indicative_amount: 15000000_00, recommendation: "proceed", decision_reason: "Category leader in a large, under-digitised market.", outstanding_concern: "Regulatory change risk in health data.", evaluated_at: d(-80) },
  { id: "AE-03", application_id: "A-0004", analyst_id: "U-AN1", thesis_fit: 4, market_opportunity: 3, traction: 2, business_model: 3, competitive_positioning: 3, willingness_to_invest: 2, indicative_amount: 2500000_00, recommendation: "conditional", decision_reason: "Strong product thinking, unproven distribution.", outstanding_concern: "No paying customers yet.", evaluated_at: d(-63) },
  { id: "AE-04", application_id: "A-0006", analyst_id: "U-AN1", thesis_fit: 5, market_opportunity: 4, traction: 4, business_model: 4, competitive_positioning: 4, willingness_to_invest: 3, indicative_amount: 6000000_00, recommendation: "proceed", decision_reason: "Municipal contracts give predictable revenue.", outstanding_concern: "Working-capital cycle is long.", evaluated_at: d(-52) },
  { id: "AE-05", application_id: "A-0008", analyst_id: "U-AN1", thesis_fit: 4, market_opportunity: 5, traction: 5, business_model: 5, competitive_positioning: 4, willingness_to_invest: 5, indicative_amount: 20000000_00, recommendation: "proceed", decision_reason: "Network effects are already visible in the data.", outstanding_concern: "Diesel-price sensitivity.", evaluated_at: d(-72) },
];

export const MOUS: Row[] = [
  { id: "MOU-01", application_id: "A-0001", shared_on: d(-86), legal_ama_due: d(-82), legal_ama_on: d(-82), signing_deadline: d(-79), signed_on: d(-78), status: "signed", commercial_schedule: "Schedule A: 2% success fee, cap Rs 50,00,000, no upfront adjustment.", approved_exceptions: "Founder requested a 30-day payment window; approved.", response: "Proceed", discontinued_reason: "", founder_email: "kavitha@agrinova.example", escalated_to_management: 0 },
  { id: "MOU-02", application_id: "A-0003", shared_on: d(-78), legal_ama_due: d(-74), legal_ama_on: d(-74), signing_deadline: d(-71), signed_on: d(-70), status: "signed", commercial_schedule: "Schedule A: 2.5% success fee, cap Rs 75,00,000.", approved_exceptions: "", response: "Proceed", discontinued_reason: "", founder_email: "anand@meditrack.example", escalated_to_management: 0 },
  { id: "MOU-03", application_id: "A-0004", shared_on: d(-61), legal_ama_due: d(-57), legal_ama_on: d(-57), signing_deadline: d(-54), signed_on: d(-53), status: "signed", commercial_schedule: "Schedule A: 2% success fee, slab-linked.", approved_exceptions: "", response: "Proceed", discontinued_reason: "", founder_email: "neha@finlit.example", escalated_to_management: 0 },
  { id: "MOU-04", application_id: "A-0006", shared_on: d(-50), legal_ama_due: d(-46), legal_ama_on: null, signing_deadline: d(-43), signed_on: null, status: "negotiation", commercial_schedule: "Proposed: 3% success fee.", approved_exceptions: "Founder is seeking a lower cap.", response: "Negotiate", discontinued_reason: "", founder_email: "thomas@greenloop.example", escalated_to_management: 1 },
  { id: "MOU-05", application_id: "A-0008", shared_on: d(-70), legal_ama_due: d(-66), legal_ama_on: d(-66), signing_deadline: d(-63), signed_on: d(-62), status: "signed", commercial_schedule: "Schedule A: 2% success fee, cap Rs 1,00,00,000.", approved_exceptions: "", response: "Proceed", discontinued_reason: "", founder_email: "harpreet@logichain.example", escalated_to_management: 0 },
];

export const IRR_REPORTS: Row[] = [
  { id: "IRR-01", application_id: "A-0001", version: 3, status: "shared_with_ir", requested_on: d(-80), handover_accepted_on: d(-79), checklist_sent_on: d(-78), prepared_on: d(-72), reviewed_by_id: "U-FIN1", approved_on: d(-70), approved_by_id: "U-MGMT", shared_with_ir_on: d(-70), document_ref: "IRR-AGRINOVA-V3.pdf", missing_documents: "" },
  { id: "IRR-02", application_id: "A-0003", version: 2, status: "shared_with_ir", requested_on: d(-74), handover_accepted_on: d(-73), checklist_sent_on: d(-72), prepared_on: d(-66), reviewed_by_id: "U-FIN1", approved_on: d(-64), approved_by_id: "U-MGMT", shared_with_ir_on: d(-64), document_ref: "IRR-MEDITRACK-V2.pdf", missing_documents: "" },
  { id: "IRR-03", application_id: "A-0004", version: 1, status: "shared_with_ir", requested_on: d(-55), handover_accepted_on: d(-54), checklist_sent_on: d(-53), prepared_on: d(-49), reviewed_by_id: "U-FIN1", approved_on: d(-47), approved_by_id: "U-MGMT", shared_with_ir_on: d(-47), document_ref: "IRR-FINLIT-V1.pdf", missing_documents: "" },
  { id: "IRR-04", application_id: "A-0008", version: 1, status: "under_review", requested_on: d(-64), handover_accepted_on: d(-63), checklist_sent_on: d(-62), prepared_on: d(-58), reviewed_by_id: "U-FIN1", approved_on: null, approved_by_id: null, shared_with_ir_on: null, document_ref: "IRR-LOGICHAIN-V1.pdf", missing_documents: "Updated cap table" },
];
