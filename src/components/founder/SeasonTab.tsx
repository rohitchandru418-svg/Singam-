"use client";

import { useState } from "react";
import { Button, InfoNote } from "../ui";
import { Icon } from "../icons";
import { useSession } from "../SessionProvider";
import { autofillProfile } from "@/lib/domain/sampleProfile";
import type { StartupSideData } from "@/lib/client/api";
import { humanDate } from "./shared";
import { ApplicationForm } from "./ApplicationForm";

/**
 * The Season 3 tab.
 *
 * The founder lands here to see the live season — what it is, who may apply, when it closes —
 * and to apply. Before an application exists the tab is the call to action; once one does, the
 * same tab carries the step-by-step application form, so "apply" and "my application" are one
 * place rather than two.
 */

export function SeasonTab({
  data,
  onAction,
  onGoJourney,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  onGoJourney: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const { devMode } = useSession();
  const program = data.programs.find((p) => p.status === "open") ?? data.programs[0] ?? null;
  const application = data.applications.find((a) => a.id === data.currentApplicationId) ?? null;
  const profileApproved = String(data.startup?.profile_status ?? "") === "approved";
  const profileStatus = String(data.startup?.profile_status ?? "incomplete");
  const isDraft = application !== null && application.status === "draft";

  const apply = async () => {
    setBusy(true);
    await onAction("application.apply", {}, "Application started");
    setBusy(false);
  };

  const submitProfile = async () => {
    setBusy(true);
    await onAction("profile.submit", {}, "Profile submitted for review");
    setBusy(false);
  };

  // Demo convenience: fill the profile's empty fields in one click, then refresh so the
  // missing list and the submit button update without the reviewer opening the form.
  const autoFillProfile = async () => {
    setBusy(true);
    const { payload, filled } = autofillProfile(data.startup ?? {});
    if (filled > 0) {
      await onAction("founder_side.save_draft", payload, `Auto-filled ${filled} field${filled === 1 ? "" : "s"}`);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-hair bg-gradient-to-br from-brand to-brand-dark px-5 py-5 text-white shadow-raised">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">
          {program?.season ?? "Live season"}
        </p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
          {program?.title ?? "Startup Singam Season 3"}
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/85">
          {program?.description ||
            "Apply to pitch on national television, get mentored, and raise from our investor panel."}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium capitalize">
            {program?.status ?? "open"}
          </span>
          {program?.opens_on ? (
            <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium">Opened {humanDate(program.opens_on)}</span>
          ) : null}
          {program?.closes_on ? (
            <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium">Closes {humanDate(program.closes_on)}</span>
          ) : null}
          {program?.applied ? (
            <span className="rounded-md bg-white/25 px-2 py-[3px] text-[11.5px] font-medium">Applied</span>
          ) : null}
        </div>
      </section>

      {program?.eligibility ? (
        <div className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
          <h2 className="text-[13.5px] font-semibold text-ink">Who can apply</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{program.eligibility}</p>
        </div>
      ) : null}

      {application ? (
        <div className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-ink">
                {isDraft ? "Your draft application" : "Your application"}
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                Reference {application.reference_no}
                {application.submitted_at ? ` · submitted ${humanDate(application.submitted_at)}` : " · not submitted yet"}
              </p>
            </div>
            <span
              className={`rounded-md px-2 py-1 text-[11.5px] font-medium capitalize ${
                isDraft ? "bg-warn-soft text-warn" : "bg-ok-soft text-ok"
              }`}
            >
              {application.status.replace(/_/g, " ")}
            </span>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-4">
            <div>
              <dt className="text-faint">Completeness</dt>
              <dd className="ss-num font-medium text-ink">{application.completion_pct}%</dd>
            </div>
            <div>
              <dt className="text-faint">Stage at application</dt>
              <dd className="font-medium capitalize text-ink">{application.stage_at_application.replace(/_/g, " ")}</dd>
            </div>
            <div>
              <dt className="text-faint">Season</dt>
              <dd className="font-medium text-ink">{application.season_name ?? data.currentSeasonName}</dd>
            </div>
            <div>
              <dt className="text-faint">Linked to earlier</dt>
              <dd className="font-medium text-ink">{application.linked_to ? "Yes" : "—"}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
          <h2 className="text-[13.5px] font-semibold text-ink">Apply to Season 3</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
            Your application opens as a draft. You can fill it in a section at a time and submit when every
            required field is complete. Idea-stage businesses skip the financial and traction sections.
          </p>
          {profileApproved ? (
            <div className="mt-3">
              <Button onClick={() => void apply()} disabled={busy}>
                <Icon name="rocket" className="h-4 w-4" />
                {busy ? "Opening…" : "Apply to Season 3"}
              </Button>
            </div>
          ) : (
            <div className="mt-3 space-y-3">
              {profileStatus === "submitted" ? (
                <InfoNote tone="info">
                  Your profile is with the team for review. You will be able to apply to Season 3 as soon as it is
                  approved.
                </InfoNote>
              ) : (
                <>
                  <InfoNote tone="warning">
                    {profileStatus === "rejected"
                      ? "The team returned your profile for changes. Fix the points below and submit it again."
                      : "Your profile must be approved before you can apply."}{" "}
                    Complete every required field under <strong>My profile</strong>
                    {data.profile.missing.length ? <> — still missing: {data.profile.missing.join(", ")}</> : null}.
                    {profileStatus === "rejected" && data.startup?.profile_review_notes ? (
                      <> Reviewer note: {String(data.startup.profile_review_notes)}</>
                    ) : null}
                  </InfoNote>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => void submitProfile()}
                      disabled={busy || !data.profile.missing.length || !data.eligibility.ok}
                    >
                      {busy ? "Submitting…" : "Submit profile for review"}
                    </Button>
                    {devMode && data.profile.missing.length ? (
                      <Button variant="secondary" onClick={() => void autoFillProfile()} disabled={busy} title="Demo only: fill empty profile fields with sample data">
                        <Icon name="refresh" className="h-4 w-4" />
                        Auto-fill sample data
                      </Button>
                    ) : null}
                    {!data.eligibility.ok ? (
                      <span className="text-[12px] text-faint">{data.eligibility.blocking.join(" ")}</span>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {application ? <ApplicationForm data={data} onAction={onAction} onGoJourney={onGoJourney} /> : null}
    </div>
  );
}
