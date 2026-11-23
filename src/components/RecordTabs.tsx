"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiList, rowLabel } from "@/lib/client/api";
import { RefCell } from "@/components/EntityBrowser";
import {
  Badge,
  Card,
  DateText,
  EmptyState,
  Money,
  StatusBadge,
  Table,
  TableSkeleton,
} from "@/components/ui";
import { humanise } from "@/lib/domain/format";
import { BOOLEAN_COLUMNS, fieldLabel, MONEY_COLUMNS } from "@/lib/domain/fieldLabels";
import { isLinkableEntity, recordHref, REF_ENTITY } from "@/lib/client/recordLinks";

/**
 * Related records.
 *
 * One table per related entity, using the same value rules as the rest of the app: a resolved
 * foreign key becomes a link to that record, money is formatted, and a long list is collapsed
 * behind a "show all" so a record with ten conversations does not push the page down.
 */
export function RelatedTable({
  label,
  rows,
  parentEntity,
}: {
  label: string;
  rows: Record<string, unknown>[];
  parentEntity: string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const columns = useMemo(() => buildColumns(rows), [rows]);
  const visible = expanded ? rows : rows.slice(0, 5);

  if (rows.length === 0) return null;

  const entityGuess = guessEntity(label, parentEntity);
  const linkable = entityGuess !== parentEntity;

  return (
    <Card
      title={label}
      subtitle={`${rows.length} record${rows.length === 1 ? "" : "s"}`}
      padded={false}
      actions={
        rows.length > 5 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[12px] font-medium text-ink-soft transition hover:text-ink"
          >
            {expanded ? "Show less" : `Show all ${rows.length}`}
          </button>
        ) : null
      }
    >
      <Table
        dense
        columns={columns}
        rows={visible}
        onRowClick={
          linkable
            ? (row) => {
                const href = recordHref(singularise(entityGuess), row.id);
                if (href) router.push(href);
              }
            : undefined
        }
      />
    </Card>
  );
}

function buildColumns(rows: Record<string, unknown>[]) {
  const sample = rows[0] ?? {};
  const skip = new Set(["created_at", "updated_at", "score_reasons", "id"]);
  const allKeys = Object.keys(sample).filter((k) => !skip.has(k) && !k.endsWith("_label"));

  // Columns that only ever repeat the record's own label would show the same text twice.
  const labelKeys = new Set(allKeys.filter((k) => rows.every((r) => String(r[k] ?? "") === rowLabel(r))));
  // With more than one row, a column that never varies is just noise.
  const varies = (k: string) => new Set(rows.map((r) => String(r[k] ?? ""))).size > 1;

  const keys = allKeys.filter((k) => !labelKeys.has(k) && (rows.length === 1 || varies(k))).slice(0, 6);

  const leading = {
    key: "__record",
    label: "Record",
    render: (row: Record<string, unknown>) => (
      <span className="font-medium text-ink">{rowLabel(row)}</span>
    ),
  };

  return [
    leading,
    ...keys.map((k) => {
      const related = REF_ENTITY[k];
      const money = MONEY_COLUMNS.has(k);
      const bool = BOOLEAN_COLUMNS.has(k);
      const statusLike = k === "status" || k.endsWith("_status") || k === "outcome" || k === "recommendation";
      return {
        key: k,
        label: fieldLabel(k, humanise),
        render:
          related && isLinkableEntity(related)
            ? (row: Record<string, unknown>) => <RefCell entity={related} id={row[k]} label={row[`${k}_label`]} />
            : related
              ? (row: Record<string, unknown>) => (
                  <Badge tone="neutral">{String(row[`${k}_label`] ?? row[k] ?? "")}</Badge>
                )
              : money
                ? (row: Record<string, unknown>) => <Money paise={row[k]} compact />
                : bool
                  ? (row: Record<string, unknown>) =>
                      row[k] ? (
                        <Badge tone="success">Yes</Badge>
                      ) : (
                        <span className="text-faint">No</span>
                      )
                  : statusLike
                    ? (row: Record<string, unknown>) => <TextCell value={row[k]} statusLike />
                    : (row: Record<string, unknown>) => <TextCell value={row[k]} />,
      };
    }),
  ];
}

/** A plain cell: an enum-like value is humanised, everything else prints as it is. */
function TextCell({ value, statusLike }: { value: unknown; statusLike?: boolean }) {
  if (value === null || value === undefined || value === "") return <span className="text-faint">&ndash;</span>;
  const text = String(value);
  if (statusLike) return <Badge tone="neutral">{humanise(text)}</Badge>;
  if (/^[a-z][a-z0-9]*(_[a-z0-9]+)+$/.test(text)) return <span>{humanise(text)}</span>;
  if (text.length > 80) return <span title={text}>{text.slice(0, 80)}&hellip;</span>;
  return <span>{text}</span>;
}

function singularise(entity: string): string {
  if (entity.endsWith("ies")) return `${entity.slice(0, -3)}y`;
  if (entity.endsWith("ses")) return entity.slice(0, -2);
  if (entity.endsWith("s")) return entity.slice(0, -1);
  return entity;
}

