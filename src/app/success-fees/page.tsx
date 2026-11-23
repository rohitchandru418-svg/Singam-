"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, InfoNote, Money, Stat, StatusBadge, Tabs } from "@/components/ui";
import { useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

const MEASURES = [
  { key: "forecast_fee", label: "Forecast fee", meaning: "Expected fee on anticipated funding." },
  { key: "fee_due", label: "Fee due", meaning: "Amount determined under the agreement." },
  { key: "invoiced_amount", label: "Invoiced", meaning: "Amount formally billed." },
  { key: "collected_amount", label: "Collected", meaning: "Verified receipts allocated." },
  { key: "outstanding", label: "Outstanding", meaning: "Unsettled invoice balance after approved adjustments." },
];

export default function SuccessFeesPage() {
  const [tab, setTab] = useState("fees");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("success_fees", { limit: 200 })
      .then((r) => setRows(r.items))
      .catch(() => setRows([]));
  }, []);

  const totals = rows.reduce<{ due: number; invoiced: number; collected: number; outstanding: number }>(
    (acc, r) => {
      acc.due += Number(r.fee_due ?? 0);
      acc.invoiced += Number(r.invoiced_amount ?? 0);
      acc.collected += Number(r.collected_amount ?? 0);
      acc.outstanding += Number(r.outstanding ?? 0);
      return acc;
    },
    { due: 0, invoiced: 0, collected: 0, outstanding: 0 },
  );

  return (
    <div className="space-y-4">
      <PageIntro summary="Verified deployment triggers the success fee; Finance is notified automatically with Startup Relationships copied.">
        The applicable success fee is triggered after deployment, under the signed MoU. When deployment is verified, the
        ERP notifies Finance automatically and copies Startup Relationships into the founder coordination task, so the
        trigger never depends on somebody remembering to send an email.
      </PageIntro>

      <InfoNote tone="warning">
        There is no automatic upfront-fee deduction. The agreement must specify whether the upfront fee is adjustable;
        where it is not, the adjustment stays at zero.
      </InfoNote>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Fee due" value={<Money paise={totals.due} compact />} tone="progress" />
        <Stat label="Invoiced" value={<Money paise={totals.invoiced} compact />} tone="info" />
        <Stat label="Collected" value={<Money paise={totals.collected} compact />} tone="success" />
        <Stat label="Outstanding" value={<Money paise={totals.outstanding} compact />} tone={totals.outstanding > 0 ? "warning" : "success"} />
      </div>

      <ModuleActions
        actions={["successfee.calculate", "successfee.invoice", "successfee.collect", "ledger.add"]}
        label="Success fee actions"
        notes={{
          "successfee.invoice":
            "Discounts, waivers, partner settlements, applicable tax and any contractual upfront adjustment are applied here.",
          "successfee.collect": "Collection closure means the account reconciles, not merely that an invoice was sent.",
        }}
      />

      <Card title="The five measures stay separate">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {MEASURES.map((m) => (
            <div key={m.key} className="rounded-lg border border-hair p-3">
              <p className="text-sm font-semibold text-ink">{m.label}</p>
              <p className="mt-1 text-xs text-ink-soft">{m.meaning}</p>
              <p className="mt-2 text-sm tabular-nums text-ink">
                <Money paise={rows.reduce((s, r) => s + Number(r[m.key] ?? 0), 0)} compact />
              </p>
            </div>
          ))}
        </div>
      </Card>

      <Tabs
        tabs={[
          { key: "fees", label: "Success fees" },
          { key: "ledger", label: "Ledger entries" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "fees" ? (
        <EntityBrowser
          entity="success_fees"
          module="success_fees"
          title="Post-funding collections"
          description="Percentage, fixed-fee and slab structures, fee caps, sourcing arrangements, eligible and excluded funding, tranche-wise billing, discounts, waivers, partner settlements, credits and disputes."
          searchPlaceholder="Search agreement reference, invoice number, sourcing arrangement or dispute note"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "not_triggered", label: "Not triggered" },
                { value: "calculation_triggered", label: "Calculation triggered" },
                { value: "under_review", label: "Under review" },
                { value: "invoiced", label: "Invoiced" },
                { value: "part_collected", label: "Part collected" },
                { value: "collected", label: "Collected" },
                { value: "overdue", label: "Overdue" },
                { value: "disputed", label: "Disputed" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "Fee", render: (r) => <RefCell entity="success_fees" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "deal_id", label: "Deal", render: (r) => <RefCell entity="deals" id={r.deal_id} label={r.deal_id_label} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="success_fee" value={r.status} /> },
            { key: "fee_structure", label: "Structure", render: (r) => <Badge>{String(r.fee_structure)}</Badge> },
            { key: "fee_percent", label: "Percent", align: "right", render: (r) => <span>{Number(r.fee_percent ?? 0) / 100}%</span> },
            { key: "fee_cap", label: "Cap", align: "right", render: (r) => <Money paise={r.fee_cap} compact /> },
            { key: "eligible_funding", label: "Eligible funding", align: "right", render: (r) => <Money paise={r.eligible_funding} compact /> },
            { key: "excluded_funding", label: "Excluded funding", align: "right", render: (r) => <Money paise={r.excluded_funding} compact /> },
            { key: "forecast_fee", label: "Forecast", align: "right", render: (r) => <Money paise={r.forecast_fee} compact /> },
            { key: "fee_due", label: "Fee due", align: "right", render: (r) => <Money paise={r.fee_due} compact /> },
            { key: "invoiced_amount", label: "Invoiced", align: "right", render: (r) => <Money paise={r.invoiced_amount} compact /> },
            { key: "collected_amount", label: "Collected", align: "right", render: (r) => <Money paise={r.collected_amount} compact /> },
            { key: "outstanding", label: "Outstanding", align: "right", render: (r) => <Money paise={r.outstanding} compact /> },
            { key: "discount", label: "Discount", align: "right", render: (r) => <Money paise={r.discount} compact /> },
            { key: "waiver_amount", label: "Waiver", align: "right", render: (r) => <Money paise={r.waiver_amount} compact /> },
            { key: "partner_settlement", label: "Partner settlement", align: "right", render: (r) => <Money paise={r.partner_settlement} compact /> },
            {
              key: "upfront_adjustable",
              label: "Upfront adjustable",
              render: (r) => (r.upfront_adjustable ? <Badge tone="info">Per agreement</Badge> : <Badge>Not applicable</Badge>),
            },
            { key: "invoice_no", label: "Invoice" },
            { key: "due_date", label: "Due" },
            { key: "reconciled_on", label: "Reconciled" },
          ]}
        />
      ) : null}

      {tab === "ledger" ? (
        <Card title="Ledger entries" subtitle="A single startup account view across upfront charges, success fees, receipts, tax, withholding, credits and partner settlements" padded={false}>
          <MiniTable
            entity="ledger_entries"
            columns={["id", "startup_id", "entry_type", "reference", "amount", "occurred_on", "memo"]}
            renderers={{ amount: (r) => <Money paise={r.amount} compact /> }}
          />
        </Card>
      ) : null}
    </div>
  );
}
