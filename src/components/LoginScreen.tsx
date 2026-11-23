"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiDevSwitch, apiRequestOtp, apiVerifyOtp, type OtpRequest, type PersonaOption } from "@/lib/client/api";
import { useSession } from "./SessionProvider";
import { Icon } from "./icons";

/** A small inline spinner for a button that is waiting on the server. */
function Spinner({ className = "h-[15px] w-[15px]" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The one screen that signs a person in.
 *
 * Email and mobile are the same form: the field takes either, and the app decides which it
 * is. A first-time identifier becomes an account on the spot, so sign-in and sign-up are the
 * same journey rather than two.
 */

type Step = "identify" | "verify";

function looksLikeEmail(value: string): boolean {
  return value.includes("@");
}

function detectChannel(value: string): "email" | "phone" {
  return looksLikeEmail(value) ? "email" : "phone";
}

export function LoginScreen() {
  const router = useRouter();
  const { refresh, devMode, personas } = useSession();

  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState<OtpRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [personaKey, setPersonaKey] = useState("");

  const codeRef = useRef<HTMLInputElement>(null);

  const external = useMemo(() => personas.filter((p) => p.audience === "external"), [personas]);
  const internal = useMemo(() => personas.filter((p) => p.audience === "internal"), [personas]);
  const persona = useMemo(() => personas.find((p) => p.key === personaKey) ?? null, [personas, personaKey]);

  // The dropdown opens on a sensible persona once the list arrives.
  useEffect(() => {
    if (personaKey || personas.length === 0) return;
    setPersonaKey((personas.find((p) => p.key === "founder") ?? personas[0]).key);
  }, [personas, personaKey]);

  // A resend is only offered after the previous code has had time to arrive.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (step === "verify") codeRef.current?.focus();
  }, [step]);

  const channel = useMemo(() => detectChannel(identifier), [identifier]);
  const canSubmitIdentifier = identifier.trim().length >= 6 && !busy;

  const sendCode = useCallback(
    async (target: string, isResend = false) => {
      setBusy(true);
      setError(null);
      try {
        const result = await apiRequestOtp(target);
        setSent(result);
        setStep("verify");
        setCode("");
        setCooldown(30);
        setNotice(
          isResend
            ? `A new code is on its way to ${result.destination}.`
            : `We sent a six-digit code to ${result.destination}.`,
        );
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not send the code. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const verify = useCallback(
    async (value: string) => {
      setBusy(true);
      setError(null);
      try {
        await apiVerifyOtp(identifier.trim(), value);
        await refresh();
        router.replace("/");
        router.refresh();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "That code could not be checked.");
        setCode("");
        codeRef.current?.focus();
      } finally {
        setBusy(false);
      }
    },
    [identifier, refresh, router],
  );

  const onCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void verify(digits);
  };

  /**
   * Sign in as a persona.
   *
   * Available only where the local sign-in picker is available (never in production). It opens
   * a real session for the seeded account so the reviewer lands on that persona's screens with
   * the role and the data the persona describes.
   */
  const demoSignIn = useCallback(
    async (p: PersonaOption) => {
      setBusy(true);
      setError(null);
      try {
        await apiDevSwitch(p.userId);
        await refresh();
        router.replace(p.href || "/");
        router.refresh();
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Could not open the demo session.");
      } finally {
        setBusy(false);
      }
    },
    [refresh, router],
  );

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel. Hidden on a phone, where the form is the whole screen. */}
      <aside className="relative hidden overflow-hidden bg-navy px-10 py-12 text-white lg:flex lg:flex-col">
        <div className="ss-rule absolute inset-x-0 top-0 h-[4px]" aria-hidden />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
          aria-hidden
        />
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white/95 ring-1 ring-white/40">
            <Image src="/singam-logo.png" alt="" width={34} height={29} className="h-[26px] w-auto" priority />
          </span>
          <span>
            <span className="ss-wordmark block text-[17px] font-semibold leading-tight">Startup Singam</span>
            <span className="block text-[11.5px] leading-tight text-white/70">Baanhem Ventures</span>
          </span>
        </div>

        <div className="mt-16 max-w-md">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/60">Operations ERP</p>
          <h1 className="mt-3 text-[30px] font-semibold leading-[1.15] tracking-[-0.02em]">
            Simplify fund raise.
            <br />
            Amplify success stories.
          </h1>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/75">
            The startup journey, the investor journey, production, funding and finance, and community — tracked on
            one record, with selection, production, investment and finance kept apart.
          </p>
        </div>

        <dl className="mt-14 grid max-w-md grid-cols-2 gap-x-6 gap-y-5">
          {[
            ["Six departments", "One startup and investor record"],
            ["Two journeys", "Founder and investor, side by side"],
            ["Money kept apart", "Committed, deployed, invoiced, collected"],
            ["Every action", "Owner, deadline, evidence, approval"],
          ].map(([title, hint]) => (
            <div key={title}>
              <dt className="text-[12.5px] font-semibold text-white">{title}</dt>
              <dd className="mt-0.5 text-[11.5px] leading-snug text-white/65">{hint}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-auto pt-10 text-[11.5px] text-white/55">
          Season 3 · live. Applications are open.
        </p>
      </aside>

      {/* Form panel. */}
      <main className="flex flex-col justify-center bg-page px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-[26rem]">
          <div className="mb-7 flex items-center gap-3 lg:hidden">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl ring-1 ring-hair">
              <Image src="/singam-logo.png" alt="" width={32} height={27} className="h-[24px] w-auto" priority />
            </span>
            <span>
              <span className="ss-wordmark block text-[15px] font-semibold leading-tight text-ink">Startup Singam</span>
              <span className="block text-[11px] leading-tight text-faint">Operations ERP</span>
            </span>
          </div>

          <h2 className="text-[22px] font-semibold tracking-[-0.02em] text-ink">
            {step === "identify" ? "Sign in or create your account" : "Enter your code"}
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-soft">
            {step === "identify"
              ? "Use your email address or mobile number. New here? The same step creates your account."
              : `We sent a six-digit code to ${sent?.destination ?? ""}.`}
          </p>

          {error ? (
            <div
              role="alert"
              className="mt-5 flex items-start gap-2 rounded-lg border border-risk-line bg-risk-soft px-3 py-2.5 text-[12.5px] text-risk"
            >
              <Icon name="alert" className="mt-px h-[15px] w-[15px] shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {notice && !error ? (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-ok-line bg-ok-soft px-3 py-2.5 text-[12.5px] text-ok">
              <Icon name="check" className="mt-px h-[15px] w-[15px] shrink-0" />
              <span>{notice}</span>
            </div>
          ) : null}

          {step === "identify" ? (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (canSubmitIdentifier) void sendCode(identifier.trim());
              }}
            >
              <label htmlFor="identifier" className="block text-[12px] font-medium text-ink-soft">
                Email or mobile number
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">
                  <Icon name={channel === "email" ? "mail" : "phone"} className="h-[16px] w-[16px]" />
                </span>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  inputMode={channel === "email" ? "email" : "tel"}
                  autoComplete="username"
                  autoFocus
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@company.com or 98400 11223"
                  className="w-full rounded-lg border border-hair-strong bg-canvas py-2.5 pl-9 pr-3 text-[14px] text-ink outline-none transition placeholder:text-faint focus:border-navy focus:ring-2 focus:ring-navy/15"
                />
              </div>
              <p className="mt-1.5 text-[11.5px] text-faint">
                {channel === "email" ? "We will email you a one-time code." : "We will text you a one-time code."}
              </p>

              <button
                type="submit"
                disabled={!canSubmitIdentifier}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Spinner className="h-[15px] w-[15px]" /> : null}
                {busy ? "Sending code…" : "Continue"}
              </button>
            </form>
          ) : (
            <form
              className="mt-6"
              onSubmit={(e) => {
                e.preventDefault();
                if (code.length === 6) void verify(code);
              }}
            >
              <label htmlFor="code" className="block text-[12px] font-medium text-ink-soft">
                Six-digit code
              </label>
              <input
                id="code"
                ref={codeRef}
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="••••••"
                maxLength={6}
                className="ss-num mt-1.5 w-full rounded-lg border border-hair-strong bg-canvas px-3 py-3 text-center text-[24px] font-semibold tracking-[0.42em] text-ink outline-none transition placeholder:tracking-[0.42em] placeholder:text-hair-strong focus:border-navy focus:ring-2 focus:ring-navy/15"
              />

              <button
                type="submit"
                disabled={code.length !== 6 || busy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Spinner className="h-[15px] w-[15px]" /> : null}
                {busy ? "Checking…" : "Verify and continue"}
              </button>

              <div className="mt-4 flex items-center justify-between text-[12px]">
                <button
                  type="button"
                  onClick={() => {
                    setStep("identify");
                    setCode("");
                    setError(null);
                    setNotice(null);
                  }}
                  className="font-medium text-ink-soft transition hover:text-ink"
                >
                  Use a different email or number
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || busy}
                  onClick={() => void sendCode(identifier.trim(), true)}
                  className="font-medium text-navy transition hover:text-navy-dark disabled:cursor-not-allowed disabled:text-faint"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
                </button>
              </div>

              {sent?.devCode ? (
                <div className="mt-5 rounded-lg border border-info-line bg-info-soft px-3 py-2.5">
                  <p className="text-[11.5px] font-semibold text-info">Review environment</p>
                  <p className="mt-1 text-[12px] text-ink-soft">
                    No mail or SMS gateway is connected here, so your code is{" "}
                    <button
                      type="button"
                      onClick={() => onCodeChange(sent.devCode ?? "")}
                      className="ss-num rounded bg-canvas px-1.5 py-0.5 font-semibold tracking-[0.2em] text-ink ring-1 ring-info-line transition hover:bg-hover"
                    >
                      {sent.devCode}
                    </button>
                    . In production it arrives by {sent.channel === "email" ? "email" : "SMS"} and is never shown.
                  </p>
                </div>
              ) : null}
            </form>
          )}

          {devMode && personas.length > 0 ? (
            <section className="mt-8 border-t border-hair pt-5" aria-label="Sign in as a persona">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[12.5px] font-semibold text-ink">Sign in as</h3>
                <span className="rounded-full bg-info-soft px-2 py-0.5 text-[10.5px] font-semibold text-info">
                  Review build
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-faint">
                Two systems. External is the founder and investor portals. Internal is the team. Pick a persona and
                sign in. To change persona, sign out first.
              </p>

              <label htmlFor="persona" className="mt-3 block text-[12px] font-medium text-ink-soft">
                Persona
              </label>
              <select
                id="persona"
                value={personaKey}
                onChange={(e) => setPersonaKey(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-hair-strong bg-canvas py-2.5 pl-3 pr-8 text-[13.5px] font-medium text-ink outline-none transition focus:border-navy focus:ring-2 focus:ring-navy/15"
              >
                <optgroup label="External">
                  {external.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Internal">
                  {internal.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </optgroup>
              </select>

              {persona ? (
                <div className="mt-3 flex items-start gap-3 rounded-lg border border-hair bg-surface px-3 py-2.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md bg-navy/10 text-navy">
                    <Icon name={persona.audience === "external" ? (persona.portal === "investor" ? "briefcase" : "rocket") : "shield"} className="h-[15px] w-[15px]" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold text-ink">
                      {persona.audience === "external" ? "External portal" : "Internal console"}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-faint">{persona.blurb}</span>
                  </span>
                </div>
              ) : null}

              <button
                type="button"
                disabled={busy || !persona}
                onClick={() => persona && void demoSignIn(persona)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-navy-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Spinner className="h-[15px] w-[15px]" /> : null}
                {busy ? "Signing in…" : `Sign in as ${persona?.label ?? "persona"}`}
              </button>
            </section>
          ) : null}

          <p className="mt-8 border-t border-hair pt-5 text-[11px] leading-relaxed text-faint">
            By continuing you agree to be contacted about your application. Your code expires in ten minutes and can be
            used once.
          </p>
        </div>
      </main>
    </div>
  );
}
