import { fail, ok } from "@/lib/server/api";
import { ENTITIES } from "@/lib/server/registry";
import { STATUS_REGISTRIES } from "@/lib/domain/statuses";
import { JOURNEYS, ALL_STAGES, STAGE_MAP } from "@/lib/domain/workflows";
import { DEPARTMENTS } from "@/lib/domain/departments";
import { MODULES, ROLES, FIELD_RESTRICTIONS } from "@/lib/domain/rbac";
import { SCREENING_CRITERIA, SCREENING_MAX, DEFAULT_QUALIFYING_RULE, type QualifyingRule } from "@/lib/domain/scoring";
import { POLICY_DEFINITIONS, UPFRONT_FEE_SCHEDULE } from "@/lib/domain/policies";
import { DOCUMENT_PURPOSES } from "@/lib/domain/documents";
import { get } from "@/lib/db/client";

export const dynamic = "force-dynamic";

/**
 * The screening rule the scoring engine actually applies: the approved policy row when one
 * exists, the catalogue default otherwise. Reading it here means the screening screen shows
 * the real threshold without every role needing the policies module, and without a second
 * request that could 403 for a role that only owns the screening screen.
 */
function effectiveQualifyingRule(): QualifyingRule {
  const row = get<{ value: string }>("SELECT value FROM policies WHERE code = ?", "POL-SCREEN-QUALIFY");
  if (!row) return DEFAULT_QUALIFYING_RULE;
  try {
    const stored = JSON.parse(row.value) as Partial<QualifyingRule> & { qualifyingScore?: number };
    // An earlier revision stored the cut-off as absolute marks; the framework is out of 100.
    const qualifyingPercent = stored.qualifyingPercent ?? stored.qualifyingScore;
    return {
      ...DEFAULT_QUALIFYING_RULE,
      ...stored,
      ...(qualifyingPercent !== undefined ? { qualifyingPercent } : {}),
    };
  } catch {
    return DEFAULT_QUALIFYING_RULE;
  }
}

/**
 * Process and configuration metadata. The UI reads this so the journey maps, badges and
 * policy screens are generated from the same definitions the server enforces.
 */
export async function GET() {
  try {
    return ok({
      entities: ENTITIES,
      statuses: STATUS_REGISTRIES,
      journeys: JOURNEYS,
      stages: ALL_STAGES,
      departments: DEPARTMENTS,
      modules: MODULES,
      roles: ROLES,
      fieldRestrictions: FIELD_RESTRICTIONS,
      screening: {
        criteria: SCREENING_CRITERIA,
        max: SCREENING_MAX,
        defaultRule: DEFAULT_QUALIFYING_RULE,
        effectiveRule: effectiveQualifyingRule(),
      },
      policies: POLICY_DEFINITIONS,
      feeSchedules: UPFRONT_FEE_SCHEDULE,
      documentPurposes: DOCUMENT_PURPOSES,
      stageMap: Object.fromEntries(Object.entries(STAGE_MAP).map(([k, v]) => [k, v.label])),
    });
  } catch (error) {
    return fail(error);
  }
}
