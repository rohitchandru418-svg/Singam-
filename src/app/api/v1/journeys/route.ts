import { fail, ok } from "@/lib/server/api";
import { buildJourneys } from "@/lib/server/journeys";
import { actorFromRequest } from "@/lib/server/session";
import { seasonFromRequest } from "@/lib/server/season";

export const dynamic = "force-dynamic";

/** The journey map with a live open/aged count for every SOP stage. */
export async function GET(request: Request) {
  try {
    actorFromRequest(request);
    const seasonId = seasonFromRequest(request);
    return ok(buildJourneys(seasonId));
  } catch (error) {
    return fail(error);
  }
}
