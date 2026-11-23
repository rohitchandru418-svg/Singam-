import type { IconName } from "@/components/icons";
import type { Department } from "./departments";

/**
 * Navigation model.
 *
 * The ERP spans six departments and a cross-cutting platform area, and the sidebar used to
 * present every screen as one flat, seven-group list of ~30 links. That reads as a database
 * menu, not a workplace: nothing told a user which screens belong to their job.
 *
 * A *workspace* is one department's slice of the product. A user picks a workspace and sees
 * only its screens. Each workspace names the department that normally works in it, so the
 * header can suggest the right acting user and the dashboard can show the matching queue.
 */

export interface WorkspaceScreen {
  href: string;
  label: string;
  module: string;
  icon: IconName;
  /** A live count badge sourced from the session. */
  badge?: "tasks" | "notifications";
}

export interface Workspace {
  key: string;
  label: string;
  /** One-line description shown under the workspace heading. */
  description: string;
  icon: IconName;
  /** The department that normally works here; drives the suggested acting user. */
  department: Department;
  screens: WorkspaceScreen[];
}

export const WORKSPACES: Workspace[] = [
  {
    key: "overview",
    label: "Overview",
    description: "Where the season stands, and what needs you today.",
    icon: "home",
    department: "management",
    screens: [
      { href: "/", label: "Dashboard", module: "dashboard", icon: "home" },
      { href: "/my-work", label: "My work", module: "tasks", icon: "check-square", badge: "tasks" },
      { href: "/approvals", label: "Approvals inbox", module: "tasks", icon: "file-check" },
      { href: "/journeys", label: "Journey maps & SOP stages", module: "dashboard", icon: "map" },
      { href: "/tasks", label: "Tasks & escalations", module: "tasks", icon: "clipboard", badge: "tasks" },
      { href: "/audit", label: "Audit history", module: "audit", icon: "clock" },
    ],
  },
  {
    key: "startup",
    label: "Startup Relationship",
    description: "The founder journey: application, screening, MoU, readiness and shoot clearance.",
    icon: "rocket",
    department: "startup_relationships",
    screens: [
      { href: "/pipeline", label: "Pipeline", module: "applications", icon: "layers" },
      { href: "/startups", label: "Startups", module: "startups", icon: "rocket" },
      { href: "/applications", label: "Applications", module: "applications", icon: "file-text" },
      { href: "/screening", label: "Internal screening", module: "screening", icon: "bar-chart" },
      { href: "/bootcamp", label: "Prep Bootcamp", module: "bootcamp", icon: "graduation-cap" },
      { href: "/analyst", label: "Analyst screening", module: "analyst", icon: "search" },
      { href: "/mou", label: "MoU", module: "mou", icon: "pen" },
      { href: "/irr", label: "Investment Readiness Report", module: "irr", icon: "book" },
    ],
  },
  {
    key: "investor",
    label: "Investor Relations",
    description: "Sourcing, grading, matching, pitches and the investment commitment path.",
    icon: "briefcase",
    department: "investor_relations",
    screens: [
      { href: "/investors", label: "Investors", module: "investors", icon: "briefcase" },
      { href: "/matching", label: "Startup matching", module: "matching", icon: "link" },
      { href: "/pitches", label: "Virtual pitches", module: "pitches", icon: "mic" },
      { href: "/pitchday", label: "Pitch Day & Golden Pass", module: "pitchday", icon: "ticket" },
      { href: "/committee", label: "Final selection committee", module: "committee", icon: "scales" },
      { href: "/commitments", label: "Commitments & pre-shoot", module: "commitments", icon: "file-check" },
    ],
  },
  {
    key: "finance",
    label: "Finance",
    description: "Upfront fee collection, deal closure, deployment and success fee reconciliation.",
    icon: "receipt",
    department: "finance",
    screens: [
      { href: "/upfront-fees", label: "Upfront fee collection", module: "upfront_fees", icon: "receipt" },
      { href: "/deals", label: "Deals & closure", module: "deals", icon: "layers" },
      { href: "/deployment", label: "Deployment tracking", module: "deployment", icon: "bank" },
      { href: "/success-fees", label: "Post-funding success fees", module: "success_fees", icon: "currency" },
      { href: "/reconciliation", label: "Reconciliation & TDS", module: "success_fees", icon: "scales" },
    ],
  },
  {
    key: "legal",
    label: "Legal",
    description: "MoU Q&A and redrafts, templates, due diligence and pre-funding conditions.",
    icon: "scales",
    department: "legal",
    screens: [
      { href: "/legal", label: "Due diligence & conditions", module: "legal", icon: "scales" },
      { href: "/legal/templates", label: "Template manager", module: "legal", icon: "file-text" },
    ],
  },
  {
    key: "production",
    label: "Production & Show Ops",
    description: "AV, mock and main shoots, editing, telecast and promotions.",
    icon: "clapperboard",
    department: "production",
    screens: [
      { href: "/production", label: "AV, mock & main shoot", module: "production", icon: "clapperboard" },
    ],
  },
  {
    key: "marketing",
    label: "Marketing & Telecast",
    description: "Episode telecast, promotions, public announcements and founder feedback.",
    icon: "tv",
    department: "marketing",
    screens: [
      { href: "/episodes", label: "Episodes & editing", module: "episodes", icon: "film" },
      { href: "/telecast", label: "Telecast & promotions", module: "telecast", icon: "tv" },
    ],
  },
  {
    key: "community",
    label: "Community & Ecosystem",
    description: "Members, events, referrals, founder support and outcome tracking.",
    icon: "users",
    department: "community",
    screens: [
      { href: "/community", label: "Members", module: "community", icon: "users" },
      { href: "/events", label: "Events & engagement", module: "events", icon: "calendar" },
      { href: "/referrals", label: "Referrals", module: "referrals", icon: "sprout" },
      { href: "/support", label: "Founder support", module: "support", icon: "lifebuoy" },
    ],
  },
  {
    key: "platform",
    label: "Platform & governance",
    description: "Handovers, documents, configuration, integrations and access.",
    icon: "shield",
    department: "management",
    screens: [
      { href: "/handovers", label: "Handovers", module: "handovers", icon: "refresh" },
      { href: "/documents", label: "Document register", module: "documents", icon: "folder" },
      { href: "/policies", label: "Policies & configuration", module: "policies", icon: "settings" },
      { href: "/integrations", label: "Integrations & sync", module: "integrations", icon: "plug" },
      { href: "/admin", label: "Access & administration", module: "admin", icon: "shield" },
    ],
  },
];

