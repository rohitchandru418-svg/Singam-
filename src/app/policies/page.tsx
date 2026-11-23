"use client";

/**
 * Policies and configuration.
 *
 * Every open decision from section 11 of the brief is a policy with a value, an effective
 * date and an approval history. This screen reads them from the database rather than from the
 * static definitions, renders each value as labelled rows instead of raw JSON, and edits them
 * through a form built from the policy's own shape. The revision history keeps the version
 * each change replaced, so an earlier season can still be explained.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { apiList, apiMeta, type ActionResult, type MetaResponse } from "@/lib/client/api";
import {
  Badge,
  Button,
  Card,
  InfoNote,
  PageHeader,
  PageIntro,
  Segmented,
  Select,
  StatusBadge,
  Table,
  Toolbar,
} from "@/components/ui";
import { PolicyEditor } from "@/components/PolicyEditor";
import { Icon } from "@/components/icons";
import { useSession } from "@/components/SessionProvider";
import { POLICY_DEFINITION_MAP, UPFRONT_FEE_SCHEDULE } from "@/lib/domain/policies";
import { describePolicyValue, diffPolicyValues, parsePolicyValue } from "@/lib/domain/policyView";
import { formatINR } from "@/lib/domain/money";
import { humanise } from "@/lib/domain/format";

interface PolicyRow {
  id: string;
  code: string;
  title: string;
  category: string;
  value: unknown;
  status: string;
  effective_from: string;
  approved_by_id?: string;
  approved_by_id_label?: string;
}

interface RevisionRow {
  id: string;
  policy_id: string;
  version: number;
  value: unknown;
  changed_by_id: string;
  changed_on: string;
  reason: string;
}

/** The SOP point each policy closes, kept next to the value it governs. */
const RESOLUTIONS: Record<string, string> = {
  "POL-CLOSE-TIMING": "Closure is allowed after deal confirmation, with telecast tracked independently.",
  "POL-MOU-TIMING": "Pre-shoot and post-shoot documents are named, with their signing points.",
  "POL-GOLDEN-PASS": "Interest is retained separately from a written commitment.",
  "POL-INVESTOR-DOCS": "The mandatory document set is defined per investor category.",
  "POL-SHOOT-SIGNATURES": "The target and the final deadline are recorded separately.",
  "POL-SCREEN-QUALIFY": "Scoring rules are approved before automatic progression is enabled.",
  "POL-UPFRONT-FEE": "Slabs are configured from the approved commercial schedule.",
  "POL-COMMUNITY": "Membership, engagement, referral and support workflows are approved as policies.",
};

const CATEGORY_TONE: Record<string, "info" | "progress" | "success" | "warning" | "danger" | "neutral"> = {
  selection: "progress",
  finance: "success",
  legal: "info",
  investor: "warning",
  community: "neutral",
  operations: "neutral",
};

