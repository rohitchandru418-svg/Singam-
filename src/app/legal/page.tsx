"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import { PageIntro, Badge, InfoNote } from "@/components/ui";

/**
 * Legal workspace: due diligence and pre-funding conditions inside IR-owned deals.
 *
 * Legal is a support function. Findings carry a severity and cannot close without resolution
 * notes; a blocker condition visibly blocks tranche scheduling.
 */
export default function LegalPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Due diligence runs as tasks inside the IR-owned deal; findings carry a severity and conditions must clear before a tranche can be scheduled.">
        Legal works inside the deal that Investor Relations owns. Due-diligence findings carry a severity and cannot close
        without resolution notes. A pre-funding condition marked as a blocker visibly blocks tranche scheduling.
      </PageIntro>

      <InfoNote tone="info">
        IR confirms closure of the deal; Legal clears the conditions and agreements. Commercial terms beyond Legal&apos;s
        role are not exposed to other modules.
      </InfoNote>

      <ModuleActions
        actions={[
          "legal.dd_finding_raise",
          "legal.dd_finding_resolve",
          "legal.condition_create",
          "legal.condition_clear",
        ]}
        label="Legal actions"
        notes={{
          "legal.dd_finding_resolve": "A finding cannot close without resolution notes.",
          "legal.condition_create": "A blocker condition stops a tranche being scheduled until it is met or waived.",
        }}
      />

      <EntityBrowser
        entity="dd_findings"
        module="legal"
        title="Due-diligence findings"
        description="Deal, finding, severity, owner, due date, status and resolution notes."
        searchPlaceholder="Search finding or resolution notes"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "open", label: "Open" },
              { value: "in_review", label: "In review" },
              { value: "resolved", label: "Resolved" },
            ],
          },
          {
            column: "severity",
            label: "Severity",
            options: [
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "critical", label: "Critical" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Finding", render: (r) => <RefCell entity="dd_findings" id={r.id} label={r.id_label} /> },
          { key: "deal_id", label: "Deal", render: (r) => <RefCell entity="deals" id={r.deal_id} label={r.deal_id_label} /> },
          { key: "title", label: "Finding" },
          { key: "severity", label: "Severity", render: (r) => <Badge>{String(r.severity)}</Badge> },
          { key: "owner_id", label: "Owner", render: (r) => <RefCell entity="users" id={r.owner_id} label={r.owner_id_label} /> },
          { key: "due_date", label: "Due" },
          { key: "status", label: "Status" },
          { key: "resolution_notes", label: "Resolution notes" },
          { key: "resolved_on", label: "Resolved" },
        ]}
      />

      <EntityBrowser
        entity="pre_funding_conditions"
        module="legal"
        title="Pre-funding conditions"
        description="Each condition must clear before the tranche date; a blocker blocks scheduling."
        searchPlaceholder="Search condition or evidence"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "open", label: "Open" },
              { value: "met", label: "Met" },
              { value: "waived", label: "Waived" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Condition", render: (r) => <RefCell entity="pre_funding_conditions" id={r.id} label={r.id_label} /> },
          { key: "deal_id", label: "Deal", render: (r) => <RefCell entity="deals" id={r.deal_id} label={r.deal_id_label} /> },
          { key: "condition_text", label: "Condition" },
          { key: "blocker", label: "Blocker", render: (r) => (Number(r.blocker) ? <Badge tone="danger">Blocks tranche</Badge> : <Badge>Advisory</Badge>) },
          { key: "owner_id", label: "Owner", render: (r) => <RefCell entity="users" id={r.owner_id} label={r.owner_id_label} /> },
          { key: "due_date", label: "Due" },
          { key: "status", label: "Status" },
          { key: "evidence", label: "Evidence" },
          { key: "met_on", label: "Cleared" },
        ]}
      />
    </div>
  );
}
