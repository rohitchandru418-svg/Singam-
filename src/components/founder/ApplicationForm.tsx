"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Checkbox, Field, InfoNote, Input, ProgressBar, Select, Textarea } from "../ui";
import { Icon } from "../icons";
import { useSession } from "../SessionProvider";
import { applicationFields, APPLICATION_SECTIONS, needsFinancials, type ApplicationField } from "@/lib/domain/applicationForm";
import { autofillProfile, buildFormValues, formValuesToPayload } from "@/lib/domain/sampleProfile";
import type { StartupSideData } from "@/lib/client/api";
import { humanDate, str } from "./shared";

/**
 * The Season 3 application form, as a guided step-by-step wizard.
 *
 * The founder moves through the sections one at a time: each section shows only its own
 * fields, and the Next button unlocks once every required field in that section is filled.
 * The last step submits. A step rail on the right lists the sections and marks the ones that
 * are complete, so progress is always visible without scrolling a wall of fields.
 *
 * Mandatory fields follow the stage — a pre-revenue business never sees a required financial
 * field, so the completeness percentage is always something the founder can actually reach.
 */

export function ApplicationForm({
  data,
  onAction,
  onGoJourney,
  variant = "application",
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  onGoJourney: () => void;
  /** "application" submits to the season; "profile" is the same fields without the submit step. */
  variant?: "application" | "profile";
}) {
  const startup = useMemo(() => data.startup ?? {}, [data.startup]);
  const founders = data.founders;
  // Only the live season's application is editable here. A returning founder with no
  // application yet sees a fresh form; their closed-season entries live under Earlier seasons.
  const application = data.applications.find((a) => a.id === data.currentApplicationId) ?? null;
  const submitted = application !== null && application.status !== "draft";
  const seasonLabel = data.currentSeasonName || "this season";
  const isProfile = variant === "profile";
  const { devMode } = useSession();

  // Editable copy of the profile fields the form owns.
  const initial = useMemo(() => buildFormValues(startup), [startup]);
  const [values, setValues] = useState<Record<string, string | number | boolean>>(initial);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);

  // Re-read the form whenever the server record changes (a save, a refresh).
  useEffect(() => {
    setValues(initial);
  }, [initial]);

  const fields = useMemo(() => applicationFields(startup), [startup]);
  const fieldsWithValues = useMemo(
    () => fields.map((f) => ({ ...f, filled: (s: Record<string, unknown>) => f.filled({ ...s, ...values }, founders) })),
    [fields, values, founders],
  );

  const sections = useMemo(() => {
    const out: { name: string; complete: number; total: number; fields: ApplicationField[] }[] = [];
    for (const name of APPLICATION_SECTIONS) {
      const inSection = fieldsWithValues.filter((f) => f.section === name);
      const requiredIn = inSection.filter((f) => f.required);
      if (!requiredIn.length) continue;
      out.push({ name, complete: requiredIn.filter((f) => f.filled(startup)).length, total: requiredIn.length, fields: inSection });
    }
    return out;
  }, [fieldsWithValues, startup]);

  const required = fieldsWithValues.filter((f) => f.required);
  const complete = required.filter((f) => f.filled(startup)).length;
  const percent = required.length ? Math.round((complete / required.length) * 100) : 0;
  const financials = needsFinancials(startup);

  // Keep the step in range if the section list shrinks (e.g. financials drop out).
  const stepIndex = Math.min(step, Math.max(sections.length - 1, 0));
  const current = sections[stepIndex] ?? null;
  const currentComplete = current ? current.complete === current.total : false;
  const isLast = stepIndex >= sections.length - 1;

  const setValue = (key: string, value: string | number | boolean) => setValues((v) => ({ ...v, [key]: value }));

  /**
   * Fill only the empty fields with plausible sample answers, then save. Offered only in dev
   * mode so a reviewer can reach the submit gate in one click; every value it writes is a real
   * record the server stores, and a field the founder has already filled is left untouched.
   */
  const autoFill = async () => {
    const { values: next, payload, filled } = autofillProfile(startup, values);
    if (filled === 0) return;
    setValues(next);
    await onAction("founder_side.save_draft", payload, `Auto-filled ${filled} field${filled === 1 ? "" : "s"}`);
  };

  const payloadFrom = (source: Record<string, string | number | boolean>) => formValuesToPayload(fields, source);
  const payload = () => payloadFrom(values);

  const save = async () => {
    setBusy(true);
    const ok = await onAction("founder_side.save_draft", payload(), "Draft saved");
    setBusy(false);
    return ok;
  };

  const submit = async () => {
    setBusy(true);
    const ok = await onAction("founder_side.save_draft", payload(), "Draft saved");
    if (ok && data.currentApplicationId) {
      await onAction("application.submit_own", { application_id: data.currentApplicationId }, "Application submitted");
      onGoJourney();
    } else if (ok) {
      await onAction("application.apply", { completion_pct: 100 }, "Application started");
      onGoJourney();
    }
    setBusy(false);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_16rem]">
      <div className="space-y-4">
        <div className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">{isProfile ? "My profile" : `${seasonLabel} application`}</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                {isProfile
                  ? "The details we hold about your startup and founders. They are reused every season."
                  : application
                    ? `${submitted ? "Submitted" : "Draft"} · reference ${application.reference_no}${application.submitted_at ? ` · ${humanDate(application.submitted_at)}` : ""}`
                    : "Start your application. Your progress is saved as a draft."}
              </p>
            </div>
            {submitted && !isProfile ? (
              <span className="rounded-md bg-ok-soft px-2 py-1 text-[11.5px] font-medium text-ok">Submitted</span>
            ) : (
              <span className={`rounded-md px-2 py-1 text-[11.5px] font-medium ${percent === 100 ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>{percent}% complete</span>
            )}
          </div>
          <div className="mt-3">
            <ProgressBar value={percent} tone={percent === 100 ? "success" : "progress"} />
            <p className="mt-1.5 text-[11.5px] text-faint">
              {complete} of {required.length} required fields complete
              {financials ? "" : " · financial and traction sections are not required at your stage"}
            </p>
          </div>
        </div>

        {/* Step rail (mobile: horizontal). */}
        <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-hair bg-canvas p-1.5 shadow-card lg:hidden">
          {sections.map((s, i) => {
            const done = s.complete === s.total;
            return (
              <button
                key={s.name}
                type="button"
                onClick={() => setStep(i)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition ${
                  i === stepIndex ? "bg-ink text-white" : done ? "text-ok hover:bg-hover" : "text-ink-soft hover:bg-hover"
                }`}
              >
                <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] ${i === stepIndex ? "bg-white/25" : done ? "bg-ok-soft" : "bg-hover"}`}>
                  {done && i !== stepIndex ? "✓" : i + 1}
                </span>
                {s.name}
              </button>
            );
          })}
        </div>

        {current ? (
          <div className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-[13.5px] font-semibold text-ink">{current.name}</h3>
              <span className="ss-num text-[11.5px] text-faint">
                Step {stepIndex + 1} of {sections.length}
                {current.total > 0 ? ` · ${current.complete}/${current.total} required` : ""}
              </span>
            </div>
            <p className="mt-0.5 text-[12px] text-faint">
              Fields marked <span className="text-risk">*</span> are required for your stage.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {current.name === "Founders" ? (
                <div className="sm:col-span-2">
                  <FounderTeam data={data} onAction={onAction} />
                </div>
              ) : (
                current.fields.map((field) => (
                  <div key={field.key} className={field.type === "textarea" ? "sm:col-span-2" : ""}>
                    <ApplicationInput field={field} value={values[field.key]} onChange={setValue} />
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={busy || stepIndex === 0}>
            Back
          </Button>
          {!isLast ? (
            <Button onClick={() => setStep((s) => Math.min(sections.length - 1, s + 1))} disabled={busy || !currentComplete}>
              Next
            </Button>
          ) : isProfile ? (
            <Button onClick={() => void save()} disabled={busy}>
              {busy ? "Saving…" : "Save profile"}
            </Button>
          ) : (
            <Button onClick={() => void submit()} disabled={busy || percent < 100}>
              {submitted ? "Re-submit application" : "Submit application"}
            </Button>
          )}
          <Button variant="ghost" onClick={() => void save()} disabled={busy}>
            Save draft
          </Button>
          {devMode ? (
            <Button variant="secondary" onClick={() => void autoFill()} disabled={busy} title="Demo only: fill empty fields with sample data">
              <Icon name="refresh" className="h-[14px] w-[14px]" />
              Auto-fill sample data
            </Button>
          ) : null}
          {!currentComplete ? (
            <span className="text-[12px] text-faint">Complete this section to continue.</span>
          ) : null}
        </div>

        {submitted && !isProfile ? (
          <InfoNote tone="info">
            Your application is with the team. You can still correct a detail — saving and submitting again updates the
            same application and keeps your reference number.
          </InfoNote>
        ) : null}

        <EarlierSeasons data={data} />
      </div>

      {/* Step rail (desktop). */}
      <aside className="hidden lg:block">
        <div className="sticky top-4 rounded-xl border border-hair bg-canvas p-3 shadow-card">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-faint">Sections</p>
          <ol className="mt-2 space-y-1">
            {sections.map((s, i) => {
              const done = s.complete === s.total;
              const active = i === stepIndex;
              return (
                <li key={s.name}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12.5px] transition ${
                      active ? "bg-hover font-medium text-ink" : "text-ink-soft hover:bg-hover"
                    }`}
                  >
                    <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${active ? "bg-ink text-white" : done ? "bg-ok-soft text-ok" : "bg-hover text-faint"}`}>
                      {done && !active ? "✓" : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className={`ss-num shrink-0 text-[11.5px] ${done ? "text-ok" : "text-faint"}`}>
                      {done ? "" : `${s.complete}/${s.total}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 border-t border-hair pt-2.5 text-[11.5px] leading-snug text-faint">
            {str(startup, "name")} · {str(startup, "sector") || "sector not set"}
          </p>
        </div>
      </aside>
    </div>
  );
}

