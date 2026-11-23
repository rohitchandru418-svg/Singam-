"use client";

import type { StartupSideData } from "@/lib/client/api";
import { humanDate, str } from "./shared";

/**
 * The founder's dashboard banner.
 *
 * The one number that matters to a founder is how far along their journey is, so it leads:
 * a progress ring, the current stage in plain language, and the single next step. Profile
 * completeness and the live season sit beside it. This is not the internal KPI dashboard —
 * a founder sees their own journey, never the team's operating numbers.
 */

export function FounderHeader({ data }: { data: StartupSideData }) {
  const s = data.startup;
  const stages = data.journey.stages;
  const total = stages.length || 1;
  const done = data.journey.completedCount;
  const percent = Math.round((done / total) * 100);
  const current = stages.find((x) => x.key === data.journey.currentKey) ?? null;
  const liveProgram = data.programs.find((p) => p.status === "open") ?? data.programs[0] ?? null;
  const nextStep = stages.find((x) => x.needsYou || x.status === "action_required")?.content.nextStep;

  const circumference = 2 * Math.PI * 26;
  const dash = (percent / 100) * circumference;

  return (
    <section className="overflow-hidden rounded-2xl border border-hair bg-gradient-to-br from-brand to-brand-dark px-5 py-5 text-white shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <ProgressRing percent={percent} dash={dash} circumference={circumference} />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
              {str(s, "name") || "Your startup"} · Season 3
            </p>
            <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
              {current ? current.content.title : "Your journey with Startup Singam"}
            </h1>
            <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-white/85">
              {current ? current.content.summary : "Complete your application to begin."}
            </p>
            {nextStep ? (
              <p className="mt-2 inline-flex items-start gap-1.5 rounded-lg bg-white/12 px-2.5 py-1.5 text-[12px] leading-snug text-white/95">
                <span className="mt-[1px] font-semibold">Next:</span>
                <span>{nextStep}</span>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium capitalize">{str(s, "category") || "startup"}</span>
              <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium">{str(s, "sector") || "Sector not set"}</span>
              <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium">{str(s, "geography") || "Location not set"}</span>
            </div>
          </div>
        </div>

        <div className="grid w-full max-w-[17rem] gap-3">
          <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
            <div className="flex items-baseline justify-between text-[11.5px] text-white/80">
              <span>Profile completeness</span>
              <span className="ss-num font-semibold">{data.profile.percent}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${data.profile.percent}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-white/70">
              {data.profile.complete} of {data.profile.total} required fields
            </p>
          </div>

          {liveProgram ? (
            <div className="rounded-xl bg-white/10 p-3 backdrop-blur">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/70">Live programme</p>
              <p className="mt-0.5 text-[13px] font-semibold leading-snug">{liveProgram.title}</p>
              <p className="mt-0.5 text-[11px] text-white/75">
                {liveProgram.closes_on ? `Applications close ${humanDate(liveProgram.closes_on)}` : liveProgram.status}
                {liveProgram.applied ? " · applied" : ""}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

const HISTORY_TONE: Record<string, string> = {
  ok: "bg-ok",
  info: "bg-brand",
  warn: "bg-warn",
  risk: "bg-risk",
};

/** A short, founder-readable log of the decisions and milestones that have happened. */
export function FounderHistory({ data }: { data: StartupSideData }) {
  if (!data.history || data.history.length === 0) return null;
  return (
    <section className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
      <h2 className="text-[13.5px] font-semibold text-ink">What has happened so far</h2>
      <p className="mt-0.5 text-[12px] text-faint">The milestones and decisions on your journey, most recent first.</p>
      <ol className="mt-3 space-y-2.5">
        {data.history.map((h, i) => (
          <li key={`${h.date}-${i}`} className="flex gap-2.5">
            <span className={`mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full ${HISTORY_TONE[h.tone] ?? "bg-brand"}`} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[12.5px] font-medium text-ink">{h.title}</span>
                <span className="ss-num text-[11px] text-faint">{humanDate(h.date)}</span>
              </div>
              {h.detail ? <p className="text-[11.5px] leading-snug text-ink-soft">{h.detail}</p> : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProgressRing({ percent, dash, circumference }: { percent: number; dash: number; circumference: number }) {
  return (
    <div className="relative grid h-[68px] w-[68px] shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="h-[68px] w-[68px] -rotate-90">
        <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r="26"
          fill="none"
          stroke="white"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <span className="ss-num absolute text-[15px] font-semibold">{percent}%</span>
    </div>
  );
}
