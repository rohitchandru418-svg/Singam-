"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, Money, StatusBadge, Tabs } from "@/components/ui";
import { useState } from "react";

export default function CommitmentsPage() {
  const [tab, setTab] = useState("commitments");

  return (
    <div className="space-y-4">
      <PageIntro summary="Pre-shoot panel, written proposed commitment, valuation boundaries and the two-week IRR deadline.">
        Pre-shoot confirmation tracks the episode-wise panel, investor grade and sector fit, the written proposed investment
        commitment, valuation boundaries, production briefing and outstanding issues. The IR SOP requires the IRR at least
        two weeks before the shoot, and the system alerts the team when that deadline is at risk.
      </PageIntro>

      <ModuleActions
        actions={["preshoot.confirm", "commitment.confirm", "commitment.revise", "commitment.withdraw"]}
        label="Commitment actions"
        notes={{
          "commitment.revise":
            "A revision creates a new row that points at the original, so the earlier amount and the reason are both retained.",
        }}
      />

      <Tabs
        tabs={[
          { key: "commitments", label: "Commitments" },
          { key: "preshoot", label: "Pre-shoot confirmations" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "commitments" ? (
        <EntityBrowser
          entity="commitments"
          module="commitments"
          title="Investor commitments"
          description="A Golden Pass, a written proposal, a confirmed commitment, a revised commitment and a withdrawal are five different states."
          searchPlaceholder="Search valuation, terms, evidence or revision reason"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "golden_pass", label: "Golden Pass (initial interest)" },
                { value: "indicative", label: "Indicative" },
                { value: "written_proposed", label: "Written proposal" },
                { value: "confirmed", label: "Confirmed" },
                { value: "shoot_day_confirmed", label: "Shoot-day confirmed" },
                { value: "revised", label: "Revised" },
                { value: "withdrawn", label: "Withdrawn" },
              ],
            },
            {
              column: "is_golden_pass",
              label: "Golden Pass",
              options: [
                { value: "1", label: "Golden Pass only" },
                { value: "0", label: "Exclude Golden Pass" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "Commitment", render: (r) => <RefCell entity="commitments" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="commitment" value={r.status} /> },
            { key: "amount", label: "Amount", align: "right", render: (r) => <Money paise={r.amount} compact /> },
            { key: "valuation", label: "Valuation" },
            { key: "is_golden_pass", label: "Golden Pass", render: (r) => (r.is_golden_pass ? <Badge tone="info">Yes</Badge> : <span className="text-faint">-</span>) },
            { key: "confirmed_on", label: "Confirmed" },
            { key: "revised_from_id", label: "Revised from", render: (r) => <RefCell entity="commitments" id={r.revised_from_id} label={r.revised_from_id_label} /> },
            { key: "revision_reason", label: "Revision or withdrawal reason" },
            { key: "evidence", label: "Evidence" },
          ]}
        />
      ) : null}

      {tab === "preshoot" ? (
        <EntityBrowser
          entity="pre_shoot_confirmations"
          module="commitments"
          title="Pre-shoot confirmations"
          description="Episode-wise panel, written commitment reference, valuation boundaries, production briefing and required documentation."
          searchPlaceholder="Search panel, valuation boundaries, issues or documentation"
          columns={[
            { key: "id", label: "Confirmation", render: (r) => <RefCell entity="pre_shoot_confirmations" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "episode_no", label: "Episode" },
            { key: "shoot_date", label: "Shoot date" },
            { key: "irr_shared_on", label: "IRR shared" },
            { key: "panel_summary", label: "Panel" },
            { key: "written_commitment_ref", label: "Written commitment" },
            { key: "valuation_boundaries", label: "Valuation boundaries" },
            {
              key: "production_briefing_done",
              label: "Production briefing",
              render: (r) => (r.production_briefing_done ? <Badge tone="success">Done</Badge> : <Badge tone="warning">Pending</Badge>),
            },
            { key: "outstanding_issues", label: "Outstanding issues" },
            { key: "required_documentation", label: "Required documentation" },
          ]}
        />
      ) : null}

      <Card title="Commitment trail" subtitle="Revisions and withdrawals keep the original record intact" padded={false}>
        <MiniTable
          entity="commitments"
          columns={["id", "startup_id", "investor_id", "status", "amount", "revised_from_id", "revision_reason"]}
          renderers={{
            status: (r) => <StatusBadge registry="commitment" value={r.status} />,
            amount: (r) => <Money paise={r.amount} compact />,
          }}
        />
      </Card>
    </div>
  );
}
