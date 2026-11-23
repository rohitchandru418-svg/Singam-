"use client";

import { useEffect, useMemo, useState } from "react";
import { apiCreate, apiFields, apiOptions, apiUpdate, type FieldMeta } from "@/lib/client/api";
import { toPaise, toRupees } from "@/lib/domain/money";
import { Button, Checkbox, Field, InfoNote, Input, Modal, Select, Textarea } from "./ui";

/**
 * Create or edit one record.
 *
 * The fields come from the entity's schema, so a new column shows up here in the right
 * control without any extra wiring. Foreign keys are offered as a picker of names rather
 * than a box for an id.
 */
export function EntityForm({
  entity,
  record,
  open,
  onClose,
  onSaved,
}: {
  entity: string;
  /** Present when editing; absent when creating. */
  record?: Record<string, unknown> | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(record?.id);
  const [fields, setFields] = useState<FieldMeta[]>([]);
  const [label, setLabel] = useState(entity);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [options, setOptions] = useState<Record<string, { value: string; label: string }[]>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    apiFields(entity)
      .then((res) => {
        setFields(res.fields);
        setLabel(res.label);
        const initial: Record<string, string | boolean> = {};
        for (const field of res.fields) {
          if (field.system) continue;
          const raw = record?.[field.name];
          if (field.kind === "boolean") initial[field.name] = Boolean(Number(raw ?? 0));
          else if (field.kind === "money") initial[field.name] = raw === undefined || raw === null || raw === "" ? "" : String(toRupees(Number(raw)));
          else if (field.kind === "date") initial[field.name] = raw ? String(raw).slice(0, 10) : "";
          else initial[field.name] = raw === undefined || raw === null ? "" : String(raw);
        }
        setValues(initial);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Could not load the form"));
  }, [entity, open, record]);

  // Load the picker options once per related entity.
  const relationEntities = useMemo(
    () => Array.from(new Set(fields.filter((f) => f.kind === "relation" && f.relation).map((f) => f.relation!.entity))),
    [fields],
  );
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    for (const rel of relationEntities) {
      if (options[rel]) continue;
      apiOptions(rel)
        .then((opts) => {
          if (!cancelled) setOptions((prev) => ({ ...prev, [rel]: opts }));
        })
        .catch(() => {
          if (!cancelled) setOptions((prev) => ({ ...prev, [rel]: [] }));
        });
    }
    return () => {
      cancelled = true;
    };
  }, [relationEntities, open, options]);

  const setValue = (name: string, value: string | boolean) => setValues((prev) => ({ ...prev, [name]: value }));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      for (const field of fields) {
        if (field.system) continue;
        const raw = values[field.name];
        if (field.kind === "boolean") {
          payload[field.name] = Boolean(raw);
          continue;
        }
        const text = String(raw ?? "").trim();
        if (text === "") {
          if (field.required) throw new Error(`${field.label} is required`);
          continue;
        }
        if (field.kind === "money") {
          const n = Number(text);
          if (Number.isNaN(n)) throw new Error(`${field.label} must be an amount`);
          payload[field.name] = toPaise(n);
        } else if (field.kind === "number") {
          const n = Number(text);
          if (Number.isNaN(n)) throw new Error(`${field.label} must be a number`);
          payload[field.name] = n;
        } else {
          payload[field.name] = text;
        }
      }
      if (editing) await apiUpdate(entity, String(record!.id), payload);
      else await apiCreate(entity, payload);
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the record");
    } finally {
      setBusy(false);
    }
  };

  const editable = fields.filter((f) => !f.system);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit ${label.toLowerCase()}` : `New ${label.toLowerCase()}`}
      subtitle={editing ? `Changing ${String(record?.name ?? record?.id ?? "")}` : "Fill in what you know; the rest can be added later."}
      wide
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving\u2026" : editing ? "Save changes" : `Create ${label.toLowerCase()}`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {error ? <InfoNote tone="danger">{error}</InfoNote> : null}
        {editable.map((field) => (
          <FormField
            key={field.name}
            field={field}
            value={values[field.name]}
            options={field.kind === "relation" && field.relation ? options[field.relation.entity] : field.options}
            loadingOptions={field.kind === "relation" && field.relation ? options[field.relation.entity] === undefined : false}
            onChange={(v) => setValue(field.name, v)}
          />
        ))}
      </div>
    </Modal>
  );
}

function FormField({
  field,
  value,
  options,
  loadingOptions,
  onChange,
}: {
  field: FieldMeta;
  value: string | boolean | undefined;
  options?: { value: string; label: string }[];
  loadingOptions?: boolean;
  onChange: (value: string | boolean) => void;
}) {
  if (field.kind === "boolean") {
    return <Checkbox checked={Boolean(value)} onChange={onChange} label={field.label} />;
  }

  const hint = field.kind === "money" ? "Amount in rupees" : field.hint;

  return (
    <Field label={field.label} hint={hint} required={field.required}>
      {field.kind === "textarea" ? (
        <Textarea value={String(value ?? "")} onChange={onChange} rows={3} />
      ) : field.kind === "select" || field.kind === "relation" ? (
        <Select
          value={String(value ?? "")}
          onChange={onChange}
          placeholder={loadingOptions ? "Loading\u2026" : field.required ? "Choose one" : "\u2014"}
          options={options ?? []}
        />
      ) : (
        <Input
          value={String(value ?? "")}
          onChange={onChange}
          type={field.kind === "date" ? "date" : field.kind === "number" || field.kind === "money" ? "number" : "text"}
          step={field.kind === "money" ? 0.01 : undefined}
          placeholder={field.kind === "money" ? "Amount in rupees" : undefined}
        />
      )}
    </Field>
  );
}
