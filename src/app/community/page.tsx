"use client";

import { EntityBrowser, RefCell, LinkCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, InfoNote, StatusBadge, Tabs } from "@/components/ui";
import { useState } from "react";

export default function CommunityPage() {
  const [tab, setTab] = useState("members");

  return (
    <div className="space-y-4">
      <InfoNote tone="info">
        This module is proposed, because the supplied files do not define the full community SOP. Membership, engagement,
        referral and support workflows are approved as configurable policies on the Policies screen.
      </InfoNote>

      <PageIntro summary="One person record can hold multiple roles; membership never grants access to confidential deal information.">
        A founder who is also a mentor or an investor keeps <strong>one person record with multiple roles</strong>.
        Community membership never grants access to confidential deal information by default.
      </PageIntro>

      <ModuleActions
        actions={["community.member_create", "community.member_add_role"]}
        label="Community actions"
        notes={{
          "community.member_create":
            "Creating a member with an email already on file adds the new role to the existing person record instead of duplicating it.",
        }}
      />

      <Tabs
        tabs={[
          { key: "members", label: "Members" },
          { key: "roles", label: "Roles" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "members" ? (
        <EntityBrowser
          entity="community_members"
          module="community"
          title="Community members"
          description="Member type and organisation, sector, geography and interests, relationship owner, communication preferences and permissions, groups and programmes, engagement history, requests for support, referrals and outcomes."
          searchPlaceholder="Search name, organisation, sector, interests or engagement"
          filters={[
            {
              column: "member_type",
              label: "Member type",
              options: [
                { value: "applicant", label: "Applicant" },
                { value: "selected_startup", label: "Selected startup" },
                { value: "alumni", label: "Alumni" },
                { value: "investor", label: "Investor" },
                { value: "mentor", label: "Mentor" },
                { value: "incubator", label: "Incubator" },
                { value: "college", label: "College" },
                { value: "partner", label: "Ecosystem partner" },
              ],
            },
          ]}
          columns={[
            { key: "name", label: "Member", render: (r) => <LinkCell entity="community_members" id={r.id} label={String(r.name)} /> },
            { key: "member_type", label: "Type", render: (r) => <StatusBadge registry="member_type" value={r.member_type} /> },
            { key: "organisation", label: "Organisation" },
            { key: "sector", label: "Sector" },
            { key: "geography", label: "Geography" },
            { key: "interests", label: "Interests" },
            { key: "relationship_owner_id", label: "Relationship owner", render: (r) => <RefCell entity="users" id={r.relationship_owner_id} label={r.relationship_owner_id_label} /> },
            { key: "communication_preferences", label: "Communication preferences" },
            {
              key: "consent_marketing",
              label: "Marketing consent",
              render: (r) => (r.consent_marketing ? <Badge tone="success">Given</Badge> : <Badge tone="warning">Not given</Badge>),
            },
            {
              key: "confidential_access",
              label: "Confidential deal access",
              render: (r) => (r.confidential_access ? <Badge tone="danger">Granted</Badge> : <Badge tone="neutral">Withheld</Badge>),
            },
            { key: "engagement_summary", label: "Engagement" },
          ]}
        />
      ) : null}

      {tab === "roles" ? (
        <Card title="Member roles" subtitle="One person, several roles, one record" padded={false}>
          <MiniTable
            entity="community_member_roles"
            columns={["id", "member_id", "role", "since", "notes"]}
            renderers={{ role: (r) => <StatusBadge registry="member_type" value={r.role} /> }}
          />
        </Card>
      ) : null}
    </div>
  );
}
