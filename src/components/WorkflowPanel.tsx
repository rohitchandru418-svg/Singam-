"use client";

/**
 * Workflow panel for a record.
 *
 * The record screen used to open on a wall of fields with no sense of where the record stood
 * in its process or what to do next. This panel answers both: it places the record on its
 * journey with a stage stepper, states the stage's owner, deadline, required output, evidence
 * and approver, and puts the real next-step actions in front of the reader.
 *
 * It reads the same journey definitions the Journey map uses, matching the record's status
 * registry and value to a stage, so the two screens cannot disagree.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiActionCatalog, apiJourneys, type JourneyStageView, type JourneyView } from "@/lib/client/api";
import { Button, InfoNote, ProgressBar, StatusBadge } from "./ui";
import { Icon } from "./icons";
import { humanise } from "@/lib/domain/format";
import { ModuleActions } from "./ModuleActions";
import { ActionForm } from "./ActionForm";
import { useSession } from "./SessionProvider";
import { DEPARTMENTS, type Department } from "@/lib/domain/departments";
import { ROLE_MAP } from "@/lib/domain/rbac";
import { linkTypeForEntity } from "@/lib/client/relations";
import { completedStageActions, resolveStageKey, splitStageActions } from "@/lib/domain/stageActions";

export interface WorkflowContext {
  entity: string;
  /** The status registry the record's status belongs to, when it has one. */
  statusRegistry?: string;
  /** The record's current status value. */
  statusValue?: unknown;
  /** Actions available for the record, already scoped to the entity. */
  actions: string[];
  /** The field the record's actions use to name the subject. */
  subjectId?: string;
  /** The record id. */
  recordId: string;
}

interface Match {
  journey: JourneyView;
  stage: JourneyStageView;
  index: number;
}

function findMatch(journeys: JourneyView[], ctx: WorkflowContext): Match | null {
  if (!ctx.statusRegistry || ctx.statusValue == null) return null;
  const value = String(ctx.statusValue);
  for (const journey of journeys) {
    for (let i = 0; i < journey.stages.length; i += 1) {
      const stage = journey.stages[i];
      if (stage.statusRegistry !== ctx.statusRegistry) continue;
      if (stage.statuses.some((s) => s.value === value)) return { journey, stage, index: i };
    }
  }
  return null;
}

