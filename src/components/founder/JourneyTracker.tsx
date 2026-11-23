"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { StartupSideData, FounderStageView } from "@/lib/client/api";

import { Icon } from "../icons";
import { STAGE_TONE } from "./shared";
import { StageDetail } from "./StageDetail";

/**
 * The founder's journey tracker.
 *
 * One continuous vertical timeline of the twenty founder-facing stages, drawn as a real rail:
 * a connected line with a node per stage whose fill, ring and icon show at a glance where the
 * founder is, what is done and what needs them. Selecting a stage opens its detail panel.
 *
 * A slim filter bar (All / Needs you / Done) narrows twenty stages to the ones that matter
 * now; "Jump to current" re-centres the stage the founder is on. There is no summary card:
 * the timeline itself carries the progress, so the founder reads the journey, not a report.
 */

const needsYou = (s: FounderStageView) => s.needsYou || s.status === "action_required";

type Filter = "all" | "needs_you" | "done";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "needs_you", label: "Needs you" },
  { key: "done", label: "Done" },
];

export function JourneyTracker({
  data,
  selected,
  onSelect,
  onAction,
  onGoTab,
}: {
  data: StartupSideData;
  selected: string | null;
  onSelect: (key: string | null) => void;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  onGoTab: (t: "season" | "journey" | "profile" | "documents" | "notices") => void;
}) {
  const stages = data.journey.stages;
  const currentKey = data.journey.currentKey;
  const activeKey = selected ?? currentKey ?? stages[0]?.key ?? null;
  const active = stages.find((s) => s.key === activeKey) ?? null;

  const [filter, setFilter] = useState<Filter>("all");
  const detailRef = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);

  const counts = useMemo(
    () => ({
      all: stages.length,
      needs_you: stages.filter(needsYou).length,
      done: stages.filter((s) => s.status === "completed").length,
    }),
    [stages],
  );

  const visible = useMemo(() => {
    if (filter === "done") return stages.filter((s) => s.status === "completed");
    if (filter === "needs_you") return stages.filter(needsYou);
    return stages;
  }, [stages, filter]);

  // On narrow screens the detail panel sits below the timeline, so a tap on a row would
  // otherwise give no visible feedback. Bring the panel into view when the founder picks one.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!selected) return;
    if (typeof window === "undefined" || !window.matchMedia("(max-width: 1023px)").matches) return;
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selected]);

  const changeFilter = (next: Filter) => {
    setFilter(next);
    const list =
      next === "done" ? stages.filter((s) => s.status === "completed") : next === "needs_you" ? stages.filter(needsYou) : stages;
    const keys = new Set(list.map((s) => s.key));
    if (activeKey && !keys.has(activeKey)) onSelect(list[0]?.key ?? null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-hair bg-surface p-0.5" role="tablist" aria-label="Filter the journey">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => changeFilter(f.key)}
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium transition ${
                  on ? "bg-canvas text-ink shadow-card" : "text-ink-soft hover:text-ink"
                }`}
              >
                {f.label}
                <span className={`ss-num text-[11px] ${on ? "text-ink-soft" : "text-faint"}`}>{counts[f.key]}</span>
              </button>
            );
          })}
        </div>
        {currentKey ? (
          <button
            type="button"
            onClick={() => {
              changeFilter("all");
              onSelect(currentKey);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-hair-strong bg-canvas px-2.5 py-[5px] text-[12.5px] font-medium text-ink transition hover:bg-hover"
          >
            <Icon name="map" className="h-[14px] w-[14px]" /> Jump to current
          </button>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div>
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-hair-strong bg-surface/60 px-4 py-10 text-center text-[12.5px] text-faint">
              {filter === "needs_you"
                ? "Nothing needs you right now. The team will tell you when the next step is yours."
                : "No completed stages yet — they will appear here as you progress."}
            </p>
          ) : (
            <ol className="relative list-none">
              {visible.map((stage, index) => (
                <StageRow
                  key={stage.key}
                  stage={stage}
                  first={index === 0}
                  last={index === visible.length - 1}
                  active={stage.key === activeKey}
                  current={stage.key === currentKey}
                  onSelect={() => onSelect(stage.key)}
                />
              ))}
            </ol>
          )}
        </div>

        <div ref={detailRef} className="lg:sticky lg:top-4 lg:self-start">
          {active ? (
            <StageDetail stage={active} total={stages.length} data={data} onAction={onAction} onGoTab={onGoTab} />
          ) : (
            <div className="rounded-xl border border-dashed border-hair-strong bg-surface/60 px-4 py-12 text-center text-[13px] text-faint">
              Pick a stage to see what it means and what to do next.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Timeline row                                                        */
/* ------------------------------------------------------------------ */

/** The node's look by state: fill, ring, icon. */
function nodeStyle(stage: FounderStageView, current: boolean) {
  if (stage.status === "completed") return { cls: "bg-ok text-white", ring: "ring-ok/20", icon: "check" as const };
  if (stage.status === "not_selected") return { cls: "bg-risk text-white", ring: "ring-risk/20", icon: "x" as const };
  if (stage.status === "action_required" || stage.status === "on_hold") return { cls: "bg-warn text-white", ring: "ring-warn/25", icon: "alert" as const };
  if (current || stage.status === "in_progress") return { cls: "bg-brand text-white", ring: "ring-brand/20", icon: "play" as const };
  return { cls: "bg-canvas text-faint ring-1 ring-hair-strong", ring: "ring-transparent", icon: null };
}

function StageRow({
  stage,
  first,
  last,
  active,
  current,
  onSelect,
}: {
  stage: FounderStageView;
  first: boolean;
  last: boolean;
  active: boolean;
  current: boolean;
  onSelect: () => void;
}) {
  const tone = STAGE_TONE[stage.status];
  const node = nodeStyle(stage, current);
  const flagged = needsYou(stage);

  return (
    <li className="relative flex gap-3">
      {/* the rail */}
      <span className="relative flex w-8 shrink-0 justify-center" aria-hidden>
        <span
          className={`absolute left-1/2 w-[2px] -translate-x-1/2 bg-hair ${first ? "top-1/2" : "top-0"} ${last ? "bottom-1/2" : "bottom-0"}`}
        />
        <span
          className={`relative z-10 mt-3 grid h-7 w-7 place-items-center rounded-full text-[11px] font-semibold shadow-card ring-4 ${node.cls} ${node.ring} ${
            current ? "outline outline-2 outline-offset-2 outline-brand/30" : ""
          }`}
        >
          {node.icon ? (
            <Icon name={node.icon} className="h-[13px] w-[13px]" strokeWidth={2.4} />
          ) : (
            <span className="ss-num">{stage.order + 1}</span>
          )}
        </span>
      </span>

      <button
        type="button"
        onClick={onSelect}
        aria-current={current ? "step" : undefined}
        className={`group my-0.5 min-w-0 flex-1 rounded-xl border px-3 py-2.5 text-left transition ${
          active ? "border-hair-strong bg-canvas shadow-card" : "border-transparent hover:border-hair hover:bg-canvas/70"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-semibold text-ink">{stage.content.title}</span>
          {current ? (
            <span className="shrink-0 rounded-full bg-ink px-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
              Now
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-ink-soft">{stage.content.summary}</span>
        <span className="mt-1.5 flex flex-wrap items-center gap-1">
          <span className={`inline-block rounded-md px-1.5 py-[1px] text-[10.5px] font-medium ${tone.chip}`}>{tone.label}</span>
          {flagged && stage.status !== "action_required" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-warn-soft px-1.5 py-[1px] text-[10.5px] font-medium text-warn">
              <Icon name="alert" className="h-[11px] w-[11px]" /> Needs you
            </span>
          ) : null}
          {stage.content.deadline ? (
            <span className="inline-flex min-w-0 items-center gap-1 rounded-md bg-hover px-1.5 py-[1px] text-[10.5px] font-medium text-ink-soft">
              <Icon name="clock" className="h-[11px] w-[11px] shrink-0" />
              <span className="truncate">{stage.content.deadline}</span>
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
