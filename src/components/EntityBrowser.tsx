"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiDelete, apiList, rowLabel, type ListResponse } from "@/lib/client/api";
import { recordHref } from "@/lib/client/recordLinks";
import { workspaceForModule } from "@/lib/domain/navigation";
import { useSession } from "./SessionProvider";
import { EntityForm } from "./EntityForm";
import {
  Badge,
  Breadcrumb,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  Pagination,
  Select,
  StatusBadge,
  Table,
  TableSkeleton,
  Toaster,
  Toolbar,
  useToasts,
} from "./ui";
import { Icon } from "./icons";

/**
 * Generic list screen.
 *
 * Columns are declared per screen; search, filters, sorting, paging, CSV export and the
 * status badge are handled here, so a new list screen is a column definition plus a filter
 * list. Results reload from the server whenever the query, filters, sort or season change.
 */

export interface ColumnSpec {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
  align?: "left" | "right";
  /** Marks a money or count column so sorting and CSV export treat it as a number. */
  numeric?: boolean;
  /** Set false to keep a column out of the sort menu (for example an actions column). */
  sortable?: boolean;
}

export interface FilterSpec {
  column: string;
  label: string;
  options: { value: string; label: string }[];
}

interface EntityBrowserProps {
  entity: string;
  /** Access-control module; defaults to the entity key when they differ. */
  module?: string;
  title: string;
  description?: ReactNode;
  columns: ColumnSpec[];
  filters?: FilterSpec[];
  statusRegistry?: string;
  searchPlaceholder?: string;
  defaultFilters?: Record<string, string>;
  actions?: ReactNode;
  rowHref?: (row: Record<string, unknown>) => string | null;
  limit?: number;
  toolbar?: ReactNode;
  /** Set false for entities that must be created through a workflow action, not the raw form. */
  canCreate?: boolean;
  onRefreshRef?: (fn: () => void) => void;
}

const PAGE_SIZES = [25, 50, 100, 250];

/** Read the list view from the URL so a filtered, sorted or paged view can be shared or reloaded. */
function readUrlState(): { q: string; sort: string | null; dir: string | null; offset: number; filters: Record<string, string> } {
  if (typeof window === "undefined") return { q: "", sort: null, dir: null, offset: 0, filters: {} };
  const params = new URLSearchParams(window.location.search);
  const filters: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    if (key.startsWith("f.")) filters[key.slice(2)] = value;
  }
  return {
    q: params.get("q") ?? "",
    sort: params.get("sort"),
    dir: params.get("dir"),
    offset: Number(params.get("offset") ?? "0") || 0,
    filters,
  };
}

