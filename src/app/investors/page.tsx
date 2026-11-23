"use client";

import Link from "next/link";
import { EntityBrowser, LinkCell, RefCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, Money, StatusBadge, Tabs } from "@/components/ui";
import { useState } from "react";

export default function InvestorsPage() {
  const [tab, setTab] = useState("register");

  return (
    <div className="space-y-4">
      <PageIntro summary="One investor record holds category, thesis, ticket size and proposed season allocation, kept apart from commitments.">
        One investor record holds the category, investing entity, source and referral relationship, decision-maker,
        authorised representative, thesis, ticket size and <strong>proposed season allocation</strong>. That allocation is
        the investor&apos;s own capacity and is kept separate from commitments to individual startups.
      </PageIntro>

      <ModuleActions
        actions={["investor.create", "investor.verify", "investor.grade", "investor.agreement"]}
        label="Investor actions"
        notes={{
          "investor.verify": "Verification is checked against the eligibility policy; evidence and reference checks are required.",
          "investor.agreement":
            "The mandatory document set depends on the investor category. The agreement screen reports anything still missing for that category.",
        }}
      />

      <Tabs
        tabs={[
          { key: "register", label: "Investor register" },
          { key: "grades", label: "Grade assessments" },
          { key: "agreements", label: "Agreements" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "register" ? (
        <EntityBrowser
          entity="investors"
          module="investors"
          title="Investor register"
          description="Verification evidence, availability, expected decision timeline and the relationship owner are all held here."
          searchPlaceholder="Search name, entity, sector, geography, thesis or decision-maker"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "sourced", label: "Sourced" },
                { value: "exploratory", label: "Exploratory discussion" },
                { value: "verification_pending", label: "Verification pending" },
                { value: "verified", label: "Verified" },
                { value: "agreement_pending", label: "Agreement pending" },
                { value: "onboarded", label: "Onboarded" },
                { value: "dormant", label: "Dormant" },
              ],
            },
            {
              column: "grade",
              label: "Grade",
              options: [
                { value: "l1", label: "L1" },
                { value: "l2", label: "L2" },
                { value: "l3", label: "L3" },
                { value: "l4", label: "L4" },
              ],
            },
            {
              column: "category",
              label: "Category",
              options: [
                { value: "HNI", label: "HNI" },
                { value: "Family office", label: "Family office" },
                { value: "VC", label: "VC" },
                { value: "Angel network", label: "Angel network" },
                { value: "Corporate", label: "Corporate" },
                { value: "Syndicate", label: "Syndicate" },
              ],
            },
          ]}
          columns={[
            { key: "name", label: "Investor", render: (r) => <LinkCell entity="investors" id={r.id} label={String(r.name)} /> },
            { key: "category", label: "Category", render: (r) => <Badge>{String(r.category)}</Badge> },
            { key: "investing_entity", label: "Investing entity" },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="investor" value={r.status} /> },
            { key: "grade", label: "Grade", render: (r) => <StatusBadge registry="investor_grade" value={r.grade} /> },
            { key: "sector_focus", label: "Sector focus" },
            { key: "stage_focus", label: "Stage focus" },
            { key: "geography", label: "Geography" },
            {
              key: "ticket",
              label: "Ticket size",
              render: (r) => (
                <span className="whitespace-nowrap">
                  <Money paise={r.ticket_min} compact /> &ndash; <Money paise={r.ticket_max} compact />
                </span>
              ),
            },
            { key: "proposed_season_allocation", label: "Season allocation", align: "right", render: (r) => <Money paise={r.proposed_season_allocation} compact /> },
            { key: "relationship_owner_id", label: "Relationship owner", render: (r) => <RefCell entity="users" id={r.relationship_owner_id} label={r.relationship_owner_id_label} /> },
            { key: "expected_decision_timeline", label: "Decision timeline" },
          ]}
          actions={
            <Link href="/matching" className="rounded-lg border border-hair-strong bg-canvas px-3 py-1.5 text-[13px] hover:bg-surface">
              Startup matching
            </Link>
          }
        />
      ) : null}

      {tab === "grades" ? (
        <>
          <Card title="L1 to L4 grading" subtitle="Assessment against each grading dimension with evidence and a reviewer">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                { grade: "L1", label: "Highest", detail: "Leads panels and can anchor a round." },
                { grade: "L2", label: "Strong", detail: "Participates in panels and follows a lead." },
                { grade: "L3", label: "Developing", detail: "Smaller cheques; observes first." },
                { grade: "L4", label: "Early", detail: "Exploratory only; no panel role." },
              ].map((g) => (
                <div key={g.grade} className="rounded-lg border border-hair p-3">
                  <p className="text-sm font-semibold text-ink">{g.grade}</p>
                  <p className="text-xs text-faint">{g.label}</p>
                  <p className="mt-1 text-xs text-ink-soft">{g.detail}</p>
                </div>
              ))}
            </div>
          </Card>
          <EntityBrowser
            entity="investor_grade_assessments"
            module="investors"
            title="Grade assessments"
            description="Grade approval date, permitted engagement, panel role, review date and any change of grade with its reason."
            columns={[
              { key: "id", label: "Assessment", render: (r) => <RefCell entity="investor_grade_assessments" id={r.id} label={r.id_label} /> },
              { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
              { key: "grade", label: "Grade", render: (r) => <StatusBadge registry="investor_grade" value={r.grade} /> },
              { key: "dimension", label: "Dimension" },
              { key: "score", label: "Score", align: "right" },
              { key: "evidence", label: "Evidence" },
              { key: "reviewer_id", label: "Reviewer", render: (r) => <RefCell entity="users" id={r.reviewer_id} label={r.reviewer_id_label} /> },
              { key: "approved_on", label: "Grade approved" },
              { key: "permitted_engagement", label: "Permitted engagement" },
              { key: "panel_role", label: "Panel role" },
              { key: "review_date", label: "Review date" },
              { key: "change_reason", label: "Change reason" },
            ]}
          />
        </>
      ) : null}

      {tab === "agreements" ? (
        <EntityBrowser
          entity="investor_agreements"
          module="investors"
          title="Participation and confidentiality documents"
          description="The mandatory set differs by investor category and access level, so the action reports what is still outstanding."
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "requested", label: "Requested" },
                { value: "received", label: "Received" },
                { value: "verified", label: "Verified" },
                { value: "expired", label: "Expired" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "Agreement", render: (r) => <RefCell entity="investor_agreements" id={r.id} label={r.id_label} /> },
            { key: "investor_id", label: "Investor", render: (r) => <RefCell entity="investors" id={r.investor_id} label={r.investor_id_label} /> },
            { key: "document_type", label: "Document type" },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="document" value={r.status} /> },
            { key: "signed_on", label: "Signed" },
            { key: "reference", label: "Reference" },
            { key: "notes", label: "Notes" },
          ]}
        />
      ) : null}

      <Card title="Deals and commitments by investor" subtitle="Read-only summary drawn from the same records" padded={false}>
        <MiniTable
          entity="commitments"
          columns={["id", "investor_id", "startup_id", "status", "amount", "is_golden_pass", "confirmed_on"]}
          renderers={{
            status: (r) => <StatusBadge registry="commitment" value={r.status} />,
            amount: (r) => <Money paise={r.amount} compact />,
            is_golden_pass: (r) => (r.is_golden_pass ? <Badge tone="info">Golden Pass</Badge> : <span className="text-faint">-</span>),
          }}
        />
      </Card>
    </div>
  );
}
