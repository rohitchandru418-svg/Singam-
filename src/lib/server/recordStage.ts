import { getOne } from "./repo";
import { buildBoardRow } from "./metrics";
import { today } from "../domain/dates";
import { STATUS_STAGE } from "../domain/stageActions";
import { STAGE_MAP } from "../domain/workflows";

/**
 * The stage a record's startup has actually reached.
 *
 * A startup record carries no status that names its stage: its own status is the profile,
 * and the application, screening, analyst evaluation, MoU, IRR, committee, fee and shoot
 * records hang off the startup rather than the other way round. The workflow panel therefore
 * read "Founder profile — Step 1" on a startup whose shoot was finished and whose capital was
 * deployed.
 *
 * This resolves the startup's real stage from the same signals the Pipeline board uses, so a
 * startup record, its application record and the board cannot disagree. The keys it returns are
 * startup-journey stages only; the content, investment and finance journeys keep their own
 * records (an episode, a deal, a success fee) and are not mixed in here.
 */

/** The keys of the startup journey, so a candidate from another journey is never returned. */
const STARTUP_JOURNEY_KEYS = new Set(
  Object.values(STAGE_MAP)
    .filter((s) => s.journey === "startup")
    .map((s) => s.key),
);

/** Registry + value pairs on a startup's board row, in the order they advance the journey. */
const SIGNALS: { registry: string; field: string }[] = [
  { registry: "application", field: "application_status" },
  { registry: "screening_outcome", field: "screening_outcome" },
  { registry: "analyst_recommendation", field: "analyst_recommendation" },
  { registry: "mou", field: "mou_status" },
  { registry: "irr", field: "irr_status" },
  { registry: "committee_outcome", field: "committee_outcome" },
  { registry: "upfront_fee", field: "upfront_fee_status" },
  { registry: "av_shoot", field: "av_status" },
  { registry: "mock_shoot", field: "mock_status" },
  { registry: "main_shoot", field: "shoot_status" },
];

/**
 * The startup-journey stages a startup's records prove it has reached. The panel takes the
 * furthest of these, so a completed step stops being offered as the next one.
 */
export function startupStageKeys(startupId: string, seasonId?: string): string[] {
  const startup = getOne("startups", startupId);
  if (!startup) return [];
  const row = buildBoardRow(startup, today(), seasonId) as unknown as Record<string, unknown>;
  const keys: string[] = [];
  for (const { registry, field } of SIGNALS) {
    const value = row[field];
    if (value == null) continue;
    // Read the status map directly rather than through `resolveStageKey`: that helper falls back
    // to the entity's default stage, which for a startup is `startup_record`, and that fallback
    // would drag every startup back to "Founder profile".
    const key = STATUS_STAGE[registry]?.[String(value)] ?? null;
    if (key && STARTUP_JOURNEY_KEYS.has(key)) keys.push(key);
  }
  return keys;
}
