import { all, get } from "../db/client";

/**
 * Season scoping.
 *
 * The show runs in numbered seasons and the same startup can apply in more than one. A
 * screen therefore works inside one season at a time: the client sends `x-season`, and
 * every list, the dashboard and the board read that season.
 *
 * Most tables do not carry `season_id` directly, so the scope is resolved by walking the
 * declared foreign keys up to the season:
 *
 *   season_id             the row is dated by itself (applications, upfront fees)
 *   application_id        the application belongs to the season
 *   startup_id            the startup has an application in the season
 *   deal_id               the deal belongs to a startup with an application in the season
 *
 * Tables that link to neither (investors, users, policies, events, audit) are season
 * independent on purpose and stay visible in every season.
 */

interface ScopeRule {
  /** Column on this table that links upward. */
  column: string;
  /** The table that column points at, or `null` when it is the season column itself. */
  via: string | null;
}

/** Explicit links for tables whose season is only reachable through another table. */
const INDIRECT: Record<string, ScopeRule> = {
  tranches: { column: "deal_id", via: "deals" },
  deal_documents: { column: "deal_id", via: "deals" },
};

const COLUMN_CACHE = new Map<string, Set<string>>();

function columnsOf(table: string): Set<string> {
  const cached = COLUMN_CACHE.get(table);
  if (cached) return cached;
  const rows = all<{ name: string }>(`PRAGMA table_info(${table})`);
  const set = new Set(rows.map((r) => r.name));
  COLUMN_CACHE.set(table, set);
  return set;
}

/** The SQL that restricts a table to one season, or `null` when the table is global. */
export function seasonScopeSql(table: string, seasonId: string): { sql: string; params: unknown[] } | null {
  if (!seasonId) return null;
  const columns = columnsOf(table);

  const startupSet = "SELECT DISTINCT startup_id FROM applications WHERE season_id = ?";
  const applicationSet = "SELECT id FROM applications WHERE season_id = ?";

  if (columns.has("season_id")) {
    return { sql: "season_id = ?", params: [seasonId] };
  }

  const indirect = INDIRECT[table];
  if (indirect && columns.has(indirect.column)) {
    return {
      sql: `${indirect.column} IN (SELECT id FROM ${indirect.via} WHERE startup_id IN (${startupSet}))`,
      params: [seasonId],
    };
  }

  if (columns.has("application_id")) {
    return { sql: `application_id IN (${applicationSet})`, params: [seasonId] };
  }

  // The startups table is itself the target, so scope it by id rather than by a link.
  // A startup that has not applied yet (no application anywhere) is still shown, so a
  // startup created on the Startups screen is not invisible until it has an application.
  if (table === "startups") {
    return {
      sql: `(id IN (${startupSet}) OR id NOT IN (SELECT startup_id FROM applications))`,
      params: [seasonId],
    };
  }

  if (columns.has("startup_id")) {
    return { sql: `startup_id IN (${startupSet})`, params: [seasonId] };
  }

  return null;
}

export interface SeasonRecord {
  id: string;
  code: string;
  name: string;
  status: string;
  starts_on: string;
  ends_on: string;
}

export function listSeasons(): SeasonRecord[] {
  return all<SeasonRecord>("SELECT * FROM seasons ORDER BY code");
}

/** The season the app opens on: the live one, else the latest by code. */
export function currentSeasonId(): string {
  const live = get<{ id: string }>("SELECT id FROM seasons WHERE status = 'live' ORDER BY code DESC LIMIT 1");
  if (live) return live.id;
  const latest = get<{ id: string }>("SELECT id FROM seasons ORDER BY code DESC LIMIT 1");
  return latest?.id ?? "";
}

/** Resolve a requested season id, falling back to the current season when it is unknown. */
export function resolveSeasonId(requested?: string | null): string {
  const wanted = (requested ?? "").trim();
  if (wanted) {
    const found = get<{ id: string }>("SELECT id FROM seasons WHERE id = ? OR code = ?", wanted, wanted);
    if (found) return found.id;
  }
  return currentSeasonId();
}

export function seasonFromRequest(request: Request): string {
  return resolveSeasonId(request.headers.get("x-season") ?? new URL(request.url).searchParams.get("season"));
}

/** The season's own short code ("S01", "S02", "S03"), used to build reference numbers. */
export function seasonCodePrefix(seasonId: string): string {
  const row = get<{ code: string }>("SELECT code FROM seasons WHERE id = ?", seasonId);
  return row?.code ?? "APP";
}