function ApplicationInput({
  field,
  value,
  onChange,
}: {
  field: ApplicationField;
  value: string | number | boolean | undefined;
  onChange: (key: string, value: string | number | boolean) => void;
}) {
  if (field.type === "founder") {
    // The founder rows are edited as a block in the Founders section, not as single fields.
    return null;
  }
  if (field.type === "checkbox") {
    return <Checkbox checked={Boolean(value)} onChange={(v) => onChange(field.key, v)} label={field.label} />;
  }
  return (
    <Field label={field.label} required={field.required} hint={field.hint}>
      {field.type === "textarea" ? (
        <Textarea value={String(value ?? "")} onChange={(v) => onChange(field.key, v)} placeholder={field.placeholder} rows={3} />
      ) : field.type === "select" ? (
        <Select
          value={String(value ?? "")}
          onChange={(v) => onChange(field.key, v)}
          options={field.options ?? []}
          placeholder={field.placeholder ?? "Select…"}
        />
      ) : field.type === "money" ? (
        <Input
          type="number"
          value={value === undefined || value === "" ? "" : String(value)}
          onChange={(v) => onChange(field.key, v)}
          placeholder="Amount in rupees"
        />
      ) : field.type === "number" ? (
        <Input type="number" value={value === undefined ? "" : String(value)} onChange={(v) => onChange(field.key, v)} placeholder={field.placeholder} />
      ) : (
        <Input value={String(value ?? "")} onChange={(v) => onChange(field.key, v)} placeholder={field.placeholder} />
      )}
    </Field>
  );
}

