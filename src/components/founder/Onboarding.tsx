"use client";

import { useState } from "react";
import { Field, Input, Select, Toaster, useToasts } from "../ui";
import { formatDate } from "@/lib/domain/dates";
import type { StartupSideData } from "@/lib/client/api";
import { useSession } from "../SessionProvider";

/**
 * The first screen a brand-new founder sees: they have a login but no startup yet. Naming the
 * business creates the record and opens the workspace — the same `startup.create` action the
 * console uses, so the new startup is a real one.
 */

const SECTOR_OPTIONS = [
  "Agritech", "Fintech", "SaaS", "Healthtech", "Edtech", "Cleantech", "Logistics",
  "Manufacturing", "Retail", "D2C", "Mobility", "Proptech", "Deep tech", "Other",
];

export function Onboarding({
  onAction,
  toasts,
  dismiss,
  programs,
}: {
  onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean>;
  toasts: ReturnType<typeof useToasts>["toasts"];
  dismiss: (id: number) => void;
  programs: StartupSideData["programs"];
}) {
  const { session } = useSession();
  const [name, setName] = useState("");
  const [legalEntity, setLegalEntity] = useState("");
  const [sector, setSector] = useState("");
  const [geography, setGeography] = useState("");

  // The founder details are asked for once, here. They are pre-filled from the signed-in
  // account where we already know them, so the form is short and the application form and
  // document pack are filled in from this one entry rather than re-typed later.
  const knownEmail = session?.identifiers?.find((i) => i.channel === "email")?.display ?? "";
  const knownPhone = session?.identifiers?.find((i) => i.channel === "phone")?.display ?? "";
  const [founderName, setFounderName] = useState(session?.actor.name ?? "");
  const [founderEmail, setFounderEmail] = useState(knownEmail);
  const [founderPhone, setFounderPhone] = useState(knownPhone);
  const [busy, setBusy] = useState(false);

  const liveProgram = programs.find((p) => p.status === "open") ?? programs[0] ?? null;

  const submit = async () => {
    if (!name.trim()) return;
    setBusy(true);
    await onAction(
      "startup.create",
      {
        name: name.trim(),
        legal_entity: legalEntity.trim() || name.trim(),
        sector,
        geography,
        founder_name: founderName.trim() || session?.actor.name || "",
        founder_email: founderEmail.trim(),
        founder_phone: founderPhone.trim(),
      },
      "Startup registered",
    );
    setBusy(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      <section className="overflow-hidden rounded-2xl border border-hair bg-gradient-to-br from-brand to-brand-dark px-5 py-5 text-white shadow-raised">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Welcome to Startup Singam</p>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em]">
          {session?.actor.name ? `Hi ${session.actor.name}, name your business` : "Name your business"}
        </h1>
        <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-white/85">
          You are signed in. Register your startup to open your workspace — then fill in your application,
          upload your documents, and follow your journey with us.
        </p>
      </section>

      <div className="rounded-xl border border-hair bg-canvas p-4 shadow-card">
        <h2 className="text-[14px] font-semibold text-ink">Register your startup</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          You enter your details once here. Your application form and document pack are filled in from them, so
          you will not type them again.
        </p>

        <div className="mt-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">About you</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <Field label="Your name" required hint="Pre-filled from your sign-in.">
              <Input value={founderName} onChange={setFounderName} placeholder="e.g. Kavitha Raman" />
            </Field>
            <Field label="Email" hint="Used for all team correspondence.">
              <Input value={founderEmail} onChange={setFounderEmail} placeholder="you@company.com" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Mobile number" hint="For scheduling calls and the shoot.">
                <Input value={founderPhone} onChange={setFounderPhone} placeholder="+91 98400 00000" />
              </Field>
            </div>
          </div>
        </div>

        <div className="mt-5 border-t border-hair pt-4">
          <h3 className="text-[12px] font-semibold uppercase tracking-[0.06em] text-faint">About your business</h3>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Startup name" required hint="The name your team and investors will see.">
                <Input value={name} onChange={setName} placeholder="e.g. AgriNova" />
              </Field>
            </div>
            <Field label="Registered legal name" hint="Leave blank to reuse the startup name.">
              <Input value={legalEntity} onChange={setLegalEntity} placeholder="e.g. AgriNova Technologies Pvt Ltd" />
            </Field>
            <Field label="Sector">
              <Select value={sector} onChange={setSector} options={SECTOR_OPTIONS.map((s) => ({ value: s, label: s }))} placeholder="Select a sector" />
            </Field>
            <div className="sm:col-span-2">
              <Field label="City / State" hint="Where you are based today.">
                <Input value={geography} onChange={setGeography} placeholder="e.g. Chennai, Tamil Nadu" />
              </Field>
            </div>
          </div>
        </div>

        {liveProgram ? (
          <p className="mt-3 rounded-lg border border-hair bg-surface px-3 py-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            Next: apply to <strong className="text-ink">{liveProgram.title}</strong>
            {liveProgram.season ? ` (${liveProgram.season})` : ""}
            {liveProgram.closes_on ? ` — closes ${formatDate(liveProgram.closes_on)}` : ""}. The application form opens
            as soon as your workspace is created.
          </p>
        ) : null}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void submit()}
            disabled={busy || !name.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-brand px-3.5 py-2 text-[13px] font-medium text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:bg-hair-strong disabled:text-faint"
          >
            {busy ? "Registering…" : "Register and open my workspace"}
          </button>
        </div>
      </div>

      <p className="pb-2 text-center text-[11.5px] text-faint">
        Signed in as {session?.actor.name ?? "founder"}. You only ever see your own startup.
      </p>
    </div>
  );
}
