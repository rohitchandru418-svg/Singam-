import { all } from "../db/client";
import { roleCanAccessModule, roleCanWrite, ROLE_MAP } from "../domain/rbac";
import { authDevMode } from "./auth-config";
import { resolveToken } from "./auth";
import type { Actor } from "./repo";
import { currentSeasonId, seasonFromRequest } from "./season";

/**
 * Session handling.
 *
 * A request is scoped to the account behind its session token. The `x-actor` header (or the
 * `actor` query parameter) selects the acting user without a token, but only in development
 * and test, where the end-to-end suite drives every department through the API. In production
 * an untokened request resolves to an anonymous, read-only session, so a screen that needs a
 * signed-in user is refused rather than silently acting as somebody else.
 */

export const DEFAULT_ACTOR = "U-MGMT";

export interface Session {
  actor: Actor;
  canWrite: boolean;
  /** Season the request is scoped to; new records are written into it. */
  seasonId: string;
}

/** The session an untokened request gets in production: no role, no write access. */
function anonymousSession(seasonId: string): Session {
  return {
    actor: {
      id: "",
      name: "Guest",
      role: "anonymous",
      department: "",
      kind: "anonymous",
      startupId: null,
      investorId: null,
      seasonId,
    },
    canWrite: false,
    seasonId,
  };
}

export function resolveActor(requestedId?: string | null): Session {
  const users = all<Record<string, unknown>>("SELECT * FROM users WHERE active = 1 ORDER BY name");
  // An explicit id that names no account resolves to anonymous, never to a default user: a
  // mistyped actor in a script or a link must not silently gain an account's access. Only an
  // absent id (no header) falls back to the console default.
  if (requestedId) {
    const match = users.find((u) => u.id === requestedId);
    return match ? toSession(match) : anonymousSession(currentSeasonId());
  }
  const fallback = users.find((u) => u.id === DEFAULT_ACTOR) ?? users[0];
  return toSession(fallback);
}

function toSession(found: Record<string, unknown>): Session {
  const actor: Actor = {
    id: String(found.id),
    name: String(found.name),
    role: String(found.role),
    department: String(found.department),
    kind: String(found.kind ?? "staff"),
    startupId: found.startup_id ? String(found.startup_id) : null,
    investorId: found.investor_id ? String(found.investor_id) : null,
    seasonId: currentSeasonId(),
  };
  return { actor, canWrite: roleCanWrite(actor.role), seasonId: currentSeasonId() };
}

/**
 * The accounts the local identity picker and the acting-user switcher can offer. Every active
 * account is listed so each department and each external side can be reached during a review.
 */
export function listUsers(): { id: string; name: string; role: string; department: string; roleLabel: string; kind: string; startupId: string | null; investorId: string | null }[] {
  return all<Record<string, unknown>>(
    "SELECT * FROM users WHERE active = 1 ORDER BY department, name",
  ).map((u) => ({
    id: String(u.id),
    name: String(u.name),
    role: String(u.role),
    department: String(u.department),
    roleLabel: ROLE_MAP[String(u.role)]?.label ?? String(u.role),
    kind: String(u.kind ?? "staff"),
    startupId: u.startup_id ? String(u.startup_id) : null,
    investorId: u.investor_id ? String(u.investor_id) : null,
  }));
}

/** A founder may only open the startup side; an investor only the investor side. */
export function assertExternal(session: Session, module: string): void {
  if (session.actor.kind === "founder" && module !== "startup_side") {
    throw new HttpError(403, "The startup side can only open the startup workspace");
  }
  if (session.actor.kind === "investor" && module !== "investor_side") {
    throw new HttpError(403, "The investor side can only open the investor workspace");
  }
}

/**
 * Read the bearer token a signed-in browser sends, if any.
 *
 * A signed-in request carries `Authorization: Bearer <token>` or the httpOnly session cookie.
 * The `x-actor` header remains a development and test fallback, so the end-to-end suite keeps
 * working without a session; it is refused in production.
 */
export function tokenFromRequest(request: Request): string | null {
  const header = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (header && /^bearer /i.test(header)) return header.slice(7).trim();
  // The browser is given an httpOnly cookie, so the token never has to live in JavaScript
  // where a cross-site script could read it. Bearer stays supported for scripts and API use.
  return cookieValue(request.headers.get("cookie"), SESSION_COOKIE);
}

export const SESSION_COOKIE = "singam_session";

function cookieValue(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function actorFromRequest(request: Request): Session {
  const url = new URL(request.url);
  const seasonId = seasonFromRequest(request);

  // A real session wins: it carries the account the person actually signed in with.
  const token = tokenFromRequest(request);
  if (token) {
    const resolved = resolveToken(token);
    if (resolved) {
      return {
        actor: { ...resolved.actor, seasonId },
        canWrite: roleCanWrite(resolved.actor.role),
        seasonId,
      };
    }
  }

  const header = request.headers.get("x-actor");
  // The acting-user header is a development and test affordance. In production an untokened
  // request is anonymous, so no screen can be opened by naming a user in a header.
  if (authDevMode()) {
    const session = resolveActor(header ?? url.searchParams.get("actor"));
    // The acting season travels on the request so actions create rows in the season the
    // user is looking at, never in a hard-coded one.
    return { ...session, seasonId };
  }
  return anonymousSession(seasonId);
}

/** The bearer token, or a typed failure when the request carries none that resolves. */
export function requireSession(request: Request): { session: Session; token: string } {
  const token = tokenFromRequest(request);
  if (!token) throw new HttpError(401, "Sign in to continue");
  const resolved = resolveToken(token);
  if (!resolved) throw new HttpError(401, "Your session has expired. Sign in again.");
  const seasonId = seasonFromRequest(request);
  return {
    session: { actor: { ...resolved.actor, seasonId }, canWrite: roleCanWrite(resolved.actor.role), seasonId },
    token,
  };
}

export function assertModuleAccess(session: Session, module: string): void {
  if (session.actor.role === "admin") return;
  if (!roleCanAccessModule(session.actor.role, module)) {
    throw new HttpError(403, `Role ${session.actor.role} cannot access the ${module} module`);
  }
}

export function assertWrite(session: Session): void {
  if (!session.canWrite) throw new HttpError(403, "This role has read-only access");
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}
