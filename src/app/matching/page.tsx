"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, Money, StatusBadge, Table, Tabs } from "@/components/ui";
import { useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

export default function MatchingPage() {
  const [tab, setTab] = useState("matches");

  return (
    <div className="space-y-4">
      <PageIntro summary="Sector, stage, cheque size, geography, thesis and grade produce recommendations; Investor Relations approves circulation.">
        Matching uses sector, stage, cheque size, geography, thesis, investor grade and available allocation. The system
        <strong> recommends</strong> suitable investors; Investor Relations approves circulation. Each startup&ndash;investor
        pairing keeps its own record, so one startup can have ten conversations progressing differently.
      </PageIntro>

      <ModuleActions
        actions={["match.suggest", "match.approve", "match.share", "match.respond"]}
        label="Matching actions"
        notes={{
          "match.suggest":
            "Every eligible investor is scored. Investors with no available allocation or a sector mismatch are reported as blocked rather than suggested.",
          "match.share": "A suggested match must be approved for circulation before information can be shared.",
        }}
      />

      <Tabs
        tabs={[
          { key: "matches", label: "Startup-investor matches" },
          { key: "meetings", label: "Meetings and minutes" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "matches" ? (
        <EntityBrowser
          entity="matches"
          module="matching"
          title="Startup-investor matches"
          description="Information shared and its version, the date shared, the response, meetings and acknowledged minutes, questions, indicative amount and the next action with its deadline."
          searchPlaceholder="Search information shared, questions, next action or pass reason"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "suggested", label: "Suggested" },
                { value: "approved_for_circulation", label: "Approved for circulation" },
                { value: "shared", label: "Shared" },
                { value: "responded", label: "Responded" },
                { value: "meeting_scheduled", label: "Meeting scheduled" },
                { value: "advanced", label: "Advanced" },
                { value: "passed", label: "Passed" },
                { value: "withdrawn", label: "Withdrawn" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "Match", render: (r) => <RefCell entity="matches" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
            { key: "score", label: "Score", align: "right" },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="match" value={r.status} /> },
            { key: "info_version", label: "Version shared" },
            { key: "shared_on", label: "Shared" },
            { key: "response", label: "Response" },
            { key: "indicative_amount", label: "Indicative amount", align: "right", render: (r) => <Money paise={r.indicative_amount} compact /> },
            { key: "next_action", label: "Next action" },
            { key: "next_action_due", label: "Due" },
            { key: "pass_reason", label: "Pass reason" },
          ]}
        />
      ) : null}

      {tab === "meetings" ? (
        <EntityBrowser
          entity="meetings"
          module="matching"
          title="Meetings and minutes"
          description="Minutes are searchable, and acknowledgement is recorded separately from attendance."
          searchPlaceholder="Search attendees or minutes"
          columns={[
            { key: "id", label: "Meeting", render: (r) => <RefCell entity="meetings" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
            { key: "meeting_type", label: "Type" },
            { key: "scheduled_at", label: "Scheduled" },
            { key: "held_at", label: "Held" },
            { key: "attendees", label: "Attendees" },
            { key: "minutes", label: "Minutes" },
            {
              key: "minutes_acknowledged",
              label: "Minutes acknowledged",
              render: (r) => (r.minutes_acknowledged ? <Badge tone="success">Acknowledged</Badge> : <Badge tone="warning">Pending</Badge>),
            },
          ]}
        />
      ) : null}

      <Card title="Match scores explained" subtitle="The reasons behind each recommendation are stored with the match">
        <MatchReasons />
      </Card>

      <Card title="Meeting minutes search" subtitle="Searchable minutes across every conversation" padded={false}>
        <MiniTable
          entity="meetings"
          columns={["id", "meeting_type", "attendees", "minutes", "minutes_acknowledged"]}
          renderers={{
            minutes_acknowledged: (r) => (r.minutes_acknowledged ? <Badge tone="success">Yes</Badge> : <Badge tone="warning">No</Badge>),
          }}
        />
      </Card>
    </div>
  );
}

function MatchReasons() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("matches", { limit: 20 })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, []);

  return (
    <Table
      dense
      columns={[
        { key: "id", label: "Match" },
        { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
        { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
        { key: "score", label: "Score", align: "right" },
        {
          key: "score_reasons",
          label: "Reasons",
          render: (r) => {
            try {
              const reasons = JSON.parse(String(r.score_reasons)) as { label: string; delta: number }[];
              return (
                <div className="flex flex-wrap gap-1">
                  {reasons.map((reason) => (
                    <Badge key={reason.label} tone={reason.delta > 0 ? "success" : reason.delta < 0 ? "danger" : "neutral"}>
                      {reason.label} {reason.delta > 0 ? `+${reason.delta}` : reason.delta}
                    </Badge>
                  ))}
                </div>
              );
            } catch {
              return <span className="text-faint">-</span>;
            }
          },
        },
      ]}
      rows={rows}
      empty="No matches recorded"
    />
  );
}
