"use client";

import { useEffect, useState } from "react";
import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, InfoNote, ProgressBar, StatusBadge, Table } from "@/components/ui";
import { SCREENING_CRITERIA, SCREENING_MAX } from "@/lib/domain/scoring";
import { apiList, apiMeta, type MetaResponse } from "@/lib/client/api";

export default function ScreeningPage() {
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiMeta().then(setMeta).catch(() => setMeta(null));
    apiList("screenings", { limit: 50 }).then((r) => setRows(r.items)).catch(() => setRows([]));
  }, []);

  // The rule the server applies comes back with the meta payload as `effectiveRule` (the
  // approved policy row, or the default), so the screen and the score cannot disagree and no
  // second request is needed.
  const rule = (meta?.screening.effectiveRule ?? meta?.screening.defaultRule) as
    | { qualifyingPercent?: number; nonApplicableTreatment?: string; ideaStageSkipsFinancials?: boolean; autoProgressEnabled?: boolean }
    | undefined;
  const effective = {
    qualifyingPercent: Number(rule?.qualifyingPercent ?? 0),
    nonApplicableTreatment: String(rule?.nonApplicableTreatment ?? "exclude_from_denominator"),
    ideaStageSkipsFinancials: Boolean(rule?.ideaStageSkipsFinancials ?? true),
  };
  // Automatic progression stays off until Management approves the rule; the policy row records it.
  const autoProgressEnabled = Boolean(rule?.autoProgressEnabled);

  return (
    <div className="space-y-4">
      <InfoNote tone="warning">
        The 100-mark framework is fixed. The qualifying score and the treatment of non-applicable criteria are
        <strong> policy decisions recorded with an effective date and approval history</strong>, not hard-coded values.
        Automated progression stays off until Management approves the rule on the Policies screen.
      </InfoNote>

      <ModuleActions
        actions={["screening.score"]}
        label="Screening actions"
        notes={{
          "screening.score":
            "Leave a criterion blank when it does not apply to the stage; the rule below decides how the total is treated.",
        }}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Scoring framework" subtitle={`${SCREENING_MAX} marks in total`} className="lg:col-span-2" padded={false}>
          <Table
            dense
            columns={[
              { key: "label", label: "Criterion" },
              { key: "max", label: "Marks", align: "right" },
              { key: "hint", label: "Notes" },
              {
                key: "weight",
                label: "Weight",
                render: (c) => (
                  <div className="w-32">
                    <ProgressBar value={(Number(c.max) / SCREENING_MAX) * 100} tone="progress" />
                  </div>
                ),
              },
            ]}
            rows={SCREENING_CRITERIA as unknown as Record<string, unknown>[]}
          />
        </Card>

        <Card title="Qualifying rule" subtitle="Approved policy, not a hard-coded threshold">
          {rule ? (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Qualifying score</dt>
                <dd className="text-lg font-semibold">
                  {Math.round((effective.qualifyingPercent / 100) * SCREENING_MAX)} of {SCREENING_MAX}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Qualifying percentage</dt>
                <dd className="text-lg font-semibold">{effective.qualifyingPercent}%</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Treatment of non-applicable criteria</dt>
                <dd className="text-ink">{effective.nonApplicableTreatment.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Idea-stage financials</dt>
                <dd className="text-ink">{effective.ideaStageSkipsFinancials ? "May be skipped" : "Required"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-faint">Automatic progression</dt>
                <dd>{autoProgressEnabled ? <Badge tone="success">Enabled</Badge> : <Badge tone="warning">Disabled pending approval</Badge>}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-faint">Loading policy&hellip;</p>
          )}
          <div className="mt-4">
            <PageIntro summary="The 100-mark framework, with a reviewer, score, comments and evidence for each assessment.">
              Outcomes are Proceed, Information required, Hold and Reject. A reviewer, score, comments and
              supporting evidence are recorded for each assessment.
            </PageIntro>
          </div>
        </Card>
      </div>

      <EntityBrowser
        entity="screenings"
        module="screening"
        title="Internal screening assessments"
        description="Each row is one reviewer's assessment of one application."
        searchPlaceholder="Search comments or evidence"
        filters={[
          {
            column: "outcome",
            label: "Outcome",
            options: [
              { value: "proceed", label: "Proceed" },
              { value: "info_required", label: "Information required" },
              { value: "hold", label: "Hold" },
              { value: "reject", label: "Reject" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Assessment", render: (r) => <RefCell entity="screenings" id={r.id} label={r.id_label} /> },
          { key: "application_id", label: "Application", render: (r) => <RefCell entity="applications" id={r.application_id} label={r.application_id_label} /> },
          { key: "reviewer_id", label: "Reviewer", render: (r) => <RefCell entity="users" id={r.reviewer_id} label={r.reviewer_id_label} /> },
          {
            key: "total",
            label: "Score",
            render: (r) => (
              <span className="font-semibold tabular-nums">
                {String(r.total)}
                <span className="text-faint"> / {SCREENING_MAX}</span>
              </span>
            ),
          },
          { key: "outcome", label: "Outcome", render: (r) => <StatusBadge registry="screening_outcome" value={r.outcome} /> },
          { key: "comments", label: "Comments" },
          { key: "evidence", label: "Evidence" },
          { key: "submitted_at", label: "Submitted" },
        ]}
      />

      {rows.length > 0 ? (
        <Card title="Score breakdown" subtitle="Per-criterion marks recorded so far" padded={false}>
          <Table
            dense
            columns={[
              { key: "id", label: "Assessment" },
              ...SCREENING_CRITERIA.map((c) => ({ key: c.key, label: c.label, align: "right" as const })),
              { key: "total", label: "Total", align: "right" as const },
            ]}
            rows={rows}
          />
        </Card>
      ) : null}
    </div>
  );
}
