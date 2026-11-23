"use client";

/**
 * Structured policy editor.
 *
 * The action endpoint takes a JSON value, but nobody should have to hand-write one. This
 * builds a typed form from the policy's own default value — a checkbox for a boolean, a
 * rupee box for a paise amount, a dropdown for an enumerated key — and assembles the JSON
 * on submit. Nested shapes stay as JSON because only one policy has one, and it is a
 * document list rather than a business rule.
 */

import { useEffect, useMemo, useState } from "react";
import { apiAction, type ActionResult } from "@/lib/client/api";
import { toPaise, toRupees } from "@/lib/domain/money";
import { policyFields, type PolicyFieldSpec } from "@/lib/domain/policyView";
import type { PolicyDefinition } from "@/lib/domain/policies";
import { Button, Checkbox, Field, InfoNote, Input, Modal, Select, Textarea } from "./ui";

interface PolicyRow {
  id: string;
  code: string;
  title: string;
  category: string;
  value: unknown;
  status: string;
  effective_from: string;
}

function parse(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return (raw as Record<string, unknown>) ?? {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Seed the form from the current value, falling back to the definition's default. */
function initialValues(policy: PolicyRow, def: PolicyDefinition): Record<string, string | boolean> {
  const current = { ...def.defaultValue, ...parse(policy.value) };
  const out: Record<string, string | boolean> = {};
  for (const field of policyFields(def)) {
    const raw = current[field.name];
    switch (field.kind) {
      case "boolean":
        out[field.name] = Boolean(raw);
        break;
      case "money":
        out[field.name] = String(toRupees(Number(raw ?? 0)));
        break;
      case "number":
        out[field.name] = String(raw ?? 0);
        break;
      case "json":
        out[field.name] = JSON.stringify(raw ?? {}, null, 2);
        break;
      default:
        out[field.name] = Array.isArray(raw) ? raw.join(", ") : String(raw ?? "");
    }
  }
  return out;
}

/** Convert the form back into the JSON shape the endpoint stores. */
function assemble(
  values: Record<string, string | boolean>,
  fields: PolicyFieldSpec[],
  def: PolicyDefinition,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const field of fields) {
    const raw = values[field.name];
    const original = def.defaultValue[field.name];
    switch (field.kind) {
      case "boolean":
        out[field.name] = Boolean(raw);
        break;
      case "money":
        out[field.name] = toPaise(Number(raw || 0));
        break;
      case "number":
        out[field.name] = Number(raw || 0);
        break;
      case "json":
        out[field.name] = typeof raw === "string" && raw.trim() ? JSON.parse(raw) : {};
        break;
      default:
        if (Array.isArray(original)) {
          out[field.name] = String(raw)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);
        } else {
          out[field.name] = String(raw);
        }
    }
  }
  return out;
}

export function PolicyEditor({
  policy,
  definition,
  open,
  onClose,
  onDone,
}: {
  policy: PolicyRow | null;
  definition: PolicyDefinition | undefined;
  open: boolean;
  onClose: () => void;
  onDone: (result: ActionResult) => void;
}) {
  const fields = useMemo(() => (definition ? policyFields(definition) : []), [definition]);
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [reason, setReason] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !policy || !definition) return;
    setValues(initialValues(policy, definition));
    setReason("");
    setEffectiveFrom("");
    setError(null);
  }, [open, policy, definition]);

  if (!policy || !definition) return null;

  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));

  const submit = async () => {
    setError(null);
    if (!reason.trim()) {
      setError("A reason is required; it is recorded in the revision history.");
      return;
    }
    let value: Record<string, unknown>;
    try {
      value = assemble(values, fields, definition);
    } catch {
      setError("One of the JSON fields is not valid JSON.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiAction("policy.revise", {
        code: policy.code,
        value,
        reason: reason.trim(),
        ...(effectiveFrom ? { effective_from: effectiveFrom } : {}),
      });
      onDone(res);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the policy");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={`Revise ${policy.code}`}
      subtitle={policy.title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Saving…" : "Save new version"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <InfoNote>
          Saving creates a new version. The value in force today is kept in the revision history, so an
          earlier season can still be explained.
        </InfoNote>

        {fields.map((field) => (
          <Field key={field.name} label={field.label} hint={field.kind === "money" ? "Rupees" : undefined}>
            {field.kind === "boolean" ? (
              <Checkbox
                checked={Boolean(values[field.name])}
                onChange={(v) => set(field.name, v)}
                label={Boolean(values[field.name]) ? "Enabled" : "Disabled"}
              />
            ) : field.kind === "select" ? (
              <Select
                value={String(values[field.name] ?? "")}
                onChange={(v) => set(field.name, v)}
                options={field.options ?? []}
              />
            ) : field.kind === "json" ? (
              <Textarea
                value={String(values[field.name] ?? "")}
                onChange={(v) => set(field.name, v)}
                rows={6}
                placeholder="{}"
              />
            ) : (
              <Input
                type={field.kind === "money" || field.kind === "number" ? "number" : "text"}
                value={String(values[field.name] ?? "")}
                onChange={(v) => set(field.name, v)}
              />
            )}
          </Field>
        ))}

        <Field label="Reason for the change" required>
          <Textarea value={reason} onChange={setReason} rows={2} placeholder="Why this value is changing" />
        </Field>

        <Field label="Effective from" hint="Leave blank to take effect today">
          <Input type="date" value={effectiveFrom} onChange={setEffectiveFrom} />
        </Field>

        {error ? <InfoNote tone="danger">{error}</InfoNote> : null}
      </div>
    </Modal>
  );
}
