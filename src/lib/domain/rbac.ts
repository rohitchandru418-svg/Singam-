import type { Department } from "./departments";

/**
 * Role-based access control.
 *
 * Two kinds of restriction are modelled:
 *  - Department/document-level access (which module a role may open).
 *  - Field-level access (e.g. founder personal/contact details are withheld from
 *    analysts, confidential investor remarks are withheld from Marketing).
 */

export type Role =
  | "admin"
  | "management"
  | "startup_relationship_manager"
  | "analyst"
  | "investor_relations"
  | "finance"
  | "production"
  | "community"
  | "marketing"
  | "legal"
  | "auditor"
  | "founder"
  | "investor"
  | "anonymous";

export interface RoleMeta {
  key: Role;
  label: string;
  department: Department;
  /** Module keys this role may open. "*" means every module. */
  modules: string[];
  /** External roles use the startup-side shell, not the internal console. */
  external?: boolean;
}

export const MODULES = [
  "dashboard",
  "startups",
  "applications",
  "screening",
  "bootcamp",
  "analyst",
  "mou",
  "irr",
  "investors",
  "matching",
  "pitches",
  "pitchday",
  "committee",
  "commitments",
  "deals",
  "deployment",
  "upfront_fees",
  "success_fees",
  "production",
  "episodes",
  "telecast",
  "community",
  "events",
  "referrals",
  "support",
  "legal",
  "tasks",
  "handovers",
  "documents",
  "policies",
  "integrations",
  "audit",
  "admin",
  // The startup-side surface a founder may open.
  "startup_side",
  // The investor-side surface an investor login may open.
  "investor_side",
] as const;

export type ModuleKey = (typeof MODULES)[number];

/**
 * The screen that opens each module. The sidebar, the journey map and global search all
 * read this map, so a stage can deep-link to its module without a second hard-coded list.
 * Modules with no list screen of their own (dashboard, tasks, audit) are absent.
 */
export const MODULE_ROUTE: Partial<Record<ModuleKey, string>> = {
  startups: "/startups",
  applications: "/applications",
  screening: "/screening",
  bootcamp: "/bootcamp",
  analyst: "/analyst",
  mou: "/mou",
  irr: "/irr",
  investors: "/investors",
  matching: "/matching",
  pitches: "/pitches",
  pitchday: "/pitchday",
  committee: "/committee",
  commitments: "/commitments",
  deals: "/deals",
  deployment: "/deployment",
  upfront_fees: "/upfront-fees",
  success_fees: "/success-fees",
  production: "/production",
  episodes: "/episodes",
  telecast: "/telecast",
  community: "/community",
  events: "/events",
  referrals: "/referrals",
  support: "/support",
  legal: "/legal",
  handovers: "/handovers",
  documents: "/documents",
  policies: "/policies",
  integrations: "/integrations",
};

