"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, Money, StatusBadge, Tabs } from "@/components/ui";
import { useState } from "react";

const WORKFLOW = [
  "Deal confirmation",
  "Communication thread (48 hours)",
  "Term sheet",
  "Due diligence",
  "Findings resolution",
  "Definitive agreements",
  "Pre-funding conditions",
  "Fund transfer",
  "Receipt verification",
  "Allotment and post-funding obligations",
];

export default function DealsPage() {
  const [tab, setTab] = useState("deals");

  return (
    <div className="space-y-4">
      <PageIntro summary="One funding-round record with separate investor allocations and tranches, and a 48-hour communication thread.">
        One funding-round record holds separate investor allocations and tranches. The IR SOP requires a communication
        thread within <strong>48 hours</strong> of the investor discussion or the show, and that becomes a tracked task.
        Each deal has one accountable closure owner, expected dates for every milestone, open documents and conditions, a
        blocker with a responsible person, and a reason for any revised or withdrawn commitment.
      </PageIntro>

      <ModuleActions
        actions={["deal.open", "deal.advance", "deal.document", "tranche.schedule", "tranche.report", "tranche.confirm_receipt", "tranche.verify", "tranche.reverse"]}
        label="Deal actions"
        notes={{
          "deal.open": "Opening a deal records the communication thread as a tracked task and names the closure owner.",
          "deal.document":
            "The signing event and purpose decide when a document is required. The title is descriptive only and never drives the workflow.",
          "tranche.reverse": "Returned funds are recorded as a reversal linked to the original tranche rather than edited away.",
        }}
      />

      <Card title="Closure workflow">
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {WORKFLOW.map((step, i) => (
            <li key={step} className="flex gap-2 rounded-lg border border-hair px-3 py-2 text-xs text-ink-soft">
              <span className="font-semibold text-faint">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </Card>

      <Tabs
        tabs={[
          { key: "deals", label: "Deals" },
          { key: "rounds", label: "Funding rounds" },
          { key: "documents", label: "Deal documents" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "deals" ? (
        <EntityBrowser
          entity="deals"
          module="deals"
          title="Deals"
          description="Committed amount and agreed terms, expected dates, open documents and conditions, blocker, next action and any withdrawal or failed-deal reason."
          searchPlaceholder="Search terms, valuation, blocker, open conditions or next action"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "deal_confirmed", label: "Deal confirmed" },
                { value: "communication_thread", label: "Communication thread" },
                { value: "term_sheet", label: "Term sheet" },
                { value: "due_diligence", label: "Due diligence" },
                { value: "findings_resolution", label: "Findings resolution" },
                { value: "definitive_agreements", label: "Definitive agreements" },
                { value: "pre_funding_conditions", label: "Pre-funding conditions" },
                { value: "fund_transfer", label: "Fund transfer" },
                { value: "receipt_verification", label: "Receipt verification" },
                { value: "allotment", label: "Allotment" },
                { value: "closed", label: "Closed" },
                { value: "withdrawn", label: "Withdrawn" },
                { value: "failed", label: "Failed" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "Deal", render: (r) => <RefCell entity="deals" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="deal" value={r.status} /> },
            { key: "committed_amount", label: "Committed", align: "right", render: (r) => <Money paise={r.committed_amount} compact /> },
            { key: "valuation", label: "Valuation" },
            { key: "closure_owner_id", label: "Closure owner", render: (r) => <RefCell entity="users" id={r.closure_owner_id} label={r.closure_owner_id_label} /> },
            { key: "responsible_id", label: "Responsible", render: (r) => <RefCell entity="users" id={r.responsible_id} label={r.responsible_id_label} /> },
            { key: "communication_thread_opened_at", label: "Thread opened" },
            {
              key: "communication_thread_due",
              label: "48-hour deadline",
              render: (r) => (r.communication_thread_due ? <Badge tone="warning">Tracked task</Badge> : <span className="text-faint">-</span>),
            },
            { key: "open_documents", label: "Open documents" },
            { key: "open_conditions", label: "Open conditions" },
            { key: "blocker", label: "Blocker" },
            { key: "next_action", label: "Next action" },
            { key: "withdrawal_reason", label: "Withdrawal or failure reason" },
          ]}
        />
      ) : null}

      {tab === "rounds" ? (
        <EntityBrowser
          entity="funding_rounds"
          module="deals"
          title="Funding rounds"
          description="One round per startup, holding separate investor allocations and their tranches."
          columns={[
            { key: "id", label: "Round", render: (r) => <RefCell entity="funding_rounds" id={r.id} label={r.id_label} /> },
            { key: "name", label: "Name" },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "target_amount", label: "Target", align: "right", render: (r) => <Money paise={r.target_amount} compact /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="deal" value={r.status} /> },
            { key: "closure_owner_id", label: "Closure owner", render: (r) => <RefCell entity="users" id={r.closure_owner_id} label={r.closure_owner_id_label} /> },
            { key: "expected_close_on", label: "Expected close" },
          ]}
        />
      ) : null}

      {tab === "documents" ? (
        <EntityBrowser
          entity="deal_documents"
          module="deals"
          title="Deal documents"
          description="Each document is stored with its purpose, version, signing event and signer."
          searchPlaceholder="Search document type, signer or notes"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "requested", label: "Requested" },
                { value: "received", label: "Received" },
                { value: "signed", label: "Signed" },
                { value: "verified", label: "Verified" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "Document", render: (r) => <RefCell entity="deal_documents" id={r.id} label={r.id_label} /> },
            { key: "deal_id", label: "Deal", render: (r) => <RefCell entity="deals" id={r.deal_id} label={r.deal_id_label} /> },
            { key: "purpose", label: "Purpose" },
            { key: "document_type", label: "Title" },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="document" value={r.status} /> },
            { key: "version", label: "Version", align: "right" },
            { key: "signer", label: "Signer" },
            { key: "received_on", label: "Received" },
            { key: "signed_on", label: "Signed" },
            { key: "notes", label: "Notes" },
          ]}
        />
      ) : null}

      <Card title="Deal document trail" subtitle="Version history is preserved for every purpose" padded={false}>
        <MiniTable
          entity="deal_documents"
          columns={["id", "deal_id", "purpose", "status", "version", "signed_on"]}
          renderers={{ status: (r) => <StatusBadge registry="document" value={r.status} /> }}
        />
      </Card>
    </div>
  );
}