function guessEntity(label: string, parent: string): string {
  const map: Record<string, string> = {
    Applications: "applications",
    Founders: "founders",
    "Investor conversations": "matches",
    "Startup conversations": "matches",
    Commitments: "commitments",
    "Funding rounds": "funding_rounds",
    Deals: "deals",
    "Upfront fees": "upfront_fees",
    "Success fees": "success_fees",
    Screening: "screenings",
    Bootcamp: "bootcamp_attendance",
    "Analyst evaluation": "analyst_evaluations",
    MoU: "mous",
    "IRR reports": "irr_reports",
    Agreements: "investor_agreements",
    "Grade assessments": "investor_grade_assessments",
    Tranches: "tranches",
    "Investor allocations": "deals",
    "One-to-one slots": "pitch_day_slots",
    Registrations: "event_registrations",
    Roles: "community_member_roles",
    "Support requests": "support_requests",
    Documents: "documents",
    Tasks: "tasks",
  };
  return map[label] ?? parent;
}

/** Plural entity key -> the singular `entity_type` written on audit rows. */
const AUDIT_TYPE: Record<string, string> = {
  applications: "application",
  startups: "startup",
  founders: "founder",
  screenings: "screening",
  analyst_evaluations: "analyst_evaluation",
  mous: "mou",
  irr_reports: "irr_report",
  investors: "investor",
  investor_agreements: "investor_agreement",
  matches: "match",
  commitments: "commitment",
  funding_rounds: "funding_round",
  deals: "deal",
  tranches: "tranche",
  upfront_fees: "upfront_fee",
  success_fees: "success_fee",
  committee_decisions: "committee_decision",
  documents: "document",
  tasks: "task",
  policies: "policy",
  virtual_pitches: "virtual_pitch",
  pitch_days: "pitch_day",
  episodes: "episode",
  telecasts: "telecast",
  community_members: "community_member",
  community_events: "community_event",
  referrals: "referral",
  support_requests: "support_request",
};

/**
 * Activity.
 *
 * The audit trail for one record, read straight from the audit entity with a server-side
 * filter so it stays accurate however large the log grows. Score, amount and approval changes
 * show their before and after values, which is what makes the trail worth reading.
 */
export function ActivityTab({ entity, id }: { entity: string; id: string }) {
  const [rows, setRows] = useState<Record<string, unknown>[] | null>(null);

  useEffect(() => {
    let alive = true;
    const type = AUDIT_TYPE[entity] ?? entity;
    apiList("audit_events", { filters: { entity_type: type, entity_id: id }, limit: 100, sort: "created_at", direction: "desc" })
      .then((r) => alive && setRows(r.items))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [entity, id]);

  if (rows === null) return <TableSkeleton rows={4} cols={2} />;
  if (rows.length === 0)
    return <EmptyState title="No changes recorded yet" hint="Every score, amount, approval and status change is written here as it happens." />;

  return (
    <ol className="relative space-y-3.5 border-l border-hair pl-5">
      {rows.map((r) => (
        <li key={String(r.id)} className="relative">
          <span
            className={`absolute -left-[23px] top-1 h-2.5 w-2.5 rounded-full ring-4 ring-canvas ${
              String(r.action) === "delete" ? "bg-risk" : String(r.action) === "create" ? "bg-ok" : "bg-info"
            }`}
            aria-hidden
          />
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="text-[12.5px] font-medium text-ink">{humanise(String(r.action ?? "change"))}</span>
            <DateText value={r.created_at} />
          </div>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            by <span className="font-medium text-ink">{String(r.actor_name ?? "System")}</span>
          </p>
          {r.field ? (
            <p className="mt-1.5 rounded-lg border border-hair bg-surface px-2.5 py-1.5 text-[12px] leading-snug text-ink-soft">
              <span className="font-medium text-ink">{fieldLabel(String(r.field), humanise)}</span>
              <br />
              <span className="text-faint line-through">{String(r.before_value ?? "-")}</span>{" "}
              <span className="text-faint">&rarr;</span> <span className="font-medium text-ink">{String(r.after_value ?? "-")}</span>
            </p>
          ) : null}
          {r.reason ? <p className="mt-1 text-[11.5px] italic leading-snug text-ink-soft">{String(r.reason)}</p> : null}
        </li>
      ))}
    </ol>
  );
}

/**
 * Documents.
 *
 * The document register for a record: what was filed, at which version, who signed and
 * whether it is still a draft. Falls back to a clear empty state for records that have no
 * document register of their own.
 */
export function DocumentsTab({ rows }: { rows: Record<string, unknown>[] }) {
  if (rows.length === 0)
    return (
      <EmptyState
        title="No documents on file yet"
        hint="Agreements, reports and signed letters appear here as they are filed against this record."
      />
    );
  return (
    <Card padded={false}>
      <Table
        columns={[
          { key: "title", label: "Document" },
          { key: "document_type", label: "Type" },
          { key: "version", label: "Version" },
          { key: "status", label: "Status", render: (row) => <StatusBadge registry="document" value={row.status} /> },
          { key: "signer", label: "Signed by" },
          { key: "created_at", label: "Filed", render: (row) => <DateText value={row.created_at} /> },
        ]}
        rows={rows}
      />
    </Card>
  );
}
