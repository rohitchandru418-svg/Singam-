"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiDelete, apiFields, apiGet, apiMeta, type DetailResponse, type FieldMeta, type MetaResponse } from "@/lib/client/api";
import { useSession } from "@/components/SessionProvider";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  ConfirmDialog,
  DateText,
  EmptyState,
  InfoNote,
  Money,
  PageHeader,
  StatusBadge,
  Toaster,
  Toolbar,
  useToasts,
} from "@/components/ui";
import { Icon } from "@/components/icons";
import { humanise } from "@/lib/domain/format";
import { BOOLEAN_COLUMNS, MONEY_COLUMNS } from "@/lib/domain/fieldLabels";
import { workspaceForModule } from "@/lib/domain/navigation";
import { isLinkableEntity, listRoute } from "@/lib/client/recordLinks";
import { RefCell } from "@/components/EntityBrowser";
import { EntityForm } from "@/components/EntityForm";
import { WorkflowPanel } from "@/components/WorkflowPanel";
import { actionsForEntity, subjectDefaultFor } from "@/lib/client/entityActions";
import { artifactDoneActions, artifactStageKeys as artifactStageKeysFor } from "@/lib/domain/recordArtifacts";
import { buildSections, buildSummary, entityTitle, iconFor, type DetailContext, type FieldEntry } from "@/lib/domain/recordView";
import { RelatedTable, ActivityTab, DocumentsTab } from "@/components/RecordTabs";

/**
 * Record detail.
 *
 * One screen serves every entity. It opens with a summary of the facts that matter, then a
 * tabbed workspace: Overview groups the fields by what they are, Activity is the audit trail,
 * Related lists the linked records and Documents shows the file register. Field-level
 * restrictions arrive already applied from the API, so this screen shows exactly what the
 * acting role may see.
 */
