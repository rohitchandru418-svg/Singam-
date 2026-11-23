import { fail, ok } from "@/lib/server/api";
import { listUsers } from "@/lib/server/session";
import { DEPARTMENTS } from "@/lib/domain/departments";
import { ROLES } from "@/lib/domain/rbac";
import { actorFromRequest } from "@/lib/server/session";
import { resolveToken, signInIdentifiers } from "@/lib/server/auth";
import { authDevMode } from "@/lib/server/auth-config";
import { tokenFromRequest } from "@/lib/server/session";
import { all } from "@/lib/db/client";
import { currentSeasonId, listSeasons } from "@/lib/server/season";
import { PERSONAS } from "@/lib/domain/personas";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = actorFromRequest(request);
    const notifications = all<Record<string, unknown>>(
      "SELECT * FROM notifications WHERE read_at IS NULL AND (recipient_id = ? OR recipient_role = ?) ORDER BY created_at DESC LIMIT 20",
      session.actor.id,
      session.actor.department,
    );
    // `authenticated` says whether the request carried a real session. `devMode` says whether
    // the acting-user switcher and the local identity picker are available; both are off in
    // production, where a signed-in user is the account they signed in as.
    const token = tokenFromRequest(request);
    const resolved = token ? resolveToken(token) : null;
    const devMode = authDevMode();
    return ok({
      actor: session.actor,
      seasons: listSeasons(),
      currentSeasonId: currentSeasonId(),
      canWrite: session.canWrite,
      authenticated: Boolean(resolved),
      devMode,
      identifiers: resolved ? signInIdentifiers(resolved.user) : [],
      users: devMode ? listUsers() : [],
      // The sign-in personas, offered only where the switcher is available.
      personas: devMode ? PERSONAS : [],
      roles: ROLES,
      departments: DEPARTMENTS,
      notifications,
    });
  } catch (error) {
    return fail(error);
  }
}