export default function PoliciesPage() {
  const { session } = useSession();
  const [tab, setTab] = useState("policies");
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [revisions, setRevisions] = useState<RevisionRow[]>([]);
  const [category, setCategory] = useState("");
  const [editing, setEditing] = useState<PolicyRow | null>(null);
  const [notice, setNotice] = useState<ActionResult | null>(null);

  const load = useCallback(() => {
    apiList("policies", { limit: 100, sort: "code", direction: "asc" })
      .then((r) => setPolicies(r.items as unknown as PolicyRow[]))
      .catch(() => setPolicies([]));
    apiList("policy_revisions", { limit: 200, sort: "changed_on", direction: "desc" })
      .then((r) => setRevisions(r.items as unknown as RevisionRow[]))
      .catch(() => setRevisions([]));
  }, []);

  useEffect(() => {
    apiMeta().then(setMeta).catch(() => setMeta(null));
    load();
  }, [load]);

  const visible = useMemo(
    () => policies.filter((p) => (category ? p.category === category : true)),
    [policies, category],
  );

  const revisionsFor = useCallback(
    (policyId: string) =>
      revisions
        .filter((r) => r.policy_id === policyId)
        .sort((a, b) => b.version - a.version),
    [revisions],
  );

  const latestVersionFor = useCallback(
    (policyId: string) => revisionsFor(policyId)[0]?.version ?? 0,
    [revisionsFor],
  );

  if (!meta) {
    return (
      <div className="space-y-4" aria-hidden>
        <div className="ss-shimmer h-7 w-72 rounded" />
        <div className="ss-shimmer h-3.5 w-[34rem] max-w-full rounded" />
        <div className="ss-shimmer h-9 w-80 rounded-lg" />
        <div className="ss-shimmer h-[24rem] rounded-xl" />
      </div>
    );
  }

  const categories = [...new Set(policies.map((p) => p.category))].sort();
  const canRevise = session?.canWrite ?? false;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Policies and configuration"
        description="Every open decision is a configurable policy with an effective date and an approval history, so a future season can change the process without losing the earlier records."
        actions={
          <Link
            href="/journeys"
            className="inline-flex items-center gap-1.5 rounded-lg border border-hair-strong bg-canvas px-3 py-[7px] text-[13px] font-medium text-ink transition hover:bg-hover"
          >
            <Icon name="chevron-right" className="h-[14px] w-[14px]" />
            Journey maps and SOP stages
          </Link>
        }
      />

      <PageIntro summary="Each policy holds a value, an effective date and an approval history. A revision creates a new version and retains the previous one.">
        These are the rules the ERP reads when it decides a qualifying score, an upfront fee, a Golden Pass or a
        mandatory document set. Changing one records who changed it, when it takes effect and why.
      </PageIntro>

      {notice ? (
        <InfoNote tone={notice.ok ? "success" : "danger"}>
          {notice.message}
          <button type="button" onClick={() => setNotice(null)} className="ml-2 underline">
            dismiss
          </button>
        </InfoNote>
      ) : null}

      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "policies", label: "Policies", count: policies.length },
          { value: "fees", label: "Fee schedule" },
          { value: "revisions", label: "Revision history", count: revisions.length },
        ]}
      />

      {tab === "policies" ? (
        <Card
          title="Configured policies"
          subtitle="The value in force, who approved it and when it took effect"
          padded={false}
          actions={
            <div className="flex items-center gap-2">
              <Select
                value={category}
                onChange={setCategory}
                placeholder="All categories"
                options={categories.map((c) => ({ value: c, label: humanise(c) }))}
              />
            </div>
          }
        >
          <div className="divide-y divide-hair">
            {visible.map((policy) => {
              const def = POLICY_DEFINITION_MAP[policy.code];
              const entries = describePolicyValue(parsePolicyValue(policy.value));
              const version = latestVersionFor(policy.id);
              const resolution = RESOLUTIONS[policy.code];
              return (
                <div key={policy.id} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[13.5px] font-semibold text-ink">{policy.title}</p>
                        <Badge tone={CATEGORY_TONE[policy.category] ?? "neutral"}>{humanise(policy.category)}</Badge>
                        <StatusBadge registry="policy" value={policy.status} />
                        {version > 1 ? <Badge tone="neutral">v{version}</Badge> : null}
                      </div>
                      <p className="mt-1 font-mono text-[10.5px] text-faint">{policy.code}</p>
                    </div>
                    {canRevise ? (
                      <Button size="sm" variant="secondary" onClick={() => setEditing(policy)}>
                        Revise
                      </Button>
                    ) : null}
                  </div>

                  {def ? <p className="mt-2 max-w-[80ch] text-[12.5px] leading-snug text-ink-soft">{def.question}</p> : null}
                  {resolution ? (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[12px] leading-snug text-ink-soft">
                      <Icon name="chevron-right" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2} />
                      <span>
                        <span className="font-medium text-ink">ERP treatment:</span> {resolution}
                      </span>
                    </p>
                  ) : null}

                  <dl className="mt-3 grid gap-x-6 gap-y-2 rounded-lg border border-hair bg-surface/60 p-3 sm:grid-cols-2 lg:grid-cols-3">
                    {entries.map((entry) => (
                      <div key={entry.key} className="min-w-0">
                        <dt className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-faint">{entry.label}</dt>
                        <dd
                          className={`mt-0.5 text-[12.5px] leading-snug ${
                            entry.kind === "money" ? "ss-num font-medium text-ink" : "text-ink-soft"
                          }`}
                        >
                          {entry.display}
                        </dd>
                      </div>
                    ))}
                  </dl>

                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-faint">
                    <span>
                      Effective <span className="ss-num">{policy.effective_from}</span>
                    </span>
                    {policy.approved_by_id ? (
                      <span>
                        Approved by <span className="text-ink-soft">{policy.approved_by_id_label ?? policy.approved_by_id}</span>
                      </span>
                    ) : null}
                    {def && !def.requiresApproval ? <span>No approval required</span> : null}
                  </p>
                </div>
              );
            })}
            {visible.length === 0 ? <p className="px-4 py-12 text-center text-[13px] text-faint">No policies in this category.</p> : null}
          </div>
        </Card>
      ) : null}

      {tab === "fees" ? (
        <Card
          title="Turnover-based upfront fee schedule"
          subtitle="Configured from the approved commercial schedule, with version control"
          padded={false}
        >
          <Table
            columns={[
              { key: "schedule", label: "Schedule" },
              { key: "version", label: "Version" },
              { key: "effective_from", label: "Effective from" },
              { key: "slab", label: "Turnover slab" },
              { key: "fee", label: "Fee", align: "right", numeric: true },
            ]}
            rows={Object.entries(UPFRONT_FEE_SCHEDULE).flatMap(([code, schedule]) =>
              schedule.slabs.map((slab, i) => ({
                id: `${code}-${i}`,
                schedule: code,
                version: schedule.version,
                effective_from: schedule.effectiveFrom,
                slab:
                  slab.turnoverMaxPaise === null
                    ? `Above ${formatINR(slab.turnoverMinPaise / 100)}`
                    : slab.turnoverMinPaise === 0
                      ? `Up to ${formatINR(slab.turnoverMaxPaise / 100)}`
                      : `${formatINR(slab.turnoverMinPaise / 100)} to ${formatINR(slab.turnoverMaxPaise / 100)}`,
                fee: formatINR(slab.feePaise / 100),
              })),
            )}
            empty="No fee schedule configured"
          />
          <p className="border-t border-hair px-4 py-3 text-[12px] text-ink-soft">
            The fee is set from turnover for the relevant financial year, and payment is due within the policy&rsquo;s
            window from the announcement of initial investor interest. Whether an upfront fee is adjustable against the
            success fee depends on the signed agreement, not on this schedule.
          </p>
        </Card>
      ) : null}

      {tab === "revisions" ? (
        <Card title="Policy revision history" subtitle="Each revision retains the version it replaced" padded={false}>
          <Toolbar>
            <span className="ss-num text-[12px] text-faint">
              <span className="font-medium text-ink-soft">{revisions.length}</span> revisions across{" "}
              <span className="font-medium text-ink-soft">{new Set(revisions.map((r) => r.policy_id)).size}</span> policies
            </span>
          </Toolbar>
          <div className="divide-y divide-hair">
            {revisions.map((rev) => {
              const policy = policies.find((p) => p.id === rev.policy_id);
              const samePolicy = revisionsFor(rev.policy_id).sort((a, b) => a.version - b.version);
              const previous = samePolicy.find((r) => r.version === rev.version - 1);
              const diff = previous
                ? diffPolicyValues(parsePolicyValue(previous.value), parsePolicyValue(rev.value))
                : [];
              return (
                <div key={rev.id} className="px-4 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">v{rev.version}</Badge>
                    <p className="text-[13px] font-medium text-ink">{policy?.title ?? rev.policy_id}</p>
                    <span className="font-mono text-[10.5px] text-faint">{policy?.code ?? rev.policy_id}</span>
                    <span className="ml-auto text-[11.5px] text-faint">
                      <span className="ss-num">{rev.changed_on}</span> &middot; {rev.changed_by_id}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-snug text-ink-soft">{rev.reason || "No reason recorded"}</p>
                  {diff.length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {diff.map((row) => (
                        <li key={row.key} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
                          <span className="text-faint">{row.label}</span>
                          <span className="text-ink-soft line-through">{row.from}</span>
                          <Icon name="chevron-right" className="h-3 w-3 text-hair-strong" strokeWidth={2} />
                          <span className="font-medium text-ink">{row.to}</span>
                        </li>
                      ))}
                    </ul>
                  ) : rev.version === 1 ? (
                    <p className="mt-1 text-[11.5px] text-faint">Initial approval for the season.</p>
                  ) : null}
                </div>
              );
            })}
            {revisions.length === 0 ? (
              <p className="px-4 py-12 text-center text-[13px] text-faint">No revisions recorded yet.</p>
            ) : null}
          </div>
        </Card>
      ) : null}

      <PolicyEditor
        policy={editing}
        definition={editing ? POLICY_DEFINITION_MAP[editing.code] : undefined}
        open={editing !== null}
        onClose={() => setEditing(null)}
        onDone={(result) => {
          setNotice(result);
          load();
        }}
      />

      <Card title="How a policy change is recorded" subtitle="The trail that lets an earlier season be explained">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "Revise", text: "Management or Administrator submits a new value with a reason." },
            { step: "Version", text: "The current value is copied into the revision history as the previous version." },
            { step: "Effective", text: "The new value takes effect on the chosen date, or today." },
            { step: "Audit", text: "The change, its author and its reason are written to the audit history." },
          ].map((item, i) => (
            <li key={item.step} className="rounded-lg border border-hair p-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white">{i + 1}</span>
              <p className="mt-2 text-[13px] font-medium text-ink">{item.step}</p>
              <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{item.text}</p>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
