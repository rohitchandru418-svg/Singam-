"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Card, StatusBadge, Table } from "@/components/ui";
import { useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

const PACK_ITEMS = [
  "Startup evaluation and IRR",
  "Investor feedback",
  "Golden Pass details",
  "Unresolved questions",
  "Proposed investor participation",
  "Production readiness",
  "Commercial status",
];

export default function CommitteePage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="The committee pack is compiled from live records; the decision authorises selection and the upfront fee.">
        The committee pack is compiled from the live records: startup evaluation and IRR, investor feedback, Golden Pass
        details, unresolved questions, proposed investor participation, production readiness and commercial status.
        Outcomes are Proceed, On Hold and Rejected. This is the <strong>authorisation point</strong> for the show-selection
        and upfront-fee workflow.
      </PageIntro>

      <ModuleActions
        actions={["committee.decide"]}
        label="Committee actions"
        notes={{
          "committee.decide":
            "Leave the pack summary blank to compile it from the records. A Proceed outcome is what the upfront fee workflow checks for.",
        }}
      />

      <Card title="Committee pack contents">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {PACK_ITEMS.map((item) => (
            <li key={item} className="rounded-lg border border-hair px-3 py-2 text-sm text-ink-soft">
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <EntityBrowser
        entity="committee_decisions"
        module="committee"
        title="Final Shortlisting Committee decisions"
        description="Conditions, approver, decision date and re-review date are recorded for every decision."
        searchPlaceholder="Search pack summary or conditions"
        filters={[
          {
            column: "outcome",
            label: "Outcome",
            options: [
              { value: "pending", label: "Pending" },
              { value: "proceed", label: "Proceed" },
              { value: "on_hold", label: "On Hold" },
              { value: "rejected", label: "Rejected" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Decision", render: (r) => <RefCell entity="committee_decisions" id={r.id} label={r.id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "outcome", label: "Outcome", render: (r) => <StatusBadge registry="committee_outcome" value={r.outcome} /> },
          { key: "approver_id", label: "Approver", render: (r) => <RefCell entity="users" id={r.approver_id} label={r.approver_id_label} /> },
          { key: "decided_on", label: "Decision date" },
          { key: "re_review_date", label: "Re-review date" },
          { key: "conditions", label: "Conditions" },
          { key: "pack_summary", label: "Pack summary" },
        ]}
      />

      <Card title="Compiled packs" subtitle="Read from the live records, not typed in by hand" padded={false}>
        <CommitteePacks />
      </Card>
    </div>
  );
}

function CommitteePacks() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("committee_decisions", { limit: 20 })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, []);

  return (
    <Table
      dense
      columns={[
        { key: "id", label: "Decision" },
        { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
        { key: "outcome", label: "Outcome", render: (r) => <StatusBadge registry="committee_outcome" value={r.outcome} /> },
        { key: "pack_summary", label: "Pack summary" },
      ]}
      rows={rows}
      empty="No packs compiled yet"
    />
  );
}
