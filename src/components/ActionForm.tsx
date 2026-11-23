"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiAction, apiOptions, type ActionResult } from "@/lib/client/api";
import { formSpecFor, NA_VALUE, type FieldSpec } from "@/lib/client/forms";
import { entityForLinkType, relationEntityFor, relationLabelFor } from "@/lib/client/relations";
import { STATUS_REGISTRIES } from "@/lib/domain/statuses";
import { DEFAULT_QUALIFYING_RULE } from "@/lib/domain/scoring";
import { toPaise, toRupees } from "@/lib/domain/money";
import { Button, Checkbox, Field, InfoNote, Input, Modal, Select, Textarea } from "./ui";

/**
 * Generic action form.
 *
 * Renders the fields declared for a named action, converts money between rupees (as typed)
 * and paise (as stored) and reports the action's own message back to the caller.
 */

interface ActionFormProps {
  action: string;
  title: string;
  subtitle?: string;
  defaults?: Record<string, unknown>;
  users?: { id: string; name: string; roleLabel: string }[];
  /** The signed-in user, pre-filled into a required person or owner field. */
  actingUserId?: string;
  documentPurposes?: { key: string; label: string }[];
  open: boolean;
  onClose: () => void;
  onDone: (result: ActionResult) => void;
  extraNote?: string;
  /** Render the form in place instead of in a modal, with its own submit button. */
  inline?: boolean;
  submitLabel?: string;
  /** Submit as soon as the required fields are filled, without a click. */
  autoSubmit?: boolean;
  /** Called when the action reports an error, so a caller can stop an auto-run. */
  onError?: (message: string) => void;
}

