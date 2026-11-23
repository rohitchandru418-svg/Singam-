import { STATUS_REGISTRIES } from "../domain/statuses";
import { MODULE_ROUTE, type ModuleKey } from "../domain/rbac";
import { buildStageBacklog, STAGE_SOURCES } from "./metrics";
import { today } from "../domain/dates";
import { stagesForJourney, JOURNEYS, type StageDefinition } from "../domain/workflows";

/**
 * Journey map with live figures.
 *
 * The SOP stages are static declarations; this module joins each one to the records it
 * governs so the map can show where the season actually stands. The open count, the age of
 * the oldest open record and the set of statuses counted as open all come from the same
 * backlog sources the dashboard uses, so the two screens can never disagree.
 */

export interface JourneyStageView extends StageDefinition {
  /** The screen that opens this stage's module. */
  route: string | null;
  /** Records currently sitting at this stage, when it maps to a status column. */
  openCount: number;
  /** Age in days of the oldest open record at this stage. */
  oldestDays: number;
  /** The statuses this stage treats as open, resolved to their labels. */
  openStatusLabels: string[];
  /** The full lifecycle the stage can move through, when it maps to a status registry. */
  statuses: { value: string; label: string; tone: string; terminal?: boolean }[];
  /** The backlog label the dashboard uses for this stage, when there is one. */
  backlogLabel: string | null;
}

export interface JourneyView {
  key: string;
  label: string;
  description: string;
  department: string;
  stageCount: number;
  openCount: number;
  stages: JourneyStageView[];
}

export interface JourneysResponse {
  season: string;
  journeys: JourneyView[];
}

/** Open statuses per stage key, read from the same backlog sources the dashboard queries. */
const OPEN_STATUSES_BY_STAGE = new Map(
  STAGE_SOURCES.filter((s) => s.stageKey).map((s) => [s.stageKey as string, s.openStatuses]),
);

export function buildJourneys(seasonId?: string): JourneysResponse {
  const backlog = buildStageBacklog(today(), seasonId);
  const byStageKey = new Map(backlog.filter((b) => b.stageKey).map((b) => [b.stageKey as string, b]));

  const journeys: JourneyView[] = JOURNEYS.map((journey) => {
    const stages: JourneyStageView[] = stagesForJourney(journey.key).map((stage) => {
      const backlogRow = byStageKey.get(stage.key);
      const registry = stage.statusRegistry ? STATUS_REGISTRIES[stage.statusRegistry] : undefined;
      const openValues = OPEN_STATUSES_BY_STAGE.get(stage.key) ?? [];
      return {
        ...stage,
        route: stage.module ? MODULE_ROUTE[stage.module as ModuleKey] ?? null : null,
        openCount: backlogRow?.count ?? 0,
        oldestDays: backlogRow?.oldestDays ?? 0,
        openStatusLabels: openValues.map((v) => registry?.[v]?.label ?? v),
        statuses: registry ? Object.values(registry) : [],
        backlogLabel: backlogRow?.stage ?? null,
      };
    });
    return {
      key: journey.key,
      label: journey.label,
      description: journey.description,
      department: journey.department,
      stageCount: stages.length,
      openCount: stages.reduce((sum, s) => sum + s.openCount, 0),
      stages,
    };
  });

  return { season: seasonId ?? "", journeys };
}
