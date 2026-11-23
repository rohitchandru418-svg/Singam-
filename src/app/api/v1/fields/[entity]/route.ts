import { fail, ok } from "@/lib/server/api";
import { entityOrThrow } from "@/lib/server/registry";
import { fieldsFor } from "@/lib/server/fields";
import { assertModuleAccess, actorFromRequest } from "@/lib/server/session";

export const dynamic = "force-dynamic";

/**
 * The field list a create or edit form needs for one entity, built from the schema so the
 * form never drifts from the database.
 */
export async function GET(request: Request, { params }: { params: Promise<{ entity: string }> }) {
  try {
    const { entity: entityKey } = await params;
    const entity = entityOrThrow(entityKey);
    const session = actorFromRequest(request);
    assertModuleAccess(session, entity.module);
    return ok({ entity: entity.key, label: entity.label, plural: entity.plural, fields: fieldsFor(entity) });
  } catch (error) {
    return fail(error);
  }
}