export const ROLES: RoleMeta[] = [
  { key: "admin", label: "Administrator", department: "management", modules: ["*"] },
  {
    key: "management",
    label: "Management",
    department: "management",
    modules: [
      "dashboard", "startups", "applications", "screening", "bootcamp", "analyst", "mou", "irr",
      "investors", "matching", "pitches", "pitchday", "committee", "commitments", "deals",
      "deployment", "upfront_fees", "success_fees", "production", "episodes", "telecast",
      "community", "events", "referrals", "support", "legal", "tasks", "handovers", "documents",
      "policies", "integrations", "audit",
    ],
  },
  {
    key: "startup_relationship_manager",
    label: "Startup Relationship Manager",
    department: "startup_relationships",
    modules: [
      "dashboard", "startups", "applications", "screening", "bootcamp", "analyst", "mou", "irr",
      "commitments", "upfront_fees", "production", "tasks", "handovers", "documents", "community",
      "events", "referrals", "support",
    ],
  },
  {
    key: "analyst",
    label: "Analyst",
    department: "startup_relationships",
    // Analysts see the startup record itself but the founder contact fields are redacted.
    modules: ["dashboard", "startups", "applications", "analyst", "tasks", "documents"],
  },
  {
    key: "investor_relations",
    label: "Investor Relations",
    department: "investor_relations",
    modules: [
      "dashboard", "startups", "investors", "matching", "pitches", "pitchday", "committee",
      "commitments", "deals", "deployment", "irr", "success_fees", "production", "tasks",
      "handovers", "documents", "events", "referrals", "legal",
    ],
  },
  {
    key: "finance",
    label: "Finance",
    department: "finance",
    modules: [
      "dashboard", "startups", "irr", "upfront_fees", "success_fees", "deals", "deployment",
      "tasks", "handovers", "documents", "integrations",
    ],
  },
  {
    key: "production",
    label: "Production",
    department: "production",
    modules: [
      "dashboard", "startups", "commitments", "production", "episodes", "telecast", "tasks",
      "handovers", "documents",
    ],
  },
  {
    key: "community",
    label: "Community",
    department: "community",
    modules: [
      "dashboard", "startups", "community", "events", "referrals", "support", "tasks",
      "handovers", "documents",
    ],
  },
  {
    key: "marketing",
    label: "Marketing",
    department: "marketing",
    modules: [
      "dashboard", "startups", "episodes", "telecast", "commitments", "deployment", "tasks",
      "documents",
    ],
  },
  {
    key: "legal",
    label: "Legal",
    department: "legal",
    modules: ["dashboard", "mou", "deals", "legal", "documents", "tasks", "handovers", "policies"],
  },
  {
    key: "auditor",
    label: "Auditor (read-only)",
    department: "management",
    modules: [
      "dashboard", "startups", "applications", "screening", "investors", "matching", "pitches",
      "pitchday", "committee", "commitments", "deals", "deployment", "upfront_fees",
      "success_fees", "production", "episodes", "telecast", "community", "events", "referrals",
      "support", "tasks", "handovers", "documents", "policies", "integrations", "audit",
    ],
  },
  {
    key: "founder",
    label: "Founder (startup side)",
    department: "external",
    external: true,
    modules: ["startup_side"],
  },
  {
    key: "investor",
    label: "Investor (investor side)",
    department: "external",
    external: true,
    modules: ["investor_side"],
  },
  {
    // An untokened request in production. It carries no modules and cannot write, so a
    // screen that needs a signed-in user is refused rather than shown empty.
    key: "anonymous",
    label: "Guest",
    department: "management",
    modules: [],
  },
];

export const ROLE_MAP: Record<string, RoleMeta> = Object.fromEntries(
  ROLES.map((r) => [r.key, r]),
) as Record<string, RoleMeta>;

export function roleCanAccessModule(role: string, module: string): boolean {
  const meta = ROLE_MAP[role];
  if (!meta) return false;
  return meta.modules.includes("*") || meta.modules.includes(module);
}

/** Read-only roles cannot mutate records. */
export function roleCanWrite(role: string): boolean {
  return role !== "auditor";
}

/**
 * Field-level restrictions applied to API serialisation.
 * Returns the list of fields removed from the payload for this role.
 */
export const FIELD_RESTRICTIONS: Record<string, string[]> = {
  // SOP: founder/co-founder personal and contact details are restricted from the analyst view.
  analyst: ["founder_personal_details"],
  // Marketing sees approved publication information only.
  marketing: ["confidential_investor_remarks", "deal_documents"],
  // Community membership never grants access to confidential deal information.
  community: ["confidential_investor_remarks", "deal_documents", "investor_terms"],
  production: ["confidential_investor_remarks"],
  // A founder sees their own startup only; internal scoring, investor identities and terms
  // and staff remarks never leave the console.
  founder: ["internal_scores", "investor_identities", "investor_terms", "confidential_investor_remarks", "deal_documents"],
  // An investor sees their own record and the startups circulated to them only. Internal
  // scores, other investors' identities and terms, and staff remarks stay in the console.
  investor: ["internal_scores", "other_investor_identities", "other_investor_terms", "confidential_investor_remarks", "internal_notes"],
};

export function restrictedFieldsFor(role: string): string[] {
  return FIELD_RESTRICTIONS[role] ?? [];
}

export function isExternalRole(role: string): boolean {
  return ROLE_MAP[role]?.external === true;
}

export function maySeeFounderPersonalDetails(role: string): boolean {
  return role !== "analyst";
}
