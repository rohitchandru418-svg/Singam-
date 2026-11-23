/**
 * The walkthrough cohort.
 *
 * A single founder at the very start of the journey, so a reviewer can sign in, switch
 * persona at each stage and drive the whole 20-stage flow by hand. Nothing here is
 * pre-completed: the startup profile is incomplete and no application exists, so the founder
 * lands on stage 1 (the startup record) with the next step waiting.
 */

import type { Row } from "./seed-data";

export const WALKTHROUGH_STARTUPS: Row[] = [
  {
    id: "S-21",
    name: "Minsky",
    legal_entity: "Minsky Technologies Pvt Ltd",
    entity_type: "Private Limited",
    sector: "Agritech",
    stage: "idea",
    geography: "Tamil Nadu",
    business_model: "B2B SaaS",
    website: "minsky.example",
    cin: "",
    gstin: "",
    pan: "",
    incorporated_on: "",
    category: "startup",
    pitch: "",
    product_stage: "idea",
    revenue_stage: "pre_revenue",
    target_fundraise: 0,
    technologies: "",
    industries: "",
    monthly_revenue: 0,
    customer_count: 0,
    traction: "",
    funding_raised: 0,
    pitch_deck_ref: "",
    video_pitch_ref: "",
    profile_status: "incomplete",
    origin_country: "India",
    registered: 1,
  },
];

export const WALKTHROUGH_FOUNDERS: Row[] = [
  {
    id: "F-13",
    startup_id: "S-21",
    name: "Kishore",
    role: "Founder & CEO",
    email: "kishore@minsky.example",
    phone: "+91 98400 55667",
    linkedin: "linkedin.com/in/kishore",
    is_primary: 1,
    restricted_to_analyst: 1,
  },
];

export const WALKTHROUGH_USERS: Row[] = [
  {
    id: "U-F-S21",
    name: "Kishore",
    email: "kishore@minsky.example",
    role: "founder",
    department: "external",
    kind: "founder",
    startup_id: "S-21",
  },
];

/** No application yet: the founder creates it as stage 2 of the walkthrough. */
export const WALKTHROUGH_APPLICATIONS: Row[] = [];
