export type Department =
  | "management"
  | "startup_relationships"
  | "investor_relations"
  | "finance"
  | "production"
  | "community"
  | "marketing"
  | "legal"
  | "external";

export interface DepartmentMeta {
  key: Department;
  label: string;
  short: string;
  description: string;
  colour: string;
}

export const DEPARTMENTS: DepartmentMeta[] = [
  {
    key: "management",
    label: "Management",
    short: "MGMT",
    description: "Cross-department oversight, exceptions and final approvals.",
    colour: "slate",
  },
  {
    key: "startup_relationships",
    label: "Startup Relationship",
    short: "SR",
    description: "Owns the founder journey, readiness and cross-department coordination.",
    colour: "indigo",
  },
  {
    key: "investor_relations",
    label: "Investor Relations",
    short: "IR",
    description: "Owns investor onboarding, engagement and investment progression.",
    colour: "violet",
  },
  {
    key: "finance",
    label: "Finance",
    short: "FIN",
    description: "Upfront fee collection, post-funding success fees and reconciliation.",
    colour: "emerald",
  },
  {
    key: "production",
    label: "Production & Show Ops",
    short: "PROD",
    description: "AV, mock and main shoots, documentation and show readiness.",
    colour: "amber",
  },
  {
    key: "community",
    label: "Community & Ecosystem",
    short: "COMM",
    description: "Founder and investor engagement, events, referrals and support.",
    colour: "rose",
  },
  {
    key: "marketing",
    label: "Marketing & Telecast",
    short: "MKTG",
    description: "Episode telecast, promotions, public announcements and feedback.",
    colour: "cyan",
  },
  {
    key: "legal",
    label: "Legal",
    short: "LEGAL",
    description: "MoUs, definitive agreements, due diligence and conditions.",
    colour: "stone",
  },
  {
    key: "external",
    label: "Startup side",
    short: "STARTUP",
    description: "The founder's own view: their application, fee, shoot and telecast.",
    colour: "sky",
  },
];

export const DEPARTMENT_MAP: Record<string, DepartmentMeta> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.key, d]),
) as Record<string, DepartmentMeta>;

export function departmentLabel(key: string): string {
  return DEPARTMENT_MAP[key]?.label ?? key;
}
