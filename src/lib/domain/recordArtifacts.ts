/**
 * Stage hints from a record's own child records.
 *
 * An application's status tracks only its screening outcome: it stays `proceeded` while the
 * bootcamp, analyst evaluation, MoU and IRR live as separate child records. Reading the stage
 * from the status alone therefore froze the workflow panel at Prep Bootcamp and kept offering
 * "Invite to Prep Bootcamp" long after the invitation, the evaluation and the MoU were done.
 *
 * These helpers read the child records the detail API already returns and report which stage
 * keys and which completed actions they imply. The panel takes the furthest stage it can see,
 * so a step that has really been recorded stops being offered.
 */

import { resolveStageKey } from "./stageActions";

type Related = Record<string, unknown[]>;

function rows(related: Related | undefined, label: string): Array<Record<string, unknown>> {
  return (related?.[label] ?? []) as Array<Record<string, unknown>>;
}

function stageFor(registry: string, value: unknown): string | null {
  if (value == null) return null;
  return resolveStageKey({ registry, statusValue: value, entity: "applications" });
}

/**
 * The stage keys the record's own child records prove it has reached.
 *
 * Only an application that has already proceeded carries its stage in child records: before
 * that, its own status (in screening, information required, on hold) is the truth and a stray
 * bootcamp row must not advance the panel past a screening that has not passed.
 */
export function artifactStageKeys(entity: string, related: Related | undefined, statusValue?: unknown): string[] {
  if (entity !== "applications" || String(statusValue) !== "proceeded") return [];
  const keys: string[] = [];
  if (rows(related, "Screening").length) keys.push("internal_screening");

  const bootcamp = rows(related, "Bootcamp")[0];
  if (bootcamp) {
    // A bootcamp that has not yet reached "prep_completed" still sits at Prep Bootcamp; the
    // status map decides, so a registered-but-not-prepared founder is not pushed ahead.
    keys.push(stageFor("bootcamp", bootcamp.status) ?? "prep_bootcamp");
  }

  const evaluations = rows(related, "Analyst evaluation");
  const evaluationStage = stageFor("analyst_recommendation", evaluations[0]?.recommendation);
  if (evaluationStage) keys.push(evaluationStage);

  const mou = rows(related, "MoU")[0];
  const mouStage = stageFor("mou", mou?.status);
  if (mouStage) keys.push(mouStage);

  const irr = rows(related, "IRR reports")[0];
  const irrStage = stageFor("irr", irr?.status);
  if (irrStage) keys.push(irrStage);

  return keys;
}

/**
 * Actions the record's child records prove have already been recorded. Each is counted only
 * once the child record has moved past the state that its own action creates — an evaluation
 * row still sitting at "pending" has not been evaluated.
 */
export function artifactDoneActions(entity: string, related: Related | undefined): string[] {
  if (entity !== "applications") return [];
  const done: string[] = [];
  if (rows(related, "Screening").some((s) => s.outcome && s.outcome !== "pending")) done.push("screening.score");

  const bootcamp = rows(related, "Bootcamp")[0];
  if (bootcamp) {
    done.push("bootcamp.invite");
    if (String(bootcamp.status) === "prep_completed") done.push("bootcamp.record");
  }

  if (rows(related, "Analyst evaluation").some((e) => e.recommendation && e.recommendation !== "pending")) {
    done.push("analyst.evaluate");
  }

  const mou = rows(related, "MoU")[0];
  if (mou && String(mou.status) !== "not_started") done.push("mou.share");

  const irr = rows(related, "IRR reports")[0];
  if (irr && String(irr.status) !== "not_requested") done.push("irr.request");

  return done;
}
