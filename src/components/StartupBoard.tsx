"use client";

/**
 * Startup progress board.
 *
 * One row per startup, grouped so a reader can scan left to right and answer "how far along
 * is this startup, and is anything wrong?" without reading a paragraph. Twelve flat columns
 * forced sideways scrolling and stacked unlabelled chips that read as duplicates; the board
 * now carries six groups, each cell labels its own values, and the identity column is pinned
 * so the startup name stays visible while the rest scrolls.
 */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { BoardRow } from "@/lib/client/api";
import { Badge, Money, Segmented, StatusBadge, Toolbar } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { IconName } from "@/components/icons";
import { humanise } from "@/lib/domain/format";
import {
  boardAlerts,
  boardMilestones,
  compareBoardRows,
  currentGate,
  gatesCleared,
  milestonesDone,
  type BoardAlert,
  type SortKey,
} from "@/lib/domain/boardView";

const VIEWS = [
  { value: "all", label: "All" },
  { value: "attention", label: "Needs attention" },
  { value: "shot", label: "Shot" },
  { value: "funded", label: "Funded" },
];

const COLUMNS: { key: SortKey; label: string; icon: IconName; width: string; numeric?: boolean }[] = [
  { key: "startup", label: "Startup", icon: "sprout", width: "210px" },
  { key: "journey", label: "Selection", icon: "check-square", width: "190px", numeric: true },
  { key: "production", label: "Production", icon: "clapperboard", width: "160px" },
  { key: "investment", label: "Investment", icon: "currency", width: "170px", numeric: true },
  { key: "finance", label: "Finance", icon: "receipt", width: "180px", numeric: true },
  { key: "attention", label: "Attention", icon: "alert", width: "170px", numeric: true },
];

