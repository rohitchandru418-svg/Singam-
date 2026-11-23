"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, InfoNote, Money, Stat, StatusBadge, Tabs } from "@/components/ui";
import { useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

const WORKFLOW = [
  "Selection and initial-interest notification recorded",
  "Finance request created",
  "Turnover basis verified",
  "Applicable fee approved",
  "Invoice issued",
  "Founder notified",
  "Payment followed up",
  "Receipt verified",
  "Production clearance updated",
];

export default function UpfrontFeesPage() {
  const [tab, setTab] = useState("workflow");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("upfront_fees", { limit: 200 })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, []);

  const totals = rows.reduce<{ fee: number; paid: number; outstanding: number; overdue: number }>(
    (acc, r) => {
      acc.fee += Number(r.fee_amount ?? 0);
      acc.paid += Number(r.paid_amount ?? 0);
      acc.outstanding += Number(r.outstanding ?? 0);
      if (Number(r.outstanding) > 0 && String(r.status) === "overdue") acc.overdue += 1;
      return acc;
    },
    { fee: 0, paid: 0, outstanding: 0, overdue: 0 },
  );

  return (
    <div className="space-y-4">
      <PageIntro summary="Turnover-based fee with 15 days to pay; production gets an advance notice, the shoot handover follows payment.">
        The upfront fee is determined from turnover for the relevant financial year, and payment is allowed within
        <strong> 15 days from the announcement of initial investor interest</strong>. Production can receive an
        <strong> advance notification</strong> as soon as selection and fee initiation are recorded, but the AV shoot
        handover follows <strong>completed payment</strong>. The two milestones are shown separately.
      </PageIntro>

      <InfoNote tone="warning">
        Sending a payment screenshot does not mark an invoice paid. Finance must verify and allocate the receipt. An
        approved extension preserves the original due date so ageing is not rewritten.
      </InfoNote>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Fee determined" value={<Money paise={totals.fee} compact />} tone="progress" />
        <Stat label="Collected" value={<Money paise={totals.paid} compact />} tone="success" />
        <Stat label="Outstanding" value={<Money paise={totals.outstanding} compact />} tone={totals.outstanding > 0 ? "warning" : "success"} />
        <Stat label="Overdue invoices" value={totals.overdue} tone={totals.overdue > 0 ? "danger" : "success"} />
      </div>

      <ModuleActions
        actions={["upfront.initiate", "upfront.approve", "upfront.invoice", "upfront.record_receipt", "upfront.extension", "upfront.waive", "upfront.dispute", "upfront.refund"]}
        label="Upfront fee actions"
        notes={{
          "upfront.initiate": "The fee workflow starts from a Proceed committee decision and calculates the fee from the turnover basis.",
          "upfront.approve": "Approving the fee requires Management or Administrator.",
          "upfront.record_receipt": "Only verified receipts are allocated against the invoice.",
        }}
      />

      <Tabs
        tabs={[
          { key: "workflow", label: "Workflow and invoices" },
          { key: "ledger", label: "Ledger entries" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "workflow" ? (
        <>
          <Card title="Proposed workflow" subtitle="Joint visibility for Finance and Startup Relationships">
            <ol className="grid gap-2 sm:grid-cols-3">
              {WORKFLOW.map((step, i) => (
                <li key={step} className="flex gap-2 rounded-lg border border-hair px-3 py-2 text-xs text-ink-soft">
                  <span className="font-semibold text-faint">{i + 1}.</span>
                  {step}
                </li>
              ))}
            </ol>
          </Card>

          <EntityBrowser
            entity="upfront_fees"
            module="upfront_fees"
            title="Upfront fee collection"
            description="Turnover evidence, fee schedule and version, invoice, payment reference, outstanding balance and any extension, waiver, refund or credit."
            searchPlaceholder="Search invoice number, payment reference, turnover evidence or financial year"
            filters={[
              {
                column: "status",
                label: "Status",
                options: [
                  { value: "not_initiated", label: "Not initiated" },
                  { value: "under_calculation", label: "Under calculation" },
                  { value: "invoiced", label: "Invoiced" },
                  { value: "part_paid", label: "Part paid" },
                  { value: "paid", label: "Paid" },
                  { value: "overdue", label: "Overdue" },
                  { value: "extension_approved", label: "Extension approved" },
                  { value: "disputed", label: "Disputed" },
                  { value: "waived", label: "Waived" },
                  { value: "refunded", label: "Refunded" },
                ],
              },
            ]}
            columns={[
              { key: "id", label: "Fee", render: (r) => <RefCell entity="upfront_fees" id={r.id} label={r.id_label} /> },
              { key: "season_id", label: "Season", render: (r) => <Badge>{String(r.season_id_label ?? r.season_id ?? "")}</Badge> },
              { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
              { key: "status", label: "Status", render: (r) => <StatusBadge registry="upfront_fee" value={r.status} /> },
              { key: "financial_year", label: "Financial year" },
              { key: "turnover", label: "Turnover", align: "right", render: (r) => <Money paise={r.turnover} compact /> },
              { key: "fee_schedule_code", label: "Schedule" },
              { key: "fee_schedule_version", label: "Version" },
              { key: "fee_amount", label: "Fee determined", align: "right", render: (r) => <Money paise={r.fee_amount} compact /> },
              { key: "approved_exception", label: "Approved exception" },
              { key: "invoice_no", label: "Invoice" },
              { key: "invoice_date", label: "Invoiced" },
              { key: "due_date", label: "Due" },
              {
                key: "original_due_date",
                label: "Original due date",
                render: (r) => (r.original_due_date ? <Badge tone="warning">{String(r.original_due_date)}</Badge> : <span className="text-faint">-</span>),
              },
              { key: "paid_amount", label: "Paid", align: "right", render: (r) => <Money paise={r.paid_amount} compact /> },
              { key: "outstanding", label: "Outstanding", align: "right", render: (r) => <Money paise={r.outstanding} compact /> },
              { key: "payment_reference", label: "Payment reference" },
              { key: "extension_approved", label: "Extension", render: (r) => (r.extension_approved ? <Badge tone="warning">Approved</Badge> : <span className="text-faint">-</span>) },
              { key: "late_payment_reason", label: "Late payment reason" },
              { key: "management_decision", label: "Management decision" },
            ]}
          />
        </>
      ) : null}

      {tab === "ledger" ? (
        <Card title="Ledger entries" subtitle="Charges, receipts, tax, withholding, credits, refunds and partner settlements" padded={false}>
          <MiniTable
            entity="ledger_entries"
            columns={["id", "startup_id", "entry_type", "reference", "amount", "occurred_on", "memo"]}
            renderers={{
              amount: (r) => <Money paise={r.amount} compact />,
            }}
          />
        </Card>
      ) : null}
    </div>
  );
}
