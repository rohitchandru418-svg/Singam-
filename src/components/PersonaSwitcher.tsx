"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiDevSwitch, type PersonaOption } from "@/lib/client/api";
import { useSession } from "./SessionProvider";
import { Icon } from "./icons";

/**
 * The live acting-persona switcher.
 *
 * The reviewer moves between the eleven sign-ins from inside the running app: choosing a
 * persona re-issues the session (`apiDevSwitch`) and the whole application re-reads it, so the
 * rails, gates, dashboards and forms all change to that role's real view. Nothing here is a
 * mock screen and nothing is fixed for the session.
 *
 * It is offered only where `authDevMode()` is on — development and the review build — so a
 * production sign-in is unchanged. A persona whose role cannot open the current module lands
 * on its own home screen instead, which is the same place its sign-in would take it.
 */

export function PersonaSwitcher({ align = "right" }: { align?: "left" | "right" }) {
  const router = useRouter();
  const { session, personas, devMode, refresh } = useSession();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const currentId = session?.actor.id ?? "";
  const external = useMemo(() => personas.filter((p) => p.audience === "external"), [personas]);
  const internal = useMemo(() => personas.filter((p) => p.audience === "internal"), [personas]);
  const current = useMemo(
    () => personas.find((p) => p.userId === currentId) ?? null,
    [personas, currentId],
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const switchTo = async (persona: PersonaOption) => {
    if (busy || persona.userId === currentId) {
      setOpen(false);
      return;
    }
    setBusy(persona.key);
    setError(null);
    try {
      await apiDevSwitch(persona.userId);
      await refresh();
      setOpen(false);
      // The current route may belong to a module the new role cannot open; the persona's own
      // home screen is the honest landing point, the same one its sign-in uses.
      router.push(persona.href || "/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch persona");
    } finally {
      setBusy(null);
    }
  };

  if (!devMode || personas.length === 0 || !session) return null;

  const label = current?.label ?? session.actor.name;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Switch the acting persona"
        className="flex items-center gap-1.5 rounded-lg border border-hair bg-canvas px-2 py-1.5 text-ink-soft transition hover:bg-hover hover:text-ink"
      >
        <Icon name="users" className="h-[15px] w-[15px]" />
        <span className="hidden max-w-[9rem] truncate text-[12px] font-medium text-ink sm:inline">{label}</span>
        <Icon name="filter" className="h-[11px] w-[11px] opacity-60" />
      </button>

      {open ? (
        <div
          role="menu"
          className={`ss-rise absolute top-[calc(100%+0.5rem)] z-50 w-[19rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-hair bg-canvas shadow-overlay ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-hair px-3.5 py-2.5">
            <p className="text-[12.5px] font-semibold text-ink">Acting as</p>
            <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10px] font-semibold text-info">
              Review build
            </span>
          </div>

          <div className="max-h-[24rem] overflow-y-auto py-1">
            <Group label="External portals" personas={external} currentId={currentId} busy={busy} onPick={switchTo} />
            <Group label="Internal console" personas={internal} currentId={currentId} busy={busy} onPick={switchTo} />
          </div>

          {error ? (
            <p className="border-t border-hair px-3.5 py-2 text-[11.5px] text-risk">{error}</p>
          ) : (
            <p className="border-t border-hair px-3.5 py-2 text-[11px] leading-snug text-faint">
              Every screen re-reads as the chosen persona. In production this switcher is off and sign-in is by
              email or mobile.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Group({
  label,
  personas,
  currentId,
  busy,
  onPick,
}: {
  label: string;
  personas: PersonaOption[];
  currentId: string;
  busy: string | null;
  onPick: (p: PersonaOption) => void;
}) {
  if (personas.length === 0) return null;
  return (
    <div className="py-1">
      <p className="px-3.5 pb-1 pt-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-faint">{label}</p>
      <ul>
        {personas.map((p) => {
          const active = p.userId === currentId;
          return (
            <li key={p.key}>
              <button
                type="button"
                role="menuitem"
                onClick={() => void onPick(p)}
                disabled={busy !== null}
                className={`flex w-full items-start gap-2.5 px-3.5 py-2 text-left transition hover:bg-surface disabled:cursor-not-allowed ${
                  active ? "bg-brand-soft" : ""
                }`}
              >
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/10 text-brand">
                  {busy === p.key ? (
                    <span className="ss-shimmer h-3 w-3 rounded-full" />
                  ) : (
                    <Icon
                      name={p.audience === "external" ? (p.portal === "investor" ? "briefcase" : "rocket") : "shield"}
                      className="h-[13px] w-[13px]"
                    />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[12.5px] font-medium text-ink">{p.label}</span>
                    {active ? <Icon name="check" className="h-3 w-3 text-brand" /> : null}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-snug text-faint">{p.blurb}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