export function EntityBrowser({
  entity,
  module,
  title,
  description,
  columns,
  filters = [],
  searchPlaceholder = "Search\u2026",
  defaultFilters = {},
  actions,
  rowHref,
  limit = 50,
  toolbar,
  canCreate = true,
  onRefreshRef,
}: EntityBrowserProps) {
  const { canAccessModule, seasonId, session } = useSession();
  const { toasts, push, dismiss } = useToasts();
  const initial = useMemo(readUrlState, []);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(initial.q);
  const [debouncedSearch, setDebouncedSearch] = useState(initial.q);
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({ ...defaultFilters, ...initial.filters });
  const [sort, setSort] = useState<{ key: string; direction: "asc" | "desc" } | null>(
    initial.sort ? { key: initial.sort, direction: initial.dir === "asc" ? "asc" : "desc" } : null,
  );
  const [offset, setOffset] = useState(initial.offset);
  const [pageSize, setPageSize] = useState(limit);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, unknown> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Record<string, unknown> | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce the typed query so a burst of keystrokes issues one request.
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setOffset(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  // Mirror the view into the URL (without a history entry) so it survives a reload and can be shared.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (sort) {
      params.set("sort", sort.key);
      params.set("dir", sort.direction);
    }
    if (offset) params.set("offset", String(offset));
    for (const [key, value] of Object.entries(activeFilters)) {
      if (value) params.set(`f.${key}`, value);
    }
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `${window.location.pathname}?${qs}` : window.location.pathname);
  }, [debouncedSearch, sort, offset, activeFilters]);

  const allowed = canAccessModule(module ?? entity);
  const load = useCallback(async () => {
    // A module the acting role cannot open would answer 403 and paint a red error over a screen
    // the user should simply not see; the gate below already renders the notice instead.
    if (!allowed) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await apiList(entity, {
        search: debouncedSearch,
        filters: activeFilters,
        limit: pageSize,
        offset,
        sort: sort?.key,
        direction: sort?.direction,
      });
      setData(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  }, [entity, debouncedSearch, activeFilters, pageSize, offset, sort, allowed]);

  useEffect(() => {
    void load();
  }, [load, seasonId]);

  // A different season is a different data set, so return to the first page.
  useEffect(() => {
    setOffset(0);
  }, [seasonId]);

  useEffect(() => {
    onRefreshRef?.(() => void load());
  }, [onRefreshRef, load]);

  const activeFilterCount = useMemo(
    () => Object.values(activeFilters).filter((v) => v !== "" && v !== undefined).length,
    [activeFilters],
  );

  const toggleSort = (key: string) => {
    setOffset(0);
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  };

  const clearAll = () => {
    setSearch("");
    setActiveFilters(defaultFilters);
    setSort(null);
    setOffset(0);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditing(row);
    setFormOpen(true);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiDelete(entity, String(pendingDelete.id));
      push(`Record deleted`, "success");
      setPendingDelete(null);
      await load();
    } catch (e) {
      push(e instanceof Error ? e.message : "Could not delete the record", "danger");
    } finally {
      setDeleting(false);
    }
  };

  const exportCsv = () => {
    const rows = data?.items ?? [];
    if (rows.length === 0) {
      push("Nothing to export for the current filters", "info");
      return;
    }
    const header = columns.map((c) => c.label);
    const cell = (row: Record<string, unknown>, col: ColumnSpec) => {
      const value = row[col.key];
      if (value === null || value === undefined) return "";
      const text = typeof value === "object" ? JSON.stringify(value) : String(value);
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    };
    const lines = [header, ...rows.map((row) => columns.map((c) => cell(row, c)))];
    const csv = lines.map((line) => line.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    push(`Exported ${rows.length} row${rows.length === 1 ? "" : "s"} to CSV`, "success");
  };

  if (!canAccessModule(module ?? entity)) {
    return (
      <Card title={title}>
        <InfoBlock />
      </Card>
    );
  }

  const total = data?.total ?? 0;
  const filtered = Boolean(debouncedSearch) || activeFilterCount > 0;
  const singular = (data?.singular ?? title).toLowerCase();
  const canEdit = Boolean(session?.canWrite);
  const canCreateRecord = canEdit && canCreate;
  const workspace = workspaceForModule(module ?? entity);

  const allColumns: ColumnSpec[] = canEdit
    ? [
        ...columns,
        {
          key: "__actions",
          label: "",
          sortable: false,
          align: "right" as const,
          render: (row: Record<string, unknown>) => (
            <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => openEdit(row)}
                title="Edit"
                aria-label="Edit"
                className="rounded-md p-1.5 text-faint transition hover:bg-hover hover:text-ink"
              >
                <Icon name="pen" className="h-[14px] w-[14px]" />
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(row)}
                title="Delete"
                aria-label="Delete"
                className="rounded-md p-1.5 text-faint transition hover:bg-risk-soft hover:text-risk"
              >
                <Icon name="x" className="h-[14px] w-[14px]" strokeWidth={2} />
              </button>
            </div>
          ),
        },
      ]
    : columns;

  return (
    <div>
      <Toaster toasts={toasts} onDismiss={dismiss} />
      <PageHeader
        breadcrumb={
          <Breadcrumb
            items={[
              { label: "Dashboard", href: "/" },
              { label: workspace?.label ?? "Workspace" },
              { label: title },
            ]}
          />
        }
        title={title}
        description={description}
        actions={actions}
      />

      <Card padded={false}>
        <Toolbar
          right={
            <>
              {toolbar}
              <span className="ss-num rounded-md bg-surface px-2 py-[3px] text-[12px] font-medium text-faint ring-1 ring-inset ring-hair">
                {data ? `${total}` : "\u2026"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void load()}
                title="Reload from the server"
                aria-label="Reload from the server"
              >
                <Icon name="refresh" className="h-[14px] w-[14px]" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={exportCsv}
                title="Download the rows on this page as CSV"
                aria-label="Export as CSV"
              >
                <Icon name="download" className="h-[14px] w-[14px]" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(window.location.href)
                    .then(() => push("View link copied to the clipboard", "success"))
                    .catch(() => push("Could not copy the link", "danger"));
                }}
                title="Copy a link to this exact view"
                aria-label="Copy a link to this exact view"
              >
                <Icon name="link" className="h-[14px] w-[14px]" />
              </Button>
              {canCreateRecord ? (
                <Button size="sm" variant="brand" onClick={openCreate} title={`Create a new ${singular}`}>
                  <Icon name="plus" className="h-[14px] w-[14px]" />
                  New {singular}
                </Button>
              ) : null}
            </>
          }
        >
          <div className="relative min-w-[14rem] flex-1">
            <Icon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-faint"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-hair bg-surface py-[7px] pl-8 pr-8 text-[13px] text-ink transition placeholder:text-faint hover:border-hair-strong focus:border-brand focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-faint transition hover:bg-hover hover:text-ink"
              >
                <Icon name="x" className="h-[13px] w-[13px]" strokeWidth={2} />
              </button>
            ) : null}
          </div>
          {filters.map((f) => (
            <div key={f.column} className="w-[11.5rem]">
              <Select
                value={activeFilters[f.column] ?? ""}
                onChange={(v) => {
                  setActiveFilters((prev) => ({ ...prev, [f.column]: v }));
                  setOffset(0);
                }}
                placeholder={`All ${f.label.toLowerCase()}`}
                options={f.options}
              />
            </div>
          ))}
        </Toolbar>

          {filtered ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-hair bg-surface/50 px-3 py-2">
              <Icon name="filter" className="h-[13px] w-[13px] text-faint" />
              {debouncedSearch ? <FilterChip label={`Search: "${debouncedSearch}"`} onClear={() => setSearch("")} /> : null}
              {filters.map((f) => {
                const value = activeFilters[f.column];
                if (!value) return null;
                const label = f.options.find((o) => o.value === value)?.label ?? value;
                return (
                  <FilterChip
                    key={f.column}
                    label={`${f.label}: ${label}`}
                    onClear={() => setActiveFilters((prev) => ({ ...prev, [f.column]: "" }))}
                  />
                );
              })}
              <button
                type="button"
                onClick={clearAll}
                className="ml-1 text-[12px] font-medium text-brand-ink hover:underline"
              >
                Clear all
              </button>
            </div>
          ) : null}

        {error ? (
          <div className="flex items-center gap-2 border-b border-risk-line bg-risk-soft px-3 py-2 text-[12.5px] text-risk">
            <Icon name="alert" className="h-[15px] w-[15px]" />
            {error}
            <button type="button" onClick={() => void load()} className="ml-auto font-medium underline">
              Try again
            </button>
          </div>
        ) : null}

        {loading && !data ? (
          <TableSkeleton rows={9} cols={Math.min(allColumns.length, 6)} />
        ) : (
          <>
            <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
              <Table
                columns={allColumns}
                rows={data?.items ?? []}
                empty={filtered ? "No records match the current search and filters" : "No records yet"}
                emptyAction={
                  filtered ? (
                    <Button variant="secondary" size="sm" onClick={clearAll}>
                      Clear filters
                    </Button>
                  ) : canCreateRecord ? (
                    <Button size="sm" onClick={openCreate}>
                      Create the first {singular}
                    </Button>
                  ) : undefined
                }
                stickyHeader
                sort={sort}
                onSortChange={toggleSort}
                onRowClick={
                  rowHref
                    ? (row) => {
                        const href = rowHref(row);
                        if (href) window.location.assign(href);
                      }
                    : undefined
                }
              />
            </div>
            {total > 0 ? (
              <Pagination
                offset={data?.offset ?? 0}
                limit={pageSize}
                total={total}
                onOffset={setOffset}
                leading={
                  <label className="flex items-center gap-2">
                    <span className="text-[12px] text-faint">Rows per page</span>
                    <div className="w-20">
                      <Select
                        value={String(pageSize)}
                        onChange={(v) => {
                          setPageSize(Number(v));
                          setOffset(0);
                        }}
                        options={PAGE_SIZES.map((n) => ({ value: String(n), label: String(n) }))}
                      />
                    </div>
                  </label>
                }
              />
            ) : null}
          </>
        )}
      </Card>

      <EntityForm
        entity={entity}
        record={editing}
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          push(editing ? "Changes saved" : `${singular.charAt(0).toUpperCase()}${singular.slice(1)} created`, "success");
          void load();
        }}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={`Delete this ${singular}?`}
        message={
          <>
            {pendingDelete ? <strong>{rowLabel(pendingDelete)}</strong> : null} will be removed. This cannot be undone
            from this screen.
          </>
        }
        confirmLabel="Delete"
        busy={deleting}
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-hair-strong bg-canvas px-2 py-0.5 text-[12px] text-ink-soft">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label}`}
        className="rounded-full p-0.5 text-faint transition hover:bg-hover hover:text-ink"
      >
        <Icon name="x" className="h-[11px] w-[11px]" strokeWidth={2.4} />
      </button>
    </span>
  );
}

