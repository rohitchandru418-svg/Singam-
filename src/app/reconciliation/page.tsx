"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import { PageIntro, Card, InfoNote, Money, StatusBadge } from "@/components/ui";
import { useEffect, useMemo, useState } from "react";
import { apiList } from "@/lib/client/api";

/**
 * Finance reconciliation.
 *
 * The startup account is shown on one page: upfront charges, success fees, verified receipts,
 * TDS entries and credit notes. Reconciliation closes only when the account balances and every
 * Form 16A certificate is in (doc 05 §7, §8).
 */
export default function ReconciliationPage() {
  const [upfront, setUpfront] = useState<Record<string, unknown>[]>([]);
  const [success, setSuccess] = useState<Record<string, unknown>[]>([]);
  const [tds, setTds] = useState<Record<string, unknown>[]>([]);
  const [credits, setCredits] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("upfront_fees", { limit: 200 }).then((r) => setUpfront(r.items)).catch(() => setUpfront([]));
    apiList("success_fees", { limit: 200 }).then((r) => setSuccess(r.items)).catch(() => setSuccess([]));
    apiList("tds_entries", { limit: 200 }).then((r) => setTds(r.items)).catch(() => setTds([]));
    apiList("credit_notes", { limit: 200 }).then((r) => setCredits(r.items)).catch(() => setCredits([]));
  }, []);

  const accounts = useMemo(() => {
    const ids = new Set<string>();
    for (const rows of [upfront, success, tds, credits]) {
      for (const r of rows) if (r.startup_id) ids.add(String(r.startup_id));
    }
    return [...ids].map((startupId) => {
      const label =
        String(upfront.find((r) => r.startup_id === startupId)?.startup_id_label ??
          success.find((r) => r.startup_id === startupId)?.startup_id_label ??
          tds.find((r) => r.startup_id === startupId)?.startup_id_label ??
          credits.find((r) => r.startup_id === startupId)?.startup_id_label ??
          startupId);
      const upfrontCharged = upfront.filter((r) => r.startup_id === startupId).reduce((s, r) => s + Number(r.fee_amount ?? 0), 0);
      const upfrontPaid = upfront.filter((r) => r.startup_id === startupId).reduce((s, r) => s + Number(r.paid_amount ?? 0), 0);
      const successDue = success.filter((r) => r.startup_id === startupId).reduce((s, r) => s + Number(r.fee_due ?? 0), 0);
      const successCollected = success.filter((r) => r.startup_id === startupId).reduce((s, r) => s + Number(r.collected_amount ?? 0), 0);
      const creditTotal = credits.filter((r) => r.startup_id === startupId && String(r.status) === "issued").reduce((s, r) => s + Number(r.amount ?? 0), 0);
      const pendingTds = tds.filter((r) => r.startup_id === startupId && String(r.status) === "pending").length;
      const balance = upfrontCharged + successDue - upfrontPaid - successCollected - creditTotal;
      return { startupId, label, upfrontCharged, upfrontPaid, successDue, successCollected, creditTotal, pendingTds, balance, canClose: balance === 0 && pendingTds === 0 };
    });
  }, [upfront, success, tds, credits]);

  return (
    <div className="space-y-4">
      <PageIntro summary="One ledger per startup: upfront charges, success fees, verified receipts, TDS entries and credit notes; the account closes only when it balances and the Form 16A certificates are in.">
        Reconciliation closes when the startup account balances <em>and</em> the TDS certificates are in. Sending an
        invoice is not closure. A reversal that follows an invoice raises a credit note rather than editing history.
      </PageIntro>

      <InfoNote tone="warning">
        The five fee measures stay separate: forecast fee, fee due, invoiced, collected and outstanding. TDS is recorded
        on collection; the Form 16A certificate is tracked until it arrives.
      </InfoNote>

      <ModuleActions
        actions={["finance.tds_record", "finance.form16a_receive", "finance.reconciliation_check"]}
        label="Reconciliation actions"
        notes={{
          "finance.reconciliation_check": "Reports whether the account balances and whether every TDS certificate is in.",
          "finance.tds_record": "Records tax deducted at source; the certificate stays pending until it arrives.",
        }}
      />

      <Card title="Startup accounts" subtitle="Charges less verified receipts and applied credits" padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-hair bg-surface text-left text-[11px] uppercase tracking-wide text-faint">
                <th className="px-3 py-2">Startup</th>
                <th className="px-3 py-2 text-right">Upfront charged</th>
                <th className="px-3 py-2 text-right">Upfront paid</th>
                <th className="px-3 py-2 text-right">Success fee due</th>
                <th className="px-3 py-2 text-right">Success fee collected</th>
                <th className="px-3 py-2 text-right">Credit notes</th>
                <th className="px-3 py-2 text-right">Balance</th>
                <th className="px-3 py-2">TDS certificates</th>
                <th className="px-3 py-2">Reconciliation</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.startupId} className="border-b border-hair last:border-0">
                  <td className="px-3 py-2">
                    <RefCell entity="startups" id={a.startupId} label={a.label} />
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums"><Money paise={a.upfrontCharged} compact /></td>
                  <td className="px-3 py-2 text-right tabular-nums"><Money paise={a.upfrontPaid} compact /></td>
                  <td className="px-3 py-2 text-right tabular-nums"><Money paise={a.successDue} compact /></td>
                  <td className="px-3 py-2 text-right tabular-nums"><Money paise={a.successCollected} compact /></td>
                  <td className="px-3 py-2 text-right tabular-nums"><Money paise={a.creditTotal} compact /></td>
                  <td className="px-3 py-2 text-right tabular-nums"><Money paise={a.balance} compact /></td>
                  <td className="px-3 py-2">
                    {a.pendingTds ? <StatusBadge registry="tds" value="pending" /> : <StatusBadge registry="tds" value="received" />}
                  </td>
                  <td className="px-3 py-2">
                    {a.canClose ? <StatusBadge registry="approval" value="approved" /> : <StatusBadge registry="approval" value="pending" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <EntityBrowser
        entity="tds_entries"
        module="success_fees"
        title="TDS entries and Form 16A"
        description="Tax deducted at source on each receipt, and whether the certificate has arrived."
        searchPlaceholder="Search invoice or certificate reference"
        columns={[
          { key: "id", label: "TDS entry", render: (r) => <RefCell entity="tds_entries" id={r.id} label={r.id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "invoice_ref", label: "Invoice" },
          { key: "invoice_type", label: "Type" },
          { key: "tds_amount", label: "TDS", align: "right", render: (r) => <Money paise={r.tds_amount} compact /> },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="tds" value={r.status} /> },
          { key: "certificate_ref", label: "Certificate" },
          { key: "received_on", label: "Received" },
        ]}
      />

      <EntityBrowser
        entity="credit_notes"
        module="success_fees"
        title="Credit notes"
        description="Raised when a reversal follows an already-issued invoice."
        searchPlaceholder="Search invoice, reversal or reason"
        columns={[
          { key: "id", label: "Credit note", render: (r) => <RefCell entity="credit_notes" id={r.id} label={r.id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "invoice_ref", label: "Invoice" },
          { key: "reversal_ref", label: "Reversal" },
          { key: "amount", label: "Amount", align: "right", render: (r) => <Money paise={r.amount} compact /> },
          { key: "reason", label: "Reason" },
          { key: "status", label: "Status" },
          { key: "issued_on", label: "Issued" },
        ]}
      />
    </div>
  );
}
