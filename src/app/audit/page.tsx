"use client";

import { EntityBrowser, RecordRef } from "@/components/EntityBrowser";
import {
  PageIntro, Badge } from "@/components/ui";

export default function AuditPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Every score, term, amount and approval is audited, with the actor, before and after values, and the reason.">
        Every score, term, amount and approval is audited. The repository writes an audit row whenever a value actually
        changes, recording the actor, the field, the value before, the value after and the reason where one was given.
      </PageIntro>

      <EntityBrowser
        entity="audit_events"
        module="audit"
        title="Audit history"
        description="Actor, action, record, field, value before, value after, reason and time."
        searchPlaceholder="Search actor, action, field, reason or record type"
        filters={[
          {
            column: "action",
            label: "Action",
            options: [
              { value: "create", label: "Create" },
              { value: "update", label: "Update" },
              { value: "delete", label: "Delete" },
            ],
          },
        ]}
        columns={[
          { key: "created_at", label: "When" },
          { key: "actor_name", label: "Actor" },
          { key: "action", label: "Action", render: (r) => <Badge tone={String(r.action) === "delete" ? "danger" : String(r.action) === "create" ? "success" : "info"}>{String(r.action)}</Badge> },
          { key: "entity_type", label: "Record type" },
          { key: "entity_id", label: "Record", render: (r) => <RecordRef type={r.entity_type} id={r.entity_id} /> },
          { key: "field", label: "Field" },
          { key: "before_value", label: "Before" },
          { key: "after_value", label: "After" },
          { key: "reason", label: "Reason" },
        ]}
      />
    </div>
  );
}
