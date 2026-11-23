"use client";

import { EntityBrowser, RefCell } from "@/components/EntityBrowser";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Card, StatusBadge } from "@/components/ui";

export default function EpisodesPage() {
  return (
    <div className="space-y-4">
      <PageIntro summary="The content workstream after the shoot: editing, approvals, telecast, promotions and founder feedback.">
        The content workstream continues after the shoot: editing, approvals, telecast, promotions and founder feedback.
        Episode allocation and shoot completion are recorded separately from the investment track.
      </PageIntro>

      <ModuleActions actions={["episode.update"]} label="Episode actions" />

      <EntityBrowser
        entity="episodes"
        module="episodes"
        title="Episodes and editing"
        description="Episode allocation, shoot completion, editing and approvals."
        searchPlaceholder="Search episode number, editing status or approvals status"
        filters={[
          {
            column: "status",
            label: "Status",
            options: [
              { value: "not_allocated", label: "Not allocated" },
              { value: "allocated", label: "Allocated" },
              { value: "edited", label: "Edited" },
              { value: "approved", label: "Approved" },
              { value: "telecast", label: "Telecast" },
              { value: "on_hold", label: "On hold" },
            ],
          },
        ]}
        columns={[
          { key: "id", label: "Episode record", render: (r) => <RefCell entity="episodes" id={r.id} label={r.id_label} /> },
          { key: "startup_id", label: "Startup", render: (r) => <RefCell entity="startups" id={r.startup_id} label={r.startup_id_label} /> },
          { key: "episode_no", label: "Episode" },
          { key: "status", label: "Status", render: (r) => <StatusBadge registry="episode" value={r.status} /> },
          { key: "shoot_completed_on", label: "Shoot completed" },
          { key: "editing_status", label: "Editing" },
          { key: "approvals_status", label: "Approvals" },
        ]}
      />

      <Card title="Content workflow">
        <ol className="grid gap-2 sm:grid-cols-5">
          {["Editing", "Approvals", "Telecast", "Promotions", "Founder feedback"].map((step, i) => (
            <li key={step} className="flex gap-2 rounded-lg border border-hair px-3 py-2 text-xs text-ink-soft">
              <span className="font-semibold text-faint">{i + 1}.</span>
              {step}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
