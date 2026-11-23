"use client";

/**
 * Journey map and SOP stages.
 *
 * Every stage carries the six fields the brief asks for (owner, deadline, required output,
 * evidence, approver, escalation). The page adds what the static definitions cannot show:
 * how much work is sitting at each stage right now and how old the oldest item is, read from
 * the same backlog the dashboard uses, so the two screens cannot disagree.
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiJourneys, apiMeta, type JourneyView, type MetaResponse } from "@/lib/client/api";
import { Badge, Card, PageHeader, PageIntro, Segmented, StatusBadge, Toolbar } from "@/components/ui";
import { Icon } from "@/components/icons";
import { openSimulation } from "@/components/SimulationDock";
import { DEPARTMENT_MAP } from "@/lib/domain/departments";
import { humanise } from "@/lib/domain/format";

function roleLabel(meta: MetaResponse, role: string): string {
  return meta.roles.find((r) => r.key === role)?.label ?? humanise(role);
}

/** Tone for the ageing badge: past a fortnight is a warning, past a month is a risk. */
function ageTone(days: number): "neutral" | "warning" | "danger" {
  if (days >= 30) return "danger";
  if (days >= 14) return "warning";
  return "neutral";
}

export default function JourneysPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [data, setData] = useState<{ season: string; journeys: JourneyView[] } | null>(null);
  const [tab, setTab] = useState("startup");
  const [onlyOpen, setOnlyOpen] = useState("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    apiMeta().then(setMeta).catch(() => setMeta(null));
    apiJourneys()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const active = data?.journeys.find((j) => j.key === tab);

  const stages = useMemo(() => {
    if (!active) return [];
    const q = query.trim().toLowerCase();
    return active.stages
      .filter((s) => (onlyOpen === "open" ? s.openCount > 0 : true))
      .filter((s) =>
        q ? [s.label, s.key, s.requiredOutput, s.evidence, s.escalation ?? ""].some((v) => v.toLowerCase().includes(q)) : true,
      )
      .sort((a, b) => a.order - b.order);
  }, [active, onlyOpen, query]);

  if (!meta || !data) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="ss-shimmer h-7 w-64 rounded" />
        <div className="ss-shimmer h-3.5 w-[34rem] max-w-full rounded" />
        <div className="ss-shimmer h-24 rounded-xl" />
        <div className="ss-shimmer h-[24rem] rounded-xl" />
      </div>
    );
  }

  const totalOpen = data.journeys.reduce((sum, j) => sum + j.openCount, 0);
  const totalStages = data.journeys.reduce((sum, j) => sum + j.stageCount, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Journey maps and SOP stages"
        description="Every stage with a clear owner, deadline, approval, document record and escalation mechanism. The startup and investor journeys run in parallel, and after the shoot the content and investment workstreams continue side by side."
        actions={
          <>
            <button
              type="button"
              onClick={() => openSimulation()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-[7px] text-[13px] font-medium text-white transition hover:bg-brand-dark"
            >
              <Icon name="play" className="h-[14px] w-[14px]" />
              Run the season live
            </button>
            <Link
              href="/policies"
              className="inline-flex items-center gap-1.5 rounded-lg border border-hair-strong bg-canvas px-3 py-[7px] text-[13px] font-medium text-ink transition hover:bg-hover"
            >
              <Icon name="settings" className="h-[14px] w-[14px]" />
              Policies and configuration
            </Link>
          </>
        }
      />

      <PageIntro summary="Two journeys run in parallel, with selection, production, investment, community and finance tracked separately.">
        Each stage shows the work sitting at it right now and the age of the oldest item, counted from the same records
        the dashboard reads. A startup can therefore read as: shoot completed; telecast pending; Rs 75 lakh deployed;
        success fee partly collected.
      </PageIntro>

      {/* Journey overview ---------------------------------------------------- */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.journeys.map((j) => {
          const selected = j.key === tab;
          const dept = DEPARTMENT_MAP[j.department];
          return (
            <button
              key={j.key}
              type="button"
              onClick={() => setTab(j.key)}
              aria-pressed={selected}
              className={`rounded-xl border p-3.5 text-left transition ${
                selected ? "border-brand/50 bg-brand-soft shadow-card" : "border-hair bg-canvas hover:border-hair-strong hover:bg-hover"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink">{j.label}</p>
                {j.openCount > 0 ? <Badge tone={selected ? "info" : "neutral"}>{j.openCount} open</Badge> : <Badge tone="success">clear</Badge>}
              </div>
              <p className="mt-1 text-[11.5px] text-faint">
                {j.stageCount} stages &middot; {dept?.short ?? humanise(j.department)}
              </p>
              <p className="mt-2 line-clamp-2 text-[11.5px] leading-snug text-ink-soft">{j.description}</p>
            </button>
          );
        })}
      </div>

      {active ? (
        <Card
          title={active.label}
          subtitle={active.description}
          actions={<Badge>{DEPARTMENT_MAP[active.department]?.label ?? humanise(active.department)}</Badge>}
          padded={false}
        >
          <Toolbar
            right={
              <>
                <Segmented
                  value={onlyOpen}
                  onChange={setOnlyOpen}
                  options={[
                    { value: "all", label: "All stages" },
                    { value: "open", label: "With open work", count: active.stages.filter((s) => s.openCount > 0).length },
                  ]}
                />
                <div className="relative">
                  <Icon
                    name="search"
                    className="pointer-events-none absolute left-2.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-faint"
                  />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Filter stages"
                    aria-label="Filter stages"
                    className="w-44 rounded-lg border border-hair bg-surface py-1.5 pl-8 pr-2.5 text-[12.5px] text-ink transition placeholder:text-faint focus:border-brand focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              </>
            }
          >
            <span className="ss-num text-[12px] text-faint">
              <span className="font-medium text-ink-soft">{stages.length}</span> of {active.stageCount} stages
            </span>
          </Toolbar>

          {stages.length === 0 ? (
            <p className="px-4 py-12 text-center text-[13px] text-faint">
              {onlyOpen === "open" ? "No stage in this journey has open work." : "No stage matches this filter."}
            </p>
          ) : (
            <ol className="divide-y divide-hair">
              {stages.map((stage, i) => {
                const dept = DEPARTMENT_MAP[stage.department];
                return (
                  <li key={stage.key} className="group px-4 py-3.5 transition hover:bg-surface/60">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                          stage.openCount > 0 ? "bg-brand text-white" : "bg-hover text-faint"
                        }`}
                      >
                        {i + 1}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="text-[13.5px] font-semibold text-ink">{stage.label}</p>
                          <Badge>{dept?.short ?? humanise(stage.department)}</Badge>
                          {stage.openCount > 0 ? (
                            <>
                              <Badge tone="progress">
                                <span className="ss-num">{stage.openCount}</span> open
                              </Badge>
                              {stage.oldestDays > 0 ? (
                                <Badge tone={ageTone(stage.oldestDays)}>
                                  oldest <span className="ss-num">{stage.oldestDays}</span>d
                                </Badge>
                              ) : null}
                            </>
                          ) : (
                            <Badge tone="neutral">no open work</Badge>
                          )}
                          {stage.route ? (
                            <Link
                              href={stage.route}
                              className="ml-auto inline-flex items-center gap-1 text-[12px] font-medium text-brand opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                            >
                              Open module
                              <Icon name="chevron-right" className="h-3.5 w-3.5" strokeWidth={2} />
                            </Link>
                          ) : null}
                        </div>

                        <dl className="mt-2.5 grid gap-x-6 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
                          <Detail label="Owner" value={roleLabel(meta, stage.ownerRole)} />
                          <Detail
                            label="Deadline"
                            value={
                              stage.deadline
                                ? `${stage.deadline.workingDays} working day(s) from ${humanise(stage.deadline.fromEvent)}`
                                : "Not time-bound"
                            }
                          />
                          <Detail label="Approver" value={stage.approverRole ? roleLabel(meta, stage.approverRole) : "Not required"} />
                          <Detail label="Required output" value={stage.requiredOutput} />
                          <Detail label="Evidence" value={stage.evidence} />
                          <Detail
                            label="Documents"
                            value={
                              stage.requiredDocuments?.length ? (
                                <span className="flex flex-wrap gap-1">
                                  {stage.requiredDocuments.map((d) => (
                                    <span key={d} className="rounded bg-hover px-1.5 py-0.5 font-mono text-[10px] text-ink-soft">
                                      {d}
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                "None"
                              )
                            }
                          />
                          {stage.escalation ? <Detail label="Escalation" value={stage.escalation} /> : null}
                          {stage.notes ? <Detail label="Notes" value={stage.notes} /> : null}
                        </dl>

                        {stage.statuses.length > 0 ? (
                          <details className="mt-2.5">
                            <summary className="cursor-pointer text-[11.5px] font-medium text-ink-soft transition hover:text-ink">
                              Lifecycle &middot; <span className="ss-num">{stage.statuses.length}</span> statuses
                              {stage.openStatusLabels.length > 0
                                ? `, ${stage.openStatusLabels.length} counted as open`
                                : ""}
                            </summary>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {stage.statuses.map((s) => (
                                <StatusBadge key={s.value} registry={stage.statusRegistry ?? ""} value={s.value} />
                              ))}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Every task carries the same six fields" subtitle="The invariant that keeps the whole ERP auditable">
          <div className="flex flex-wrap items-center gap-2">
            {["Owner", "Due date", "Required output", "Evidence", "Approver", "Next action"].map((field, i) => (
              <span key={field} className="flex items-center gap-2">
                <span className="rounded-full bg-ink px-3 py-1 text-[12px] font-medium text-white">{field}</span>
                {i < 5 ? <Icon name="chevron-right" className="h-3.5 w-3.5 text-hair-strong" strokeWidth={2} /> : null}
              </span>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-ink-soft">
            <span className="ss-num font-medium text-ink">{totalOpen}</span> records are open across all{" "}
            <span className="ss-num font-medium text-ink">{totalStages}</span> stages in {data.season}. The same counts
            drive the dashboard backlog, so a stage cannot look quiet here and overdue there.
          </p>
        </Card>

        <Card
          title="Statuses tracked separately"
          subtitle="Selection, production, investment, community and finance never collapse into one figure"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { label: "Selection", registry: "committee_outcome" },
              { label: "Production", registry: "main_shoot" },
              { label: "Investment", registry: "commitment" },
              { label: "Deployment", registry: "tranche" },
              { label: "Upfront fee", registry: "upfront_fee" },
              { label: "Success fee", registry: "success_fee" },
            ].map((item) => (
              <div key={item.registry} className="rounded-lg border border-hair p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-faint">{item.label}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Object.values(meta.statuses[item.registry] ?? {}).map((s) => (
                    <StatusBadge key={s.value} registry={item.registry} value={s.value} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
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