export function StartupBoard({ rows, onOpen }: { rows: BoardRow[]; onOpen: (row: BoardRow) => void }) {
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  // The board opens worst-first: a manager scans exceptions before steady records.
  const [sort, setSort] = useState<{ key: SortKey; direction: "asc" | "desc" }>({ key: "attention", direction: "desc" });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (q) {
        const hit = [row.startup, row.sector, row.stage, row.application_ref, row.sentence]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (view === "attention") return boardAlerts(row).length > 0;
      if (view === "shot") return row.shoot_status === "completed" || row.shoot_status === "exceptions";
      if (view === "funded") return row.deployed_amount > 0;
      return true;
    });
  }, [rows, query, view]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const next = [...filtered].sort((a, b) => compareBoardRows(a, b, sort.key));
    return sort.direction === "asc" ? next : next.reverse();
  }, [filtered, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev?.key === key ? { key, direction: prev.direction === "asc" ? "desc" : "asc" } : { key, direction: "asc" },
    );

  return (
    <>
      <Toolbar
        right={
          <>
            <Segmented value={view} onChange={setView} options={VIEWS} />
            <div className="relative">
              <Icon
                name="search"
                className="pointer-events-none absolute left-2.5 top-1/2 h-[14px] w-[14px] -translate-y-1/2 text-faint"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter startups"
                aria-label="Filter startups on this board"
                className="w-48 rounded-lg border border-hair bg-surface py-1.5 pl-8 pr-2.5 text-[12.5px] text-ink transition placeholder:text-faint focus:border-brand focus:bg-canvas focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
            </div>
          </>
        }
      >
        <span className="ss-num text-[12px] text-faint">
          <span className="font-medium text-ink-soft">{sorted.length}</span> of {rows.length} startups
        </span>
      </Toolbar>

      {sorted.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <p className="text-[13.5px] font-medium text-ink-soft">
            {query || view !== "all" ? "No startups match this view." : "No startups in this season yet."}
          </p>
        </div>
      ) : (
        <div className="max-h-[68vh] overflow-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead className="sticky top-0 z-20 shadow-[0_1px_0_0_var(--color-hair)]">
              <tr className="border-b border-hair text-left">
                {COLUMNS.map((col, i) => {
                  const active = sort?.key === col.key;
                  return (
                    <th
                      key={col.label}
                      scope="col"
                      aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : undefined}
                      style={{ width: col.width }}
                      className={`whitespace-nowrap bg-[#fcfcfd] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.045em] text-faint ${
                        i === 0 ? "sticky left-0 z-30" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        title={`Sort by ${col.label}`}
                        className={`group inline-flex items-center gap-1.5 transition hover:text-ink-soft ${active ? "text-ink-soft" : ""}`}
                      >
                        <Icon name={col.icon} className="h-[13px] w-[13px] shrink-0" />
                        {col.label}
                        <span aria-hidden className={active ? "text-brand" : "text-hair-strong group-hover:text-faint"}>
                          {active ? (sort?.direction === "asc" ? "\u2191" : "\u2193") : "\u2195"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr
                  key={row.startup_id}
                  onClick={() => onOpen(row)}
                  className="cursor-pointer border-b border-hair align-top last:border-0 hover:bg-surface/70"
                >
                  <td className="sticky left-0 z-10 border-r border-hair bg-canvas px-3 py-2.5">
                    <StartupCell row={row} />
                  </td>
                  <td className="px-3 py-2.5">
                    <SelectionCell row={row} />
                  </td>
                  <td className="px-3 py-2.5">
                    <ProductionCell row={row} />
                  </td>
                  <td className="px-3 py-2.5">
                    <InvestmentCell row={row} />
                  </td>
                  <td className="px-3 py-2.5">
                    <FinanceCell row={row} />
                  </td>
                  <td className="px-3 py-2.5">
                    <AttentionCell row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/** Identity plus the milestone track: the one-sentence summary, in scannable form. */
function StartupCell({ row }: { row: BoardRow }) {
  const milestones = boardMilestones(row);
  const done = milestonesDone(row);
  const current = milestones.find((m) => m.state === "current");
  return (
    <div className="min-w-0">
      <span className="font-medium text-ink" title={row.sentence}>
        {row.startup}
      </span>
      <div className="mt-0.5 truncate text-[11px] text-faint">
        {row.sector} &middot; {humanise(row.stage)}
      </div>
      <div
        className="mt-2 flex gap-1"
        role="img"
        aria-label={`${done} of ${milestones.length} milestones complete${current ? `, now at ${current.label}` : ""}`}
        title={milestones.map((m) => `${m.state === "done" ? "\u2713" : m.state === "current" ? "\u25B8" : "\u00B7"} ${m.label}`).join("\n")}
      >
        {milestones.map((m) => (
          <span
            key={m.key}
            className={`h-2 w-2 rounded-full ${
              m.state === "done"
                ? "bg-brand"
                : m.state === "current"
                  ? "bg-brand/30 ring-1 ring-inset ring-brand/60"
                  : "bg-hair-strong/50"
            }`}
          />
        ))}
      </div>
      <div className="mt-1.5 text-[11px] leading-snug text-ink-soft">
        {current ? (
          <>
            <span className="ss-num text-faint">{done}/{milestones.length}</span> &middot; now: {current.label}
          </>
        ) : (
          <span className="text-ok">All milestones complete</span>
        )}
      </div>
    </div>
  );
}

/** Pre-shoot gates: the one still open, plus how many have cleared. */
function SelectionCell({ row }: { row: BoardRow }) {
  const gate = currentGate(row);
  const cleared = gatesCleared(row);
  const total = 6;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge registry={gate.registry} value={gate.value} />
      </div>
      <div className="text-[11px] text-faint">
        {gate.label} &middot; <span className="ss-num">{cleared}/{total}</span> gates cleared
      </div>
      {row.application_ref ? (
        <div className="font-mono text-[10.5px] text-faint">{row.application_ref}</div>
      ) : null}
    </div>
  );
}

function ProductionCell({ row }: { row: BoardRow }) {
  if (!row.shoot_status && !row.av_status && !row.mock_status && !row.telecast_status) {
    return <span className="text-[12px] text-faint">Not in production</span>;
  }
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        <StatusBadge registry="av_shoot" value={row.av_status} />
        <StatusBadge registry="mock_shoot" value={row.mock_status} />
      </div>
      <div className="flex flex-wrap gap-1">
        <StatusBadge registry="main_shoot" value={row.shoot_status} />
        <StatusBadge registry="telecast" value={row.telecast_status} />
      </div>
    </div>
  );
}

function InvestmentCell({ row }: { row: BoardRow }) {
  // Committed, deployed and balance must share one basis or the balance can read larger than
  // the commitment. Deployment is verified against the deal, so the deal is the basis here.
  const committedOnDeals = row.outstanding_commitment + row.deployed_amount;
  if (committedOnDeals === 0 && row.committed_amount === 0 && !row.deal_status) {
    return <span className="text-[12px] text-faint">No commitments</span>;
  }
  return (
    <div className="space-y-1">
      {committedOnDeals > 0 ? (
        <ValueLine label="Committed" value={<Money paise={committedOnDeals} compact />} />
      ) : null}
      <ValueLine label="Deployed" value={<Money paise={row.deployed_amount} compact />} emphasis />
      {row.outstanding_commitment > 0 ? (
        <ValueLine label="Balance" value={<Money paise={row.outstanding_commitment} compact />} tone="warning" />
      ) : null}
      {row.deal_status ? (
        <div className="pt-0.5">
          <StatusBadge registry="deal" value={row.deal_status} />
        </div>
      ) : null}
    </div>
  );
}

function FinanceCell({ row }: { row: BoardRow }) {
  const hasUpfront = row.upfront_fee_amount > 0 || row.upfront_fee_status !== null;
  const hasSuccess = row.success_fee_invoiced > 0 || row.success_fee_status !== null;
  if (!hasUpfront && !hasSuccess) return <span className="text-[12px] text-faint">No fees raised</span>;
  return (
    <div className="space-y-1.5">
      {hasUpfront ? (
        <FeeLine label="Upfront" registry="upfront_fee" status={row.upfront_fee_status} amount={row.upfront_fee_outstanding || row.upfront_fee_amount} />
      ) : null}
      {hasSuccess ? (
        <FeeLine label="Success" registry="success_fee" status={row.success_fee_status} amount={row.success_fee_outstanding || row.success_fee_invoiced} />
      ) : null}
    </div>
  );
}

function AttentionCell({ row }: { row: BoardRow }) {
  const alerts = boardAlerts(row);
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-ok">
        <Icon name="check" className="h-[13px] w-[13px]" strokeWidth={2.2} />
        On track
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {alerts.map((alert: BoardAlert) => (
        <Badge key={alert.key} tone={alert.tone}>
          {alert.label}
        </Badge>
      ))}
    </div>
  );
}

/** A label-and-value line, right aligned so a column of numbers lines up. */
function ValueLine({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: ReactNode;
  emphasis?: boolean;
  tone?: "warning";
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="shrink-0 text-[11px] text-faint">{label}</span>
      <span className={`ss-num text-[12px] ${emphasis ? "font-medium text-ink" : tone === "warning" ? "text-warn" : "text-ink-soft"}`}>
        {value}
      </span>
    </div>
  );
}

function FeeLine({
  label,
  registry,
  status,
  amount,
}: {
  label: string;
  registry: string;
  status: string | null;
  amount: number;
}) {
  return (
    <div className="flex items-center justify-between gap-1.5">
      <div className="min-w-0">
        <div className="text-[11px] text-faint">{label}</div>
        <StatusBadge registry={registry} value={status} />
      </div>
      <Money paise={amount} compact />
    </div>
  );
}
