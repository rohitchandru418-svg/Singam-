"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import { PageIntro, Badge, InfoNote } from "@/components/ui";

/**
 * Legal template manager.
 *
 * A template version is immutable once approved; a new version supersedes the live one. Only
 * one version per type is active for the season.
 */
export default function LegalTemplatesPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Versioned templates with effective dates and approval status; a live version is never edited, only superseded.">
        Maintain the founder MoU, participation agreement, NDA, Investment Commitment Letter, Startup Deal Acceptance
        Letter and term sheet. A new version supersedes the old one; approval is recorded against the super admin.
      </PageIntro>

      <InfoNote tone="info">
        Templates must be approved and active before a season opens. Old versions stay readable so earlier seasons can be
        reconstructed.
      </InfoNote>

      <ModuleActions
        actions={["legal.template_create", "legal.template_approve", "legal.template_activate"]}
        label="Template actions"
        notes={{
          "legal.template_create": "Creating a template of an existing type makes the next version and supersedes the old one.",
          "legal.template_activate": "Only an approved version can be made active for the season.",
        }}
      />

      <EntityBrowser
        entity="legal_templates"
        module="legal"
        title="Template manager"
        description="Type, version, effective-from date, approval status and whether the version is active for the season."
        searchPlaceholder="Search template name or summary"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "draft", label: "Draft" },
              { value: "approved", label: "Approved" },
              { value: "active", label: "Active for season" },
              { value: "superseded", label: "Superseded" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Template", render: (r) => <RefCell entity="legal_templates" id={r.id} label={r.id_label} /> },
          { key: "name", label: "Name" },
          { key: "template_type", label: "Type", render: (r) => <Badge>{String(r.template_type).replace(/_/g, " ")}</Badge> },
          { key: "version", label: "Version", align: "right", render: (r) => <span>v{String(r.version)}</span> },
          { key: "effective_from", label: "Effective from" },
          { key: "status", label: "Status" },
          { key: "active_for_season", label: "Active", render: (r) => (Number(r.active_for_season) ? <Badge tone="success">Yes</Badge> : <Badge>No</Badge>) },
          { key: "approved_by_id", label: "Approved by", render: (r) => (r.approved_by_id ? <RefCell entity="users" id={r.approved_by_id} label={r.approved_by_id_label} /> : <span className="text-faint">-</span>) },
          { key: "approved_on", label: "Approved" },
          { key: "summary", label: "Summary" },
        ]}
      />
    </div>
  );
}
