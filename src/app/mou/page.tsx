"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, StatusBadge } from "@/components/ui";

export default function MouPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Sharing starts the clock: Legal AMA on day four, signing by day seven, and a recorded response if it is unsigned.">
        The documented timing runs as automated tasks: sharing the MoU starts the review clock, the Legal AMA falls on the
        fourth working day and the signing deadline on the seventh. An unsigned MoU needs a Proceed, Negotiate or
        Discontinue response; negotiation escalates to Management, and discontinuation keeps the founder&apos;s email and
        the reason on the record.
      </PageIntro>

      <ModuleActions
        actions={["mou.share", "mou.record_ama", "mou.respond"]}
        label="MoU actions"
        notes={{
          "mou.share": "Deadlines are computed against the working-day calendar, so holidays and non-working days are respected.",
        }}
      />

      <EntityBrowser
        entity="mous"
        module="mou"
        title="Startup MoUs"
        description="Signed version, commercial schedule, approved exceptions and signature dates are stored."
        searchPlaceholder="Search commercial schedule, exceptions or founder email"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "not_started", label: "Not started" },
              { value: "shared", label: "Shared" },
              { value: "under_review", label: "Under review" },
              { value: "legal_ama_done", label: "Legal AMA done" },
              { value: "signed", label: "Signed" },
              { value: "negotiation", label: "In negotiation" },
              { value: "discontinued", label: "Discontinued" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "MoU", render: (r) => <RefCell entity="mous" id={r.id} label={r.id_label} /> },
          { key: "application_id", label: "Application", render: (r) => <RefCell entity="applications" id={r.application_id} label={r.application_id_label} /> },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="mou" value={r.status} /> },
          { key: "shared_on", label: "Shared" },
          { key: "legal_ama_due", label: "Legal AMA due (working day 4)" },
          { key: "legal_ama_on", label: "AMA held" },
          { key: "signing_deadline", label: "Signing deadline (working day 7)" },
          { key: "signed_on", label: "Signed" },
          { key: "response", label: "Response" },
          {
            key: "escalated_to_management",
            label: "Escalated",
            render: (r) => (r.escalated_to_management ? <span className="text-xs font-medium text-warn">Yes</span> : <span className="text-faint">No</span>),
          },
          { key: "approved_exceptions", label: "Approved exceptions" },
          { key: "discontinued_reason", label: "Discontinuation reason" },
        ]}
      />
    </div>
  );
}
