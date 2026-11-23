"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiAction, apiStartupSide, ApiError, type StartupSideData } from "@/lib/client/api";
import { useSession } from "../SessionProvider";
import { Button, EmptyState, Toaster, useToasts } from "../ui";
import { Icon } from "../icons";
import { Onboarding } from "./Onboarding";
import { FounderHeader, FounderHistory } from "./FounderHeader";
import { ApplicationForm } from "./ApplicationForm";
import { JourneyTracker } from "./JourneyTracker";
import { SeasonTab } from "./SeasonTab";
import { DocumentsStep } from "./DocumentsStep";
import { NoticesPanel } from "./NoticesPanel";

/**
 * The founder portal.
 *
 * A founder gets a calm, guided workspace rather than the internal console. Everything they
 * see is scoped to their own startup by the API; this component only chooses what to show.
 *
 * The tabs follow the founder's own order of business: the live season they are applying to,
 * then the journey through it, then their profile. The journey tracker is the spine: a founder
 * opens a stage, reads what it means and what their next step is, and acts in the panel beside
 * it. Reaching a completed stage reopens its record read-only, so a founder can always look
 * back at what happened.
 */

export type TabKey = "season" | "journey" | "profile" | "documents" | "notices";

const TABS: { key: TabKey; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { key: "season", label: "Startup Singam Season 3", icon: "rocket" },
  { key: "journey", label: "My journey", icon: "map" },
  { key: "profile", label: "My profile", icon: "pen" },
  { key: "documents", label: "Documents", icon: "folder" },
  { key: "notices", label: "Notices", icon: "bell" },
];

export function StartupPortal() {
  const { session, refresh } = useSession();
  const { toasts, push, dismiss } = useToasts();
  const [data, setData] = useState<StartupSideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("season");
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await apiStartupSide());
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load your workspace");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = useCallback(
    async (action: string, payload: Record<string, unknown>, done: string) => {
      try {
        const result = await apiAction(action, payload);
        push(result.message ?? done, "success");
        await load();
        await refresh();
        return true;
      } catch (e) {
        push(e instanceof ApiError ? e.message : "Something went wrong", "danger");
        return false;
      }
    },
    [load, refresh, push],
  );

  const needsCount = useMemo(
    () => data?.journey.stages.filter((s) => s.status === "action_required" || s.needsYou).length ?? 0,
    [data],
  );

  if (loading && !data) {
    return <div className="grid h-64 place-items-center text-[13px] text-faint">Loading your workspace&hellip;</div>;
  }
  if (error && !data) {
    return (
      <EmptyState
        title="We could not load your workspace"
        hint={error}
        action={<Button variant="secondary" onClick={() => void load()}>Try again</Button>}
      />
    );
  }
  if (!data) return null;

  if (!data.startup) {
    return (
      <div className="space-y-4">
        <Onboarding onAction={runAction} toasts={toasts} dismiss={dismiss} programs={data.programs} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      <FounderHeader data={data} />

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-hair bg-canvas p-1 shadow-card" aria-label="Sections">
        {TABS.map((t) => {
          const active = tab === t.key;
          const count =
            t.key === "journey" ? needsCount : t.key === "documents" ? data.documentRequests.filter((r) => r.status === "info_required" || r.status === "resubmission_required").length : 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-current={active ? "page" : undefined}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition ${
                active ? "bg-ink text-white" : "text-ink-soft hover:bg-hover hover:text-ink"
              }`}
            >
              <Icon name={t.icon} className="h-[15px] w-[15px]" />
              {t.label}
              {count > 0 ? (
                <span className={`ss-num rounded-full px-1.5 text-[10.5px] ${active ? "bg-white/20" : "bg-warn-soft text-warn"}`}>{count}</span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {tab === "season" ? <SeasonTab data={data} onAction={runAction} onGoJourney={() => setTab("journey")} /> : null}
      {tab === "journey" ? (
        <JourneyTracker data={data} selected={selectedStage} onSelect={setSelectedStage} onAction={runAction} onGoTab={setTab} />
      ) : null}
      {tab === "journey" ? <FounderHistory data={data} /> : null}
      {tab === "profile" ? <ApplicationForm data={data} onAction={runAction} onGoJourney={() => setTab("journey")} variant="profile" /> : null}
      {tab === "documents" ? <DocumentsStep data={data} onAction={runAction} push={push} /> : null}
      {tab === "notices" ? <NoticesPanel data={data} onAction={runAction} /> : null}


      <p className="pb-2 text-center text-[11.5px] text-faint">
        Signed in as {session?.actor.name ?? "founder"}. You only ever see your own startup.
      </p>
    </div>
  );
}
