"use client";

import { useEffect, useState } from "react";
import { Button, Field, InfoNote, Input, Money, Textarea } from "../ui";
import { Icon } from "../icons";
import type { StartupSideData, FounderStageView, FounderDeal } from "@/lib/client/api";
import { STAGE_TONE, humanDate, humanDateTime, str } from "./shared";
import { StageThread } from "./StageThread";
import { FileUploader } from "./FileUploader";

/**
 * The detail panel for one stage of the founder's journey.
 *
 * It is built to be read at a glance: a status header, a small grid of facts, one clear next
 * step, the action for that stage, and — only if the founder wants it — a short "what this
 * means" note folded away. Long prose never sits in the founder's way.
 */

const THREAD_STAGES = new Set(["application_review", "agreement", "document_verification", "virtual_pitch", "pitch_day", "programme_fee", "main_shoot", "telecast", "deal_closure", "funds_received", "success_fee", "community"]);

export function StageDetail({
  stage,
  total,
  data,
  onAction,
  onGoTab,
}: {
  stage: FounderStageView;
  total: number;
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  onGoTab: (t: "season" | "journey" | "profile" | "documents" | "notices") => void;
}) {
  const tone = STAGE_TONE[stage.status];
  const showThread = THREAD_STAGES.has(stage.key) && stage.status !== "upcoming";

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-hair bg-canvas shadow-card">
        <header className="border-b border-hair px-4 py-3.5">
          <div className="flex items-center justify-between gap-2">
            <span className={`rounded-md px-2 py-[3px] text-[11px] font-semibold ${tone.chip}`}>{tone.label}</span>
            <span className="ss-num text-[11.5px] text-faint">
              Step {stage.order + 1} of {total}
            </span>
          </div>
          <h2 className="mt-2 text-[17px] font-semibold leading-snug text-ink">{stage.content.title}</h2>
          <p className="mt-0.5 text-[13px] text-ink-soft">{stage.content.summary}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {stage.content.deadline ? (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-hover px-2 py-1 text-[12px] font-medium text-ink-soft">
                <Icon name="clock" className="h-[13px] w-[13px]" /> {stage.content.deadline}
              </span>
            ) : null}
            <span className="text-[11.5px] text-faint">Coordinated by {stage.owner}</span>
          </div>
        </header>

        <div className="space-y-3.5 px-4 py-3.5">
          {stage.content.nextStep ? (
            <div className="rounded-lg border border-brand/25 bg-brand-soft px-3 py-2.5">
              <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-brand-ink">Your next step</h3>
              <p className="mt-0.5 text-[13px] font-medium leading-snug text-ink">{stage.content.nextStep}</p>
            </div>
          ) : null}

          <StageAction stage={stage} data={data} onAction={onAction} onGoTab={onGoTab} />

          <details className="group rounded-lg border border-hair bg-surface px-3 py-2">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[12px] font-medium text-ink-soft">
              <span>What this stage means</span>
              <Icon name="chevron-down" className="h-[14px] w-[14px] transition group-open:rotate-180" />
            </summary>
            <div className="mt-2 space-y-2 border-t border-hair pt-2">
              <p className="text-[12.5px] leading-relaxed text-ink-soft">{stage.content.whatThisMeans}</p>
              <p className="text-[12px] leading-relaxed text-faint">{stage.content.latestUpdate}</p>
            </div>
          </details>
        </div>
      </div>

      {showThread ? <StageThread data={data} stageKey={stage.key} onAction={onAction} compact /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Per-stage actions                                                   */
/* ------------------------------------------------------------------ */

function StageAction({
  stage,
  data,
  onAction,
  onGoTab,
}: {
  stage: FounderStageView;
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  onGoTab: (t: "season" | "journey" | "profile" | "documents" | "notices") => void;
}) {
  const currentApp = data.applications.find((a) => a.id === data.currentApplicationId) ?? null;
  switch (stage.key) {
    case "profile":
      return <ProfileAction data={data} onGoTab={onGoTab} />;

    case "application_draft":
      return <DraftAction data={data} onGoTab={onGoTab} />;

    case "application_submitted":
      return currentApp ? (
        <FactGrid
          facts={[
            { label: "Reference number", value: currentApp.reference_no },
            { label: "Submitted", value: humanDate(currentApp.submitted_at) || "—" },
            { label: "Season", value: currentApp.season_name ?? currentApp.season_code ?? data.currentSeasonName },
            { label: "Status", value: currentApp.status.replace(/_/g, " ") },
          ]}
        />
      ) : null;

    case "application_review":
      return stage.status === "action_required" ? (
        <Button variant="secondary" onClick={() => onGoTab("documents")}>
          Open the document checklist
        </Button>
      ) : null;

    case "agreement":
      return <AgreementAction data={data} onAction={onAction} />;

    case "document_verification":
      return <DocumentSummary data={data} onGoTab={onGoTab} />;

    case "pre_bootcamp":
      return <BootcampAction data={data} onAction={onAction} />;

    case "virtual_pitch":
      return <VirtualPitchAction data={data} onAction={onAction} />;

    case "pitch_day":
      return <PitchDayAction data={data} onAction={onAction} />;

    case "programme_fee":
      return <FeeAction data={data} onAction={onAction} />;

    case "av_shoot":
      return <ShootAction data={data} onAction={onAction} />;

    case "mock_shoot":
      return <MockAction data={data} />;

    case "main_shoot":
      return <MainShootAction data={data} onAction={onAction} />;

    case "telecast":
      return <TelecastAction data={data} onAction={onAction} />;

    case "deal_closure":
      return <DealClosureAction data={data} onAction={onAction} />;

    case "funds_received":
      return <FundsAction data={data} onAction={onAction} />;

    case "success_fee":
      return <SuccessFeeAction data={data} onAction={onAction} />;

    case "community":
      return <CommunityAction data={data} />;

    case "final_selection":
      return data.investment.committed > 0 || data.investment.hasCommitment ? null : (
        <InfoNote tone="info">
          Only amounts confirmed by the Startup Singam team appear in your money stages. A Golden Pass or a selection is
          not, by itself, an investment.
        </InfoNote>
      );

    default:
      return null;
  }
}

/** A compact grid of key facts, so a stage reads in one glance. */
function FactGrid({ facts, cols = 2 }: { facts: { label: string; value: React.ReactNode }[]; cols?: 2 | 3 }) {
  return (
    <dl className={`grid gap-x-4 gap-y-2.5 rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px] ${cols === 3 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
      {facts.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[10.5px] uppercase tracking-[0.06em] text-faint">{f.label}</dt>
          <dd className="mt-0.5 font-medium capitalize text-ink">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ReadOnly({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.06em] text-faint">{label}</dt>
      <dd className="mt-0.5 font-medium capitalize text-ink">{value}</dd>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Application draft and profile                                       */
/* ------------------------------------------------------------------ */

function DraftAction({
  data,
  onGoTab,
}: {
  data: StartupSideData;
  onGoTab: (t: "season" | "journey" | "profile" | "documents" | "notices") => void;
}) {
  const p = data.profile;
  const missing = p.missing.slice(0, 6);
  const isIdeaStage = ["idea", "ideation", "pre_revenue"].includes(String(str(data.startup, "stage")).toLowerCase());
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-hair bg-surface px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[12.5px] font-medium text-ink">
            {p.complete} of {p.total} required fields
          </span>
          <span className="ss-num text-[13px] font-semibold text-brand-ink">{p.percent}% complete</span>
        </div>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-hair" role="img" aria-label={`${p.percent}% complete`}>
          <div className="h-full rounded-full bg-brand transition-[width] duration-500" style={{ width: `${p.percent}%` }} />
        </div>
        {missing.length > 0 ? (
          <div className="mt-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Still missing</p>
            <ul className="mt-1 flex flex-wrap gap-1.5">
              {missing.map((m) => (
                <li key={m} className="rounded-md bg-warn-soft px-1.5 py-[1px] text-[11px] font-medium text-warn">
                  {m}
                </li>
              ))}
              {p.missing.length > missing.length ? (
                <li className="rounded-md bg-hover px-1.5 py-[1px] text-[11px] font-medium text-faint">
                  +{p.missing.length - missing.length} more
                </li>
              ) : null}
            </ul>
          </div>
        ) : (
          <p className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-ok">
            <Icon name="check" className="h-[13px] w-[13px]" /> Every required field is filled in.
          </p>
        )}
      </div>
      {isIdeaStage ? (
        <InfoNote tone="info">
          You are at the idea stage, so the financial and traction sections are skipped — they will appear only when you
          have revenue to report.
        </InfoNote>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => onGoTab("season")}>{data.applications.length ? "Continue application" : "Start application"}</Button>
        <span className="text-[12px] text-faint">Fill in, save and resume any time.</span>
      </div>
    </div>
  );
}

function ProfileAction({
  data,
  onGoTab,
}: {
  data: StartupSideData;
  onGoTab: (t: "season" | "journey" | "profile" | "documents" | "notices") => void;
}) {
  const p = data.profile;
  return (
    <div className="space-y-3">
      <FactGrid
        facts={[
          { label: "Startup", value: String(str(data.startup, "name")) || "—" },
          { label: "Sector", value: String(str(data.startup, "sector")) || "—" },
          { label: "Stage", value: String(str(data.startup, "stage")).replace(/_/g, " ") || "—" },
          { label: "Profile complete", value: `${p.percent}%` },
        ]}
      />
      <Button onClick={() => onGoTab("profile")}>{p.percent >= 100 ? "Review your profile" : "Complete your profile"}</Button>
    </div>
  );
}


function AgreementAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const agreement = data.agreement;
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadRef, setUploadRef] = useState("");

  if (!agreement) {
    return <InfoNote tone="info">Your participation agreement will appear here once it is ready to review.</InfoNote>;
  }

  if (agreement.status === "signed") {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok-soft px-3 py-2.5">
        <p className="flex items-center gap-2 text-[13px] font-medium text-ok">
          <Icon name="check" className="h-[14px] w-[14px]" /> Agreement signed on {humanDate(agreement.signed_on)}
        </p>
        {agreement.document ? (
          <a
            href={`/api/v1/founder-upload?ref=${encodeURIComponent(agreement.document.file_ref)}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-ink hover:underline"
          >
            <Icon name="file-text" className="h-[14px] w-[14px]" /> View the signed agreement
          </a>
        ) : null}
      </div>
    );
  }

  const sign = async () => {
    setBusy(true);
    await onAction("founder_side.mou_sign", { mou_id: agreement.id }, "Agreement signed");
    setBusy(false);
  };
  const uploadSigned = async () => {
    if (!uploadRef) return;
    setBusy(true);
    const ok = await onAction("founder_side.mou_upload_signed", { mou_id: agreement.id, file_ref: uploadRef }, "Signed copy uploaded");
    if (ok) {
      setUploadRef("");
      setShowUpload(false);
    }
    setBusy(false);
  };
  const ask = async () => {
    if (!question.trim()) return;
    setBusy(true);
    const ok = await onAction("founder_side.mou_clarify", { mou_id: agreement.id, question: question.trim() }, "Question sent");
    if (ok) {
      setQuestion("");
      setShowQuestion(false);
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <FactGrid
        facts={[
          { label: "Shared", value: humanDate(agreement.shared_on) || "—" },
          { label: "Sign by", value: humanDate(agreement.signing_deadline) || "—" },
          { label: "Legal AMA", value: humanDate(agreement.legal_ama_on) || "Scheduled" },
          { label: "Status", value: agreement.status.replace(/_/g, " ") },
        ]}
      />
      {agreement.commercial_schedule ? (
        <p className="rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">Commercial schedule: </span>
          {agreement.commercial_schedule}
        </p>
      ) : null}
      {agreement.document ? (
        <a
          href={`/api/v1/founder-upload?ref=${encodeURIComponent(agreement.document.file_ref)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-ink hover:underline"
        >
          <Icon name="file-text" className="h-[14px] w-[14px]" /> Read the agreement document
        </a>
      ) : null}

      {showQuestion ? (
        <div>
          <Textarea value={question} onChange={setQuestion} rows={3} placeholder="What would you like clarified?" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => void ask()} disabled={busy || !question.trim()}>
              Send question
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowQuestion(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : showUpload ? (
        <div className="space-y-2 rounded-lg border border-hair bg-surface px-3 py-3">
          <p className="text-[12.5px] text-ink-soft">
            Printed, signed and scanned? Upload the copy and the team will validate it as your signing event.
          </p>
          <FileUploader onUploaded={(r) => setUploadRef(r.file_ref)} acceptedFormats="pdf,png,jpg,jpeg" label="Upload signed copy" />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void uploadSigned()} disabled={busy || !uploadRef}>
              Submit signed copy
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void sign()} disabled={busy}>
            {busy ? "Signing…" : "I accept and sign"}
          </Button>
          <Button variant="secondary" onClick={() => setShowUpload(true)} disabled={busy}>
            Upload a printed, signed copy
          </Button>
          <Button variant="ghost" onClick={() => setShowQuestion(true)} disabled={busy}>
            Ask a question
          </Button>
        </div>
      )}
    </div>
  );
}

function DocumentSummary({
  data,
  onGoTab,
}: {
  data: StartupSideData;
  onGoTab: (t: "season" | "journey" | "profile" | "documents" | "notices") => void;
}) {
  const mandatory = data.documentRequests.filter((r) => r.mandatory === 1);
  const verified = mandatory.filter((r) => r.status === "verified").length;
  const needs = data.documentRequests.filter((r) => r.status === "info_required" || r.status === "resubmission_required");
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hair">
          <div
            className="h-full rounded-full bg-ok transition-[width] duration-500"
            style={{ width: `${mandatory.length ? (verified / mandatory.length) * 100 : 100}%` }}
          />
        </div>
        <span className="ss-num shrink-0 text-[12px] text-ink-soft">
          {verified}/{mandatory.length} verified
        </span>
      </div>
      {needs.length > 0 ? (
        <InfoNote tone="warning">
          The team has asked about {needs.length} document{needs.length === 1 ? "" : "s"}. Open the checklist to read the
          note and upload the corrected file.
        </InfoNote>
      ) : null}
      <Button variant="secondary" onClick={() => onGoTab("documents")}>
        Open the document checklist
      </Button>
    </div>
  );
}

function BootcampAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const bootcamp = data.bootcamp;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!bootcamp) {
    return <InfoNote tone="info">Your Prep Bootcamp invitation will appear here once the team invites you.</InfoNote>;
  }
  const respond = async (decision: "accept" | "unavailable" | "question") => {
    setBusy(true);
    await onAction("founder_side.bootcamp_respond", { decision, note: note.trim() }, "Bootcamp response sent");
    setBusy(false);
  };
  if (bootcamp.acknowledgement === "accepted") {
    return (
      <div className="space-y-2.5">
        <div className="rounded-lg border border-ok/30 bg-ok-soft px-3 py-2.5 text-[13px] font-medium text-ok">
          Your place is confirmed. Preparation counts as complete only when every session is done.
        </div>
        <FactGrid
          facts={[
            { label: "Invited", value: humanDate(bootcamp.invitedOn) || "—" },
            { label: "Sessions", value: bootcamp.sessionDates || "Date to be confirmed" },
            { label: "Preparation", value: bootcamp.preparationCompleted ? "Complete" : "In progress" },
          ]}
        />
        {bootcamp.meetLink ? (
          <a
            href={bootcamp.meetLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-ink hover:underline"
          >
            <Icon name="link" className="h-[14px] w-[14px]" /> Join the bootcamp session
          </a>
        ) : (
          <p className="text-[12px] text-faint">The meeting link will appear here once the team fixes the schedule.</p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <InfoNote tone="info">
        Invited on {humanDate(bootcamp.invitedOn) || "—"}. Tell the team you are coming, or flag a clash so they can help.
      </InfoNote>
      <Textarea value={note} onChange={setNote} rows={2} placeholder="Anything the team should know? (required if you cannot attend)" />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void respond("accept")} disabled={busy}>
          {busy ? "Sending…" : "I will attend"}
        </Button>
        <Button variant="secondary" onClick={() => void respond("unavailable")} disabled={busy || !note.trim()}>
          I cannot attend
        </Button>
        <Button variant="ghost" onClick={() => void respond("question")} disabled={busy || !note.trim()}>
          Ask a question
        </Button>
      </div>
    </div>
  );
}

function VirtualPitchAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const stage = data.journey.stages.find((s) => s.key === "virtual_pitch");
  const dateLine = stage?.content.latestUpdate ?? "";
  const pitch = data.virtualPitch;
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);

  const requestReschedule = async () => {
    if (!pitch || !reason.trim()) return;
    setBusy(true);
    const ok = await onAction(
      "founder_side.pitch_reschedule_request",
      { pitch_id: pitch.id, reason: reason.trim() },
      "Reschedule requested",
    );
    if (ok) {
      setReason("");
      setShowReschedule(false);
    }
    setBusy(false);
  };

  const missed = pitch ? pitch.missed === 1 : false;
  const attended = pitch ? pitch.attended === 1 : false;
  const asked = pitch ? pitch.rescheduleReason.trim().length > 0 : false;
  const pitches = data.virtualPitches ?? [];

  return (
    <div className="space-y-2.5">
      {pitches.length > 0 ? (
        <ul className="space-y-2">
          {pitches.map((p) => {
            const held = p.attended === 1;
            const off = p.missed === 1;
            return (
              <li key={p.id} className="flex items-start justify-between gap-3 rounded-lg border border-hair bg-surface px-3 py-2.5">
                <div className="min-w-0">
                  <p className="ss-num text-[13px] font-medium text-ink">{humanDateTime(p.scheduledAt) || "Date to be confirmed"}</p>
                  <p className="mt-0.5 text-[11.5px] text-faint">
                    {p.pitchMin} min pitch · {p.qaMin} min Q&amp;A
                    {p.response ? ` · ${p.response.replace(/_/g, " ")}` : ""}
                  </p>
                  {p.meetLink ? (
                    <a href={p.meetLink} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-ink hover:underline">
                      <Icon name="link" className="h-[13px] w-[13px]" /> Join the pitch
                    </a>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-[1px] text-[10.5px] font-semibold ${
                    held ? "bg-ok-soft text-ok" : off ? "bg-warn-soft text-warn" : "bg-hover text-faint"
                  }`}
                >
                  {held ? "Held" : off ? "Missed" : "Scheduled"}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-[12.5px] text-ink-soft">{dateLine}</p>
      )}
      {missed ? (
        <InfoNote tone="warning">
          The team recorded that you could not attend your pitch. Ask for a new date and they will offer one.
        </InfoNote>
      ) : null}
      {asked ? (
        <InfoNote tone="info">Your request for a new date is with Investor Relations: “{pitch?.rescheduleReason}”.</InfoNote>
      ) : null}
      <InfoNote tone="info">
        Five minutes of pitch and five minutes of questions, exactly as the programme runs it. The meeting link and the
        material to present are sent to you by the Investor Relations team.
      </InfoNote>
      {pitch && !attended && !asked ? (
        showReschedule ? (
          <div>
            <Textarea value={reason} onChange={setReason} rows={2} placeholder="Why does the date not work? The team will find another slot." />
            <div className="mt-2 flex gap-2">
              <Button size="sm" onClick={() => void requestReschedule()} disabled={busy || !reason.trim()}>
                Send request
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowReschedule(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setShowReschedule(true)}>
            Ask to reschedule
          </Button>
        )
      ) : null}
    </div>
  );
}

function PitchDayAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const options = data.pitchDayOptions;
  const [selected, setSelected] = useState<string[]>(options.filter((o) => o.founder_available === 1).map((o) => o.id));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSelected(options.filter((o) => o.founder_available === 1).map((o) => o.id));
  }, [options]);

  if (options.length === 0) {
    return <InfoNote tone="info">The team will release the available Pitch Day dates here for you to confirm.</InfoNote>;
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const confirm = async () => {
    setBusy(true);
    await onAction("founder_side.pitch_day_confirm", { option_ids: selected }, "Slots sent to the team");
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-[12.5px] text-ink-soft">
        Pick every slot you can attend. The team verifies, validates and approves the schedule, and asks for a change if a
        slot does not work.
      </p>
      <ul className="space-y-2">
        {options.map((o) => {
          const approved = o.status === "chosen" || o.approval === "approved";
          const change = o.approval === "change_requested";
          return (
            <li key={o.id}>
              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 ${
                  approved ? "border-ok/30 bg-ok-soft" : change ? "border-warn/40 bg-warn-soft" : "border-hair bg-surface"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(o.id)}
                  onChange={() => toggle(o.id)}
                  disabled={approved}
                  className="mt-0.5 h-[15px] w-[15px] accent-[color:var(--brand)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="ss-num text-[13px] font-medium text-ink">
                      {humanDate(o.option_date)}
                      {o.slot_time ? ` · ${o.slot_time}` : ""}
                    </span>
                    {approved ? (
                      <span className="shrink-0 rounded-md bg-ok-soft px-1.5 py-[1px] text-[10.5px] font-semibold text-ok">Approved</span>
                    ) : change ? (
                      <span className="shrink-0 rounded-md bg-warn-soft px-1.5 py-[1px] text-[10.5px] font-semibold text-warn">Change asked</span>
                    ) : o.approval === "requested" ? (
                      <span className="shrink-0 rounded-md bg-brand-soft px-1.5 py-[1px] text-[10.5px] font-semibold text-brand-ink">With the team</span>
                    ) : null}
                  </span>
                  {o.investor_name ? (
                    <span className="mt-0.5 block text-[11.5px] text-ink-soft">
                      With {o.investor_name}
                      {o.investor_category ? ` · ${o.investor_category.replace(/_/g, " ")}` : ""}
                    </span>
                  ) : o.slot_note ? (
                    <span className="mt-0.5 block text-[11.5px] text-ink-soft">{o.slot_note}</span>
                  ) : null}
                  {o.review_note ? <span className="mt-0.5 block text-[11.5px] text-warn">{o.review_note}</span> : null}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <Button onClick={() => void confirm()} disabled={busy || selected.length === 0}>
        {busy ? "Sending…" : "Send my slots to the team"}
      </Button>
    </div>
  );
}

function FeeAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const fee = data.finance.fee;
  const [showProof, setShowProof] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [fileRef, setFileRef] = useState("");
  const [busy, setBusy] = useState(false);

  if (!fee) {
    return <InfoNote tone="info">Your programme fee invoice will appear here once you are selected.</InfoNote>;
  }
  const status = str(fee, "status");
  if (status === "paid" || status === "waived") {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok-soft px-3 py-2.5 text-[13px] font-medium text-ok">
        {status === "paid" ? "Your programme fee is paid and the receipt is allocated." : "Your programme fee has been waived."}
      </div>
    );
  }

  const submitProof = async () => {
    setBusy(true);
    const ok = await onAction(
      "founder_side.fee_proof_submit",
      { fee_id: str(fee, "id"), amount: Math.round(Number(amount || 0) * 100), reference, file_ref: fileRef },
      "Payment proof shared",
    );
    if (ok) {
      setShowProof(false);
      setAmount("");
      setReference("");
      setFileRef("");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <FactGrid
        facts={[
          { label: "Invoice", value: str(fee, "invoice_no") || "—" },
          { label: "Financial year", value: str(fee, "financial_year") || "—" },
          { label: "Turnover basis", value: str(fee, "turnoverBasis") || "—" },
          { label: "Fee schedule", value: `${str(fee, "feeScheduleCode") || "—"}${str(fee, "feeScheduleVersion") ? ` v${str(fee, "feeScheduleVersion")}` : ""}` },
          { label: "Fee", value: <Money paise={Number(fee.fee_amount ?? 0)} /> },
          { label: "Due", value: humanDate(str(fee, "due_date")) || "—" },
          { label: "Paid", value: <Money paise={Number(fee.paid_amount ?? 0)} /> },
          { label: "Outstanding", value: <Money paise={Number(fee.outstanding ?? 0)} /> },
        ]}
      />

      <InfoNote tone="info">
        Pay using the invoice details shared by Finance, then share your payment proof. Finance verifies and allocates the
        receipt before the invoice is marked paid.
      </InfoNote>

      {Boolean(fee.extension_approved) ? (
        <InfoNote tone="warning">
          An extension was approved. Your original due date is preserved in the record, so the history stays intact.
        </InfoNote>
      ) : null}

      {data.paymentProofs[0] ? (
        <p className="text-[12px] text-ink-soft">
          Your last proof ({humanDateTime(data.paymentProofs[0].created_at)}) is {data.paymentProofs[0].status}.
        </p>
      ) : null}

      {showProof ? (
        <div className="space-y-2 rounded-lg border border-hair bg-surface px-3 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Amount paid (₹)" required>
              <Input type="number" value={amount} onChange={setAmount} placeholder="e.g. 5000" />
            </Field>
            <Field label="Payment reference / UTR" required>
              <Input value={reference} onChange={setReference} placeholder="e.g. NEFT-…" />
            </Field>
          </div>
          <Field label="Receipt or screenshot" hint="Optional but it speeds up verification.">
            <FileUploader onUploaded={(r) => setFileRef(r.file_ref)} acceptedFormats="pdf,png,jpg,jpeg" label="Attach receipt" />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void submitProof()} disabled={busy || !amount || !reference.trim()}>
              Share proof
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowProof(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowProof(true)}>Share payment proof</Button>
      )}
    </div>
  );
}

function ShootAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const shoot = data.shoot;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  if (!shoot.av_id) {
    return <InfoNote tone="info">Your AV shoot details will appear here once production schedules it.</InfoNote>;
  }
  const confirm = async () => {
    setBusy(true);
    await onAction("founder_side.shoot_confirm", { av_id: shoot.av_id, availability: note }, "Availability confirmed");
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px]">
        <ReadOnly label="AV shoot" value={shoot.av_scheduled_on ? humanDate(shoot.av_scheduled_on) : "Being scheduled"} />
        <ReadOnly label="Location" value={shoot.av_location || "To be confirmed"} />
        <ReadOnly label="Mock shoot" value={shoot.mock_scheduled_on ? humanDate(shoot.mock_scheduled_on) : "—"} />
        <ReadOnly label="Main shoot" value={shoot.main_scheduled_on ? humanDate(shoot.main_scheduled_on) : "—"} />
      </dl>
      <Field label="Confirm your availability" hint="Let production know any constraint on the shoot day.">
        <Input value={note} onChange={setNote} placeholder={shoot.av_availability || "e.g. Available all day"} />
      </Field>
      <Button onClick={() => void confirm()} disabled={busy}>
        {busy ? "Sending…" : "Confirm availability"}
      </Button>
    </div>
  );
}

