"use client";

import { EntityBrowser, LinkCell, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, ProgressBar, StatusBadge } from "@/components/ui";

export default function ApplicationsPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Save-and-resume, completion tracking, duplicate detection and manager assignment; mandatory fields change with stage.">
        Save-and-resume, completion percentage and reminders, duplicate detection, submission acknowledgement,
        relationship-manager assignment and movement into screening only after formal submission. Idea-stage startups
        may skip the financial and traction sections, so the mandatory fields change with the applicant&apos;s stage.
      </PageIntro>
      <ModuleActions
        actions={["application.draft", "application.submit"]}
        notes={{
          "application.submit":
            "Submission checks the required documents for the applicant's stage, links a repeat application to the existing startup record and assigns a relationship manager.",
        }}
        label="Application actions"
      />
      <EntityBrowser
        entity="applications"
        module="applications"
        title="Applications"
        description="Application source, referring partner and campaign are recorded, along with the relationship manager."
        searchPlaceholder="Search by reference number, source, partner or campaign"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "draft", label: "Draft" },
              { value: "submitted", label: "Submitted" },
              { value: "in_screening", label: "In screening" },
              { value: "info_required", label: "Information required" },
              { value: "hold", label: "On hold" },
              { value: "proceeded", label: "Proceeded" },
              { value: "rejected", label: "Rejected" },
              { value: "withdrawn", label: "Withdrawn" },
            ],
          },
          {
            column: "stage_at_application",
            label: "Stage",
            options: [
              { value: "idea", label: "Idea" },
              { value: "pre_revenue", label: "Pre-revenue" },
              { value: "early_revenue", label: "Early revenue" },
              { value: "growth", label: "Growth" },
            ],
          },
        ]}
        columns={[
          { key: "reference_no", label: "Reference", render: (r) => <LinkCell entity="applications" id={r.id} label={String(r.reference_no)} /> },
          { key: "season_id", label: "Season", render: (r) => <Badge>{String(r.season_id_label ?? r.season_id ?? "")}</Badge> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="application" value={r.status} /> },
          { key: "stage_at_application", label: "Stage", render: (r) => <Badge>{String(r.stage_at_application).replace(/_/g, " ")}</Badge> },
          {
            key: "completion_pct",
            label: "Completion",
            render: (r) => (
              <div className="w-24">
                <div className="mb-1 text-[11px] text-faint">{String(r.completion_pct)}%</div>
                <ProgressBar value={Number(r.completion_pct)} tone={Number(r.completion_pct) === 100 ? "success" : "progress"} />
              </div>
            ),
          },
          { key: "source", label: "Source" },
          { key: "referring_partner", label: "Referring partner" },
          { key: "campaign", label: "Campaign" },
          { key: "relationship_manager_id", label: "Relationship manager", render: (r) => <RefCell entity="users" id={r.relationship_manager_id} label={r.relationship_manager_id_label} /> },
          {
            key: "duplicate_of",
            label: "Earlier application",
            render: (r) => <RefCell entity="applications" id={r.duplicate_of} label={r.duplicate_of_label} />,
          },
          { key: "submitted_at", label: "Submitted" },
        ]}
      />
    </div>
  );
}
