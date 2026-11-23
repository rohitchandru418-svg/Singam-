"use client";

import { useEffect, useState } from "react";
import { apiList, apiMeta, type MetaResponse } from "@/lib/client/api";
import { MiniTable } from "@/components/MiniTable";
import { ModuleGate, useSession } from "@/components/SessionProvider";
import {
  PageIntro, Badge, Card, StatusBadge, Table, Tabs } from "@/components/ui";
import { DEPARTMENT_MAP } from "@/lib/domain/departments";
import { FIELD_RESTRICTIONS, ROLES } from "@/lib/domain/rbac";
import { MODULES } from "@/lib/domain/rbac";

export default function AdminPage() {
  const { session, canAccessModule } = useSession();
  const [tab, setTab] = useState("access");
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [calendars, setCalendars] = useState<Record<string, unknown>[]>([]);
  const [seasons, setSeasons] = useState<Record<string, unknown>[]>([]);

  // The admin data is fetched only once the acting role may open the module, so a persona
  // that lands on /admin by mistake never fires forbidden requests before the gate renders.
  const canAdmin = canAccessModule("admin");
  useEffect(() => {
    if (!canAdmin) return;
    apiMeta().then(setMeta).catch(() => setMeta(null));
    apiList("users", { limit: 100 }).then((r) => setUsers(r.items)).catch(() => setUsers([]));
    apiList("calendars", { limit: 20 }).then((r) => setCalendars(r.items)).catch(() => setCalendars([]));
    apiList("seasons", { limit: 20 }).then((r) => setSeasons(r.items)).catch(() => setSeasons([]));
  }, [canAdmin]);

  return (
    <ModuleGate module="admin">
    <div className="space-y-4">
      <PageIntro summary="Roles, module access, document restrictions and the working-day calendar that drives every deadline.">
        Department and document-level access, the working-day calendar used for every deadline, and the role matrix that
        governs which modules and actions each team can reach.
      </PageIntro>

      <Tabs
        tabs={[
          { key: "access", label: "Users and access" },
          { key: "roles", label: "Role matrix" },
          { key: "restrictions", label: "Field restrictions" },
          { key: "calendars", label: "Working-day calendars" },
          { key: "entities", label: "Entity registry" },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === "access" ? (
        <Card title="Users" subtitle={session ? `Acting as ${session.actor.name}` : undefined} padded={false}>
          <Table
            dense
            columns={[
              { key: "id", label: "User id" },
              { key: "name", label: "Name" },
              { key: "email", label: "Email" },
              { key: "role", label: "Role", render: (r) => <Badge>{ROLES.find((x) => x.key === r.role)?.label ?? String(r.role)}</Badge> },
              { key: "department", label: "Department", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.department)]?.short ?? String(r.department)}</Badge> },
              { key: "active", label: "Active", render: (r) => (r.active ? <Badge tone="success">Yes</Badge> : <Badge tone="neutral">No</Badge>) },
            ]}
            rows={users}
          />
        </Card>
      ) : null}

      {tab === "roles" ? (
        <Card title="Role matrix" subtitle="Modules each role can open; Management and Admin reach everything" padded={false}>
          <Table
            dense
            columns={[
              { key: "label", label: "Role" },
              { key: "department", label: "Department", render: (r) => <Badge>{DEPARTMENT_MAP[String(r.department)]?.short ?? String(r.department)}</Badge> },
              {
                key: "modules",
                label: "Modules",
                render: (r) => (
                  <div className="flex flex-wrap gap-1">
                    {(r.modules as string[]).map((m) => (
                      <span key={m} className="rounded bg-hover px-1.5 py-0.5 text-[11px] text-ink-soft">
                        {m}
                      </span>
                    ))}
                  </div>
                ),
              },
            ]}
            rows={ROLES as unknown as Record<string, unknown>[]}
          />
        </Card>
      ) : null}

      {tab === "restrictions" ? (
        <Card title="Field-level restrictions" subtitle="Applied to every API response, so screens, exports and shared documents all obey them">
          <div className="space-y-3">
            {Object.entries(FIELD_RESTRICTIONS).map(([role, restrictions]) => (
              <div key={role} className="rounded-lg border border-hair p-3">
                <p className="text-sm font-medium text-ink">{ROLES.find((r) => r.key === role)?.label ?? role}</p>
                {restrictions.length === 0 ? (
                  <p className="mt-1 text-xs text-faint">No field restrictions.</p>
                ) : (
                  <ul className="mt-1 space-y-1">
                    {restrictions.map((r) => (
                      <li key={r} className="text-xs text-ink-soft">
                        {r.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "calendars" ? (
        <Card title="Working-day calendars" subtitle="Every deadline is computed against these calendars" padded={false}>
          <Table
            dense
            columns={[
              { key: "id", label: "Calendar" },
              { key: "name", label: "Name" },
              { key: "region", label: "Region" },
              { key: "working_days", label: "Working days (0 = Sunday)" },
              { key: "holidays", label: "Holidays", render: (r) => <span className="font-mono text-[11px]">{String(r.holidays)}</span> },
            ]}
            rows={calendars}
          />
        </Card>
      ) : null}

      {tab === "entities" ? (
        <>
          <Card title="Entity registry" subtitle="Every REST entity, its table, governing module and searchable columns" padded={false}>
            <Table
              dense
              columns={[
                { key: "key", label: "Entity" },
                { key: "table", label: "Table" },
                { key: "label", label: "Label" },
                { key: "module", label: "Module", render: (r) => <Badge>{String(r.module)}</Badge> },
                {
                  key: "searchable",
                  label: "Searchable columns",
                  render: (r) => <span className="text-[11px] text-ink-soft">{(r.searchable as string[]).join(", ")}</span>,
                },
              ]}
              rows={(meta?.entities ?? []) as unknown as Record<string, unknown>[]}
            />
          </Card>
          <Card title="Seasons" padded={false}>
            <Table dense columns={[{ key: "id", label: "Id" }, { key: "code", label: "Code" }, { key: "name", label: "Name" }, { key: "status", label: "Status", render: (r) => <StatusBadge registry="season" value={r.status} /> }, { key: "starts_on", label: "Starts" }, { key: "ends_on", label: "Ends" }]} rows={seasons} />
          </Card>
          <Card title="Modules" subtitle="Access is granted per module" padded={false}>
            <div className="flex flex-wrap gap-2 p-4">
              {MODULES.map((m) => (
                <span key={m} className="rounded-full bg-hover px-3 py-1 text-xs text-ink-soft">
                  {m}
                </span>
              ))}
            </div>
          </Card>
        </>
      ) : null}

      <Card title="Import batches" subtitle="Importing existing records and reconciling them" padded={false}>
        <MiniTable entity="import_batches" columns={["id", "entity_type", "file_name", "rows", "imported", "duplicates", "skipped", "log"]} />
      </Card>
    </div>
    </ModuleGate>
  );
}
