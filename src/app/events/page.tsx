"use client";

import { EntityBrowser, RefCell, LinkCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, Money, StatusBadge } from "@/components/ui";

export default function EventsPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Every event needs a purpose, owner, budget, registrations, attendance, feedback, follow-ups and outcomes.">
        Every event needs a purpose, an owner, a budget, registrations, attendance, feedback, follow-up tasks and outcomes.
        Founder meetups, investor sessions, sector roundtables, partner programmes, mentoring clinics, alumni activities and
        community communications all run through this one register.
      </PageIntro>

      <ModuleActions actions={["event.create", "event.register", "event.complete"]} label="Event actions" />

      <EntityBrowser
        entity="community_events"
        module="events"
        title="Events and engagement"
        description="Purpose, owner, budget, registrations, attendance, feedback, follow-up tasks and outcomes."
        searchPlaceholder="Search name, purpose, follow-up tasks or outcomes"
        filters={[
          {
            column: "event_type",
            label: "Event type",
            options: [
              { value: "Founder meetup", label: "Founder meetup" },
              { value: "Investor session", label: "Investor session" },
              { value: "Sector roundtable", label: "Sector roundtable" },
              { value: "Partner programme", label: "Partner programme" },
              { value: "Mentoring clinic", label: "Mentoring clinic" },
              { value: "Alumni", label: "Alumni activity" },
              { value: "Community communication", label: "Community communication" },
            ],
          },
          {
            column: "status",
            label: "Status",
            options: [
              { value: "planned", label: "Planned" },
              { value: "open", label: "Open for registration" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ]}
        columns={[
          { key: "name", label: "Event", render: (r) => <LinkCell entity="community_events" id={r.id} label={String(r.name)} /> },
          { key: "event_type", label: "Type" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="event" value={r.status} /> },
          { key: "owner_id", label: "Owner", render: (r) => <RefCell entity="users" id={r.owner_id} label={r.owner_id_label} /> },
          { key: "budget", label: "Budget", align: "right", render: (r) => <Money paise={r.budget} compact /> },
          { key: "scheduled_on", label: "Date" },
          { key: "registrations", label: "Registered", align: "right" },
          { key: "attendance", label: "Attended", align: "right" },
          { key: "feedback_score", label: "Feedback", align: "right" },
          { key: "outcomes", label: "Outcomes" },
          { key: "follow_up_tasks", label: "Follow-up tasks" },
        ]}
      />

      <Card title="Registrations and attendance" subtitle="Recalculated from the registration records" padded={false}>
        <MiniTable
          entity="event_registrations"
          columns={["id", "event_id", "member_id", "registered", "attended", "feedback"]}
          renderers={{
            registered: (r) => (r.registered ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>),
            attended: (r) => (r.attended ? <Badge tone="success">Attended</Badge> : <Badge tone="warning">No-show</Badge>),
          }}
        />
      </Card>
    </div>
  );
}