export default function RecordPage() {
  const params = useParams<{ entity: string; id: string }>();
  const router = useRouter();
  const { session, canAccessModule } = useSession();
  const { toasts, push, dismiss } = useToasts();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [meta, setMeta] = useState<MetaResponse | null>(null);
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState("overview");
  const [showEmpty, setShowEmpty] = useState(false);
  const [fieldQuery, setFieldQuery] = useState("");

  const entity = params?.entity ?? "";
  const id = params?.id ?? "";

  const load = useCallback(async () => {
    if (!entity || !id) return;
    try {
      const detail = await apiGet(entity, id);
      setData(detail);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load record");
    }
  }, [entity, id]);

  useEffect(() => {
    apiMeta().then(setMeta).catch(() => setMeta(null));
  }, []);

  const entityMeta = meta?.entities.find((e) => e.key === entity);
  const moduleKey = entityMeta?.module ?? entity;
  const allowed = meta !== null && canAccessModule(moduleKey);

  useEffect(() => {
    // The record is fetched only after the meta payload names the module and the acting role
    // may open it, so a link to a record outside the role's department never fires a
    // forbidden request before the access notice renders.
    if (!meta || !canAccessModule(moduleKey)) return;
    void load();
    apiFields(entity)
      .then((r) => setFields(r.fields))
      .catch(() => setFields([]));
  }, [meta, moduleKey, canAccessModule, load, entity]);

  const backTo = listRoute(entity);

  const context: DetailContext | null = useMemo(() => {
    if (!data) return null;
    return {
      entity,
      entityLabel: data.label,
      singular: data.label,
      icon: iconFor(entity),
      statusColumn: entityMeta?.status?.column,
      statusRegistry: entityMeta?.status?.registry,
      fields,
    };
  }, [data, entity, entityMeta, fields]);

  const sections = useMemo(() => (data && context ? buildSections(fields, data.record) : []), [data, context, fields]);
  const summary = useMemo(() => (data && context ? buildSummary(context, data.record) : []), [data, context]);

  const remove = async () => {
    setDeleting(true);
    try {
      await apiDelete(entity, id);
      push("Record deleted", "success");
      router.push(backTo ?? "/");
    } catch (e) {
      push(e instanceof Error ? e.message : "Delete failed", "danger");
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (error) {
    return (
      <div className="space-y-4">
        <InfoNote tone="danger">{error}</InfoNote>
        <Link href="/" className="text-[13px] font-medium text-ink-soft transition hover:text-ink">
          Back to the dashboard
        </Link>
      </div>
    );
  }

  if (meta !== null && !allowed) {
    return (
      <div className="space-y-4">
        <EmptyState title="This record is not available for the acting role" />
        <Link href="/" className="text-[13px] font-medium text-ink-soft transition hover:text-ink">
          Back to the dashboard
        </Link>
      </div>
    );
  }

  if (!data || !context)
    return (
      <div className="space-y-4" aria-hidden>
        <div className="ss-shimmer h-7 w-72 rounded" />
        <div className="ss-shimmer h-20 rounded-xl" />
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="ss-shimmer h-64 rounded-xl lg:col-span-2" />
          <div className="ss-shimmer h-64 rounded-xl" />
        </div>
      </div>
    );

  const record = data.record;
  const title = entityTitle(record, entity);
  const relatedKeys = Object.keys(data.related).filter((k) => (data.related[k]?.length ?? 0) > 0);
  const relatedCount = relatedKeys.reduce((n, k) => n + (data.related[k]?.length ?? 0), 0);
  const documents = data.related["Documents"] ?? [];
  const documentRows = documents.length > 0 ? documents : findDocumentRows(data.related);
  const nextSteps = actionsForEntity(entity);
  const subjectId = nextSteps[0]?.idField;

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "related", label: "Related", count: relatedCount },
    { key: "activity", label: "Activity" },
    { key: "documents", label: "Documents", count: documentRows.length },
  ];

  return (
    <div className="space-y-4">
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        icon={<Icon name={context.icon} className="h-[18px] w-[18px]" />}
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/" },
              { label: workspaceForModule(entityMeta?.module ?? entity)?.label ?? "Workspace" },
              backTo ? { label: data.label, href: backTo } : { label: data.label },
              { label: title },
            ]}
          />
        }
        title={title}
        description={<span className="font-mono text-[12px] text-faint">{entity} · {id}</span>}
        actions={
          <>
            {context.statusColumn ? (
              <StatusBadge registry={context.statusRegistry ?? ""} value={record[context.statusColumn]} />
            ) : null}
            {session?.canWrite ? (
              <>
                <Button variant="secondary" onClick={() => setEditOpen(true)}>
                  <Icon name="pen" className="h-[14px] w-[14px]" />
                  Edit
                </Button>
                <Button variant="ghost" onClick={() => setConfirmDelete(true)} title="Delete this record" ariaLabel="Delete this record">
                  <Icon name="x" className="h-[14px] w-[14px]" strokeWidth={2} />
                </Button>
              </>
            ) : null}
          </>
        }
      />

      {backTo ? (
        <Link href={backTo} className="inline-flex items-center gap-1 text-[13px] font-medium text-ink-soft transition hover:text-ink">
          <span aria-hidden>&larr;</span> Back to {data.label}
        </Link>
      ) : null}

      {summary.length > 0 ? (
        <Card>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
            {summary.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-faint">{fact.label}</dt>
                <dd className={`mt-1 truncate text-[15px] font-semibold leading-tight ${factTone(fact.tone)}`} title={fact.value}>
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      ) : null}

      {entity === "startups" ? <SeasonHistory applications={data.related["Applications"] ?? []} /> : null}

      <WorkflowPanel
        ctx={{
          entity,
          statusRegistry: context.statusRegistry,
          statusValue: context.statusColumn ? record[context.statusColumn] : undefined,
          actions: nextSteps.map((s) => s.action),
          subjectId,
          recordId: subjectId ? subjectDefaultFor(entity, subjectId, record) : id,
        }}
        artifactStageKeys={data.stageKeys ?? artifactStageKeysFor(entity, data.related, context.statusColumn ? record[context.statusColumn] : undefined)}
        artifactDone={artifactDoneActions(entity, data.related)}
        // After a step runs the record is refetched, so the panel moves to the new stage and
        // stops offering an action that has just been recorded — no manual reload needed.
        onRefresh={load}
      />

      <Card padded={false}>
        <Toolbar
          right={
            tab === "overview" ? (
              <>
                <label className="flex items-center gap-1.5 text-[12px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={showEmpty}
                    onChange={(e) => setShowEmpty(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-hair-strong accent-brand"
                  />
                  Show empty fields
                </label>
                <div className="relative w-44">
                  <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-[13px] w-[13px] -translate-y-1/2 text-faint" />
                  <input
                    value={fieldQuery}
                    onChange={(e) => setFieldQuery(e.target.value)}
                    placeholder="Find a field"
                    className="w-full rounded-lg border border-hair bg-surface py-[6px] pl-7 pr-2 text-[12.5px] text-ink transition placeholder:text-faint focus:border-brand focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/15"
                  />
                </div>
              </>
            ) : null
          }
        >
          <div className="inline-flex items-center gap-0.5 rounded-lg border border-hair bg-surface p-0.5" role="tablist">
            {tabs.map((t) => {
              const active = t.key === tab;
              return (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-[12.5px] font-medium transition ${
                    active ? "bg-canvas text-ink shadow-card" : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {t.label}
                  {t.count !== undefined ? <span className="ss-num text-[11px] text-faint">{t.count}</span> : null}
                </button>
              );
            })}
          </div>
        </Toolbar>

        <div className="p-4">
          {tab === "overview" ? (
            <OverviewTab
              sections={sections}
              record={record}
              query={fieldQuery}
              showEmpty={showEmpty}
              statusColumn={context.statusColumn}
              statusRegistry={context.statusRegistry}
            />
          ) : null}
          {tab === "related" ? (
            relatedKeys.length === 0 ? (
              <EmptyState title="No related records yet" hint="Linked records appear here as the workflow moves forward." />
            ) : (
              <div className="space-y-4">
                {relatedKeys.map((key) => (
                  <RelatedTable key={key} label={key} rows={data.related[key]} parentEntity={entity} />
                ))}
              </div>
            )
          ) : null}
          {tab === "activity" ? <ActivityTab entity={entity} id={id} /> : null}
          {tab === "documents" ? <DocumentsTab rows={documentRows} /> : null}
        </div>
      </Card>

      <EntityForm
        entity={entity}
        record={record}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          push("Changes saved", "success");
          void load();
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this record?"
        message={
          <>
            <strong>{title}</strong> will be removed. This cannot be undone from this screen.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </div>
  );
}

/** Grouped fields: each section is a small panel of label/value rows, empty ones hidden by default. */
function OverviewTab({
  sections,
  record,
  query,
  showEmpty,
  statusColumn,
  statusRegistry,
}: {
  sections: ReturnType<typeof buildSections>;
  record: Record<string, unknown>;
  query: string;
  showEmpty: boolean;
  statusColumn?: string;
  statusRegistry?: string;
}) {
  const q = query.trim().toLowerCase();
  const visible = sections
    .map((section) => ({
      ...section,
      fields: section.fields.filter((f) => {
        if (q && !f.label.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return false;
        if (!showEmpty && f.empty) return false;
        return true;
      }),
    }))
    .filter((section) => section.fields.length > 0);

  if (visible.length === 0)
    return <EmptyState title="No fields to show" hint="Clear the filter or tick “Show empty fields” to see everything." />;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {visible.map((section) => (
        <div key={section.key} className="rounded-xl border border-hair bg-canvas">
          <div className="border-b border-hair px-3.5 py-2.5">
            <h3 className="text-[12.5px] font-semibold text-ink">{section.label}</h3>
            {section.hint ? <p className="mt-0.5 text-[11.5px] text-faint">{section.hint}</p> : null}
          </div>
          <dl className="divide-y divide-hair">
            {section.fields.map((field) => (
              <div key={field.name} className="grid grid-cols-1 gap-1 px-3.5 py-2 sm:grid-cols-[minmax(7rem,40%)_1fr] sm:gap-3">
                <dt className="text-[12px] leading-snug text-faint">{field.label}</dt>
                <dd className="min-w-0 text-[13px] leading-snug text-ink">
                  <FieldValue field={field} record={record} statusColumn={statusColumn} statusRegistry={statusRegistry} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}

/** One field value, rendered by its kind rather than its column name. */
function FieldValue({
  field,
  record,
  statusColumn,
  statusRegistry,
}: {
  field: FieldEntry;
  record: Record<string, unknown>;
  statusColumn?: string;
  statusRegistry?: string;
}) {
  if (field.empty) return <span className="text-faint">&ndash;</span>;
  const value = field.value;

  if (field.name === statusColumn) return <StatusBadge registry={statusRegistry ?? ""} value={value} />;

  if (field.kind === "boolean" || BOOLEAN_COLUMNS.has(field.name))
    return value ? <Badge tone="success">Yes</Badge> : <span className="text-faint">No</span>;

  if (field.kind === "money" || MONEY_COLUMNS.has(field.name)) return <Money paise={value} />;

  if (field.kind === "date") return <DateText value={value} relative={field.name.endsWith("due") || field.name === "signing_deadline"} />;

  if (field.relation) {
    // A season is admin-only, so show it as a badge rather than a link that would 403.
    if (!isLinkableEntity(field.relation.entity)) {
      return <Badge tone="neutral">{String(record[`${field.name}_label`] ?? value)}</Badge>;
    }
    return <RefCell entity={field.relation.entity} id={value} label={record[`${field.name}_label`]} />;
  }

  if (field.kind === "select") {
    const label = field.options?.find((o) => o.value === String(value))?.label;
    if (label) return <Badge tone="info">{label}</Badge>;
    return <span>{humanise(String(value))}</span>;
  }

  if (field.kind === "textarea") {
    const text = String(value);
    return (
      <span className="block whitespace-pre-wrap break-words text-[12.5px] leading-relaxed text-ink-soft">{text}</span>
    );
  }

  if (/percent|_pct$/.test(field.name)) return <span className="ss-num">{String(value)}%</span>;

  const text = String(value);
  // An enum-like value ("early_revenue") reads far better as "Early revenue".
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text)) return <span>{humanise(text)}</span>;
  return <span className="break-words">{text}</span>;
}

function factTone(tone?: string): string {
  switch (tone) {
    case "danger":
      return "text-risk";
    case "warning":
      return "text-warn";
    case "success":
      return "text-ok";
    case "progress":
      return "text-brand-ink";
    default:
      return "text-ink";
  }
}

/**
 * A startup can apply in more than one season. Its record shows every season it has taken
 * part in, with the status of that season's application, so a repeat applicant keeps its
 * history instead of being collapsed to a single, current application.
 */
function SeasonHistory({ applications }: { applications: Record<string, unknown>[] }) {
  if (applications.length === 0) return null;
  const rows = [...applications].sort((a, b) => String(b.season_id ?? "").localeCompare(String(a.season_id ?? "")));
  return (
    <Card title="Season participation" subtitle="Every season this startup has applied to">
      <ul className="space-y-2">
        {rows.map((app) => (
          <li key={String(app.id)} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <Badge tone="neutral">{String(app.season_id_label ?? app.season_id ?? "")}</Badge>
            <Link
              href={`/records/applications/${String(app.id)}`}
              className="font-medium text-ink underline decoration-hair-strong underline-offset-2 transition hover:decoration-ink"
            >
              {String(app.reference_no)}
            </Link>
            <StatusBadge registry="application" value={app.status} />
            <span className="text-[12px] text-ink-soft">{String(app.stage_at_application ?? "").replace(/_/g, " ")}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** Find the document rows whatever label the API gave the register. */
function findDocumentRows(related: Record<string, Record<string, unknown>[]>): Record<string, unknown>[] {
  for (const [label, rows] of Object.entries(related)) {
    if (label.toLowerCase().includes("document")) return rows;
  }
  return [];
}