function InfoBlock() {
  return (
    <EmptyState
      title="This module is not available for the acting role"
      hint="Switch the acting user in the header to see this module."
    />
  );
}

export function StatusCell({ registry, value }: { registry: string; value: unknown }) {
  return <StatusBadge registry={registry} value={value} />;
}

export function LinkCell({ entity, id, label }: { entity: string; id: unknown; label: string }) {
  if (!id) return <span className="text-faint">-</span>;
  return (
    <Link
      href={`/records/${entity}/${String(id)}`}
      className="font-medium text-ink underline decoration-hair-strong underline-offset-2 transition hover:decoration-ink"
    >
      {label}
    </Link>
  );
}

/**
 * A link to a related record that shows the human label the server resolved for the foreign
 * key (`<column>_label`) and keeps the raw id alongside it in small type. Falls back to the
 * id when no label was resolved, so the link is never blank.
 */
export function RefCell({ entity, id, label }: { entity: string; id: unknown; label?: unknown }) {
  if (!id) return <span className="text-faint">-</span>;
  const hasLabel = label !== undefined && label !== null && label !== "" && String(label) !== String(id);
  return (
    <Link
      href={`/records/${entity}/${String(id)}`}
      className="font-medium text-ink underline decoration-hair-strong underline-offset-2 transition hover:decoration-ink"
      title={`${String(id)}`}
    >
      {hasLabel ? String(label) : String(id)}
      {hasLabel ? <span className="ml-1.5 font-mono text-[10px] text-faint">{String(id)}</span> : null}
    </Link>
  );
}

/**
 * A link to a record whose type is stored on the row itself (audit events, documents,
 * handovers and tasks carry `entity_type` plus `entity_id`). The target route is derived from
 * the type, so the same cell works for every record the row can point at.
 */
export function RecordRef({ type, id, label }: { type: unknown; id: unknown; label?: unknown }) {
  const href = recordHref(type, id);
  if (!id) return <span className="text-faint">-</span>;
  if (!href) return <span className="font-mono text-xs text-ink-soft">{String(id)}</span>;
  const text = label !== undefined && label !== null && label !== "" ? String(label) : String(id);
  return (
    <Link
      href={href}
      className="font-medium text-ink underline decoration-hair-strong underline-offset-2 transition hover:decoration-ink"
    >
      {text}
    </Link>
  );
}

export function CountBadge({ value, tone = "neutral" }: { value: number; tone?: "neutral" | "danger" | "warning" | "success" }) {
  if (!value) return <span className="text-hair-strong">0</span>;
  return <Badge tone={tone}>{value}</Badge>;
}
