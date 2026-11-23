/**
 * The sign-in personas.
 *
 * The prototype is used by two very different audiences, so sign-in is split into two
 * systems rather than one flat list:
 *
 *   External  - a startup founder and an investor. Each has its own portal.
 *   Internal  - the departments that run the show: Startup Relationship, Investor Relations,
 *               Finance, Production, Legal, Marketing, Community, Analyst and the super admin.
 *
 * A reviewer picks the persona from a dropdown and signs in. The list is a map from persona to
 * a seeded account; the role on each entry is the role that account already carries, so this
 * is a convenience over the real sign-in, not a second source of truth about permissions.
 *
 * The shortcuts exist only where the acting-user switcher is available, which is never in
 * production (see `authDevMode`). A production sign-in is an email address or mobile number
 * and a one-time code, unchanged.
 */

import type { Role } from "./rbac";

export type PersonaAudience = "external" | "internal";

export interface Persona {
  /** Stable key for the dropdown. */
  key: string;
  /** Short name for the menu. */
  label: string;
  /** One line on what this persona does, so the right one is obvious. */
  blurb: string;
  audience: PersonaAudience;
  role: Role;
  /** The seeded account behind the shortcut. */
  userId: string;
  /** The screen the persona lands on after sign-in. */
  href: string;
  /** For an external persona, which portal it opens. */
  portal?: "founder" | "investor";
}

export const PERSONAS: Persona[] = [
  /* External -------------------------------------------------------- */
  {
    key: "founder",
    label: "Startup founder",
    blurb: "Apply, sign the agreement, confirm the shoot and follow the telecast.",
    audience: "external",
    role: "founder",
    // The walkthrough founder: Kishore at Minsky, seeded at stage 0 with nothing completed,
    // so the persona starts the journey from the beginning.
    userId: "U-F-S21",
    href: "/",
    portal: "founder",
  },
  {
    key: "investor",
    label: "Investor",
    blurb: "See the startups circulated to you, your meetings and your commitments.",
    audience: "external",
    role: "investor",
    userId: "U-I-01",
    href: "/",
    portal: "investor",
  },

  /* Internal -------------------------------------------------------- */
  {
    key: "startup_relationship",
    label: "Startup Relationship",
    blurb: "Applications, screening, the Prep Bootcamp, the MoU clock and the readiness handover.",
    audience: "internal",
    role: "startup_relationship_manager",
    userId: "U-SR1",
    href: "/startups",
  },
  {
    key: "investor_relations",
    label: "Investor Relations",
    blurb: "Sourcing and grading investors, matching, pitches, Pitch Day and the commitment path.",
    audience: "internal",
    role: "investor_relations",
    userId: "U-IR1",
    href: "/investors",
  },
  {
    key: "finance",
    label: "Finance",
    blurb: "Upfront fees, deal closure, tranche-wise deployment and success fee reconciliation.",
    audience: "internal",
    role: "finance",
    userId: "U-FIN1",
    href: "/upfront-fees",
  },
  {
    key: "production",
    label: "Production & Show Ops",
    blurb: "AV, mock and main shoots, the handover pack, signing events and shoot-day exceptions.",
    audience: "internal",
    role: "production",
    userId: "U-PROD1",
    href: "/production",
  },
  {
    key: "legal",
    label: "Legal",
    blurb: "Template versions, due-diligence findings and the pre-funding conditions that hold a tranche.",
    audience: "internal",
    role: "legal",
    userId: "U-LEGAL1",
    href: "/legal",
  },
  {
    key: "marketing",
    label: "Marketing & Telecast",
    blurb: "Episode telecast, promotions and announcements that keep announced, committed and deployed apart.",
    audience: "internal",
    role: "marketing",
    userId: "U-MKT1",
    href: "/telecast",
  },
  {
    key: "community",
    label: "Community & Ecosystem",
    blurb: "Members and their roles, events, referrals and the founder support requests that follow.",
    audience: "internal",
    role: "community",
    userId: "U-COMM1",
    href: "/community",
  },
  {
    key: "analyst",
    label: "Analyst",
    blurb: "The analyst evaluation, with founder contact details kept out of the view and the export.",
    audience: "internal",
    role: "analyst",
    userId: "U-AN1",
    href: "/analyst",
  },
  {
    key: "super_admin",
    label: "Super Admin",
    blurb: "The approvals inbox, escalations, reassignment, versioned policies and season setup.",
    audience: "internal",
    role: "management",
    userId: "U-MGMT",
    href: "/approvals",
  },
];

export const PERSONA_BY_KEY: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.key, p]),
) as Record<string, Persona>;

export const PERSONA_BY_USER: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.userId, p]),
) as Record<string, Persona>;

export const EXTERNAL_PERSONAS = PERSONAS.filter((p) => p.audience === "external");
export const INTERNAL_PERSONAS = PERSONAS.filter((p) => p.audience === "internal");

/** The default persona the sign-in dropdown opens on. */
export const DEFAULT_PERSONA = "founder";
