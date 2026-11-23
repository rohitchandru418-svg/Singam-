import { fail, ok } from "@/lib/server/api";
import { dashboardKpis, departmentSummary, startupBoard } from "@/lib/server/metrics";
import { actorFromRequest } from "@/lib/server/session";
import { seasonFromRequest } from "@/lib/server/season";
import { DEPARTMENTS } from "@/lib/domain/departments";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    actorFromRequest(request);
    const seasonId = seasonFromRequest(request);
    const kpis = dashboardKpis(seasonId);
    const departments = DEPARTMENTS.map((d) => ({ ...d, metrics: departmentSummary(d.key, seasonId) }));
    const board = startupBoard(seasonId);
    return ok({ season: seasonId, kpis, departments, board });
  } catch (error) {
    return fail(error);
  }
}
