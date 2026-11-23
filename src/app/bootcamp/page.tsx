"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, StatusBadge } from "@/components/ui";

export default function BootcampPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Records whether the founder completed the required preparation, not just whether they attended.">
        The ERP records whether the founder <strong>completed the required preparation</strong>, not simply whether they
        attended an event. Process briefing, founder and investment readiness, the MoU briefing and the upfront fee
        briefing must all be complete before the record counts as ready for analyst evaluation.
      </PageIntro>

      <ModuleActions actions={["bootcamp.invite", "bootcamp.schedule", "bootcamp.record"]} label="Bootcamp actions" />

      <EntityBrowser
        entity="bootcamp_attendance"
        module="bootcamp"
        title="Prep Bootcamp"
        description="Invitations, attendance, session completion, founder questions and actions assigned after the session."
        searchPlaceholder="Search questions or assigned actions"
        canCreate={false}
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "not_invited", label: "Not invited" },
              { value: "invited", label: "Invited" },
              { value: "registered", label: "Registered" },
              { value: "scheduled", label: "Scheduled" },
              { value: "attended", label: "Attended" },
              { value: "not_attended", label: "Did not attend" },
              { value: "prep_completed", label: "Preparation completed" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Record", render: (r) => <RefCell entity="bootcamp_attendance" id={r.id} label={r.id_label} /> },
          { key: "application_id", label: "Application", render: (r) => <RefCell entity="applications" id={r.application_id} label={r.application_id_label} /> },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="bootcamp" value={r.status} /> },
          { key: "invited_on", label: "Invited" },
          { key: "attended_on", label: "Attended" },
          { key: "process_briefing_done", label: "Process", render: (r) => (r.process_briefing_done ? <Badge tone="success">Done</Badge> : <Badge>Pending</Badge>) },
          { key: "readiness_session_done", label: "Readiness", render: (r) => (r.readiness_session_done ? <Badge tone="success">Done</Badge> : <Badge>Pending</Badge>) },
          { key: "mou_briefing_done", label: "MoU briefing", render: (r) => (r.mou_briefing_done ? <Badge tone="success">Done</Badge> : <Badge>Pending</Badge>) },
          { key: "fee_briefing_done", label: "Fee briefing", render: (r) => (r.fee_briefing_done ? <Badge tone="success">Done</Badge> : <Badge>Pending</Badge>) },
          {
            key: "preparation_completed",
            label: "Ready for analyst",
            render: (r) => (r.preparation_completed ? <Badge tone="success">Ready</Badge> : <Badge tone="warning">Not ready</Badge>),
          },
          { key: "actions_assigned", label: "Actions assigned" },
        ]}
      />
    </div>
  );
}
