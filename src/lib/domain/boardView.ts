/**
 * Startup progress board view model.
 *
 * The board answers two questions per startup: how far along is it, and what needs
 * attention? Selection, shoot completion, investment commitment, deployment and fee
 * collection are separate facts, so the board shows a milestone track for progress plus
 * the approval gate currently in flight. No status is ever folded into another, and a
 * status that has not been recorded reads as "not started" rather than as a blank.
 *
 * Pure functions, no I/O.
 */

import type { BoardRow } from "@/lib/client/api";
import type { Tone } from "./statuses";

export type StageState = "done" | "current" | "pending";

export interface Milestone {
  key: string;
  label: string;
  state: StageState;
}

/** Production is complete on either a clean or an exception shoot; both are done. */
const SHOT_DONE = new Set(["completed", "exceptions"]);
/**
 * An episode has aired once the telecast is at or past `telecast`; `feedback_pending` and
 * `completed` still mean it went out. `promo_pending`/`promo_done` mean the promotions run
 * *before* the air date, so they are not aired. An episode record that is itself
 * `telecast`/`promoted`/`closed` counts too, so a row whose telecast record lags is not
 * reported as never aired.
 */
const TELECAST_DONE = new Set(["telecast", "feedback_pending", "completed"]);
const EPISODE_AIRED = new Set(["telecast", "promoted", "closed"]);
const UPFRONT_SETTLED = new Set(["paid", "waived", "refunded"]);
const SUCCESS_SETTLED = new Set(["collected", "waived"]);
const UPFRONT_BILLED = new Set(["invoiced", "part_paid", "extension_approved", "disputed", "overdue"]);
const SUCCESS_BILLED = new Set(["calculation_triggered", "under_review", "invoiced", "part_collected", "disputed", "overdue"]);

const MILESTONE_DEFS: { key: string; label: string }[] = [
  { key: "selected", label: "Selected" },
  { key: "shot", label: "Shot" },
  { key: "telecast", label: "Telecast" },
  { key: "committed", label: "Committed" },
  { key: "deployed", label: "Deployed" },
  { key: "fees", label: "Fees" },
];

/** True when every billed fee has been collected, waived or refunded. */
export function feesSettled(row: BoardRow): boolean {
  const billed = row.upfront_fee_amount > 0 || row.success_fee_invoiced > 0;
  const upfrontOk = row.upfront_fee_amount === 0 || UPFRONT_SETTLED.has(row.upfront_fee_status ?? "");
  const successOk = row.success_fee_invoiced === 0 || SUCCESS_SETTLED.has(row.success_fee_status ?? "");
  return billed && upfrontOk && successOk;
}

/**
 * The six milestones the brief asks to track separately. The first unfinished one is the
 * milestone in flight; everything before it is done and everything after is pending.
 */
export function boardMilestones(row: BoardRow): Milestone[] {
  const aired =
    Boolean(row.telecast_status && TELECAST_DONE.has(row.telecast_status)) ||
    Boolean(row.episode_status && EPISODE_AIRED.has(row.episode_status));
  const flags = [
    row.committee_outcome === "proceed",
    Boolean(row.shoot_status && SHOT_DONE.has(row.shoot_status)),
    aired,
    row.committed_amount > 0,
    row.deployed_amount > 0,
    feesSettled(row),
  ];
  const firstOpen = flags.indexOf(false);
  return MILESTONE_DEFS.map((def, i) => ({
    ...def,
    state: flags[i] ? "done" : i === firstOpen ? "current" : "pending",
  }));
}

export function milestonesDone(row: BoardRow): number {
  return boardMilestones(row).filter((m) => m.state === "done").length;
}

/**
 * How far the shoot has progressed, as one number for sorting the Production column. Ordering:
 * not in production (0), AV (1), mock (2), main shoot (3), aired (4).
 */
export function productionStage(row: BoardRow): number {
  if (row.telecast_status && TELECAST_DONE.has(row.telecast_status)) return 4;
  if (row.shoot_status && SHOT_DONE.has(row.shoot_status)) return 3;
  if (row.mock_status && row.mock_status !== "not_started") return 2;
  if (row.av_status && row.av_status !== "not_started") return 1;
  return 0;
}

/** A label for the milestone in flight, or null once the startup has cleared them all. */
export function currentMilestone(row: BoardRow): Milestone | null {
  return boardMilestones(row).find((m) => m.state === "current") ?? null;
}

export interface Gate {
  key: string;
  label: string;
  registry: string;
  value: string | null;
  settled: boolean;
}

interface GateDef {
  key: string;
  label: string;
  registry: string;
  column: keyof BoardRow;
  /** Values that mean this gate no longer needs anyone's attention. */
  settled: string[];
  /** Values that end the pre-shoot journey: the startup is out, so no later gate applies. */
  terminal?: string[];
  /** Values that put the whole journey on hold: the record waits here, not further on. */
  hold?: string[];
}