/** The workspace that owns a path, so the sidebar can open the right one on load. */
export function workspaceForPath(pathname: string): Workspace | null {
  let best: { ws: Workspace; len: number } | null = null;
  for (const ws of WORKSPACES) {
    for (const screen of ws.screens) {
      if (screen.href === "/") {
        if (pathname === "/") best = { ws, len: 1 };
        continue;
      }
      if (pathname === screen.href || pathname.startsWith(`${screen.href}/`)) {
        if (!best || screen.href.length > best.len) best = { ws, len: screen.href.length };
      }
    }
  }
  return best?.ws ?? null;
}

/** The screen entry whose route matches the path, for the breadcrumb. */
export function screenForPath(pathname: string): { workspace: Workspace; screen: WorkspaceScreen } | null {
  const ws = workspaceForPath(pathname);
  if (!ws) return null;
  const screen =
    ws.screens.find((s) => s.href === pathname) ??
    ws.screens
      .filter((s) => s.href !== "/" && pathname.startsWith(s.href))
      .sort((a, b) => b.href.length - a.href.length)[0] ??
    null;
  return screen ? { workspace: ws, screen } : null;
}

/** The workspace that owns a module, so a list screen can name its place in the product. */
export function workspaceForModule(module: string): Workspace | null {
  for (const ws of WORKSPACES) {
    if (ws.screens.some((s) => s.module === module)) return ws;
  }
  return null;
}

/**
 * Cross-cutting workspaces every department works in: the overview every role lands on, and
 * the platform tools (handovers, documents, policies) that are shared infrastructure rather
 * than one department's queue.
 */
const CROSS_CUTTING = new Set(["overview", "platform"]);

/**
 * Whether a workspace belongs in the acting role's navigation.
 *
 * The module grant alone is too coarse: Startup Relationship is granted a handful of
 * cross-department screens (initiating the upfront fee, production clearance, community
 * follow-up), and a flat "can open any of its screens" test then pulled the whole Investor
 * Relations, Finance, Production and Community workspaces into SR's sidebar. A workspace is
 * therefore offered only when the role's own department owns it, or it is cross-cutting, or
 * the role is Management (which oversees every department).
 */
export function workspaceVisibleForRole(
  ws: Workspace,
  department: string,
  canAccessModule: (module: string) => boolean,
): boolean {
  if (!ws.screens.some((s) => canAccessModule(s.module))) return false;
  if (CROSS_CUTTING.has(ws.key)) return true;
  if (department === "management") return true;
  return ws.department === department;
}