export function ActionForm({
  action,
  title,
  subtitle,
  defaults = {},
  users = [],
  actingUserId,
  documentPurposes = [],
  open,
  onClose,
  onDone,
  extraNote,
  inline = false,
  submitLabel,
  autoSubmit = false,
  onError,
}: ActionFormProps) {
  const spec = useMemo(() => formSpecFor(action), [action]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [relationOptions, setRelationOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [linkOptions, setLinkOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // The reset effect below keys on this string, so a caller that builds `defaults` inline
  // does not wipe what has been typed on every render.
  const defaultsKey = useMemo(() => JSON.stringify(defaults ?? {}), [defaults]);

  const documentPurposesKey = useMemo(() => documentPurposes.map((d) => d.key).join("|"), [documentPurposes]);
  // Field defaults that do not depend on loaded options: the first selectable value for a
  // required dropdown or status, the acting user for a required person picker, and today for
  // a required date. They only fill a blank, so a caller's own default always wins.
  const baseDefaults = useMemo(() => {
    const map: Record<string, string | boolean> = {};
    for (const field of spec) {
      if (field.type === "user") {
        // A person picker defaults to the signed-in user, required or not.
        if (actingUserId) map[field.name] = actingUserId;
      } else if (field.type === "select" && field.required && field.options?.length) {
        map[field.name] = field.options[0].value;
      } else if (
        field.type === "select" &&
        field.required &&
        field.name === "purpose" &&
        field.options?.length === 0 &&
        documentPurposes.length
      ) {
        // The document purpose list is supplied by the page, not the field spec.
        map[field.name] = documentPurposes[0].key;
      } else if (field.type === "status" && field.required && field.statusRegistry) {
        const reg = STATUS_REGISTRIES[field.statusRegistry];
        const first = reg ? Object.values(reg)[0] : undefined;
        if (first) map[field.name] = first.value;
      } else if (field.type === "date" && field.required) {
        map[field.name] = new Date().toISOString().slice(0, 10);
      } else if (field.required && !field.linkTypeFor && !relationEntityFor(field.name)) {
        if (field.type === "money") {
          // A required amount starts at a round placeholder the reader can overwrite.
          map[field.name] = "1000000";
        } else if (field.type === "number") {
          // A scored field is pre-filled with its maximum ("(max 10)", "(1-5)") so a reader can
          // move on; any other number starts at 1.
          const maxMatch = /\(max\s+(\d+)\)/i.exec(field.label) ?? /\(1-(\d+)\)/.exec(field.label);
          map[field.name] = maxMatch ? maxMatch[1] : "1";
        }
      }
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spec, actingUserId, documentPurposesKey]);

  // A field that is really a foreign key is offered as a picker of names, not an id box.
  const relationFields = useMemo(
    () => spec.filter((f) => f.type === "text" && relationEntityFor(f.name)),
    [spec],
  );

  // A `*_id` column whose meaning depends on a sibling `*_type` column. The id picker follows
  // whichever record kind the type field is set to.
  const linkFields = useMemo(() => spec.filter((f) => f.linkTypeFor), [spec]);

  // A screening form scores criteria on scales; the panel shows the running total against the
  // 100-mark framework and the qualifying mark, so the outcome is visible while scoring.
  const scaleSummary = useMemo(() => {
    const scaleFields = spec.filter((f) => f.type === "scale");
    if (scaleFields.length === 0) return null;
    const applicable = scaleFields.filter((f) => values[f.name] !== NA_VALUE);
    const total = applicable.reduce((sum, f) => sum + (Number(values[f.name] ?? 0) || 0), 0);
    const max = applicable.reduce((sum, f) => sum + (f.scaleMax ?? 10), 0);
    const threshold = Math.round((DEFAULT_QUALIFYING_RULE.qualifyingPercent / 100) * max);
    const skipped = scaleFields.length - applicable.length;
    return { total, max, threshold, pass: total >= threshold, label: "Screening total", skipped };
  }, [spec, values]);
  const linkTypeKey = linkFields.map((f) => `${f.name}:${String(values[f.linkTypeFor!] ?? "")}`).join("|");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    for (const field of relationFields) {
      const rel = relationEntityFor(field.name)!;
      if (relationOptions[field.name]) continue;
      apiOptions(rel)
        .then((opts) => {
          if (!cancelled) setRelationOptions((prev) => ({ ...prev, [field.name]: opts }));
        })
        .catch(() => {
          if (!cancelled) setRelationOptions((prev) => ({ ...prev, [field.name]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [open, relationFields, relationOptions]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    for (const field of linkFields) {
      const entity = entityForLinkType(String(values[field.linkTypeFor!] ?? ""));
      if (!entity) {
        setLinkOptions((prev) => ({ ...prev, [field.name]: [] }));
        continue;
      }
      apiOptions(entity)
        .then((opts) => {
          if (!cancelled) setLinkOptions((prev) => ({ ...prev, [field.name]: opts }));
        })
        .catch(() => {
          if (!cancelled) setLinkOptions((prev) => ({ ...prev, [field.name]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, linkFields, linkTypeKey]);

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string | boolean> = {};
    for (const field of spec) {
      if (defaults[field.name] !== undefined) {
        initial[field.name] = field.type === "money" ? String(toRupees(Number(defaults[field.name]))) : String(defaults[field.name]);
      } else if (field.defaultValue !== undefined) {
        initial[field.name] = typeof field.defaultValue === "boolean" ? field.defaultValue : String(field.defaultValue);
      } else if (baseDefaults[field.name] !== undefined) {
        initial[field.name] = baseDefaults[field.name];
      } else if (field.type === "scale") {
        // A slider always carries a value, so a required criterion counts as answered at 0.
        initial[field.name] = "0";
      } else {
        initial[field.name] = field.type === "checkbox" ? false : "";
      }
    }
    setValues(initial);
    setError(null);
    setResult(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, spec, defaultsKey, baseDefaults]);

  const setValue = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));

  // Fill a required picker from the first loaded record, and a required polymorphic link once
  // its record kind is chosen. This is what lets a reader press Next and move on.
  useEffect(() => {
    if (!open) return;
    setValues((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const field of spec) {
        if (field.type !== "text" || !field.required) continue;
        const blank = next[field.name] === undefined || next[field.name] === "";
        if (!blank) continue;
        if (relationEntityFor(field.name)) {
          const opts = relationOptions[field.name];
          if (opts && opts.length) {
            next[field.name] = opts[0].value;
            changed = true;
          }
        } else if (field.linkTypeFor) {
          const opts = linkOptions[field.name];
          if (opts && opts.length) {
            next[field.name] = opts[0].value;
            changed = true;
          }
        }
      }
      return changed ? next : prev;
    });
  }, [open, spec, relationOptions, linkOptions]);

  const submit = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of spec) {
        const raw = values[field.name];
        if (field.type === "checkbox") {
          payload[field.name] = Boolean(raw);
          continue;
        }
        const text = String(raw ?? "");
        if (field.type === "scale" && text === NA_VALUE) {
          payload[field.name] = null;
          continue;
        }
        if (text === "" && !field.required) continue;
        if (field.required && text === "") throw new Error(`${field.label} is required`);
        if (field.type === "money" || field.type === "number" || field.type === "scale") {
          const n = Number(text);
          if (Number.isNaN(n)) throw new Error(`${field.label} must be a number`);
          payload[field.name] = field.type === "money" ? toPaise(n) : n;
        } else if (field.type === "json") {
          payload[field.name] = JSON.parse(text) as unknown;
        } else {
          payload[field.name] = text;
        }
      }
      const res = await apiAction(action, payload);
      setResult(res);
      onDone(res);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Action failed";
      setError(message);
      onError?.(message);
    } finally {
      setBusy(false);
    }
  }, [action, spec, values, onDone, onError]);

  // Every required field carries a value, so the form can be submitted as it stands.
  const requiredFilled = useMemo(
    () =>
      spec.every((field) => {
        if (!field.required || field.type === "checkbox") return true;
        const v = values[field.name];
        return v !== undefined && v !== "";
      }),
    [spec, values],
  );

  // Auto-run: submit once the required fields are filled. This waits for the pickers to load
  // their records, so a required foreign key is never submitted blank.
  useEffect(() => {
    if (!autoSubmit || !open || autoSubmitted || busy || result || !requiredFilled) return;
    setAutoSubmitted(true);
    void submit();
  }, [autoSubmit, open, autoSubmitted, busy, result, requiredFilled, submit]);

  useEffect(() => {
    if (!open) setAutoSubmitted(false);
  }, [open]);

  const bodyContent = result ? (
    <div className="space-y-3">
      <InfoNote tone="success">{result.message ?? "Action completed"}</InfoNote>
      {result.data !== undefined && result.data !== null ? (
        <pre className="max-h-72 overflow-auto rounded-lg bg-ink p-3 font-mono text-[11px] leading-relaxed text-white/90">
          {JSON.stringify(result.data, null, 2)}
        </pre>
      ) : null}
    </div>
  ) : (
    <div className="space-y-3">
      {extraNote ? <InfoNote tone="info">{extraNote}</InfoNote> : null}
      {error ? <InfoNote tone="danger">{error}</InfoNote> : null}
      {scaleSummary ? (
        <div className="rounded-xl border border-hair bg-surface px-3.5 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-[12px] font-semibold uppercase tracking-[0.05em] text-faint">
              {scaleSummary.label}
            </span>
            <span className="text-[15px] font-semibold text-ink">
              <span className="ss-num">{scaleSummary.total}</span>
              <span className="text-faint"> / {scaleSummary.max}</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
            <div
              className={`h-full rounded-full ${scaleSummary.pass ? "bg-ok" : "bg-warn"}`}
              style={{ width: `${Math.min(100, (scaleSummary.total / (scaleSummary.max || 1)) * 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-[11.5px] text-ink-soft">
            {scaleSummary.pass
              ? `At or above the qualifying mark of ${scaleSummary.threshold}.`
              : `Below the qualifying mark of ${scaleSummary.threshold}.`}
            {scaleSummary.skipped > 0
              ? ` ${scaleSummary.skipped} criterion${scaleSummary.skipped === 1 ? "" : "a"} marked not applicable and excluded.`
              : ""}
          </p>
        </div>
      ) : null}
      {spec.length === 0 ? (
        <InfoNote tone="info">This step has no form fields; press the button to record it.</InfoNote>
      ) : null}
      {spec.map((field) => {
        const rel = field.type === "text" ? relationEntityFor(field.name) : null;
        return (
          <ActionField
            key={field.name}
            field={field}
            value={values[field.name]}
            onChange={(v) => setValue(field.name, v)}
            users={users}
            documentPurposes={documentPurposes}
            relationOptions={rel ? relationOptions[field.name] : undefined}
            relationLabel={rel ? relationLabelFor(rel) : undefined}
            linkOptions={field.linkTypeFor ? linkOptions[field.name] : undefined}
            linkReady={field.linkTypeFor ? Boolean(entityForLinkType(String(values[field.linkTypeFor] ?? ""))) : undefined}
          />
        );
      })}
    </div>
  );

  if (inline) {
    return (
      <div className="space-y-3">
        {bodyContent}
        {!result ? (
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button onClick={submit} disabled={busy}>
              {busy ? "Working\u2026" : (submitLabel ?? "Run this step")}
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      wide
      footer={
        result ? (
          <>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? "Working\u2026" : (submitLabel ?? "Run action")}
            </Button>
          </>
        )
      }
    >
      {bodyContent}
    </Modal>
  );
}

function ActionField({
  field,
  value,
  onChange,
  users,
  documentPurposes,
  relationOptions,
  relationLabel,
  linkOptions,
  linkReady,
}: {
  field: FieldSpec;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
  users: { id: string; name: string; roleLabel: string }[];
  documentPurposes: { key: string; label: string }[];
  relationOptions?: { value: string; label: string }[];
  relationLabel?: string;
  linkOptions?: { value: string; label: string }[];
  linkReady?: boolean;
}) {
  if (field.type === "checkbox") {
    return <Checkbox checked={Boolean(value)} onChange={onChange} label={field.label} />;
  }

  // A polymorphic link: the id means whatever the paired type field says, so the picker
  // offers the records of that kind instead of an id box.
  if (field.linkTypeFor) {
    if (!linkReady) {
      return (
        <Field label={field.label} hint="Choose the record type first." required={field.required}>
          <Select value="" onChange={() => undefined} disabled placeholder="Choose the record type first" options={[]} />
        </Field>
      );
    }
    return (
      <Field label={field.label} hint={field.hint ?? "Choose the record this step applies to."} required={field.required}>
        <Select
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={linkOptions === undefined ? "Loading\u2026" : `Select ${field.label.toLowerCase()}`}
          options={linkOptions ?? []}
        />
      </Field>
    );
  }

  // A foreign key is chosen from the records themselves; the id box is only a fallback for
  // an empty list, so an action never becomes impossible to complete.
  if (relationLabel) {
    const options = relationOptions ?? [];
    return (
      <Field label={relationLabel} hint={relationOptions === undefined ? "Loading\u2026" : "Choose the record this step applies to."} required={field.required}>
        <Select
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={relationOptions === undefined ? "Loading\u2026" : `Select ${relationLabel.toLowerCase()}`}
          options={options}
        />
      </Field>
    );
  }

  const options =
    field.name === "purpose" && field.options?.length === 0
      ? documentPurposes.map((d) => ({ value: d.key, label: d.label }))
      : field.options;

  // A criterion scored on a scale: a slider with the running value and its ceiling, which
  // reads faster than typing a number and makes the marks visible against the maximum. A
  // skippable criterion carries a "Not applicable" toggle that sends null, so the domain can
  // drop it from the denominator instead of counting a zero against the startup.
  if (field.type === "scale") {
    const max = field.scaleMax ?? 10;
    const min = field.scaleMin ?? 0;
    const step = field.scaleStep ?? 1;
    const notApplicable = value === NA_VALUE;
    const current = Number(value ?? 0) || 0;
    return (
      <Field label={field.label} hint={field.hint} required={field.required}>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={notApplicable ? 0 : current}
            disabled={notApplicable}
            onChange={(e) => onChange(e.target.value)}
            aria-label={field.label}
            className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-hover accent-brand disabled:cursor-not-allowed disabled:opacity-40"
          />
          <span className="ss-num w-14 shrink-0 text-right text-[13px] font-semibold tabular-nums text-ink">
            {notApplicable ? <span className="text-faint">n/a</span> : current}
            <span className="text-faint"> / {max}</span>
          </span>
        </div>
        {field.skippable ? (
          <label className="mt-1.5 flex cursor-pointer items-center gap-2 text-[12px] text-ink-soft">
            <input
              type="checkbox"
              checked={notApplicable}
              onChange={(e) => onChange(e.target.checked ? NA_VALUE : "0")}
              className="h-[14px] w-[14px] cursor-pointer rounded border-hair-strong accent-[color:var(--brand)]"
            />
            Not applicable for this stage
          </label>
        ) : null}
      </Field>
    );
  }

  return (
    <Field label={field.label} hint={field.hint} required={field.required}>
      {field.type === "textarea" || field.type === "json" ? (
        <Textarea
          value={String(value ?? "")}
          onChange={onChange}
          rows={field.type === "json" ? 6 : 3}
          placeholder={field.type === "json" ? '{"key": "value"}' : field.placeholder}
        />
      ) : field.type === "select" || field.type === "status" || field.type === "user" ? (
        <Select
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={field.required ? undefined : "\u2014"}
          options={
            field.type === "user"
              ? users.map((u) => ({ value: u.id, label: `${u.name} (${u.roleLabel})` }))
              : (options ?? [])
          }
        />
      ) : (
        <Input
          value={String(value ?? "")}
          onChange={onChange}
          type={field.type === "date" ? "date" : field.type === "money" || field.type === "number" ? "number" : "text"}
          step={field.type === "money" ? 0.01 : undefined}
          placeholder={field.type === "money" ? "Amount in rupees" : field.placeholder}
        />
      )}
    </Field>
  );
}