const GATE_DEFS: GateDef[] = [
  { key: "application", label: "Application", registry: "application", column: "application_status", settled: ["proceeded", "rejected", "withdrawn"], terminal: ["rejected", "withdrawn"] },
  { key: "screening", label: "Screening", registry: "screening_outcome", column: "screening_outcome", settled: ["proceed", "reject"], terminal: ["reject"] },
  { key: "analyst", label: "Analyst", registry: "analyst_recommendation", column: "analyst_recommendation", settled: ["proceed", "conditional", "reject"], terminal: ["reject"], hold: ["hold"] },
  { key: "mou", label: "MoU", registry: "mou", column: "mou_status", settled: ["signed", "discontinued"], terminal: ["discontinued"] },
  { key: "irr", label: "IRR", registry: "irr", column: "irr_status", settled: ["shared_with_ir"] },
  { key: "committee", label: "Committee", registry: "committee_outcome", column: "committee_outcome", settled: ["proceed", "rejected"], terminal: ["rejected"], hold: ["on_hold"] },
];

export function boardGates(row: BoardRow): Gate[] {
  return GATE_DEFS.map((def) => {
    const value = (row[def.column] as string | null) ?? null;
    return {
      key: def.key,
      label: def.label,
      registry: def.registry,
      value,
      settled: value !== null && def.settled.includes(value),
    };
  });
}

export function gatesCleared(row: BoardRow): number {
  return boardGates(row).filter((g) => g.settled).length;
}

/**
 * The gate a team is working on.
 *
 * A rejection or withdrawal anywhere ends the journey: the pointer stays on that gate rather
 * than stepping past it onto a later stage the startup will never reach (a rejected screening
 * used to read "Analyst"). A gate on hold (an analyst "hold", a committee "on hold") is where
 * the record waits. Otherwise the pointer is the gate after the furthest one already settled,
 * so it can never move backwards: a startup whose MoU is signed, IRR shared and committee
 * decided reads "Committee", not "Analyst".
 */
export function currentGate(row: BoardRow): Gate {
  const gates = boardGates(row);
  const terminal = gates.find((g) => {
    const def = GATE_DEFS.find((d) => d.key === g.key);
    return g.value !== null && Boolean(def?.terminal?.includes(g.value));
  });
  if (terminal) return terminal;
  const held = gates.find((g) => {
    const def = GATE_DEFS.find((d) => d.key === g.key);
    return g.value !== null && Boolean(def?.hold?.includes(g.value));
  });
  if (held) return held;
  const lastSettled = gates.reduce((idx, g, i) => (g.settled ? i : idx), -1);
  return gates[lastSettled + 1] ?? gates[gates.length - 1];
}

export interface BoardAlert {
  key: string;
  label: string;
  tone: Tone;
}

/** Exceptions worth a manager's eye: overdue money, a deal that stalled, overdue tasks. */
export function boardAlerts(row: BoardRow): BoardAlert[] {
  const alerts: BoardAlert[] = [];
  const upfrontStatus = row.upfront_fee_status ?? "";
  if (upfrontStatus === "overdue") alerts.push({ key: "upfront_overdue", label: "Upfront fee overdue", tone: "danger" });
  else if (row.upfront_fee_outstanding > 0 && UPFRONT_BILLED.has(upfrontStatus))
    alerts.push({ key: "upfront_due", label: "Upfront fee pending", tone: "warning" });

  const successStatus = row.success_fee_status ?? "";
  if (successStatus === "overdue") alerts.push({ key: "success_overdue", label: "Success fee overdue", tone: "danger" });
  else if (row.success_fee_outstanding > 0 && SUCCESS_BILLED.has(successStatus))
    alerts.push({ key: "success_due", label: "Success fee pending", tone: "warning" });

  if (row.deal_status === "failed") alerts.push({ key: "deal_failed", label: "Deal failed", tone: "danger" });
  else if (row.deal_status === "withdrawn") alerts.push({ key: "deal_withdrawn", label: "Deal withdrawn", tone: "neutral" });

  if (row.overdue_tasks > 0)
    alerts.push({ key: "tasks", label: `${row.overdue_tasks} overdue task${row.overdue_tasks > 1 ? "s" : ""}`, tone: "danger" });

  return alerts;
}

export function needsAttention(row: BoardRow): boolean {
  return boardAlerts(row).length > 0;
}

export type SortKey = "startup" | "journey" | "production" | "investment" | "finance" | "attention";

/**
 * Sort weight for a column. Attention sorts by severity first so the worst rows rise to the
 * top, then by how many things are late. Production sorts by how far the shoot has got, so the
 * Production header sorts production rather than repeating the Selection order.
 */
export function boardSortValue(row: BoardRow, key: SortKey): number | string {
  switch (key) {
    case "startup":
      return row.startup.toLowerCase();
    case "journey":
      return milestonesDone(row);
    case "production":
      return productionStage(row);
    case "investment":
      return row.deployed_amount;
    case "finance":
      return row.upfront_fee_outstanding + row.success_fee_outstanding;
    case "attention": {
      const alerts = boardAlerts(row);
      const worst = alerts.some((a) => a.tone === "danger") ? 2 : alerts.length > 0 ? 1 : 0;
      return worst * 1_000_000 + row.overdue_tasks * 1_000 + row.open_tasks;
    }
  }
}

export function compareBoardRows(a: BoardRow, b: BoardRow, key: SortKey): number {
  const left = boardSortValue(a, key);
  const right = boardSortValue(b, key);
  if (typeof left === "string" || typeof right === "string") return String(left).localeCompare(String(right));
  return left - right;
}
