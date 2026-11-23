"use client";

import { useMemo, useState } from "react";
import { apiActionCatalog, type ActionResult } from "@/lib/client/api";
import { useEffect } from "react";
import { ActionForm } from "./ActionForm";
import { useSession } from "./SessionProvider";
import { Button, InfoNote } from "./ui";
import { Icon } from "./icons";

/**
 * Module action bar.
 *
 * Shows every action the acting role may run for a module, and opens the generic form for
 * the chosen action. Actions the role may not run are hidden, and a read-only role sees a
 * note instead of buttons.
 */
export function ModuleActions({
  actions,
  label = "Actions",
  defaults = {},
  notes = {},
  documentPurposes = [],
  maxVisible,
  done = [],
  doneNote,
  onDone,
}: {
  actions: string[];
  label?: string;
  defaults?: Record<string, unknown>;
  notes?: Record<string, string>;
  documentPurposes?: { key: string; label: string }[];
  /** When set, only this many actions show until the reader asks for the rest. */
  maxVisible?: number;
  /** Actions the record has already passed, shown struck through instead of offered again. */
  done?: string[];
  /** One line explaining why the completed actions are shown at all. */
  doneNote?: string;
  /** Called after an action succeeds, so the caller can refresh the record behind it. */
  onDone?: (result: ActionResult) => void;
}) {
  const { session } = useSession();
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [catalog, setCatalog] = useState<Record<string, { label: string; description: string }>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ActionResult | null>(null);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    apiActionCatalog()
      .then((res) => {
        setAllowed(new Set(res.allowed));
        setCatalog(Object.fromEntries(res.catalog.map((a) => [a.name, { label: a.label, description: a.description }])));
      })
      .catch(() => {
        setAllowed(new Set());
      });
  }, [session?.actor.id]);

  const doneSet = useMemo(() => new Set(done), [done]);
  const visible = useMemo(
    () => actions.filter((a) => allowed.has(a) && !doneSet.has(a)),
    [actions, allowed, doneSet],
  );
  const collapsed = maxVisible !== undefined && !showAll && visible.length > maxVisible;
  const shown = collapsed ? visible.slice(0, maxVisible) : visible;
  // Only completed actions the reader could actually run are shown struck through; a stage
  // action belonging to another role would otherwise appear as the reader's own done work.
  const doneShown = useMemo(
    () => done.filter((a) => allowed.has(a) && actions.includes(a)),
    [done, allowed, actions],
  );

  if (!session) return null;
  if (!session.canWrite) {
    return <InfoNote tone="warning">Read-only role: actions are disabled.</InfoNote>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 rounded-xl border border-hair bg-canvas px-3 py-2.5 shadow-card">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">
          <Icon name="refresh" className="h-[13px] w-[13px]" />
          {label}
        </span>
        <span className="h-4 w-px bg-hair" aria-hidden />
        {visible.length === 0 ? (
          <span className="text-[12.5px] text-faint">
            {doneShown.length > 0 ? "This step is complete" : "No actions available for this role"}
          </span>
        ) : null}
        {shown.map((name) => (
          <Button key={name} size="sm" variant="secondary" onClick={() => setOpen(name)} title={catalog[name]?.description}>
            {catalog[name]?.label ?? name}
          </Button>
        ))}
        {collapsed ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="rounded-lg px-2.5 py-1 text-[12.5px] font-medium text-ink-soft transition hover:bg-hover hover:text-ink"
          >
            +{visible.length - (maxVisible ?? 0)} more
          </button>
        ) : null}
        {doneShown.length > 0 ? (
          <span className="ml-auto flex flex-wrap items-center gap-1.5" title={doneNote}>
            {doneShown.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 rounded-md bg-ok/10 px-2 py-0.5 text-[11.5px] font-medium text-ok line-through decoration-ok/50"
              >
                <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                {catalog[name]?.label ?? name}
              </span>
            ))}
          </span>
        ) : null}
      </div>
      {lastResult?.message ? <InfoNote tone="success">{lastResult.message}</InfoNote> : null}
      {open ? (
        <ActionForm
          action={open}
          title={catalog[open]?.label ?? open}
          subtitle={catalog[open]?.description}
          defaults={defaults}
          users={session.users}
          actingUserId={session.actor.id}
          documentPurposes={documentPurposes}
          open
          onClose={() => setOpen(null)}
          onDone={(res) => {
            setLastResult(res);
            setOpen(null);
            onDone?.(res);
          }}
          extraNote={notes[open]}
        />
      ) : null}
    </div>
  );
}

export function ActionButton({ action, label }: { action: string; label?: string }) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const [allowed, setAllowed] = useState<Set<string>>(new Set());
  const [meta, setMeta] = useState<{ label: string; description: string } | null>(null);

  useEffect(() => {
    apiActionCatalog()
      .then((res) => {
        setAllowed(new Set(res.allowed));
        const found = res.catalog.find((a) => a.name === action);
        setMeta(found ? { label: found.label, description: found.description } : null);
      })
      .catch(() => setAllowed(new Set()));
  }, [action]);

  if (!session?.canWrite || !allowed.has(action)) return null;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        {label ?? meta?.label ?? action}
      </Button>
      <ActionForm
        action={action}
        title={meta?.label ?? action}
        subtitle={meta?.description}
        users={session.users}
        actingUserId={session.actor.id}
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => setOpen(false)}
      />
    </>
  );
}

export function useActionRunner() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: string, payload: Record<string, unknown> = {}) => {
    setBusy(true);
    setError(null);
    try {
      const res = await import("@/lib/client/api").then((m) => m.apiAction(action, payload));
      setResult(res);
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
      throw e;
    } finally {
      setBusy(false);
    }
  };

  return { run, busy, result, error };
}
