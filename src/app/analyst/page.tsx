"use client";

import { EntityBrowser, LinkCell, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, InfoNote, Money, StatusBadge } from "@/components/ui";
import { useSession } from "@/components/SessionProvider";

export default function AnalystPage() {
  const { session } = useSession();
  const restricted = session?.actor.role === "analyst";

  return (
    <div className="space-y-4">
      <InfoNote tone={restricted ? "warning" : "info"}>
        The analyst receives the permitted business information only. Founder and co-founder personal and contact details
        are withheld from the analyst view, from exports and from shared documents.
        {restricted ? " You are signed in as an analyst, so founder contact fields show as restricted." : ""}
      </InfoNote>

      <PageIntro summary="An analyst's willingness to invest is separate from an investor commitment, never committed or deployed capital.">
        An analyst&apos;s indicative willingness to invest is <strong>separate from an actual investor commitment</strong>.
        It is never counted as committed or deployed capital.
      </PageIntro>

      <ModuleActions
        actions={["analyst.evaluate"]}
        label="Analyst actions"
        notes={{
          "analyst.evaluate": "Willingness to invest and the indicative amount are recorded as indicative values only.",
        }}
      />

      <EntityBrowser
        entity="analyst_evaluations"
        module="analyst"
        title="Analyst screening"
        description="Investment thesis fit, market opportunity, traction, business model, competitive positioning and the next-stage recommendation."
        searchPlaceholder="Search decision reason or outstanding concern"
        filters={[
          {
            column: "recommendation",
            label: "Recommendation",
            options: [
              { value: "pending", label: "Pending" },
              { value: "proceed", label: "Proceed" },
              { value: "conditional", label: "Conditional" },
              { value: "hold", label: "Hold" },
              { value: "reject", label: "Reject" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Evaluation", render: (r) => <RefCell entity="analyst_evaluations" id={r.id} label={r.id_label} /> },
          { key: "application_id", label: "Application", render: (r) => <RefCell entity="applications" id={r.application_id} label={r.application_id_label} /> },
          { key: "analyst_id", label: "Analyst", render: (r) => <RefCell entity="users" id={r.analyst_id} label={r.analyst_id_label} /> },
          { key: "thesis_fit", label: "Thesis", align: "right" },
          { key: "market_opportunity", label: "Market", align: "right" },
          { key: "traction", label: "Traction", align: "right" },
          { key: "business_model", label: "Model", align: "right" },
          { key: "competitive_positioning", label: "Positioning", align: "right" },
          { key: "willingness_to_invest", label: "Willingness", align: "right" },
          { key: "indicative_amount", label: "Indicative amount", align: "right", render: (r) => <Money paise={r.indicative_amount} /> },
          { key: "recommendation", label: "Recommendation", render: (r) => <StatusBadge registry="analyst_recommendation" value={r.recommendation} /> },
          { key: "decision_reason", label: "Decision reason" },
          { key: "outstanding_concern", label: "Outstanding concern" },
        ]}
      />

      <EntityBrowser
        entity="founders"
        module="startups"
        title="Founder records as visible to this role"
        description="Analyst roles receive the permitted business information only. Personal and contact fields are redacted by the API, not merely hidden in the screen."
        columns={[
          { key: "id", label: "Founder", render: (r) => <LinkCell entity="founders" id={r.id} label={String(r.name)} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "role", label: "Role" },
          { key: "email", label: "Email" },
          { key: "phone", label: "Phone" },
          {
            key: "personal_details_restricted",
            label: "Redaction",
            render: (r) => (r.personal_details_restricted ? <span className="text-xs text-warn">Restricted for this role</span> : <span className="text-faint">-</span>),
          },
        ]}
      />
    </div>
  );
}
