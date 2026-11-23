"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import { Badge, Card, InfoNote, StatusBadge } from "@/components/ui";

export default function PitchDayPage() {
  return (
    <div className="space-y-4">
      <InfoNote tone="warning">
        A Golden Pass is <strong>initial interest under the application SOP</strong>. It must remain distinct from a written
        investment commitment. The Golden Pass policy requires written evidence and a minimum indicated amount, and it
        records whether the pass counts as a written commitment &mdash; it does not by default.
      </InfoNote>

      <ModuleActions
        actions={["pitchday.record", "pitchday.golden_pass"]}
        label="Pitch Day actions"
        notes={{
          "pitchday.golden_pass":
            "Issuing a Golden Pass records a commitment row flagged as a Golden Pass. It is reported separately from confirmed commitments.",
        }}
      />

      <EntityBrowser
        entity="pitch_days"
        module="pitchday"
        title="Pitch Days"
        description="Startup and investor mapping, IRR and information memorandum distribution, one-to-one outcomes and follow-on interest from HNIs."
        searchPlaceholder="Search episode number, evidence or follow-on interest"
        filters={[
          {
            column: "outcome",
            label: "Outcome",
            options: [
              { value: "scheduled", label: "Scheduled" },
              { value: "one_to_one_held", label: "One-to-one held" },
              { value: "golden_pass_issued", label: "Golden Pass issued" },
              { value: "follow_on", label: "Follow-on interest" },
              { value: "no_interest", label: "No interest" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Pitch Day", render: (r) => <RefCell entity="pitch_days" id={r.id} label={r.id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "episode_no", label: "Episode" },
          { key: "scheduled_at", label: "Date" },
          { key: "outcome", label: "Outcome", render: (r) => <StatusBadge registry="pitch_day_outcome" value={r.outcome} /> },
          {
            key: "irr_distributed",
            label: "IRR",
            render: (r) => (r.irr_distributed ? <Badge tone="success">Distributed</Badge> : <Badge tone="warning">Pending</Badge>),
          },
          {
            key: "information_memorandum_distributed",
            label: "Information memorandum",
            render: (r) => (r.information_memorandum_distributed ? <Badge tone="success">Distributed</Badge> : <Badge tone="warning">Pending</Badge>),
          },
          {
            key: "golden_pass_issuer_investor_id",
            label: "Golden Pass issuer",
            render: (r) => (r.golden_pass_issuer_investor_id ? <RefCell entity="investors" id={r.golden_pass_issuer_investor_id} label={r.golden_pass_issuer_investor_id_label} /> : <span className="text-faint">-</span>),
          },
          { key: "golden_pass_evidence", label: "Evidence" },
          { key: "follow_on_interest", label: "Follow-on interest" },
          { key: "further_discussion_deadline", label: "Further discussion deadline" },
        ]}
      />

      <Card title="One-to-one meeting slots" subtitle="Each slot is its own record, so outcomes do not overwrite each other" padded={false}>
        <MiniTable
          entity="pitch_day_slots"
          columns={["id", "pitch_day_id", "investor_id", "slot_time", "held", "outcome", "notes"]}
          renderers={{
            held: (r) => (r.held ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>),
            outcome: (r) => <StatusBadge registry="pitch_day_outcome" value={r.outcome} />,
          }}
        />
      </Card>
    </div>
  );
}