/**
 * The founder team, edited as a block.
 *
 * The primary founder's details arrive pre-filled from registration, so this is usually a
 * quick confirm; it is also how a co-founder is added. Each row saves on its own through
 * `founder_side.save_founder`, so the section can never dead-end the way a display-only row
 * would.
 */
function FounderTeam({
  data,
  onAction,
}: {
  data: StartupSideData;
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<string | null>(data.founders[0] ? String(data.founders[0].id) : "new");
  const [busy, setBusy] = useState(false);

  const rows = data.founders;
  const startNew = () => setEditing("new");

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <InfoNote tone="warning">
          Add the founder details so this section can be completed. They are captured once and reused on every
          document and form.
        </InfoNote>
      ) : null}

      <ul className="space-y-2">
        {rows.map((f) => {
          const id = String(f.id);
          return (
            <li key={id} className="rounded-lg border border-hair bg-surface px-3 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-[12.5px] font-medium text-ink">
                    {str(f, "name")}
                    {Number(f.is_primary ?? 0) === 1 ? (
                      <span className="ml-2 rounded-md bg-brand-soft px-1.5 py-[1px] text-[10.5px] font-medium text-brand-ink">
                        Primary
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11.5px] text-ink-soft">
                    {str(f, "role") || "Founder"} · {str(f, "email") || "no email"}
                    {str(f, "phone") ? ` · ${str(f, "phone")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(editing === id ? null : id)}
                  className="rounded-lg border border-hair-strong bg-canvas px-2.5 py-[5px] text-[12px] font-medium text-ink hover:bg-hover"
                >
                  {editing === id ? "Close" : "Edit"}
                </button>
              </div>

              {editing === id ? (
                <FounderForm
                  key={id}
                  initial={{
                    id,
                    name: str(f, "name"),
                    role: str(f, "role") || "Founder",
                    email: str(f, "email"),
                    phone: str(f, "phone"),
                    linkedin: str(f, "linkedin"),
                  }}
                  busy={busy}
                  onCancel={() => setEditing(null)}
                  onSave={async (payload) => {
                    setBusy(true);
                    const ok = await onAction("founder_side.save_founder", payload, "Founder details saved");
                    setBusy(false);
                    if (ok) setEditing(null);
                  }}
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {editing === "new" ? (
        <div className="rounded-lg border border-hair bg-surface px-3 py-2.5">
          <FounderForm
            initial={{ id: "", name: "", role: "Co-founder", email: "", phone: "", linkedin: "" }}
            busy={busy}
            onCancel={() => setEditing(rows.length ? String(rows[0].id) : null)}
            onSave={async (payload) => {
              setBusy(true);
              const ok = await onAction("founder_side.save_founder", payload, "Co-founder added");
              setBusy(false);
              if (ok) setEditing(rows.length ? String(rows[0].id) : null);
            }}
          />
        </div>
      ) : (
        <Button variant="secondary" onClick={startNew} disabled={busy}>
          Add a co-founder
        </Button>
      )}
    </div>
  );
}

function FounderForm({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: { id: string; name: string; role: string; email: string; phone: string; linkedin: string };
  busy: boolean;
  onSave: (payload: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState(initial);
  const set = (key: keyof typeof values, value: string) => setValues((v) => ({ ...v, [key]: value }));

  return (
    <div className="mt-2.5 grid gap-3 border-t border-hair pt-3 sm:grid-cols-2">
      <Field label="Name" required>
        <Input value={values.name} onChange={(v) => set("name", v)} placeholder="Founder name" />
      </Field>
      <Field label="Role">
        <Input value={values.role} onChange={(v) => set("role", v)} placeholder="Founder & CEO" />
      </Field>
      <Field label="Email" required>
        <Input value={values.email} onChange={(v) => set("email", v)} placeholder="founder@company.com" />
      </Field>
      <Field label="Mobile number">
        <Input value={values.phone} onChange={(v) => set("phone", v)} placeholder="+91 98400 00000" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="LinkedIn" hint="Optional. Kept private from the analyst view.">
          <Input value={values.linkedin} onChange={(v) => set("linkedin", v)} placeholder="linkedin.com/in/…" />
        </Field>
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button
          onClick={() => void onSave({ ...values, id: values.id || undefined })}
          disabled={busy || !values.name.trim() || !values.email.trim()}
        >
          {busy ? "Saving…" : values.id ? "Save details" : "Add co-founder"}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <p className="text-[11.5px] text-faint">Personal details are never shown to the analyst.</p>
      </div>
    </div>
  );
}

/**
 * Earlier seasons, read-only.
 *
 * A returning founder keeps their history: every past-season application stays visible, and a
 * repeat application names the record it links to. Nothing here can be edited — the live
 * season is the one the form above writes.
 */
function EarlierSeasons({ data }: { data: StartupSideData }) {
  // Past seasons only: the live season is the form above, so it never appears here.
  const earlier = data.applications.filter((a) => a.season_id && a.season_id !== data.currentSeasonId);
  if (earlier.length === 0) return null;
  return (
    <section className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
      <h3 className="text-[13.5px] font-semibold text-ink">Earlier seasons</h3>
      <p className="mt-0.5 text-[12px] text-faint">
        Your history with Startup Singam. These records are closed and kept read-only for your reference.
      </p>
      <ul className="mt-3 space-y-2">
        {earlier.map((a) => (
          <li key={a.id} className="rounded-lg border border-hair bg-surface px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-ink">
                {a.season_name ?? a.season_code ?? "Earlier season"} · {a.reference_no}
              </span>
              <span className="rounded-md bg-hover px-2 py-[2px] text-[11px] font-medium capitalize text-ink-soft">
                {a.status.replace(/_/g, " ")}
              </span>
            </div>
            <dl className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[11.5px] text-ink-soft">
              <div>
                <dt className="text-faint">Submitted</dt>
                <dd>{humanDate(a.submitted_at) || "—"}</dd>
              </div>
              <div>
                <dt className="text-faint">Completeness</dt>
                <dd className="ss-num">{a.completion_pct}%</dd>
              </div>
            </dl>
            {a.linked_to ? (
              <p className="mt-1.5 text-[11.5px] text-ink-soft">
                This season&rsquo;s application links back to this record as your earlier entry.
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
