"use client";

import { EntityBrowser, LinkCell, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Card, InfoNote, Money, Stat, StatusBadge } from "@/components/ui";
import { useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

export default function DeploymentPage() {
  const [tranches, setTranches] = useState<Record<string, unknown>[]>([]);
  const [deals, setDeals] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("tranches", { limit: 200 }).then((r) => setTranches(r.items)).catch(() => setTranches([]));
    apiList("deals", { limit: 200 }).then((r) => setDeals(r.items)).catch(() => setDeals([]));
  }, []);

  const verified = tranches.reduce((s, t) => s + Number(t.verified_amount ?? 0), 0);
  const reported = tranches.reduce((s, t) => s + Number(t.reported_amount ?? 0), 0);
  const committed = deals
    .filter((d) => !["withdrawn", "failed"].includes(String(d.status)))
    .reduce((s, d) => s + Number(d.committed_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageIntro summary="Each tranche is verified independently: scheduled, reported, confirmed, evidenced, verified and remaining.">
        Every tranche is recorded independently: scheduled amount and date, investor-reported transfer, startup-confirmed
        receipt, bank evidence or other approved supporting evidence, the verified amount and date, the verifier and the
        remaining commitment.
      </PageIntro>

      <InfoNote tone="warning">
        The example from the brief: a commitment of Rs 2 crore with Rs 75 lakh verified as received must show
        <strong> Rs 75 lakh deployed and Rs 1.25 crore outstanding</strong>. Reported and verified amounts are never merged.
      </InfoNote>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Committed" value={<Money paise={committed} compact />} tone="progress" />
        <Stat label="Investor-reported" value={<Money paise={reported} compact />} tone="info" hint="Not yet verified" />
        <Stat label="Verified deployed" value={<Money paise={verified} compact />} tone="success" />
        <Stat label="Outstanding commitment" value={<Money paise={Math.max(0, committed - verified)} compact />} tone={committed - verified > 0 ? "warning" : "success"} />
      </div>

      <ModuleActions
        actions={["tranche.schedule", "tranche.report", "tranche.confirm_receipt", "tranche.verify", "tranche.reverse"]}
        label="Deployment actions"
        notes={{
          "tranche.verify": "Verifying a tranche is what triggers the success-fee calculation and notifies Finance.",
        }}
      />

      <EntityBrowser
        entity="tranches"
        module="deployment"
        title="Tranche-wise deployment tracking"
        description="A reversal is linked to the original tranche, so returned funds stay visible instead of disappearing."
        searchPlaceholder="Search evidence or reversal reason"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "scheduled", label: "Scheduled" },
              { value: "reported_by_investor", label: "Reported by investor" },
              { value: "receipt_confirmed", label: "Receipt confirmed" },
              { value: "part_verified", label: "Part verified" },
              { value: "verified", label: "Verified" },
              { value: "reversed", label: "Reversed" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Tranche", render: (r) => <RefCell entity="tranches" id={r.id} label={r.id_label} /> },
          { key: "deal_id", label: "Deal", render: (r) => <RefCell entity="deals" id={r.deal_id} label={r.deal_id_label} /> },
          { key: "seq", label: "#", align: "right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="tranche" value={r.status} /> },
          { key: "scheduled_amount", label: "Scheduled", align: "right", render: (r) => <Money paise={r.scheduled_amount} compact /> },
          { key: "scheduled_on", label: "Scheduled date" },
          { key: "reported_amount", label: "Reported", align: "right", render: (r) => <Money paise={r.reported_amount} compact /> },
          { key: "reported_on", label: "Reported date" },
          { key: "startup_confirmed_on", label: "Startup confirmed" },
          { key: "verified_amount", label: "Verified", align: "right", render: (r) => <Money paise={r.verified_amount} compact /> },
          { key: "verified_on", label: "Verified date" },
          { key: "verifier_id", label: "Verifier", render: (r) => <RefCell entity="users" id={r.verifier_id} label={r.verifier_id_label} /> },
          { key: "evidence", label: "Evidence" },
          { key: "reversal_of_id", label: "Reversal of", render: (r) => (r.reversal_of_id ? <RefCell entity="tranches" id={r.reversal_of_id} label={r.reversal_of_id_label} /> : <span className="text-faint">-</span>) },
          { key: "reversal_reason", label: "Reversal reason" },
        ]}
      />

      <Card title="Remaining commitment by deal" subtitle="Committed amount less the verified amount" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hair bg-surface text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-3 py-2">Deal</th>
                <th className="px-3 py-2">Startup</th>
                <th className="px-3 py-2">Investor</th>
                <th className="px-3 py-2 text-right">Committed</th>
                <th className="px-3 py-2 text-right">Verified</th>
                <th className="px-3 py-2 text-right">Outstanding</th>
                <th className="px-3 py-2">Tranches</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((d) => {
                const dealTranches = tranches.filter((t) => t.deal_id === d.id);
                const dealVerified = dealTranches.reduce((s, t) => s + Number(t.verified_amount ?? 0), 0);
                const dealCommitted = Number(d.committed_amount ?? 0);
                return (
                  <tr key={String(d.id)} className="border-b border-hair last:border-0">
                    <td className="px-3 py-2">
                      <LinkCell entity="deals" id={d.id} label={String(d.id)} />
                    </td>
                    <td className="px-3 py-2">
                      <RefCell entity="startups" id={d.startup_id} label={d.startup_id_label} />
                    </td>
                    <td className="px-3 py-2">
                      <RefCell entity="investors" id={d.investor_id} label={d.investor_id_label} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <Money paise={dealCommitted} compact />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <Money paise={dealVerified} compact />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <Money paise={Math.max(0, dealCommitted - dealVerified)} compact />
                    </td>
                    <td className="px-3 py-2">
                      {dealTranches.map((t) => (
                        <StatusBadge key={String(t.id)} registry="tranche" value={t.status} />
                      ))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