function MockAction({ data }: { data: StartupSideData }) {
  const stage = data.journey.stages.find((s) => s.key === "mock_shoot");
  const mock = data.mock;
  return (
    <div className="space-y-2.5">
      <p className="text-[12.5px] text-ink-soft">{stage?.content.latestUpdate}</p>
      <InfoNote tone="info">
        The mock shoot is your rehearsal: pitch revisions, product demo, costumes and properties, stage movement and your
        final ask and valuation. Production confirms your readiness before the main shoot.
      </InfoNote>
      {mock?.scheduledOn ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px]">
          <ReadOnly label="Mock shoot" value={humanDate(mock.scheduledOn)} />
          <ReadOnly label="Product demo" value={mock.productDemoReady === 1 ? "Ready" : "Pending"} />
          <ReadOnly label="Stage rehearsal" value={mock.stageMovementRehearsed === 1 ? "Done" : "Pending"} />
          <ReadOnly label="Readiness" value={mock.finalReadinessApprovedOn ? humanDate(mock.finalReadinessApprovedOn) : "Pending"} />
        </dl>
      ) : null}
    </div>
  );
}

function MainShootAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const shoot = data.shoot;
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    if (!shoot.av_id) return;
    setBusy(true);
    await onAction("founder_side.shoot_confirm", { av_id: shoot.av_id, availability: note }, "Availability confirmed");
    setBusy(false);
  };
  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px]">
        <ReadOnly label="Main shoot" value={shoot.main_scheduled_on ? humanDate(shoot.main_scheduled_on) : "Being scheduled"} />
        <ReadOnly label="Mock shoot" value={shoot.mock_scheduled_on ? humanDate(shoot.mock_scheduled_on) : "—"} />
        <ReadOnly label="Episode" value={data.episodeNo || "—"} />
        <ReadOnly label="Status" value={(shoot.main_status ?? "planned").replace(/_/g, " ")} />
      </dl>
      {shoot.av_id ? (
        <>
          <Field label="Confirm your availability" hint="Let production know any constraint on the shoot day.">
            <Input value={note} onChange={setNote} placeholder={shoot.av_availability || "e.g. Available all day"} />
          </Field>
          <Button onClick={() => void confirm()} disabled={busy}>
            {busy ? "Sending…" : "Confirm availability"}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function TelecastAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const stage = data.journey.stages.find((s) => s.key === "telecast");
  const t = data.telecast;
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(t?.founderFeedback ?? "");
  const [showFeedback, setShowFeedback] = useState(false);

  if (!t) {
    return <InfoNote tone="info">{stage?.content.latestUpdate ?? "Your episode details will appear here after the main shoot."}</InfoNote>;
  }

  const markPosted = async (done: boolean) => {
    setBusy(true);
    await onAction("founder_side.telecast_update", { posting_done: done ? 1 : 0 }, done ? "Posts marked done" : "Posts marked pending");
    setBusy(false);
  };
  const sendFeedback = async () => {
    if (!feedback.trim()) return;
    setBusy(true);
    const ok = await onAction("founder_side.telecast_update", { feedback: feedback.trim() }, "Feedback sent");
    if (ok) setShowFeedback(false);
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <FactGrid
        facts={[
          { label: "Episode", value: t.episodeNo || data.episodeNo || "—" },
          { label: "Air date", value: humanDate(t.telecastDate) || "Being prepared" },
          { label: "Approved promo assets", value: t.promoAssetsApproved ? "Ready" : "Pending" },
          { label: "Your posts", value: t.founderPostingDone ? "Done" : "Pending" },
        ]}
      />

      {t.promoRequirements ? (
        <p className="rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">Promotion brief: </span>
          {t.promoRequirements}
        </p>
      ) : null}
      {t.promoPosts ? (
        <p className="rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">Approved posts: </span>
          {t.promoPosts}
        </p>
      ) : null}
      {t.announcementWording ? (
        <p className="rounded-lg border border-brand/25 bg-brand-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-ink">
          <span className="font-medium">Approved announcement: </span>
          {t.announcementWording}
        </p>
      ) : null}
      {t.publicAnnouncement ? (
        <p className="text-[12px] leading-relaxed text-faint">
          Public claims distinguish announced, committed and verified-deployed amounts: {t.publicAnnouncement}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {t.founderPostingDone ? (
          <Button variant="secondary" onClick={() => void markPosted(false)} disabled={busy}>
            Mark my posts as pending
          </Button>
        ) : (
          <Button onClick={() => void markPosted(true)} disabled={busy}>
            {busy ? "Saving…" : "I have published the approved posts"}
          </Button>
        )}
        <Button variant="ghost" onClick={() => setShowFeedback((v) => !v)} disabled={busy}>
          {t.founderFeedback ? "Edit my feedback" : "Share your feedback"}
        </Button>
      </div>

      {t.founderFeedback && !showFeedback ? (
        <p className="rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
          <span className="font-medium text-ink">Your feedback: </span>
          {t.founderFeedback}
        </p>
      ) : null}

      {showFeedback ? (
        <div>
          <Textarea value={feedback} onChange={setFeedback} rows={3} placeholder="How did the episode and the promotion go?" />
          <div className="mt-2 flex gap-2">
            <Button size="sm" onClick={() => void sendFeedback()} disabled={busy || !feedback.trim()}>
              Send feedback
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowFeedback(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const DEAL_STAGE_LABEL: Record<string, string> = {
  deal_confirmed: "Deal confirmed",
  communication_thread: "In discussion",
  term_sheet: "Term sheet",
  due_diligence: "Due diligence",
  findings_resolution: "Findings resolution",
  definitive_agreements: "Definitive agreements",
  pre_funding_conditions: "Pre-funding conditions",
  fund_transfer: "Fund transfer",
  receipt_verification: "Receipt verification",
  allotment: "Allotment",
  closed: "Closed",
  withdrawn: "Withdrawn",
  failed: "Failed",
};

function DealClosureAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const stage = data.journey.stages.find((s) => s.key === "deal_closure");
  const deals = data.dealsPerInvestor ?? [];
  if (deals.length === 0) {
    return (
      <div className="space-y-2.5">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{stage?.content.latestUpdate}</p>
        <InfoNote tone="info">
          Each investor conversation becomes its own deal: term sheet, due diligence, agreements and conditions, with an
          expected date for every milestone. The team tells you which documents to upload and which agreements to sign.
        </InfoNote>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {deals.map((d) => (
        <DealCard key={d.id} deal={d} onAction={onAction} />
      ))}
    </div>
  );
}

function DealCard({
  deal,
  onAction,
}: {
  deal: FounderDeal;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadRef, setUploadRef] = useState("");
  const [purpose, setPurpose] = useState("due_diligence_report");
  const closed = ["closed"].includes(deal.status);
  const withdrawn = ["withdrawn", "failed"].includes(deal.status);

  const upload = async () => {
    if (!uploadRef) return;
    setBusy(true);
    const ok = await onAction("founder_side.deal_document", { deal_id: deal.id, purpose, file_ref: uploadRef }, "Document uploaded");
    if (ok) {
      setUploadRef("");
      setShowUpload(false);
    }
    setBusy(false);
  };

  return (
    <div className="rounded-lg border border-hair bg-surface px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-ink">{deal.investorName}</p>
          <p className="text-[11.5px] capitalize text-faint">{deal.investorCategory.replace(/_/g, " ") || "Investor"}</p>
        </div>
        <span
          className={`shrink-0 rounded-md px-1.5 py-[1px] text-[10.5px] font-semibold ${
            closed ? "bg-ok-soft text-ok" : withdrawn ? "bg-risk-soft text-risk" : "bg-brand-soft text-brand-ink"
          }`}
        >
          {DEAL_STAGE_LABEL[deal.status] ?? deal.status.replace(/_/g, " ")}
        </span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <div>
          <dt className="text-[10.5px] uppercase tracking-[0.06em] text-faint">Committed</dt>
          <dd className="mt-0.5 font-medium text-ink">
            <Money paise={deal.committed} />
          </dd>
        </div>
        {deal.valuation ? (
          <div>
            <dt className="text-[10.5px] uppercase tracking-[0.06em] text-faint">Valuation</dt>
            <dd className="mt-0.5 font-medium text-ink">{deal.valuation}</dd>
          </div>
        ) : null}
      </div>

      {deal.milestones.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {deal.milestones.map((m) => (
            <li key={m.label} className="flex items-center justify-between text-[12px]">
              <span className="capitalize text-ink-soft">{m.label}</span>
              <span className="ss-num text-ink">{humanDate(m.date)}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {deal.documents.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {deal.documents.map((doc, i) => (
            <li key={`${doc.purpose}-${i}`} className="flex items-center justify-between gap-2 text-[12px]">
              <span className="truncate capitalize text-ink-soft">{doc.type || doc.purpose.replace(/_/g, " ")}</span>
              <span
                className={`shrink-0 rounded px-1.5 py-[1px] text-[10.5px] font-medium ${
                  doc.status === "verified" ? "bg-ok-soft text-ok" : doc.status === "signed" ? "bg-brand-soft text-brand-ink" : "bg-hover text-faint"
                }`}
              >
                {doc.status}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {deal.openDocuments ? <p className="mt-2 text-[11.5px] text-warn">Open: {deal.openDocuments}</p> : null}
      {deal.openConditions ? <p className="mt-1 text-[11.5px] text-warn">Conditions: {deal.openConditions}</p> : null}
      {deal.withdrawalReason ? <p className="mt-1 text-[11.5px] text-risk">Withdrawn: {deal.withdrawalReason}</p> : null}
      {deal.replacementName ? <p className="mt-1 text-[11.5px] text-ink-soft">Replacement investor: {deal.replacementName}</p> : null}

      {!closed && !withdrawn ? (
        showUpload ? (
          <div className="mt-2.5 space-y-2 rounded-lg border border-hair bg-canvas px-3 py-2.5">
            <Field label="What is this document?">
              <select
                className="w-full rounded-lg border border-hair-strong bg-canvas px-2.5 py-[7px] text-[13px] text-ink"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              >
                <option value="due_diligence_report">Due diligence report</option>
                <option value="due_diligence_data">Due diligence data room document</option>
                <option value="definitive_agreement">Signed agreement</option>
                <option value="board_resolution">Board resolution</option>
                <option value="cap_table">Cap table</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <FileUploader onUploaded={(r) => setUploadRef(r.file_ref)} acceptedFormats="pdf,png,jpg,jpeg,xlsx" label="Attach document" />
            <div className="flex gap-2">
              <Button size="sm" onClick={() => void upload()} disabled={busy || !uploadRef}>
                Upload
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowUpload(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => setShowUpload(true)}>
            Upload due-diligence document
          </Button>
        )
      ) : null}
    </div>
  );
}

function FundsAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const inv = data.investment;
  const outstanding = Math.max(0, inv.committed - inv.deployed);
  const partial = inv.trancheCount > 0 && inv.verifiedTranches < inv.trancheCount;
  const perDeal = data.fundingPerDeal ?? [];
  return (
    <div className="space-y-3">
      <FactGrid
        facts={[
          { label: "Committed", value: <Money paise={inv.committed} /> },
          { label: "Investors", value: String(inv.committedCount) },
          { label: "Verified as received", value: <Money paise={inv.deployed} /> },
          { label: "Tranches verified", value: `${inv.verifiedTranches} of ${inv.trancheCount}` },
          { label: "Still to be received", value: <Money paise={outstanding} /> },
        ]}
      />
      {partial ? (
        <InfoNote tone="info">
          Deployment is in progress: {inv.verifiedTranches} of {inv.trancheCount} tranches are verified as received, so{" "}
          <Money paise={inv.deployed} /> is received and <Money paise={outstanding} /> of the commitment is still pending.
        </InfoNote>
      ) : null}
      {perDeal.map((deal) => (
        <div key={deal.dealId} className="rounded-lg border border-hair bg-surface px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[12.5px] font-semibold text-ink">{deal.investorName}</p>
            <p className="ss-num shrink-0 text-[12px] text-ink-soft">
              <Money paise={deal.received} /> of <Money paise={deal.committed} />
            </p>
          </div>
          {deal.tranches.length > 0 ? (
            <table className="mt-2 w-full text-[11.5px]">
              <thead>
                <tr className="text-left text-faint">
                  <th className="font-medium">Tranche</th>
                  <th className="font-medium">Scheduled</th>
                  <th className="font-medium">Verified</th>
                  <th className="font-medium">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {deal.tranches.map((t) => {
                  const verified = ["verified", "part_verified"].includes(t.status);
                  return (
                    <tr key={t.id} className="border-t border-hair">
                      <td className="py-1 pr-2 ss-num">#{t.seq}</td>
                      <td className="py-1 pr-2">
                        <Money paise={t.scheduledAmount} compact />
                        {t.scheduledOn ? <span className="block text-[10.5px] text-faint">{humanDate(t.scheduledOn)}</span> : null}
                      </td>
                      <td className="py-1 pr-2">
                        <Money paise={t.verifiedAmount} compact />
                        {t.verifiedOn ? <span className="block text-[10.5px] text-faint">{humanDate(t.verifiedOn)}</span> : null}
                      </td>
                      <td className="py-1 pr-2 capitalize text-ink-soft">{t.status.replace(/_/g, " ")}</td>
                      <td className="py-1 text-right">
                        {!verified && !t.startupConfirmedOn ? (
                          <TrancheConfirmButton trancheId={t.id} onAction={onAction} />
                        ) : t.startupConfirmedOn ? (
                          <span className="text-[10.5px] font-medium text-ok">Confirmed</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="mt-1.5 text-[11.5px] text-faint">No tranches scheduled yet.</p>
          )}
        </div>
      ))}
    </div>
  );
}

function TrancheConfirmButton({
  trancheId,
  onAction,
}: {
  trancheId: string;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await onAction("founder_side.tranche_confirm", { tranche_id: trancheId }, "Receipt confirmed");
        setBusy(false);
      }}
      className="rounded-md border border-hair-strong bg-canvas px-1.5 py-[2px] text-[10.5px] font-medium text-ink transition hover:bg-hover disabled:text-faint"
    >
      {busy ? "…" : "I received this"}
    </button>
  );
}

function SuccessFeeAction({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const stage = data.journey.stages.find((s) => s.key === "success_fee");
  const sf = data.finance.successFee;
  const [showProof, setShowProof] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [fileRef, setFileRef] = useState("");
  const [busy, setBusy] = useState(false);

  if (!sf) {
    return (
      <div className="space-y-2.5">
        <p className="text-[12.5px] leading-relaxed text-ink-soft">{stage?.content.latestUpdate}</p>
        <InfoNote tone="info">
          Your success fee is calculated only on the money actually received, under your signed MoU, and is triggered once
          a deployment is verified. Finance raises the invoice here.
        </InfoNote>
      </div>
    );
  }

  const settled = ["collected", "reconciled"].includes(str(sf, "status"));
  const submitProof = async () => {
    setBusy(true);
    const ok = await onAction(
      "founder_side.success_fee_proof",
      { fee_id: str(sf, "id"), amount: Math.round(Number(amount || 0) * 100), reference, file_ref: fileRef },
      "Payment proof shared",
    );
    if (ok) {
      setShowProof(false);
      setAmount("");
      setReference("");
      setFileRef("");
    }
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      <FactGrid
        facts={[
          { label: "Fee base (eligible funding)", value: <Money paise={Number(sf.base ?? 0)} /> },
          { label: "Rate", value: `${Number(sf.ratePercent ?? 0)}%` },
          { label: "Structure", value: str(sf, "structure").replace(/_/g, " ") || "—" },
          { label: "Fee due", value: <Money paise={Number(sf.feeDue ?? 0)} /> },
          { label: "Invoiced", value: <Money paise={Number(sf.invoiced ?? 0)} /> },
          { label: "Collected", value: <Money paise={Number(sf.collected ?? 0)} /> },
          { label: "Outstanding", value: <Money paise={Number(sf.outstanding ?? 0)} /> },
          { label: "Due", value: humanDate(str(sf, "dueDate")) || "—" },
        ]}
      />
      <InfoNote tone="info">
        Your success fee is calculated only on the money actually received, under your signed MoU. Sharing a payment
        screenshot does not mark it paid until Finance verifies and allocates the receipt.
      </InfoNote>
      {settled ? (
        <p className="flex items-center gap-2 text-[13px] font-medium text-ok">
          <Icon name="check" className="h-[14px] w-[14px]" /> This invoice is settled.
        </p>
      ) : showProof ? (
        <div className="space-y-2 rounded-lg border border-hair bg-surface px-3 py-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Amount paid (₹)" required>
              <Input type="number" value={amount} onChange={setAmount} placeholder="e.g. 1500" />
            </Field>
            <Field label="Payment reference / UTR" required>
              <Input value={reference} onChange={setReference} placeholder="e.g. NEFT-…" />
            </Field>
          </div>
          <Field label="Receipt or screenshot" hint="Optional but it speeds up verification.">
            <FileUploader onUploaded={(r) => setFileRef(r.file_ref)} acceptedFormats="pdf,png,jpg,jpeg" label="Attach receipt" />
          </Field>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void submitProof()} disabled={busy || !amount || !reference.trim()}>
              Share proof
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowProof(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button onClick={() => setShowProof(true)}>Share payment proof</Button>
      )}
    </div>
  );
}

function CommunityAction({ data }: { data: StartupSideData }) {
  const stage = data.journey.stages.find((s) => s.key === "community");
  return (
    <div className="space-y-2.5">
      <p className="text-[12.5px] leading-relaxed text-ink-soft">{stage?.content.latestUpdate}</p>
      <InfoNote tone="info">
        The community brings together founders, alumni, mentors, investors and ecosystem partners. You can join events and
        ask for support — investor introductions, mentoring, customer connections, hiring help or follow-on funding. You
        will always see the outcome of a request here.
      </InfoNote>
    </div>
  );
}
