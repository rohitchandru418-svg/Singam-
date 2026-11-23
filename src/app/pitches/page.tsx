"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Card, InfoNote, Money, StatusBadge } from "@/components/ui";

export default function PitchesPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Five minutes of pitch and five of Q&A; Ready to Invest is not the same as committed capital.">
        The application SOP specifies <strong>five minutes of pitch and five minutes of Q&amp;A</strong>. The SOP response
        options are retained (Ready to Invest, Ready to Proceed to the Next Stage), with operational statuses added for
        Information Requested, Pass and No Response.
      </PageIntro>

      <InfoNote tone="warning">
        &ldquo;Ready to Invest&rdquo; confirms the amount and the terms and conditions. It does <strong>not</strong> count as
        deployed or contractually committed capital.
      </InfoNote>

      <ModuleActions actions={["pitch.schedule", "pitch.record"]} label="Virtual pitch actions" />

      <EntityBrowser
        entity="virtual_pitches"
        module="pitches"
        title="Virtual pitches"
        description="Scheduling, attendance, material shared, investor questions and the responses given."
        searchPlaceholder="Search material shared, questions or responses"
        filters={[
          {
            column: "response",
            label: "Response",
            options: [
              { value: "ready_to_invest", label: "Ready to Invest" },
              { value: "ready_to_proceed", label: "Ready to Proceed to the Next Stage" },
              { value: "info_requested", label: "Information Requested" },
              { value: "pass", label: "Pass" },
              { value: "no_response", label: "No Response" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Pitch", render: (r) => <RefCell entity="virtual_pitches" id={r.id} label={r.id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
          { key: "scheduled_at", label: "Scheduled" },
          {
            key: "duration",
            label: "Duration",
            render: (r) => (
              <span className="whitespace-nowrap text-xs">
                {String(r.duration_pitch_min)} min pitch + {String(r.duration_qa_min)} min Q&amp;A
              </span>
            ),
          },
          { key: "attended", label: "Attended", render: (r) => (r.attended ? <span className="text-ok">Yes</span> : <span className="text-faint">No</span>) },
          { key: "material_shared", label: "Material shared" },
          { key: "response", label: "Response", render: (r) => <StatusBadge registry="pitch_response" value={r.response} /> },
          { key: "amount_confirmed", label: "Amount confirmed", align: "right", render: (r) => <Money paise={r.amount_confirmed} compact /> },
          { key: "terms_confirmed", label: "Terms confirmed" },
          { key: "investor_questions", label: "Questions" },
          { key: "responses", label: "Responses" },
        ]}
      />

      <Card title="What counts as what" subtitle="Each figure is stored and reported separately">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <div className="rounded-lg border border-hair p-3">
            <dt className="font-medium text-ink">Ready to Invest</dt>
            <dd className="mt-1 text-xs text-ink-soft">Amount and terms confirmed. Not committed, not deployed.</dd>
          </div>
          <div className="rounded-lg border border-hair p-3">
            <dt className="font-medium text-ink">Golden Pass</dt>
            <dd className="mt-1 text-xs text-ink-soft">Initial interest recorded at Pitch Day. Never a written commitment.</dd>
          </div>
          <div className="rounded-lg border border-hair p-3">
            <dt className="font-medium text-ink">Written commitment</dt>
            <dd className="mt-1 text-xs text-ink-soft">A confirmed commitment with evidence, tracked on the Commitments screen.</dd>
          </div>
          <div className="rounded-lg border border-hair p-3">
            <dt className="font-medium text-ink">Verified deployment</dt>
            <dd className="mt-1 text-xs text-ink-soft">Funds verified as received, tranche by tranche.</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
