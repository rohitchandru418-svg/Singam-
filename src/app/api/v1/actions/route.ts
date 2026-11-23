import { fail, ok, readBody } from "@/lib/server/api";
import { ACTIONS, ACTION_CATALOG, actionsForRole, runAction } from "@/lib/server/action-registry";
import { actorFromRequest, HttpError } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = actorFromRequest(request);
    return ok({
      role: session.actor.role,
      canWrite: session.canWrite,
      total: Object.keys(ACTIONS).length,
      catalog: ACTION_CATALOG,
      allowed: actionsForRole(session.actor.role).map((a) => a.name),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  let name = "";
  try {
    const session = actorFromRequest(request);
    const body = await readBody(request);
    name = typeof body.action === "string" ? body.action : "";
    if (!name) throw new HttpError(422, "field action is required");
    const payload = (body.payload as Record<string, unknown>) ?? {};
    const result = runAction(name, { session, body: payload });
    return ok(result);
  } catch (error) {
    console.error(`[actions] ${name || "(unknown)"} failed:`, error instanceof Error ? error.message : error);
    return fail(error, name);
  }
}
