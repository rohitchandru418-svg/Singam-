"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Card, InfoNote, StatusBadge } from "@/components/ui";
import { DEPARTMENT_MAP } from "@/lib/domain/departments";

const HANDOVER_STEPS = [
  "Startup Relationships initiates the IRR request.",
  "Finance / IRR receives and accepts the handover.",
  "The founder receives the information checklist.",
  "Missing documents and clarifications are tracked.",
  "The report is prepared, reviewed and approved.",
  "Investor Relations receives the approved version.",
];

export default function IrrPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="The version of the report shared with each investor is preserved, with an accepted handover to Investor Relations.">
        The system preserves the document version shared with each investor. Sharing the approved version with Investor
        Relations creates a versioned document record and an accepted handover.
      </PageIntro>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Handover sequence" subtitle="After MoU signing" className="lg:col-span-2">
          <ol className="space-y-2">
            {HANDOVER_STEPS.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-ink-soft">{step}</span>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Alerts">
          <InfoNote tone="warning">
            The IR SOP requires the IRR at least two weeks before the shoot. The pre-shoot screen raises an alert when
            that deadline is at risk, and the management dashboard carries it as a material exception.
          </InfoNote>
        </Card>
      </div>

      <ModuleActions actions={["irr.request", "irr.advance"]} label="IRR actions" />

      <EntityBrowser
        entity="irr_reports"
        module="irr"
        title="Investment Readiness Reports"
        description="Every version is retained, so the version shared with each investor is always recoverable."
        searchPlaceholder="Search document reference or missing documents"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "not_requested", label: "Not requested" },
              { value: "requested", label: "Requested" },
              { value: "handover_accepted", label: "Handover accepted" },
              { value: "checklist_sent", label: "Checklist sent" },
              { value: "docs_pending", label: "Documents pending" },
              { value: "in_preparation", label: "In preparation" },
              { value: "under_review", label: "Under review" },
              { value: "approved", label: "Approved" },
              { value: "shared_with_ir", label: "Shared with IR" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "IRR", render: (r) => <RefCell entity="irr_reports" id={r.id} label={r.id_label} /> },
          { key: "application_id", label: "Application", render: (r) => <RefCell entity="applications" id={r.application_id} label={r.application_id_label} /> },
          { key: "version", label: "Version", align: "right" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="irr" value={r.status} /> },
          { key: "requested_on", label: "Requested" },
          { key: "handover_accepted_on", label: "Handover accepted" },
          { key: "checklist_sent_on", label: "Checklist sent" },
          { key: "prepared_on", label: "Prepared" },
          { key: "approved_on", label: "Approved" },
          { key: "shared_with_ir_on", label: "Shared with IR" },
          { key: "document_ref", label: "Document reference" },
          { key: "missing_documents", label: "Missing documents" },
        ]}
      />

      <Card title="Handover register" subtitle="Accepted handovers between teams" padded={false}>
        <MiniTable
          entity="handovers"
          columns={["id", "from_department", "to_department", "entity_type", "entity_id", "status", "summary"]}
          renderers={{
            from_department: (r) => <span>{DEPARTMENT_MAP[String(r.from_department)]?.short ?? String(r.from_department)}</span>,
            to_department: (r) => <span>{DEPARTMENT_MAP[String(r.to_department)]?.short ?? String(r.to_department)}</span>,
            status: (r) => <StatusBadge registry="handover" value={r.status} />,
          }}
        />
      </Card>
    </div>
  );
}
