"use client";

import { EntityBrowser, LinkCell } from "@/components/EntityBrowser";
import { MiniTable } from "@/components/MiniTable";
import { ModuleActions } from "@/components/ModuleActions";
import {
  PageIntro, Badge, Card, StatusBadge, Tabs } from "@/components/ui";
import { useState } from "react";

export default function IntegrationsPage() {
  const [tab, setTab] = useState("integrations");

  return (
    <div className="space-y-4">
      <PageIntro summary="Sanchi Connect, accounting and communication syncs, with a failed-sync alert so errors never stop work silently.">
        Integration with Sanchi Connect, accounting and communication tools runs where the available interfaces permit.
        A <strong>failed-sync alert</strong> is raised whenever a sync fails, so an integration error never silently stops
        work. The management dashboard carries those alerts as exceptions.
      </PageIntro>

      <ModuleActions
        actions={["integration.sync", "import.run"]}
        label="Integration actions"
        notes={{
          "integration.sync": "Tick the failure box to see the failed-sync alert path and the exception it raises.",
          "import.run": "Existing records are linked rather than replaced when duplicates are found.",
        }}
      />

      <Tabs
        tabs={[
          { key: "integrations", label: "Integrations" },
          { key: "sync", label: "Sync runs" },
          { key: "imports", label: "Import batches" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "integrations" ? (
        <EntityBrowser
          entity="integrations"
          module="integrations"
          title="Integrations"
          description="Category, status, last sync, records synced and any failed-sync alert."
          searchPlaceholder="Search name, category or last error"
          filters={[
            {
              column: "status",
              label: "Status",
              options: [
                { value: "connected", label: "Connected" },
                { value: "degraded", label: "Degraded" },
                { value: "disconnected", label: "Disconnected" },
                { value: "not_configured", label: "Not configured" },
              ],
            },
          ]}
          columns={[
            { key: "name", label: "Integration", render: (r) => <LinkCell entity="integrations" id={r.id} label={String(r.name)} /> },
            { key: "category", label: "Category", render: (r) => <Badge>{String(r.category)}</Badge> },
            { key: "status", label: "Status", render: (r) => <StatusBadge registry="integration" value={r.status} /> },
            { key: "last_sync_at", label: "Last sync" },
            { key: "last_sync_status", label: "Last result" },
            { key: "records_synced", label: "Records synced", align: "right" },
            {
              key: "failed_sync_alerts",
              label: "Failed-sync alerts",
              render: (r) => (Number(r.failed_sync_alerts) > 0 ? <Badge tone="danger">{String(r.failed_sync_alerts)}</Badge> : <Badge tone="success">None</Badge>),
            },
            { key: "last_error", label: "Last error" },
          ]}
        />
      ) : null}

      {tab === "sync" ? (
        <Card title="Sync runs" subtitle="Every attempt is recorded, successful or not" padded={false}>
          <MiniTable
            entity="sync_runs"
            columns={["id", "integration_id", "started_at", "finished_at", "status", "records", "error"]}
            renderers={{ status: (r) => <StatusBadge registry="sync" value={r.status} /> }}
          />
        </Card>
      ) : null}

      {tab === "imports" ? (
        <Card title="Import and reconciliation batches" subtitle="Rows imported, merged duplicates and skipped rows" padded={false}>
          <MiniTable
            entity="import_batches"
            columns={["id", "entity_type", "file_name", "rows", "imported", "duplicates", "skipped", "status", "started_at", "log"]}
          />
        </Card>
      ) : null}
    </div>
  );
}
