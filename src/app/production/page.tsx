"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, InfoNote, Money, StatusBadge, Tabs } from "@/components/ui";
import { useState } from "react";

export default function ProductionPage() {
  const [tab, setTab] = useState("handovers");

  return (
    <div className="space-y-4">
      <PageIntro summary="Production receives an approved handover pack; selection approval and payment clearance are separate gates.">
        Production receives an approved handover pack containing the startup profile, founder contacts, the selection
        decision, payment clearance and the permitted business information. Selection approval and payment clearance are
        recorded as <strong>separate facts</strong>, and accepting the pack is blocked until payment is cleared.
      </PageIntro>

      <ModuleActions
        actions={["production.handover", "production.accept", "av.update", "mock.update", "mainshoot.update"]}
        label="Production actions"
        notes={{
          "production.handover":
            "Raises the advance notification. Accepting the pack is a separate step and is blocked until payment is cleared.",
          "mainshoot.update":
            "Records attendance, live ask and offers, accepted terms, lead and co-investor allocations, conditions and outstanding actions.",
        }}
      />

      <Tabs
        tabs={[
          { key: "handovers", label: "Handover packs" },
          { key: "av", label: "AV shoots" },
          { key: "mock", label: "Mock shoots" },
          { key: "main", label: "Main shoots" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "handovers" ? (
        <EntityBrowser
          entity="production_handovers"
          module="production"
          title="Production handover packs"
          description="Selection approval and payment clearance are both visible, so the two milestones never blur together."
          columns={[
            { key: "id", label: "Handover", render: (r) => <RefCell entity="production_handovers" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="handover" value={r.status} /> },
            {
              key: "selection_approved",
              label: "Selection approved",
              render: (r) => (r.selection_approved ? <Badge tone="success">Approved</Badge> : <Badge tone="warning">Pending</Badge>),
            },
            {
              key: "payment_cleared",
              label: "Payment cleared",
              render: (r) => (r.payment_cleared ? <Badge tone="success">Cleared</Badge> : <Badge tone="danger">Not cleared</Badge>),
            },
            {
              key: "advance_notified",
              label: "Advance notification",
              render: (r) => (r.advance_notified ? <Badge tone="info">Sent</Badge> : <span className="text-faint">-</span>),
            },
            { key: "pack_summary", label: "Pack summary" },
            { key: "permitted_business_information", label: "Permitted business information" },
            { key: "handed_over_on", label: "Handed over" },
            { key: "accepted_on", label: "Accepted" },
            { key: "accepted_by_id", label: "Accepted by", render: (r) => <RefCell entity="users" id={r.accepted_by_id} label={r.accepted_by_id_label} /> },
          ]}
        />
      ) : null}

      {tab === "av" ? (
        <EntityBrowser
          entity="av_shoots"
          module="production"
          title="AV shoots"
          description="Story research, location, crew, schedule, founder availability, shot requirements, completion and asset links."
          searchPlaceholder="Search story research, location, crew or assets"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "not_started", label: "Not started" },
                { value: "planned", label: "Planned" },
                { value: "shooting", label: "Shooting" },
                { value: "completed", label: "Completed" },
                { value: "on_hold", label: "On hold" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "AV", render: (r) => <RefCell entity="av_shoots" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="av_shoot" value={r.status} /> },
            { key: "schedule_on", label: "Scheduled" },
            { key: "story_research", label: "Story research" },
            { key: "location", label: "Location" },
            { key: "crew", label: "Crew" },
            { key: "founder_availability", label: "Founder availability" },
            { key: "shot_requirements", label: "Shot requirements" },
            { key: "completed_on", label: "Completed" },
            { key: "asset_links", label: "Asset links" },
          ]}
        />
      ) : null}

      {tab === "mock" ? (
        <EntityBrowser
          entity="mock_shoots"
          module="production"
          title="Mock shoots"
          description="Costumes and properties, pitch revisions, product demo readiness, stage movement and rehearsal, the final ask and valuation information, open actions and final readiness approval."
          searchPlaceholder="Search costumes, pitch revisions, valuation or open actions"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "not_scheduled", label: "Not scheduled" },
                { value: "scheduled", label: "Scheduled" },
                { value: "rehearsed", label: "Rehearsed" },
                { value: "ready", label: "Readiness approved" },
                { value: "on_hold", label: "On hold" },
              ],
            },
          ]}
          columns={[
            { key: "id", label: "Mock shoot", render: (r) => <RefCell entity="mock_shoots" id={r.id} label={r.id_label} /> },
            { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="mock_shoot" value={r.status} /> },
            { key: "scheduled_on", label: "Scheduled" },
            { key: "costumes_properties", label: "Costumes and properties" },
            { key: "pitch_revisions", label: "Pitch revisions" },
            {
              key: "product_demo_ready",
              label: "Product demo",
              render: (r) => (r.product_demo_ready ? <Badge tone="success">Ready</Badge> : <Badge tone="warning">Pending</Badge>),
            },
            {
              key: "stage_movement_rehearsed",
              label: "Rehearsed",
              render: (r) => (r.stage_movement_rehearsed ? <Badge tone="success">Yes</Badge> : <Badge tone="warning">No</Badge>),
            },
            { key: "final_ask", label: "Final ask", align: "right", render: (r) => <Money paise={r.final_ask} compact /> },
            { key: "valuation_information", label: "Valuation information" },
            { key: "open_actions", label: "Open actions" },
            { key: "final_readiness_approved_on", label: "Readiness approved" },
          ]}
        />
      ) : null}

      {tab === "main" ? (
        <>
          <EntityBrowser
            entity="main_shoots"
            module="production"
            title="Main shoots"
            description="Founder and investor attendance, the live ask and offers, accepted deal terms, lead and co-investor allocations, conditions and signature completion."
            searchPlaceholder="Search live offers, accepted terms, conditions or outstanding actions"
            filters={[
              {
                column: "status",
                label: "Status",
                options: [
                  { value: "not_started", label: "Not started" },
                  { value: "scheduled", label: "Scheduled" },
                  { value: "shooting", label: "Shooting" },
                  { value: "completed", label: "Completed" },
                  { value: "exceptions", label: "Completed with exceptions" },
                ],
              },
            ]}
            columns={[
              { key: "id", label: "Shoot", render: (r) => <RefCell entity="main_shoots" id={r.id} label={r.id_label} /> },
              { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
              { key: "episode_no", label: "Episode" },
              { key: "status", label: "Status", render: (r) => <StatusBadge registry="main_shoot" value={r.status} /> },
              { key: "scheduled_on", label: "Scheduled" },
              { key: "founder_attendance", label: "Founder attendance" },
              { key: "investor_attendance", label: "Investor attendance" },
              { key: "live_ask", label: "Live ask", align: "right", render: (r) => <Money paise={r.live_ask} compact /> },
              { key: "live_offers", label: "Live offers" },
              { key: "accepted_deal_terms", label: "Accepted deal terms" },
              { key: "lead_investor_id", label: "Lead investor", render: (r) => <RefCell entity="investors" id={r.lead_investor_id} label={r.lead_investor_id_label} /> },
              {
                key: "investment_commitment_letter_ref",
                label: "Commitment letter",
                render: (r) => (r.investment_commitment_letter_ref ? <Badge tone="success">{String(r.investment_commitment_letter_ref)}</Badge> : <Badge tone="warning">Pending</Badge>),
              },
              {
                key: "startup_deal_acceptance_letter_ref",
                label: "Deal acceptance letter",
                render: (r) => (r.startup_deal_acceptance_letter_ref ? <Badge tone="success">{String(r.startup_deal_acceptance_letter_ref)}</Badge> : <Badge tone="warning">Pending</Badge>),
              },
              { key: "signature_completed_on", label: "Signatures completed" },
              { key: "conditions", label: "Conditions" },
              { key: "outstanding_actions", label: "Outstanding actions" },
            ]}
          />
          <Card title="Shoot-day signature controls">
            <InfoNote tone="info">
              Document titles do not determine the workflow. The actual signing event and the purpose determine when each
              document is required. The IR SOP names both an immediate execution target and a 24-hour sign-off control;
              the target and the final deadline are stored separately so the difference stays visible.
            </InfoNote>
          </Card>
          <EntityBrowser
            entity="signing_events"
            module="production"
            title="Signing events"
            description="Each signing event names the document it requires; the target date and the final deadline are tracked separately."
            searchPlaceholder="Search event type, document reference or notes"
            filters={[
              {
                column: "status",
                label: "Status",
                options: [
                  { value: "pending", label: "Awaiting signature" },
                  { value: "signed", label: "Signed" },
                  { value: "refused", label: "Refused" },
                  { value: "waived", label: "Waived" },
                ],
              },
            ]}
            columns={[
              { key: "id", label: "Signing event", render: (r) => <RefCell entity="signing_events" id={r.id} label={r.id_label} /> },
              { key: "main_shoot_id", label: "Main shoot", render: (r) => <RefCell entity="main_shoots" id={r.main_shoot_id} label={r.main_shoot_id_label} /> },
              { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
              { key: "event_type", label: "Signing event" },
              { key: "required_document_purpose", label: "Required document" },
              { key: "status", label: "Status", render: (r) => <StatusBadge registry="signing_event" value={r.status} /> },
              { key: "target_on", label: "Target" },
              { key: "final_deadline", label: "Final deadline" },
              { key: "signed_on", label: "Signed" },
              { key: "signed_by_id", label: "Signed by", render: (r) => <RefCell entity="users" id={r.signed_by_id} label={r.signed_by_id_label} /> },
              { key: "document_ref", label: "Document" },
              { key: "notes", label: "Notes" },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}
