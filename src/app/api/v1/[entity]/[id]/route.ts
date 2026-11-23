import { fail, ok, readBody } from "@/lib/server/api";
import { getOne, listWhere, remove, update, withRelationLabels } from "@/lib/server/repo";
import { redactRow, redactRows } from "@/lib/server/redact";
import { entityOrThrow } from "@/lib/server/registry";
import { actorFromRequest, assertModuleAccess, assertWrite, HttpError } from "@/lib/server/session";
import { seasonFromRequest } from "@/lib/server/season";
import { startupStageKeys } from "@/lib/server/recordStage";

export const dynamic = "force-dynamic";

/** Child records shown on a detail page. */
const CHILDREN: Record<string, { entity: string; column: string; label: string }[]> = {
  startups: [
    { entity: "applications", column: "startup_id", label: "Applications" },
    { entity: "founders", column: "startup_id", label: "Founders" },
    { entity: "matches", column: "startup_id", label: "Investor conversations" },
    { entity: "commitments", column: "startup_id", label: "Commitments" },
    { entity: "funding_rounds", column: "startup_id", label: "Funding rounds" },
    { entity: "deals", column: "startup_id", label: "Deals" },
    { entity: "upfront_fees", column: "startup_id", label: "Upfront fees" },
    { entity: "success_fees", column: "startup_id", label: "Success fees" },
    { entity: "documents", column: "entity_id", label: "Documents" },
    { entity: "tasks", column: "entity_id", label: "Tasks" },
  ],
  applications: [
    { entity: "screenings", column: "application_id", label: "Screening" },
    { entity: "bootcamp_attendance", column: "application_id", label: "Bootcamp" },
    { entity: "analyst_evaluations", column: "application_id", label: "Analyst evaluation" },
    { entity: "mous", column: "application_id", label: "MoU" },
    { entity: "irr_reports", column: "application_id", label: "IRR reports" },
  ],
  investors: [
    { entity: "investor_agreements", column: "investor_id", label: "Agreements" },
    { entity: "investor_grade_assessments", column: "investor_id", label: "Grade assessments" },
    { entity: "matches", column: "investor_id", label: "Startup conversations" },
    { entity: "commitments", column: "investor_id", label: "Commitments" },
    { entity: "deals", column: "investor_id", label: "Deals" },
  ],
  deals: [
    { entity: "tranches", column: "deal_id", label: "Tranches" },
    { entity: "deal_documents", column: "deal_id", label: "Documents" },
  ],
  funding_rounds: [{ entity: "deals", column: "funding_round_id", label: "Investor allocations" }],
  pitch_days: [{ entity: "pitch_day_slots", column: "pitch_day_id", label: "One-to-one slots" }],
  community_events: [{ entity: "event_registrations", column: "event_id", label: "Registrations" }],
  community_members: [
    { entity: "community_member_roles", column: "member_id", label: "Roles" },
    { entity: "support_requests", column: "member_id", label: "Support requests" },
  ],
};

export async function GET(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  try {
    const { entity: entityKey, id } = await params;
    const entity = entityOrThrow(entityKey);
    const session = actorFromRequest(request);
    assertModuleAccess(session, entity.module);

    const record = getOne(entityKey, id);
    if (!record) throw new HttpError(404, `${entity.label} ${id} not found`);

    const related: Record<string, unknown[]> = {};
    for (const relation of entity.relations ?? []) {
      if (relation.entity === entityKey) continue;
      const rows = listWhere(relation.entity, "id", record[relation.column]);
      if (rows.length) related[relation.label] = withRelationLabels(relation.entity, redactRows(relation.entity, rows, session.actor.role));
    }
    for (const child of CHILDREN[entityKey] ?? []) {
      related[child.label] = withRelationLabels(child.entity, redactRows(child.entity, listWhere(child.entity, child.column, id), session.actor.role));
    }

    // A startup's own status names only the profile; the journey stage lives in the records
    // that hang off it. Resolve it here so the workflow panel opens on the real stage instead
    // of "Founder profile — Step 1" for every startup. The other journeys (content, investment,
    // finance) keep their own records and are not folded in.
    let stageKeys: string[] | undefined;
    if (entityKey === "startups") {
      stageKeys = startupStageKeys(id, seasonFromRequest(request) || undefined);
    } else if (entityKey === "applications") {
      const startupId = record["startup_id"];
      if (typeof startupId === "string" && startupId) stageKeys = startupStageKeys(startupId, seasonFromRequest(request) || undefined);
    }

    return ok({
      entity: entityKey,
      label: entity.label,
      record: withRelationLabels(entityKey, [redactRow(entityKey, record, session.actor.role)])[0],
      related,
      stageKeys,
    });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  try {
    const { entity: entityKey, id } = await params;
    const entity = entityOrThrow(entityKey);
    const session = actorFromRequest(request);
    assertModuleAccess(session, entity.module);
    assertWrite(session);
    const body = await readBody(request);
    const reason = typeof body._reason === "string" ? body._reason : "";
    delete body._reason;
    const updated = update(entityKey, id, body, session.actor, reason);
    return ok(redactRow(entityKey, updated, session.actor.role));
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ entity: string; id: string }> }) {
  try {
    const { entity: entityKey, id } = await params;
    const entity = entityOrThrow(entityKey);
    const session = actorFromRequest(request);
    assertModuleAccess(session, entity.module);
    assertWrite(session);
    const done = remove(entityKey, id, session.actor);
    if (!done) throw new HttpError(404, `${entity.label} ${id} not found`);
    return ok({ deleted: id });
  } catch (error) {
    return fail(error);
  }
}
