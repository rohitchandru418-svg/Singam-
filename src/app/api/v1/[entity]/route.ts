import { fail, ok, queryFilters, readBody, RESERVED_QUERY } from "@/lib/server/api";
import { create, list, withRelationLabels } from "@/lib/server/repo";
import { redactRows } from "@/lib/server/redact";
import { entityOrThrow } from "@/lib/server/registry";
import { seasonFromRequest } from "@/lib/server/season";
import { actorFromRequest, assertModuleAccess, assertWrite, HttpError } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity: entityKey } = await params;
    const entity = entityOrThrow(entityKey);
    const session = actorFromRequest(request);
    assertModuleAccess(session, entity.module);

    const url = new URL(request.url);
    const result = list(entityKey, {
      search: url.searchParams.get("search") ?? undefined,
      filters: queryFilters(url, RESERVED_QUERY),
      limit: url.searchParams.get("limit") ? Number(url.searchParams.get("limit")) : 100,
      offset: url.searchParams.get("offset") ? Number(url.searchParams.get("offset")) : 0,
      sort: url.searchParams.get("sort") ?? undefined,
      direction: (url.searchParams.get("direction") as "asc" | "desc" | null) ?? undefined,
      seasonId: seasonFromRequest(request),
    });

    return ok({
      entity: entityKey,
      label: entity.plural,
      singular: entity.label,
      total: result.total,
      limit: result.limit,
      offset: result.offset,
      season: seasonFromRequest(request),
      items: withRelationLabels(entityKey, redactRows(entityKey, result.items, session.actor.role)),
    });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity: entityKey } = await params;
    const entity = entityOrThrow(entityKey);
    const session = actorFromRequest(request);
    assertModuleAccess(session, entity.module);
    assertWrite(session);
    const body = await readBody(request);
    const created = create(entityKey, body, session.actor);
    return ok(created, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity: entityKey } = await params;
    const entity = entityOrThrow(entityKey);
    const session = actorFromRequest(request);
    assertModuleAccess(session, entity.module);
    assertWrite(session);
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) throw new HttpError(422, "id query parameter is required");
    const { remove } = await import("@/lib/server/repo");
    const done = remove(entityKey, id, session.actor);
    if (!done) throw new HttpError(404, `${entity.label} ${id} not found`);
    return ok({ deleted: id });
  } catch (error) {
    return fail(error);
  }
}
