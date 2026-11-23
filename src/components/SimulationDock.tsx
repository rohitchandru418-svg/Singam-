"use client";

/**
 * The live simulation dock.
 *
 * A slim bar pinned to the bottom of the real application. It does not draw screens: it
 * navigates the real router to each step's route and, when a step does work, runs the real
 * business action through the real API as the persona that owns it. The screens and the
 * records behind them therefore move for real while the run proceeds.
 *
 * It is reachable from anywhere by dispatching `ss:open-simulation`, or with `?simulate=1`.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDevSwitch } from "@/lib/client/api";
import { useSession } from "./SessionProvider";
import { ActionForm } from "./ActionForm";
import { Icon } from "./icons";
import { SIM_JOURNEYS, stepsFor, type SimJourney, type SimStep } from "@/lib/domain/simulation";

/** The window event any surface can dispatch to open the simulation dock. */
export const OPEN_SIMULATION_EVENT = "ss:open-simulation";

export function openSimulation(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_SIMULATION_EVENT));
}

export function SimulationDock() {
  const router = useRouter();
  const { session, personas, refresh, devMode } = useSession();
  const [open, setOpen] = useState(false);
  const [journey, setJourney] = useState<SimJourney>("startup");
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [autoRun, setAutoRun] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("simulate") !== "1") return;
    const wantedJourney = params.get("journey") as SimJourney | null;
    if (wantedJourney && SIM_JOURNEYS.some((j) => j.key === wantedJourney)) setJourney(wantedJourney);
    const wantedStep = Number(params.get("step"));
    if (Number.isInteger(wantedStep) && wantedStep > 0) setIndex(wantedStep);
    setOpen(true);
  }, []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_SIMULATION_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SIMULATION_EVENT, onOpen);
  }, []);

  const steps = useMemo(() => stepsFor(journey), [journey]);
  const step: SimStep | undefined = steps[index];
  const actorKey = session?.actor.id;
  const personaForStep = useMemo(
    () => (step ? personas.find((p) => p.key === step.owner) : undefined),
    [step, personas],
  );

  // Navigate the real router to the step's route whenever the step changes.
  useEffect(() => {
    if (!open || !step) return;
    router.push(step.route);
  }, [open, step, router]);

  /**
   * Keep the acting persona in step with the step's owner.
   *
   * A step opens a real screen, and a screen is only shown to the role that owns its module.
   * Without this the first step of a journey would land on "this module is not available for
   * your role" whenever the signed-in persona is not the owner. The switch is silent and only
   * happens in dev mode, where the persona picker is available.
   */
  useEffect(() => {
    if (!open || !step || !personaForStep || !devMode) return;
    if (personaForStep.userId === actorKey) return;
    let cancelled = false;
    setBusy(true);
    apiDevSwitch(personaForStep.userId)
      .then(() => refresh())
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not switch persona");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step?.id, personaForStep?.userId, devMode]);

  // Play-through: when the step's action can run as the acting persona, open the form and let
  // it submit itself. The form reports an error back so a run pauses instead of pressing on.
  useEffect(() => {
    if (!autoRun || !step || !step.action) return;
    const owns = personaForStep ? personaForStep.userId === actorKey : false;
    if (!owns || busy) return;
    setFormOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, step?.id, actorKey, personaForStep?.userId, busy]);

  // A step with no action is a screen to read, not a button to press: during a play-through it
  // is passed over automatically once the acting persona matches, so the run reaches the next
  // actionable step instead of stopping on it. At the last step the run stops cleanly.
  useEffect(() => {
    if (!autoRun || !step || step.action || busy || formOpen) return;
    const owns = personaForStep ? personaForStep.userId === actorKey : false;
    if (!owns) return;
    const timer = setTimeout(() => {
      if (index >= steps.length - 1) {
        setAutoRun(false);
        setNote("Journey complete.");
        return;
      }
      setIndex((i) => Math.min(i + 1, steps.length - 1));
    }, 900);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, step?.id, step?.action, actorKey, personaForStep?.userId, busy, formOpen, index, steps.length]);

  const goTo = useCallback(
    (nextIndex: number) => {
      setAutoRun(false);
      setIndex(Math.max(0, Math.min(nextIndex, steps.length - 1)));
      setNote(null);
      setError(null);
    },
    [steps.length],
  );

  const switchJourney = useCallback((key: SimJourney) => {
    setJourney(key);
    setAutoRun(false);
    setIndex(0);
    setNote(null);
    setError(null);
  }, []);

  /** Re-authenticate as the step's owner so the run can perform that persona's work. */
  const actAsOwner = useCallback(async () => {
    if (!personaForStep) return;
    setBusy(true);
    setError(null);
    try {
      await apiDevSwitch(personaForStep.userId);
      await refresh();
      setNote(`Now running as ${personaForStep.label}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not switch persona");
    } finally {
      setBusy(false);
    }
  }, [personaForStep, refresh]);

  if (!session) return null;

  const ownsStep = personaForStep ? personaForStep.userId === actorKey : false;
  const canActAsOwner = Boolean(personaForStep) && !ownsStep && devMode;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ss-sim-launcher fixed bottom-5 right-5 z-[60] inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-[13px] font-semibold text-white shadow-overlay ring-1 ring-brand-dark/20 transition hover:bg-brand-dark"
      >
        <Icon name="play" className="h-[14px] w-[14px]" />
        Run the season live
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-hair bg-canvas/98 shadow-overlay">
      <div className="mx-auto w-full max-w-[80rem] px-4 py-3">
        {/* Journey tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {SIM_JOURNEYS.map((j) => {
            const active = j.key === journey;
            return (
              <button
                key={j.key}
                type="button"
                onClick={() => switchJourney(j.key)}
                className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition ${
                  active ? "bg-brand text-white" : "bg-hover text-ink-soft hover:text-ink"
                }`}
              >
                {j.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="ml-auto rounded-lg p-1.5 text-faint transition hover:bg-hover hover:text-ink"
            aria-label="Close the simulation"
          >
            <Icon name="x" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>

        {/* Current step */}
        {step ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="ss-num grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[11.5px] font-semibold text-white">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-ink">
                {step.title}
                <span className="ml-2 font-mono text-[11px] font-normal text-faint">{step.route}</span>
              </p>
              <p className="text-[11.5px] leading-snug text-ink-soft">{step.lookAt}</p>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setAutoRun((v) => !v)}
                title="Switch persona, open each step and submit the pre-filled form automatically."
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold transition ${
                  autoRun ? "bg-brand text-white hover:bg-brand-dark" : "border border-brand/40 bg-brand-soft text-brand-ink hover:bg-brand/15"
                }`}
              >
                <Icon name={autoRun ? "pause" : "play"} className="h-[13px] w-[13px]" />
                {autoRun ? "Playing" : "Play through"}
              </button>
              <button
                type="button"
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                className="rounded-lg border border-hair-strong bg-canvas px-2.5 py-1.5 text-[12.5px] font-medium text-ink transition hover:bg-hover disabled:opacity-40"
              >
                Back
              </button>
              {step.action ? (
                ownsStep ? (
                  <button
                    type="button"
                    onClick={() => setFormOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-dark"
                  >
                    <Icon name="play" className="h-[13px] w-[13px]" />
                    Run this step
                  </button>
                ) : canActAsOwner ? (
                  <button
                    type="button"
                    onClick={() => void actAsOwner()}
                    disabled={busy}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-brand/40 bg-brand-soft px-3 py-1.5 text-[12.5px] font-semibold text-brand-ink transition hover:bg-brand/15 disabled:opacity-60"
                  >
                    <Icon name="shield" className="h-[13px] w-[13px]" />
                    {busy ? "Switching…" : `Run as ${personaForStep?.label}`}
                  </button>
                ) : (
                  <span className="rounded-lg border border-hair bg-surface px-2.5 py-1.5 text-[11.5px] text-faint">
                    Owned by {personaForStep?.label ?? step.owner}
                  </span>
                )
              ) : null}
              <button
                type="button"
                onClick={() => goTo(index + 1)}
                disabled={index >= steps.length - 1}
                className="rounded-lg bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-ink/90 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}

        {note ? <p className="mt-2 text-[11.5px] text-ok">{note}</p> : null}
        {error ? <p className="mt-2 text-[11.5px] text-risk">{error}</p> : null}

        {/* Step progress */}
        <div className="mt-2.5 flex items-center gap-1">
          {steps.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              title={s.title}
              aria-label={s.title}
              className={`h-1.5 flex-1 rounded-full transition ${i <= index ? "bg-brand" : "bg-hair"}`}
            />
          ))}
        </div>
      </div>

      {step?.action ? (
        <ActionForm
          action={step.action}
          title={step.title}
          subtitle={step.lookAt}
          users={session.users}
          actingUserId={session.actor.id}
          open={formOpen}
          autoSubmit={autoRun}
          onClose={() => setFormOpen(false)}
          onError={(message) => {
            setError(message);
            setAutoRun(false);
          }}
          onDone={(res) => {
            setFormOpen(false);
            setNote(res.message ?? "Step complete.");
            router.refresh();
            if (autoRun) {
              if (index >= steps.length - 1) {
                setAutoRun(false);
                setNote("Journey complete.");
              } else {
                setIndex((i) => Math.min(i + 1, steps.length - 1));
              }
            }
          }}
        />
      ) : null}
    </div>
  );
}