export function WorkflowPanel({
  ctx,
  artifactStageKeys = [],
  artifactDone = [],
  onRefresh,
}: {
  ctx: WorkflowContext;
  /** Stage keys the record's child records prove it has reached. */
  artifactStageKeys?: string[];
  /** Actions the record's child records prove have already been recorded. */
  artifactDone?: string[];
  onRefresh?: () => void;
}) {
  const [journeys, setJourneys] = useState<JourneyView[] | null>(null);

  useEffect(() => {
    apiJourneys()
      .then((r) => setJourneys(r.journeys))
      .catch(() => setJourneys([]));
  }, []);

  const match = useMemo(() => (journeys ? findMatch(journeys, ctx) : null), [journeys, ctx]);
  // The stage the record is at: an explicit status override first, then the journey stage its
  // status maps to, then the entity's usual stage. This is what decides the next-step set.
  const statusStageKey = resolveStageKey({
    registry: ctx.statusRegistry,
    statusValue: ctx.statusValue,
    entity: ctx.entity,
    matchedStageKey: match?.stage.key,
  });
  // The stage the panel shows is the furthest of what the status says and what the record's
  // own child records prove. The status alone under-reports: an application stays `proceeded`
  // through bootcamp, analyst review, MoU and IRR, so the child records carry the real stage.
  const view = useMemo<Match | null>(() => {
    if (!journeys) return match;
    const candidates = [statusStageKey, ...artifactStageKeys].filter((k): k is string => Boolean(k));
    let best: Match | null = null;
    for (const journey of journeys) {
      for (const key of candidates) {
        const index = journey.stages.findIndex((s) => s.key === key);
        if (index >= 0 && (!best || index > best.index)) best = { journey, stage: journey.stages[index], index };
      }
    }
    return best ?? match;
  }, [match, journeys, statusStageKey, artifactStageKeys]);
  const stageKey = view?.stage.key ?? statusStageKey;
  const { primary, others } = useMemo(() => splitStageActions(ctx.actions, stageKey), [ctx.actions, stageKey]);
  const [showAll, setShowAll] = useState(false);

  // Actions the record has already moved past in this journey, plus the ones its child records
  // prove are done. They are shown struck through rather than offered again, so a screening
  // score that has been recorded stops reading as a step still waiting to be run.
  const doneActions = useMemo(() => {
    const byStage = view ? completedStageActions(view.journey.stages.map((s) => s.key), view.index, ctx.actions) : [];
    return Array.from(new Set([...byStage, ...artifactDone]));
  }, [view, ctx.actions, artifactDone]);

  // The stage that follows the current one, so the panel can say "then: X, owned by Y". When
  // the owner changes, the reader is told to hand the record over — the SOP's accepted
  // handover between departments.
  const next = useMemo(() => {
    if (!view) return null;
    const stages = view.journey.stages;
    const nextStage = stages[view.index + 1];
    return nextStage ?? null;
  }, [view]);
  const nextOwnerDifferent = Boolean(next && next.ownerRole && next.ownerRole !== view?.stage.ownerRole);

  // Whose step is this? The stage's owning role decides whether the reader can act here or
  // must hand the record on. This is what stops a Startup Relationship user hunting for the
  // analyst's login: the panel says "another team's step" and offers the handover instead.
  const { session } = useSession();
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [handoverDone, setHandoverDone] = useState<string | null>(null);
  const [allowed, setAllowed] = useState<Set<string> | null>(null);
  const myRole = session?.actor.role ?? "";
  const ownerRole = view?.stage.ownerRole ?? "";
  const ownerDepartment = (view?.stage.department ?? "") as Department | "";
  const ownerLabel = ownerRole ? ROLE_MAP[ownerRole]?.label ?? humanise(ownerRole) : "";
  const linkType = linkTypeForEntity(ctx.entity);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    apiActionCatalog()
      .then((res) => {
        if (!cancelled) setAllowed(new Set(res.allowed));
      })
      .catch(() => {
        if (!cancelled) setAllowed(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // Can the reader actually run this step? Privileged roles can run anything; everyone else
  // is checked against the action catalogue. Until the catalogue loads we fall back to the
  // stage's nominal owner, so the block does not flash from "theirs" to "yours".
  const isPrivileged = myRole === "admin" || myRole === "management";
  const canRun = isPrivileged || (allowed ? primary.some((a) => allowed.has(a)) : Boolean(ownerRole) && ownerRole === myRole);
  const ownerDiffers = Boolean(ownerRole) && ownerRole !== myRole;

  const hasActions = primary.length > 0 && Boolean(ctx.subjectId);
  const hasOwnActions = canRun && hasActions;
  if (!view && !hasActions) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-hair bg-canvas shadow-card" aria-label="Workflow">
      {view ? (
        <>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-hair bg-surface px-4 py-3">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
              <Icon name="map" className="h-[13px] w-[13px]" />
              {view.journey.label}
            </span>
            <span className="text-[13px] font-semibold text-ink">{view.stage.label}</span>
            <span className="text-[11.5px] text-faint">
              Step <span className="ss-num">{view.index + 1}</span> of{" "}
              <span className="ss-num">{view.journey.stages.length}</span>
            </span>
            <div className="ml-auto flex items-center gap-2">
              {ctx.statusRegistry && ctx.statusValue != null ? (
                <StatusBadge registry={ctx.statusRegistry} value={ctx.statusValue} />
              ) : null}
              {view.stage.route ? (
                <Link
                  href={view.stage.route}
                  className="inline-flex items-center gap-1 rounded-lg border border-hair-strong bg-canvas px-2.5 py-1 text-[12px] font-medium text-ink transition hover:bg-hover"
                >
                  Open module
                  <Icon name="chevron-right" className="h-3.5 w-3.5" strokeWidth={2} />
                </Link>
              ) : null}
            </div>
          </div>

          {/* Progress across the journey. The full stage list used to run off the side of the
              panel; a bar with the previous and next stage named in place of it stays legible
              at any width, and the Journey map is one click away for the whole picture. */}
          <div className="px-4 pt-3">
            <ProgressBar value={((view.index + 1) / view.journey.stages.length) * 100} />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 px-4 pt-2 text-[12px]">
            <span className="flex items-center gap-1 text-faint">
              {view.index > 0 ? (
                <>
                  <Icon name="check" className="h-3 w-3 text-ok" strokeWidth={3} />
                  After <span className="font-medium text-ink-soft">{view.journey.stages[view.index - 1].label}</span>
                </>
              ) : (
                "Start of the journey"
              )}
            </span>
            <span className="text-faint" aria-hidden>
              &middot;
            </span>
            {next ? (
              <span className="text-ink-soft">
                Next: <span className="font-medium text-ink">{next.label}</span>
                {next.ownerRole ? <span className="text-faint"> · {humanise(next.ownerRole)}</span> : null}
                {nextOwnerDifferent ? <span className="text-faint"> — hand this record over when done</span> : null}
                {next.route ? (
                  <Link href={next.route} className="ml-1 font-medium text-brand hover:underline">
                    Open
                  </Link>
                ) : null}
              </span>
            ) : (
              <span className="font-medium text-ok">Final stage of the journey</span>
            )}
            <Link href="/journeys" className="ml-auto text-[11.5px] font-medium text-ink-soft transition hover:text-ink">
              Full journey map
            </Link>
          </div>

          {/* Stage contract */}
          <dl className="grid gap-x-6 gap-y-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-3">
            <Detail label="Owner" value={humanise(view.stage.ownerRole)} />
            <Detail
              label="Deadline"
              value={
                view.stage.deadline
                  ? `${view.stage.deadline.workingDays} working day(s) from ${humanise(view.stage.deadline.fromEvent)}`
                  : "Not time-bound"
              }
            />
            <Detail label="Approver" value={view.stage.approverRole ? humanise(view.stage.approverRole) : "Not required"} />
            <Detail label="Required output" value={view.stage.requiredOutput} />
            <Detail label="Evidence" value={view.stage.evidence} />
            {view.stage.escalation ? <Detail label="Escalation" value={view.stage.escalation} /> : null}
          </dl>
        </>
      ) : null}

      {/* Next step, labelled with whose step it is. When the stage belongs to another team,
          the actions stay visible but greyed with a hand-over, so a Startup Relationship
          reader is never left guessing whether to sign in as the analyst. */}
      {hasActions ? (
        <div className="border-t border-hair bg-surface px-4 py-3">
          {hasOwnActions ? (
            <>
              <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-brand-ink">
                <Icon name="check" className="h-[13px] w-[13px]" strokeWidth={2.5} />
                Your step
              </span>
              <ModuleActions
                actions={primary}
                label={view ? view.stage.label : "Next step"}
                maxVisible={3}
                defaults={{ [ctx.subjectId as string]: ctx.recordId }}
                notes={{ [ctx.subjectId as string]: "This step is already linked to the record you are viewing." }}
                done={doneActions}
                doneNote="Already recorded for this record."
                onDone={() => onRefresh?.()}
              />
            </>
          ) : (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-warn/30 bg-warn/5 px-3.5 py-3">
              <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-warn">
                <Icon name="clock" className="h-[13px] w-[13px]" />
                {ownerDiffers ? "Waiting on another team" : "Not available for your role"}
              </span>
              <span className="text-[12.5px] text-ink-soft">
                {ownerDiffers ? (
                  <>
                    This stage is owned by <strong className="font-semibold text-ink">{ownerLabel || "another team"}</strong>
                    {ownerDepartment ? ` (${DEPARTMENTS.find((d) => d.key === ownerDepartment)?.label ?? humanise(ownerDepartment)})` : ""}
                    {" — "}you do not need to sign in as them.
                  </>
                ) : (
                  <>
                    This step needs the <strong className="font-semibold text-ink">{ownerLabel || "owning"}</strong> role. Ask a{" "}
                    {ownerLabel || "colleague"} or Management to run it.
                  </>
                )}
              </span>
              {ownerDiffers && ownerDepartment && linkType && session?.canWrite ? (
                <span className="ml-auto">
                  <Button size="sm" variant="secondary" onClick={() => setHandoverOpen(true)}>
                    <Icon name="chevron-right" className="h-[13px] w-[13px]" />
                    Hand over to {DEPARTMENTS.find((d) => d.key === ownerDepartment)?.label ?? humanise(ownerDepartment)}
                  </Button>
                </span>
              ) : null}
            </div>
          )}

          {handoverDone ? <InfoNote tone="success">{handoverDone}</InfoNote> : null}

          {others.length > 0 && hasOwnActions ? (
            <div className="mt-2">
              {showAll ? (
                <div className="mt-2">
                  <ModuleActions
                    actions={others}
                    label="Other actions for this record"
                    maxVisible={6}
                    onDone={() => onRefresh?.()}
                    defaults={{ [ctx.subjectId as string]: ctx.recordId }}
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAll(true)}
                  className="text-[12px] font-medium text-ink-soft transition hover:text-ink"
                >
                  Show all {primary.length + others.length} actions for this record
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {handoverOpen && ownerDepartment && linkType ? (
        <ActionForm
          action="handover.create"
          title={`Hand this record to ${DEPARTMENTS.find((d) => d.key === ownerDepartment)?.label ?? humanise(ownerDepartment)}`}
          subtitle={`Raises an accepted handover so the owning team picks the record up. The next stage — ${view?.stage.label ?? "the next step"} — is theirs.`}
          defaults={{
            from_department: session?.actor.department,
            to_department: ownerDepartment,
            entity_type: linkType,
            entity_id: ctx.recordId,
            summary: `Handover of ${ctx.entity} ${ctx.recordId} at stage ${view?.stage.label ?? ""}`,
          }}
          users={session?.users}
          actingUserId={session?.actor.id}
          open
          onClose={() => setHandoverOpen(false)}
          onDone={(res) => {
            setHandoverOpen(false);
            setHandoverDone(res.message ?? "Handover raised");
            onRefresh?.();
          }}
        />
      ) : null}
    </section>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-faint">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] leading-snug text-ink-soft">{value}</dd>
    </div>
  );
}
