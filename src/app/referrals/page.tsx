"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, Money, StatusBadge } from "@/components/ui";

const CHAIN = [
  "Community interaction",
  "Referral",
  "Application or investor lead",
  "Qualification",
  "Engagement",
  "Funding or other outcome",
];

export default function ReferralsPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="The full referral chain, with the original source and later contributors preserved separately.">
        The full chain is tracked, and the <strong>original source and later contributors are preserved separately</strong>,
        so attribution stays clear. An event-generated application links to the existing startup record rather than
        creating a duplicate.
      </PageIntro>

      <ModuleActions
        actions={["referral.create", "referral.advance"]}
        label="Referral actions"
        notes={{
          "referral.create":
            "When the referred startup already exists by name, the referral links to that record instead of creating a duplicate.",
        }}
      />

      <Card title="Referral chain">
        <ol className="flex flex-wrap items-center gap-2">
          {CHAIN.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-lg border border-hair px-3 py-1.5 text-xs text-ink-soft">{step}</span>
              {i < CHAIN.length - 1 ? <span className="text-faint">&rarr;</span> : null}
            </li>
          ))}
        </ol>
      </Card>

      <EntityBrowser
        entity="referrals"
        module="referrals"
        title="Referrals and introductions"
        description="Source, referred party, qualification, engagement and the resulting outcome."
        searchPlaceholder="Search source, referred name, contributor or outcome"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "new", label: "New" },
              { value: "qualified", label: "Qualified" },
              { value: "engaged", label: "Engaged" },
              { value: "converted", label: "Converted" },
              { value: "dropped", label: "Dropped" },
            ],
          },
          {
            column: "referred_type",
            label: "Referred type",
            options: [
              { value: "startup_application", label: "Startup application" },
              { value: "investor_lead", label: "Investor lead" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Referral", render: (r) => <RefCell entity="referrals" id={r.id} label={r.id_label} /> },
          { key: "source_type", label: "Source type" },
          { key: "source_name", label: "Source" },
          { key: "referred_name", label: "Referred", render: (r) => <span>{String(r.referred_name)}</span> },
          { key: "referred_type", label: "Referred as", render: (r) => <Badge>{String(r.referred_type).replace(/_/g, " ")}</Badge> },
          {
            key: "startup_id",
            label: "Linked startup",
            render: (r) => (r.startup_id ? <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> : <span className="text-faint">Not yet linked</span>),
          },
          { key: "original_contributor", label: "Original contributor" },
          { key: "additional_contributors", label: "Later contributors" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="referral" value={r.status} /> },
          { key: "outcome", label: "Outcome" },
          { key: "outcome_amount", label: "Outcome amount", align: "right", render: (r) => <Money paise={r.outcome_amount} compact /> },
        ]}
      />
    </div>
  );
}
