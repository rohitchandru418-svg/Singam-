"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, InfoNote, Money, Stat, StatusBadge } from "@/components/ui";
import { useEffect, useState } from "react";
import { apiList } from "@/lib/client/api";

export default function TelecastPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    apiList("telecasts", { limit: 200 }).then((r) => setRows(r.items)).catch(() => setRows([]));
  }, []);

  const announced = rows.reduce((s, r) => s + Number(r.announced_amount ?? 0), 0);
  const committed = rows.reduce((s, r) => s + Number(r.committed_amount ?? 0), 0);
  const verified = rows.reduce((s, r) => s + Number(r.verified_deployed_amount ?? 0), 0);

  return (
    <div className="space-y-4">
      <PageIntro summary="Episode and telecast date, promotional requirements, founder posting and feedback, and public announcements.">
        Marketing tracks the episode and telecast date, founder notification, pre-telecast promotional requirements,
        approved audio-visual assets, videos and posts, founder posting completion, post-telecast activity and founder
        feedback.
      </PageIntro>

      <InfoNote tone="warning">
        Public claims must distinguish amounts <strong>announced</strong>, <strong>committed</strong> and
        <strong> verified as deployed</strong>. Marketing sees approved publication information, while confidential investor
        remarks and deal documents remain restricted.
      </InfoNote>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Amounts announced publicly" value={<Money paise={announced} compact />} tone="info" />
        <Stat label="Amounts committed" value={<Money paise={committed} compact />} tone="progress" />
        <Stat label="Amounts verified as deployed" value={<Money paise={verified} compact />} tone="success" />
      </div>

      <ModuleActions actions={["telecast.update"]} label="Telecast actions" />

      <EntityBrowser
        entity="telecasts"
        module="telecast"
        title="Telecast and promotions"
        description="Promotional requirements, approved assets, founder posting, post-telecast activity, founder feedback and the public announcement."
        searchPlaceholder="Search promo requirements, assets, activity, feedback or announcement"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "not_scheduled", label: "Not scheduled" },
              { value: "scheduled", label: "Scheduled" },
              { value: "founder_notified", label: "Founder notified" },
              { value: "promo_pending", label: "Promotions pending" },
              { value: "promo_done", label: "Promotions done" },
              { value: "telecast", label: "Telecast" },
              { value: "feedback_pending", label: "Feedback pending" },
              { value: "completed", label: "Completed" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Telecast", render: (r) => <RefCell entity="telecasts" id={r.id} label={r.id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "episode_no", label: "Episode" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="telecast" value={r.status} /> },
          { key: "telecast_date", label: "Telecast date" },
          { key: "founder_notified_on", label: "Founder notified" },
          { key: "promo_requirements", label: "Promotional requirements" },
          { key: "promo_assets_approved", label: "Approved assets" },
          {
            key: "founder_posting_done",
            label: "Founder posting",
            render: (r) => (r.founder_posting_done ? <Badge tone="success">Done</Badge> : <Badge tone="warning">Pending</Badge>),
          },
          { key: "post_telecast_activity", label: "Post-telecast activity" },
          { key: "founder_feedback", label: "Founder feedback" },
          { key: "public_announcement", label: "Public announcement" },
          { key: "announced_amount", label: "Announced", align: "right", render: (r) => <Money paise={r.announced_amount} compact /> },
          { key: "committed_amount", label: "Committed", align: "right", render: (r) => <Money paise={r.committed_amount} compact /> },
          { key: "verified_deployed_amount", label: "Verified deployed", align: "right", render: (r) => <Money paise={r.verified_deployed_amount} compact /> },
        ]}
      />

      <Card title="What each figure means for public communication">
        <dl className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
            <dt className="font-medium text-sky-900">Announced</dt>
            <dd className="mt-1 text-xs text-sky-800">The figure communicated publicly at telecast.</dd>
          </div>
          <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3">
            <dt className="font-medium text-indigo-900">Committed</dt>
            <dd className="mt-1 text-xs text-indigo-800">Written commitments on record, whether or not funded yet.</dd>
          </div>
          <div className="rounded-lg border border-ok-line bg-ok-soft p-3">
            <dt className="font-medium text-ok">Verified deployed</dt>
            <dd className="mt-1 text-xs text-ok">Funds verified as received, tranche by tranche.</dd>
          </div>
        </dl>
      </Card>
    </div>
  );
}
