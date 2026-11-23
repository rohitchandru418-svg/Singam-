import { fail, ok } from "@/lib/server/api";
import { buildBoardRow, startupBoard } from "@/lib/server/metrics";
import { getOne } from "@/lib/server/repo";
import { today } from "@/lib/domain/dates";
import { HttpError } from "@/lib/server/session";
import { seasonFromRequest } from "@/lib/server/season";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const seasonId = seasonFromRequest(request);
    const id = url.searchParams.get("startup_id");
    if (id) {
      const startup = getOne("startups", id);
      if (!startup) throw new HttpError(404, `Startup ${id} not found`);
      return ok(buildBoardRow(startup, today(), seasonId));
    }
    return ok(startupBoard(seasonId));
  } catch (error) {
    return fail(error);
  }
}
