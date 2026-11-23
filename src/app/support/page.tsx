"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Card, StatusBadge } from "@/components/ui";

export default function SupportPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="Founder support requests, each with an owner, a deadline, an outcome and the founder's feedback.">
        Founder support covers requests for investor introductions, mentoring, customer connections, hiring support and
        follow-on funding. Every request needs an owner, a deadline, an outcome and the founder&apos;s feedback. The
        deadline is set from the community policy&apos;s working-day SLA.
      </PageIntro>

      <ModuleActions actions={["support.create", "support.resolve"]} label="Support actions" />

      <EntityBrowser
        entity="support_requests"
        module="support"
        title="Founder support requests"
        description="Requests, owners, deadlines, outcomes and founder feedback."
        searchPlaceholder="Search request detail, outcome or founder feedback"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "open", label: "Open" },
              { value: "in_progress", label: "In progress" },
              { value: "resolved", label: "Resolved" },
              { value: "closed", label: "Closed" },
              { value: "declined", label: "Declined" },
            ],
          },
          {
            column: "request_type",
            label: "Request type",
            options: [
              { value: "investor_introduction", label: "Investor introduction" },
              { value: "mentoring", label: "Mentoring" },
              { value: "customer_connection", label: "Customer connection" },
              { value: "hiring", label: "Hiring support" },
              { value: "follow_on_funding", label: "Follow-on funding" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Request", render: (r) => <RefCell entity="support_requests" id={r.id} label={r.id_label} /> },
          { key: "member_id", label: "Member", render: (r) => <RefCell entity="community_members" id={r.member_id} label={r.member_id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => (r.startup_id ? <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> : <span className="text-faint">-</span>) },
          { key: "request_type", label: "Type", render: (r) => <span className="capitalize">{String(r.request_type).replace(/_/g, " ")}</span> },
          { key: "detail", label: "Detail" },
          { key: "owner_id", label: "Owner", render: (r) => <RefCell entity="users" id={r.owner_id} label={r.owner_id_label} /> },
          { key: "due_date", label: "Due" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="support_request" value={r.status} /> },
          { key: "outcome", label: "Outcome" },
          { key: "founder_feedback", label: "Founder feedback" },
        ]}
      />

      <Card title="Community dashboard measures">
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          {[
            "Active participation",
            "Repeat attendance",
            "Partner activity",
            "Qualified referrals",
            "Support requests resolved",
            "Funding outcomes connected to community activity",
          ].map((item) => (
            <li key={item} className="rounded-lg border border-hair px-3 py-2 text-ink-soft">
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
