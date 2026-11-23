"use client";

import { useEffect, useState } from "react";
import { apiList, ApiError } from "@/lib/client/api";
import { Table } from "./ui";
import { RecordRef, RefCell } from "./EntityBrowser";
import { humanise } from "@/lib/domain/format";
import { REF_ENTITY } from "@/lib/client/recordLinks";

/**
 * Compact read-only table for a secondary entity on a page that is already about
 * something else, for example the handover register on the IRR screen.
 */
export function MiniTable({
  entity,
  columns,
  filters,
  empty,
  limit = 50,
  renderers,
  refs,
}: {
  entity: string;
  columns: string[];
  filters?: Record<string, string>;
  empty?: string;
  limit?: number;
  renderers?: Record<string, (row: Record<string, unknown>) => React.ReactNode>;
  /** Extra or overriding foreign-key mappings for columns not in the shared map. */
  refs?: Record<string, string>;
}) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  const filterKey = JSON.stringify(filters ?? {});
  useEffect(() => {
    setError(null);
    setForbidden(false);
    // filterKey stands in for the filters object so the effect reruns only when it changes.
    apiList(entity, { limit, filters: JSON.parse(filterKey) as Record<string, string> | undefined })
      .then((r) => setRows(r.items))
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 403) {
          setForbidden(true);
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load");
      });
  }, [entity, limit, filterKey]);

  if (forbidden) {
    return (
      <p className="px-4 py-3 text-xs text-faint">
        Not available for your role.
      </p>
    );
  }
  if (error) return <div className="px-4 py-3 text-sm text-risk">{error}</div>;

  return (
    <Table
      dense
      columns={columns.map((c) => {
        const related = refs?.[c] ?? REF_ENTITY[c];
        const custom = renderers?.[c];
        const render =
          custom ??
          (related
            ? (row: Record<string, unknown>) => <RefCell entity={related} id={row[c]} label={row[`${c}_label`]} />
            : c === "entity_id"
              ? (row: Record<string, unknown>) => <RecordRef type={row.entity_type} id={row.entity_id} />
              : undefined);
        return { key: c, label: humanise(c), render };
      })}
      rows={rows}
      empty={empty ?? "No records"}
    />
  );
}
