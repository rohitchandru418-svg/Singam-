import { fail, ok } from "@/lib/server/api";
import { resolveToken, signInIdentifiers } from "@/lib/server/auth";
import { actorFromRequest, tokenFromRequest } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * Who the caller is.
 *
 * Resolves a session token first and falls back to the `x-actor` header (development and test
 * only), so the same endpoint answers for a signed-in browser and for a script. `authenticated`
 * says which of the two it was, so the UI can tell a real login from a header identity.
 */
export async function GET(request: Request) {
  try {
    const session = actorFromRequest(request);
    const token = tokenFromRequest(request);
    const resolved = token ? resolveToken(token) : null;

    return ok({
      actor: session.actor,
      canWrite: session.canWrite,
      authenticated: Boolean(resolved),
      seasonId: session.seasonId,
      identifiers: resolved ? signInIdentifiers(resolved.user) : [],
    });
  } catch (error) {
    return fail(error);
  }
}
