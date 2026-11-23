"use client";

import { EntityBrowser, RefCell, RecordRef } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, StatusBadge } from "@/components/ui";
import { DEPARTMENT_MAP, DEPARTMENTS } from "@/lib/domain/departments";

export default function HandoversPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Work moves between teams through accepted handovers, not by email; a rejection requires a reason.">
        Work moves between teams through accepted handovers, not by email. A rejected handover requires a reason, so the
        receiving team&apos;s objection is recorded rather than lost.
      </PageIntro>

      <ModuleActions
        actions={["handover.create", "handover.accept"]}
        label="Handover actions"
        notes={{ "handover.accept": "Clearing the accept checkbox records a rejection and requires a reason." }}
      />

      <EntityBrowser
        entity="handovers"
        module="handovers"
        title="Handovers"
        description="Who handed what to whom, when it was accepted or rejected, and why."
        searchPlaceholder="Search summary or rejection reason"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "pending", label: "Pending" },
              { value: "accepted", label: "Accepted" },
              { value: "rejected", label: "Rejected" },
            ],
          },
          {
            column: "to_department",
            label: "Receiving department",
            options: DEPARTMENTS.map((d) => ({ value: d.key, label: d.label })),
          },
        ]}
        columns={[
          { key: "id", label: "Handover", render: (r) => <RefCell entity="handovers" id={r.id} label={r.id_label} /> },
          { key: "from_department", label: "From", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.from_department)]?.short ?? String(r.from_department)}</Badge> },
          { key: "to_department", label: "To", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.to_department)]?.short ?? String(r.to_department)}</Badge> },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="handover" value={r.status} /> },
          { key: "entity_type", label: "Record type" },
          { key: "entity_id", label: "Record", render: (r) => <RecordRef type={r.entity_type} id={r.entity_id} /> },
          { key: "summary", label: "Summary" },
          { key: "accepted_on", label: "Accepted" },
          { key: "accepted_by_id", label: "Accepted by", render: (r) => <RefCell entity="users" id={r.accepted_by_id} label={r.accepted_by_id_label} /> },
          { key: "rejected_reason", label: "Rejection reason" },
        ]}
      />
    </div>
  );
}
