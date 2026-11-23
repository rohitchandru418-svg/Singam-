"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { apiDashboard, type DashboardResponse } from "@/lib/client/api";
import { useSession } from "@/components/SessionProvider";
import {
  Accordion,
  Badge,
  Card,
  DateText,
  EmptyState,
  InfoNote,
  Money,
  PageHeader,
  ProgressBar,
  Stat,
  ToneDot,
} from "@/components/ui";
import { StartupBoard } from "@/components/StartupBoard";
import { StartupPortal } from "@/components/founder/StartupPortal";
import { InvestorPortal } from "@/components/InvestorPortal";
import { openSimulation } from "@/components/SimulationDock";
import { DEPARTMENT_MAP } from "@/lib/domain/departments";
import { recordHref } from "@/lib/client/recordLinks";
import { Icon } from "@/components/icons";
import type { Tone } from "@/lib/domain/statuses";

const SEVERITY_TONE: Record<string, Tone> = {
  critical: "danger",
  high: "warning",
  medium: "info",
  low: "neutral",
};

export default function ManagementDashboard() {
  const { actorKind } = useSession();
  // A founder gets the startup side, an investor the investor side; the internal console is
  // only for staff.
  if (actorKind === "founder") return <StartupPortal />;
  if (actorKind === "investor") return <InvestorPortal />;
  return <InternalDashboard />;
}

