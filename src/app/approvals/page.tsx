"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import { PageIntro, Badge, StatusBadge, Money, InfoNote } from "@/components/ui";
import { useEffect, useMemo, useState } from "react";
import { apiList } from "@/lib/client/api";

const APPROVAL_TYPES: { value: string; label: string }[] = [
  { value: "grade", label: "Investor grade" },
  { value: "commitment_change", label: "Revised / withdrawn commitment" },
  { value: "mou_negotiation", label: "MoU negotiation outcome" },
  { value: "irr_final", label: "IRR final approval" },
  { value: "fee_exception", label: "Upfront fee exception or discount" },
  { value: "fee_extension", label: "Fee extension over 7 days" },
  { value: "waiver", label: "Waiver" },
  { value: "refund", label: "Refund" },
  { value: "dispute", label: "Dispute" },
  { value: "mock_readiness", label: "Mock shoot final readiness" },
  { value: "episode_edit", label: "Episode edit" },
  { value: "event_budget", label: "Event budget" },
  { value: "promo_assets", label: "Promo assets" },
  { value: "legal_template", label: "Legal template" },
  { value: "signature_refusal", label: "Shoot-day signature refusal" },
  { value: "season_setup", label: "Season setup" },
];

export default function ApprovalsPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    apiList("approval_requests", { limit: 200 }).then((r) => setRows(r.items)).catch(() => setRows([]));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const { overdue, pending } = useMemo(() => {
    const open = rows.filter((r) => String(r.status) === "pending");
    return {
      pending: open.length,
      overdue: open.filter((r) => String(r.due_on ?? "") !== "" && String(r.due_on) < today).length,
    };
  }, [rows, today]);

  return (
    <div className="space-y-4">
      <PageIntro summary="One inbox for every approval, each with a two-working-day deadline; the decision records which super admin decided and why.">
        Every approval type lands in this one inbox, sorted by due date. Any one super admin can approve and the system
        records which one did, when and why. Only types explicitly marked low-risk may be approved in bulk.
      </PageIntro>

      <InfoNote tone={overdue > 0 ? "danger" : "info"}>
        {pending} pending approval{pending === 1 ? "" : "s"}
        {overdue > 0 ? `, ${overdue} past the two-working-day deadline` : ""}. A reason is mandatory on every decision.
      </InfoNote>

      <ModuleActions
        actions={["approval.raise", "approval.decide", "approval.withdraw"]}
        label="Approval actions"
        notes={{
          "approval.decide": "Pass approval_ids (a list) for a bulk decision; only low-risk types may be bulk approved.",
          "approval.withdraw": "Withdraw an item you raised that is no longer needed.",
        }}
      />

      <EntityBrowser
        entity="approval_requests"
        module="tasks"
        title="Approvals inbox"
        description="Type, requester, affected record, amount or impact, due date and overdue flag."
        searchPlaceholder="Search title, impact or reason"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "withdrawn", label: "Withdrawn" },
            ],
          },
          { column: "approval_type", label: "Approval type", options: APPROVAL_TYPES },
        ]}
        columns={[
          { key: "id", label: "Approval", render: (r) => <RefCell entity="approval_requests" id={r.id} label={r.id_label} /> },
          { key: "approval_type", label: "Type", render: (r) => <Badge>{APPROVAL_TYPES.find((t) => t.value === r.approval_type)?.label ?? String(r.approval_type)}</Badge> },
          { key: "title", label: "Item" },
          { key: "raised_by_id", label: "Raised by", render: (r) => <RefCell entity="users" id={r.raised_by_id} label={r.raised_by_id_label} /> },
          { key: "record_id", label: "Record", render: (r) => (r.record_entity ? <RefCell entity={String(r.record_entity)} id={r.record_id} label={r.record_id_label} /> : <span className="text-faint">-</span>) },
          { key: "amount", label: "Amount", align: "right", render: (r) => (Number(r.amount ?? 0) ? <Money paise={r.amount} compact /> : <span className="text-faint">-</span>) },
          { key: "impact", label: "Impact" },
          { key: "due_on", label: "Due", render: (r) => {
            const due = String(r.due_on ?? "");
            const isOverdue = String(r.status) === "pending" && due !== "" && due < today;
            return due ? <span className={isOverdue ? "font-medium text-danger" : undefined}>{due}{isOverdue ? " (overdue)" : ""}</span> : <span className="text-faint">-</span>;
          } },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="approval" value={r.status} /> },
          { key: "decided_by_id", label: "Decided by", render: (r) => (r.decided_by_id ? <RefCell entity="users" id={r.decided_by_id} label={r.decided_by_id_label} /> : <span className="text-faint">-</span>) },
          { key: "decided_on", label: "Decided" },
          { key: "reason", label: "Reason" },
        ]}
      />
    </div>
  );
}