function InternalDashboard() {
  const { session, seasonId, season } = useSession();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!seasonId) return;
    setError(null);
    apiDashboard()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load dashboard"));
  }, [seasonId]);

  if (error) {
    return (
      <div className="p-1">
        <InfoNote tone="danger">{error}</InfoNote>
      </div>
    );
  }

  if (!data) return <DashboardSkeleton />;

  const k = data.kpis;
  const critical = k.exceptions.filter((e) => e.severity === "critical" || e.severity === "high");
  const grouped = k.exceptions.reduce((s, e) => s + (e.count - 1), 0);
  const openStages = k.stageBacklog.reduce((s, b) => s + b.count, 0);
  const totalOverdue = k.overdueByDepartment.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Management dashboard"
        description="Every startup's progress, pending actions, investor commitments, funds deployed, fees collected and outstanding balances. Selection, shoot completion, investment commitment, deployment and fee collection are tracked separately, never merged."
        icon={<Icon name="home" className="h-[19px] w-[19px]" />}
        actions={
          <>
            {season ? (
              <Badge tone="info">
                {season.name} · {season.status === "live" ? "live" : "closed"}
              </Badge>
            ) : null}
            <button
              type="button"
              onClick={() => openSimulation()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-2.5 py-[7px] text-[13px] font-medium text-white transition hover:bg-brand-dark"
            >
              <Icon name="play" className="h-[14px] w-[14px]" />
              Run the season live
            </button>
            <Link
              href="/journeys"
              className="inline-flex items-center gap-1.5 rounded-lg border border-hair-strong bg-canvas px-2.5 py-[7px] text-[13px] font-medium text-ink transition hover:bg-hover"
            >
              <Icon name="map" className="h-[14px] w-[14px] text-faint" />
              Journey maps
            </Link>
            <Link
              href="/my-work"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-2.5 py-[7px] text-[13px] font-medium text-white transition hover:bg-black"
            >
              <Icon name="check-square" className="h-[14px] w-[14px]" />
              My work
            </Link>
          </>
        }
      />

      {/* What needs you today -------------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Card
          title={
            <span className="flex items-center gap-2">
              <ToneDot tone={critical.length > 0 ? "danger" : "success"} />
              Needs attention today
            </span>
          }
          subtitle={
            (critical.length > 0
              ? `${critical.length} urgent of ${k.exceptions.length} item${k.exceptions.length === 1 ? "" : "s"}`
              : `${k.exceptions.length} item${k.exceptions.length === 1 ? "" : "s"}`) +
            (grouped > 0 ? ` (${grouped} repeat${grouped === 1 ? "" : "s"} grouped)` : "") +
            ` · ${totalOverdue} overdue action${totalOverdue === 1 ? "" : "s"} across departments`
          }
          padded={false}
          actions={
            <Link href="/tasks" className="text-[12.5px] font-medium text-brand-ink hover:underline">
              Open task register
            </Link>
          }
        >
          {k.exceptions.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Nothing needs attention" hint="Escalations, overdue fees and failed syncs appear here." />
            </div>
          ) : (
            <>
              <ul className="max-h-[19rem] divide-y divide-hair overflow-y-auto">
                {k.exceptions.slice(0, 8).map((e) => {
                  const href = recordHref(e.entityType, e.entityId);
                  const tone = SEVERITY_TONE[e.severity] ?? "info";
                  const row = (
                    <div className="flex items-start gap-3 px-4 py-2.5 transition group-hover:bg-surface">
                      <span className="mt-[6px]">
                        <ToneDot tone={tone} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] font-medium leading-snug text-ink">
                          <span>{e.title}</span>
                          {e.count > 1 ? (
                            <Badge tone={tone}>{e.count}×</Badge>
                          ) : null}
                          {e.ageDays > 0 ? (
                            <span className="text-[11px] font-normal text-faint">open {e.ageDays}d</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{e.detail}</p>
                      </div>
                      <span className="shrink-0 pt-0.5 text-[11px] text-faint">
                        {DEPARTMENT_MAP[e.department]?.short ?? e.department}
                      </span>
                    </div>
                  );
                  return (
                    <li key={`${e.entityType}-${e.entityId}-${e.title}`}>
                      {href ? (
                        <Link href={href} className="group block" title={`Open ${e.entityLabel}`}>
                          {row}
                        </Link>
                      ) : (
                        <div className="group">{row}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
              {k.exceptions.length > 8 ? (
                <div className="border-t border-hair px-4 py-2 text-[12px] text-ink-soft">
                  Showing the 8 most urgent of {k.exceptions.length}.{" "}
                  <Link href="/tasks" className="font-medium text-brand-ink hover:underline">
                    View all in the task register
                  </Link>
                  .
                </div>
              ) : null}
            </>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 lg:content-start">
          <Card title="Overdue by department" subtitle="Actions past their due date">
            {k.overdueByDepartment.length === 0 ? (
              <EmptyState title="No overdue actions" />
            ) : (
              <ul className="space-y-2.5">
                {k.overdueByDepartment.map((d) => {
                  const max = Math.max(...k.overdueByDepartment.map((x) => x.count), 1);
                  return (
                    <li key={d.department}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-[12.5px] text-ink-soft">
                          {DEPARTMENT_MAP[d.department]?.label ?? d.department}
                        </span>
                        <span className="ss-num text-[12.5px] font-semibold text-risk">{d.count}</span>
                      </div>
                      <ProgressBar value={(d.count / max) * 100} tone="danger" />
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
          <Card title="Stage-wise backlog" subtitle={`${openStages} open records across ${k.stageBacklog.length} stages`}>
            {k.stageBacklog.length === 0 ? (
              <EmptyState title="No open stages" />
            ) : (
              <ul className="space-y-2">
                {k.stageBacklog.slice(0, 5).map((b) => (
                  <li key={b.stage} className="flex items-center justify-between gap-3 text-[12.5px]">
                    <span className="truncate text-ink-soft">{b.stage}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="ss-num text-ink">{b.count}</span>
                      <span
                        className={`ss-num w-12 text-right text-[11.5px] ${
                          b.oldestDays > 30 ? "font-medium text-risk" : b.oldestDays > 10 ? "text-warn" : "text-faint"
                        }`}
                      >
                        {b.oldestDays}d
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 border-t border-hair pt-2.5">
              <Link href="/tasks" className="text-[12.5px] font-medium text-brand-ink hover:underline">
                See all {k.stageBacklog.length} stages
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* Key numbers ----------------------------------------------------------- */}
      <section>
        <div className="mb-2.5 flex items-center gap-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">Season at a glance</h2>
          <span className="h-px flex-1 bg-hair" aria-hidden />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat
            label="Application to selection"
            value={`${k.applications.conversionPct}%`}
            hint={`${k.applications.proceeded} of ${k.applications.total} proceeded`}
            tone="progress"
            onClick={() => router.push("/applications")}
          />
          <Stat
            label="Open backlog"
            value={openStages}
            hint={`${k.stageBacklog.length} stages · ${totalOverdue} overdue`}
            tone="warning"
            onClick={() => router.push("/tasks")}
          />
          <Stat
            label="Investor conversion"
            value={`${k.matching.coveragePct}%`}
            hint={`${k.matching.advanced} advanced of ${k.investors.total} investors`}
            tone="info"
            onClick={() => router.push("/matching")}
          />
          <Stat
            label="Upfront fees"
            value={<Money paise={k.upfront.collected} compact />}
            hint={
              k.upfront.overdueCount > 0 ? (
                <span className="text-risk">{k.upfront.overdueCount} overdue</span>
              ) : (
                "None overdue"
              )
            }
            tone={k.upfront.overdueCount > 0 ? "danger" : "success"}
            onClick={() => router.push("/upfront-fees")}
          />
          <Stat
            label="Verified deployment"
            value={<Money paise={k.commitments.deployed} compact />}
            hint={<><Money paise={k.commitments.outstanding} compact /> outstanding</>}
            tone="success"
            onClick={() => router.push("/deployment")}
          />
          <Stat
            label="Success fees"
            value={<Money paise={k.successFees.collected} compact />}
            hint={
              k.successFees.overdueCount > 0 ? (
                <span className="text-risk">{k.successFees.overdueCount} overdue</span>
              ) : (
                "None overdue"
              )
            }
            tone={k.successFees.overdueCount > 0 ? "danger" : "success"}
            onClick={() => router.push("/success-fees")}
          />
        </div>
      </section>

      {/* Startup progress board ------------------------------------------------ */}
      <Card
        title="Startup progress board"
        subtitle="One row per startup. Selection, shoot, telecast, commitment, deployment and fee collection are separate columns, never merged."
        padded={false}
      >
        <StartupBoard rows={data.board} onOpen={(row) => router.push(`/records/startups/${row.startup_id}`)} />
      </Card>

      {/* Department detail, collapsed by default --------------------------------- */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">Department detail</h2>
          <span className="h-px flex-1 bg-hair" aria-hidden />
        </div>

        <Accordion title={<span className="text-[13px]">Applications &amp; screening</span>}>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Total applications" value={k.applications.total} />
            <Metric label="Awaiting screening" value={k.applications.submitted} />
            <Metric label="In screening" value={k.applications.inScreening} />
            <Metric label="Proceeded" value={k.applications.proceeded} />
            <Metric label="Rejected" value={k.applications.rejected} />
            <Metric label="Conversion" value={`${k.applications.conversionPct}%`} />
          </div>
          <div className="mt-3">
            <ProgressBar value={k.applications.conversionPct} tone="progress" />
          </div>
        </Accordion>

        <Accordion title={<span className="text-[13px]">Investor engagement &amp; matching</span>}>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Investors on record" value={k.investors.total} />
            <Metric label="Onboarded" value={k.investors.onboarded} />
            <Metric label="Verification pending" value={k.investors.verificationPending} />
            <Metric label="Agreement pending" value={k.investors.agreementPending} />
            <Metric label="Matches advanced" value={k.matching.advanced} />
            <Metric label="Matching coverage" value={`${k.matching.coveragePct}%`} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11.5px] text-faint">Grades:</span>
            {Object.entries(k.investors.gradeMix).map(([grade, count]) => (
              <Badge
                key={grade}
                tone={grade === "l1" ? "success" : grade === "l2" ? "info" : grade === "l3" ? "warning" : "neutral"}
              >
                {grade.toUpperCase()}: {count}
              </Badge>
            ))}
          </div>
        </Accordion>

        <Accordion title={<span className="text-[13px]">Shoot &amp; telecast readiness</span>}>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Paid startups awaiting AV" value={k.shoot.paidAwaitingAv} />
            <Metric label="AV completed" value={k.shoot.avCompleted} />
            <Metric label="Mock readiness approved" value={k.shoot.mockReady} />
            <Metric label="Shoots completed" value={k.shoot.shootCompleted} />
            <Metric label="Episodes awaiting telecast" value={k.shoot.telecastReady} />
            <Metric label="Telecast done" value={k.shoot.telecastDone} />
          </div>
        </Accordion>

        <Accordion title={<span className="text-[13px]">Commitments, deals &amp; finance</span>}>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Committed" value={<Money paise={k.commitments.committed} />} />
            <Metric label="Signed deals" value={k.commitments.signedDeals} />
            <Metric label="Verified deployed" value={<Money paise={k.commitments.deployed} />} />
            <Metric label="Outstanding commitment" value={<Money paise={k.commitments.outstanding} />} />
            <Metric label="Deals at risk" value={k.commitments.atRiskDeals} danger={k.commitments.atRiskDeals > 0} />
            <Metric label="Upfront fees due" value={<Money paise={k.upfront.due} />} />
            <Metric label="Upfront fees collected" value={<Money paise={k.upfront.collected} />} />
            <Metric
              label="Upfront fees overdue"
              value={<Money paise={k.upfront.overdue} />}
              danger={k.upfront.overdue > 0}
            />
            <Metric label="Success fee due" value={<Money paise={k.successFees.due} />} />
            <Metric label="Success fee invoiced" value={<Money paise={k.successFees.invoiced} />} />
            <Metric label="Success fee collected" value={<Money paise={k.successFees.collected} />} />
          </div>
        </Accordion>

        <Accordion title={<span className="text-[13px]">Community &amp; ecosystem</span>}>
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Members" value={k.community.members} />
            <Metric label="Events" value={`${k.community.events} (${k.community.attendance} attended)`} />
            <Metric label="Qualified referrals" value={k.community.qualifiedReferrals} />
            <Metric label="Converted referrals" value={k.community.convertedReferrals} />
            <Metric
              label="Support resolved"
              value={`${k.community.supportResolved} of ${k.community.supportResolved + k.community.supportOpen}`}
            />
            <Metric label="Referral funding outcomes" value={<Money paise={k.community.referralFunding} compact />} />
          </div>
        </Accordion>
      </div>

      {/* Departments ----------------------------------------------------------- */}
      <section>
        <div className="mb-2.5 flex items-center gap-3">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">Departments</h2>
          <span className="h-px flex-1 bg-hair" aria-hidden />
          <span className="text-[12px] text-faint">Every department works from the same startup and investor records.</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {data.departments.map((d) => (
            <div
              key={d.key}
              className="rounded-xl border border-hair bg-canvas p-3.5 shadow-card transition hover:border-hair-strong hover:shadow-raised"
            >
              <p className="text-[13px] font-semibold text-ink">{d.label}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">{d.description}</p>
              <dl className="mt-3 flex items-center gap-3 border-t border-hair pt-2.5 text-[11.5px]">
                <div className="flex items-baseline gap-1">
                  <dt className="text-faint">Open</dt>
                  <dd className="ss-num font-semibold text-ink">{d.metrics.open}</dd>
                </div>
                <div className="flex items-baseline gap-1">
                  <dt className="text-faint">Overdue</dt>
                  <dd className={`ss-num font-semibold ${d.metrics.overdue > 0 ? "text-risk" : "text-ink"}`}>
                    {d.metrics.overdue}
                  </dd>
                </div>
                <div className="flex items-baseline gap-1">
                  <dt className="text-faint">Escalated</dt>
                  <dd className={`ss-num font-semibold ${d.metrics.escalated > 0 ? "text-warn" : "text-ink"}`}>
                    {d.metrics.escalated}
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      {session ? (
        <InfoNote>
          Acting as <strong>{session.actor.name}</strong> (
          {DEPARTMENT_MAP[session.actor.department]?.label ?? session.actor.department}). Switch the acting user in the
          header to see how the screens, exports and documents change with role restrictions.
        </InfoNote>
      ) : null}

      <p className="text-[11.5px] text-faint">
        Figures refresh from the live records on every load. <DateText value={new Date().toISOString()} />.
      </p>
    </div>
  );
}

function Metric({ label, value, danger }: { label: string; value: React.ReactNode; danger?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-hair/70 pb-1.5">
      <span className="text-[12px] text-faint">{label}</span>
      <span className={`ss-num text-[13px] font-medium ${danger ? "text-risk" : "text-ink"}`}>{value}</span>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className="space-y-2">
        <div className="ss-shimmer h-6 w-56 rounded" />
        <div className="ss-shimmer h-3.5 w-[36rem] max-w-full rounded" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="ss-shimmer h-64 rounded-xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div className="ss-shimmer h-[7.5rem] rounded-xl" />
          <div className="ss-shimmer h-[7.5rem] rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ss-shimmer h-[5.5rem] rounded-xl" />
        ))}
      </div>
      <div className="ss-shimmer h-[22rem] rounded-xl" />
    </div>
  );
}
