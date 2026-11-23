"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiAction, apiInvestorIrrView, apiInvestorSide, ApiError, type InvestorSideData, type InvestorSideOpportunity } from "@/lib/client/api";
import { formatDate } from "@/lib/domain/dates";
import { Icon } from "./icons";
import { useSession } from "./SessionProvider";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  InfoNote,
  Input,
  Money,
  Modal,
  Select,
  Stat,
  StatusBadge,
  Textarea,
  Toaster,
  ToneDot,
  useToasts,
} from "./ui";

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

const str = (row: Record<string, unknown> | null | undefined, key: string): string =>
  row && row[key] !== null && row[key] !== undefined ? String(row[key]) : "";
const num = (row: Record<string, unknown> | null | undefined, key: string): number =>
  row && row[key] !== null && row[key] !== undefined ? Number(row[key]) : 0;

type TabKey = "overview" | "details" | "opportunities" | "pitches" | "funding" | "documents";

const TABS: { key: TabKey; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { key: "overview", label: "Overview", icon: "home" },
  { key: "details", label: "My details", icon: "briefcase" },
  { key: "opportunities", label: "Opportunities", icon: "search" },
  { key: "pitches", label: "Pitches & Pitch Day", icon: "mic" },
  { key: "funding", label: "Commitments & funding", icon: "currency" },
  { key: "documents", label: "Documents", icon: "folder" },
];

const RESPONSE_OPTIONS = [
  { value: "Ready to Invest", label: "Ready to Invest" },
  { value: "Ready to Proceed to the Next Stage", label: "Ready to Proceed to the Next Stage" },
  { value: "Information Requested", label: "Information Requested" },
  { value: "Pass", label: "Pass" },
  { value: "No Response", label: "No Response" },
];

/* ------------------------------------------------------------------ */
/* Portal                                                              */
/* ------------------------------------------------------------------ */

export function InvestorPortal() {
  const { session, refresh } = useSession();
  const { toasts, push, dismiss } = useToasts();
  const [data, setData] = useState<InvestorSideData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await apiInvestorSide());
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

  // An investor login that is not yet linked to a record sees a clear step, not a broken page.
  if (!data.investor) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Toaster toasts={toasts} onDismiss={dismiss} />
        <Card title="Your investor record is being set up">
          <InfoNote>
            You are signed in, but your account is not yet linked to an investor record. Investor
            Relations links your record during onboarding. Once linked, your thesis, the startups
            circulated to you and your commitments appear here.
          </InfoNote>
        </Card>
        <p className="pb-2 text-center text-[11.5px] text-faint">
          Signed in as {session?.actor.name ?? "investor"}.
        </p>
      </div>
    );
  }

  const current = data.journey.steps.find((s) => s.key === data.journey.currentKey) ?? null;

  return (
    <div className="space-y-4">
      <Toaster toasts={toasts} onDismiss={dismiss} />

      <InvestorHeader data={data} currentLabel={current?.label ?? ""} />

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-hair bg-canvas p-1 shadow-card" aria-label="Sections">
        {TABS.map((t) => {
          const active = tab === t.key;
          const pending = t.key === "opportunities" ? data.summary.openOpportunities : 0;
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
              {pending > 0 ? (
                <span className={`ss-num rounded-full px-1.5 text-[10.5px] ${active ? "bg-white/20" : "bg-info-soft text-info"}`}>
                  {pending}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {tab === "overview" ? <OverviewTab data={data} onGo={setTab} /> : null}
      {tab === "details" ? <DetailsTab data={data} onAction={runAction} /> : null}
      {tab === "opportunities" ? <OpportunitiesTab data={data} onAction={runAction} /> : null}
      {tab === "pitches" ? <PitchesTab data={data} onAction={runAction} /> : null}
      {tab === "funding" ? <FundingTab data={data} onAction={runAction} /> : null}
      {tab === "documents" ? <DocumentsTab data={data} /> : null}

      <p className="pb-2 text-center text-[11.5px] text-faint">
        Signed in as {session?.actor.name ?? "investor"}. You only ever see your own record and the
        startups shared with you.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */

function InvestorHeader({ data, currentLabel }: { data: InvestorSideData; currentLabel: string }) {
  const inv = data.investor ?? {};
  const allocation = data.summary.allocation;
  const committedPct = allocation > 0 ? Math.min(100, Math.round((data.summary.committed / allocation) * 100)) : 0;
  return (
    <section className="overflow-hidden rounded-2xl border border-hair bg-gradient-to-br from-brand to-brand-dark px-5 py-5 text-white shadow-raised">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/70">Your investor profile</p>
          <h1 className="mt-1 truncate text-[24px] font-semibold leading-tight tracking-[-0.02em]">{str(inv, "name")}</h1>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-white/85">
            {str(inv, "thesis") || "Add your investment thesis in My details so the team can match you well."}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium">{str(inv, "category") || "Investor"}</span>
            {data.investor?.grade ? (
              <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium uppercase">{String(data.investor.grade)}</span>
            ) : null}
            <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium">{str(inv, "geography") || "Geography not set"}</span>
            <span className="rounded-md bg-white/15 px-2 py-[3px] text-[11.5px] font-medium capitalize">{str(inv, "status").replace(/_/g, " ")}</span>
          </div>
        </div>
        <div className="w-full max-w-[15rem] rounded-xl bg-white/10 p-3 backdrop-blur">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-white/70">Your current stage</p>
          <p className="mt-1 text-[15px] font-semibold leading-snug">{currentLabel || "Not started"}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-[11.5px] text-white/80">
              <span>Season allocation committed</span>
              <span className="ss-num">{committedPct}%</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${committedPct}%` }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewTab({ data, onGo }: { data: InvestorSideData; onGo: (t: TabKey) => void }) {
  const nextActions = useMemo(() => {
    const items: { title: string; detail: string; tab: TabKey; cta: string }[] = [];
    for (const o of data.opportunities) {
      if (!o.response && o.shared_on) {
        items.push({
          title: `Respond on ${o.startupName}`,
          detail: `${o.information_shared || "Information"} shared${o.shared_on ? ` on ${formatDate(o.shared_on)}` : ""}.`,
          tab: "opportunities",
          cta: "Respond",
        });
      }
      if (o.next_action_due && o.next_action) {
        items.push({ title: `${o.startupName}: ${o.next_action}`, detail: `Due ${formatDate(o.next_action_due)}.`, tab: "opportunities", cta: "Open" });
      }
    }
    for (const c of data.commitments) {
      if (String(c.status) === "written_proposed") {
        items.push({
          title: `Confirm your commitment to ${str(c, "startupName")}`,
          detail: `${(num(c, "amount") / 100).toLocaleString("en-IN")} proposed. Confirming sets the amount and terms.`,
          tab: "funding",
          cta: "Review",
        });
      }
    }
    for (const s of data.pitchDaySlots) {
      if (!num(s, "held") && str(s, "slot_time")) {
        items.push({ title: `Pitch Day slot with ${str(s, "startupName")}`, detail: `${formatDate(str(s, "pitch_day_on"))} at ${str(s, "slot_time").slice(11, 16)}.`, tab: "pitches", cta: "Open" });
      }
    }
    for (const t of data.tasks) {
      items.push({
        title: str(t, "title"),
        detail: `${str(t, "required_output") || "Action from the team"}${str(t, "due_date") ? ` · due ${formatDate(str(t, "due_date"))}` : ""}`,
        tab: "overview",
        cta: "",
      });
    }
    return items;
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Opportunities" value={data.summary.openOpportunities} hint={`${data.opportunities.length} shared in all`} tone="info" />
        <Stat label="Allocation" value={<Money paise={data.summary.allocation} compact />} hint="Proposed for this season" tone="neutral" />
        <Stat label="Committed" value={<Money paise={data.summary.committed} compact />} hint={data.summary.committedCount ? `${data.summary.committedCount} confirmed` : "Nothing confirmed yet"} tone={data.summary.committed > 0 ? "success" : "neutral"} />
        <Stat label="Deployed" value={<Money paise={data.summary.deployed} compact />} hint="Verified by Finance" tone={data.summary.deployed > 0 ? "success" : "neutral"} />
      </div>

      {!data.summary.verified ? (
        <InfoNote tone="warning">
          Your verification is not complete. Investor Relations will confirm your eligibility and
          collect the signed participation and confidentiality documents before matching begins.
        </InfoNote>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Your journey" subtitle="Every stage is tracked separately, so one part moving ahead never hides another that is waiting.">
          <JourneyTimeline steps={data.journey.steps} />
        </Card>

        <div className="space-y-4">
          <Card title="What needs you next" subtitle="Actions on your side only.">
            {nextActions.length === 0 ? (
              <EmptyState title="Nothing is waiting on you" hint="Investor Relations will notify you here when a startup is shared or a meeting is scheduled." />
            ) : (
              <ul className="space-y-2">
                {nextActions.map((a, i) => (
                  <li key={`${a.title}-${i}`} className="flex items-start gap-2.5 rounded-lg border border-hair bg-surface/50 px-3 py-2.5">
                    <ToneDot tone="warning" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-medium text-ink">{a.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{a.detail}</p>
                    </div>
                    {a.cta ? (
                      <Button size="sm" variant="secondary" onClick={() => onGo(a.tab)}>
                        {a.cta}
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Notices from the team">
            {data.notices.length === 0 ? (
              <p className="text-[12.5px] text-faint">Nothing new.</p>
            ) : (
              <ul className="space-y-2">
                {data.notices.map((n) => (
                  <li key={String(n.id)} className="rounded-lg border border-hair bg-surface/50 px-3 py-2.5">
                    <p className="text-[12.5px] font-medium text-ink">{String(n.title)}</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{String(n.body ?? "")}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function JourneyTimeline({ steps }: { steps: InvestorSideData["journey"]["steps"] }) {
  return (
    <ol className="relative space-y-0.5">
      {steps.map((step, i) => {
        const isLast = i === steps.length - 1;
        return (
          <li key={step.key} className="relative flex gap-3 pb-2.5">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full ring-2 ${
                  step.status === "done"
                    ? "bg-ok ring-ok/25 text-white"
                    : step.status === "current"
                      ? "bg-brand ring-brand/25 text-white"
                      : "bg-canvas ring-hair-strong"
                }`}
              >
                {step.status === "done" ? <Icon name="check" className="h-2.5 w-2.5" strokeWidth={3} /> : null}
              </span>
              {!isLast ? <span className={`mt-1 w-px flex-1 ${step.status === "done" ? "bg-ok/40" : "bg-hair-strong"}`} /> : null}
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className={`text-[12.5px] font-medium ${step.status === "pending" ? "text-ink-soft" : "text-ink"}`}>{step.label}</p>
                {step.status === "current" ? <Badge tone="progress">You are here</Badge> : null}
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-faint">
                {step.detail}
                {step.owner ? ` · ${step.owner}` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ */
/* My details                                                          */
/* ------------------------------------------------------------------ */

const STAGE_FOCUS_OPTIONS = [
  { value: "idea", label: "Idea" },
  { value: "pre_revenue", label: "Pre-revenue" },
  { value: "early_revenue", label: "Early revenue" },
  { value: "growth", label: "Growth" },
];

function DetailsTab({ data, onAction }: { data: InvestorSideData; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  const inv = data.investor ?? {};
  const [values, setValues] = useState<Record<string, string>>(() => ({
    thesis: str(inv, "thesis"),
    sector_focus: str(inv, "sector_focus"),
    stage_focus: str(inv, "stage_focus"),
    geography: str(inv, "geography"),
    ticket_min: inv.ticket_min ? String(num(inv, "ticket_min") / 100) : "",
    ticket_max: inv.ticket_max ? String(num(inv, "ticket_max") / 100) : "",
    availability: str(inv, "availability"),
    expected_decision_timeline: str(inv, "expected_decision_timeline"),
    decision_maker: str(inv, "decision_maker"),
    authorised_representative: str(inv, "authorised_representative"),
    portfolio: str(inv, "portfolio"),
  }));
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValues({
      thesis: str(inv, "thesis"),
      sector_focus: str(inv, "sector_focus"),
      stage_focus: str(inv, "stage_focus"),
      geography: str(inv, "geography"),
      ticket_min: inv.ticket_min ? String(num(inv, "ticket_min") / 100) : "",
      ticket_max: inv.ticket_max ? String(num(inv, "ticket_max") / 100) : "",
      availability: str(inv, "availability"),
      expected_decision_timeline: str(inv, "expected_decision_timeline"),
      decision_maker: str(inv, "decision_maker"),
      authorised_representative: str(inv, "authorised_representative"),
      portfolio: str(inv, "portfolio"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.investor]);

  const set = (key: string, value: string) => setValues((v) => ({ ...v, [key]: value }));

  const save = async () => {
    setBusy(true);
    await onAction(
      "investor_side.profile_save",
      {
        thesis: values.thesis,
        sector_focus: values.sector_focus,
        stage_focus: values.stage_focus,
        geography: values.geography,
        ticket_min: values.ticket_min ? Math.round(Number(values.ticket_min) * 100) : 0,
        ticket_max: values.ticket_max ? Math.round(Number(values.ticket_max) * 100) : 0,
        availability: values.availability,
        expected_decision_timeline: values.expected_decision_timeline,
        decision_maker: values.decision_maker,
        authorised_representative: values.authorised_representative,
        portfolio: values.portfolio,
      },
      "Details saved",
    );
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Card
        title="Thesis and preferences"
        subtitle="Keep these current so the team matches you well. Commercial terms, your grade and your season allocation are set by Investor Relations."
        actions={<Button onClick={() => void save()} disabled={busy}>{busy ? "Saving…" : "Save changes"}</Button>}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Investment thesis" hint="What you back, and why.">
              <Textarea value={values.thesis} onChange={(v) => set("thesis", v)} rows={3} />
            </Field>
          </div>
          <Field label="Sector focus" hint="Comma separated.">
            <Input value={values.sector_focus} onChange={(v) => set("sector_focus", v)} placeholder="e.g. Agritech, Cleantech" />
          </Field>
          <Field label="Stage focus">
            <Select value={values.stage_focus} onChange={(v) => set("stage_focus", v)} options={STAGE_FOCUS_OPTIONS} placeholder="Select a stage" />
          </Field>
          <Field label="Geography">
            <Input value={values.geography} onChange={(v) => set("geography", v)} placeholder="e.g. Tamil Nadu, Karnataka" />
          </Field>
          <Field label="Availability" hint="When and where you can meet.">
            <Input value={values.availability} onChange={(v) => set("availability", v)} placeholder="e.g. Chennai, second and fourth week" />
          </Field>
          <Field label="Typical ticket — minimum (₹)" hint="Enter rupees, not paise.">
            <Input value={values.ticket_min} onChange={(v) => set("ticket_min", v)} type="number" placeholder="e.g. 5000000" />
          </Field>
          <Field label="Typical ticket — maximum (₹)">
            <Input value={values.ticket_max} onChange={(v) => set("ticket_max", v)} type="number" placeholder="e.g. 50000000" />
          </Field>
          <Field label="Decision maker">
            <Input value={values.decision_maker} onChange={(v) => set("decision_maker", v)} />
          </Field>
          <Field label="Authorised representative">
            <Input value={values.authorised_representative} onChange={(v) => set("authorised_representative", v)} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Portfolio and references" hint="Briefly, what you have backed.">
              <Textarea value={values.portfolio} onChange={(v) => set("portfolio", v)} rows={2} />
            </Field>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Your record" subtitle="Set by Investor Relations.">
          <dl className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
            <dt className="text-faint">Investing entity</dt>
            <dd className="text-ink">{str(inv, "investing_entity") || "—"}</dd>
            <dt className="text-faint">Category</dt>
            <dd className="text-ink">{str(inv, "category") || "—"}</dd>
            <dt className="text-faint">Source</dt>
            <dd className="text-ink">{str(inv, "source") || "—"}</dd>
            <dt className="text-faint">Relationship owner</dt>
            <dd className="text-ink">{str(inv, "relationship_owner") || "—"}</dd>
            <dt className="text-faint">Verification evidence</dt>
            <dd className="text-ink">{str(inv, "verification_evidence") || "—"}</dd>
            <dt className="text-faint">Season allocation</dt>
            <dd className="text-ink"><Money paise={data.summary.allocation} compact /></dd>
            <dt className="text-faint">Expected decision timeline</dt>
            <dd className="text-ink">{str(inv, "expected_decision_timeline") || "—"}</dd>
          </dl>
        </Card>

        <Card
          title="Your season meter"
          subtitle="Your allocation for the season, what you have committed, and what is left to deploy. Only verified transfers count as deployed."
        >
          <div className="space-y-3">
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface ring-1 ring-hair">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: `${data.summary.allocation > 0 ? Math.min(100, Math.round((data.summary.committed / data.summary.allocation) * 100)) : 0}%` }}
              />
            </div>
            <dl className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
              <dt className="text-faint">Season allocation</dt>
              <dd className="ss-num text-right text-ink"><Money paise={data.summary.allocation} compact /></dd>
              <dt className="text-faint">Committed</dt>
              <dd className="ss-num text-right text-ink"><Money paise={data.summary.committed} compact /></dd>
              <dt className="text-faint">Available</dt>
              <dd className="ss-num text-right text-ink"><Money paise={data.summary.available} compact /></dd>
              <dt className="text-faint">Verified as deployed</dt>
              <dd className="ss-num text-right text-ink"><Money paise={data.summary.deployed} compact /></dd>
              <dt className="text-faint">Maximum per startup</dt>
              <dd className="ss-num text-right text-ink">
                {data.summary.maxPerStartup > 0 ? <Money paise={data.summary.maxPerStartup} compact /> : "Not set"}
              </dd>
            </dl>
            <p className="text-[11.5px] text-faint">
              {data.summary.commitmentConfirmed
                ? "You have confirmed this ceiling for the season."
                : "Confirm your season ceiling with Investor Relations so the team can match you accurately."}
            </p>
          </div>
        </Card>

        <Card
          title="Verification"
          subtitle="Your grading is internal to Investor Relations. Your verification status, agreements and permitted engagement are shown here."
        >
          <dl className="grid grid-cols-2 gap-y-2.5 text-[12.5px]">
            <dt className="text-faint">Verification</dt>
            <dd className="text-ink">{data.summary.verified ? "Verified" : "In progress"}</dd>
            <dt className="text-faint">Onboarding</dt>
            <dd className="text-ink">{data.summary.onboarded ? "Complete" : "Pending"}</dd>
            <dt className="text-faint">Agreements signed</dt>
            <dd className="text-ink">{data.agreements.length > 0 ? `${data.agreements.length} on file` : "None yet"}</dd>
          </dl>
          <p className="mt-3 text-[11.5px] text-faint">
            Your grade sets your permitted engagement and panel role, and is decided by Investor Relations after verification.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Opportunities                                                       */
/* ------------------------------------------------------------------ */

function OpportunitiesTab({ data, onAction }: { data: InvestorSideData; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  if (data.opportunities.length === 0) {
    return (
      <Card title="Opportunities">
        <EmptyState
          title="No startups shared with you yet"
          hint="Investor Relations circulates a startup to you once it is matched to your thesis and approved for circulation."
        />
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {data.opportunities.map((o) => (
        <OpportunityCard key={o.matchId} o={o} onAction={onAction} />
      ))}
    </div>
  );
}

function OpportunityCard({ o, onAction }: { o: InvestorSideOpportunity; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [irrOpen, setIrrOpen] = useState(false);
  const [response, setResponse] = useState(o.response || "");
  const [questions, setQuestions] = useState(o.questions || "");
  const [docs, setDocs] = useState(o.documents_requested || "");
  const [amount, setAmount] = useState(o.indicative_amount ? String(o.indicative_amount / 100) : "");
  const [passReason, setPassReason] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    await onAction(
      "investor_side.respond",
      {
        match_id: o.matchId,
        response,
        questions,
        documents_requested: docs,
        indicative_amount: amount ? Math.round(Number(amount) * 100) : 0,
        pass_reason: passReason,
      },
      "Response recorded",
    );
    setBusy(false);
    setOpen(false);
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          {o.startupName}
          <StatusBadge registry="match" value={o.status} />
          {o.response ? <Badge tone="neutral">{o.response}</Badge> : null}
        </span>
      }
      subtitle={`${o.sector || "Sector not set"} · ${o.stage.replace(/_/g, " ")} · ${o.geography || "Location not set"}`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {o.matchPct > 0 ? (
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[12px] font-semibold text-ink ring-2 ring-brand/30"
              style={{ background: `conic-gradient(var(--color-brand) ${o.matchPct * 3.6}deg, var(--color-hair) 0)` }}
              aria-label={`Match ${o.matchPct} percent`}
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-canvas">{o.matchPct}%</span>
            </span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={() => { setIrrOpen(true); void apiInvestorIrrView(o.matchId).catch(() => {}); }}>
            Investment Readiness Report
          </Button>
          <Button size="sm" variant={open ? "secondary" : "primary"} onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : o.response ? "Update response" : "Respond"}
          </Button>
        </div>
      }
    >
      <p className="text-[12.5px] leading-relaxed text-ink-soft">{o.pitch || "No pitch summary provided."}</p>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-3">
        <Detail label="Asking" value={<Money paise={o.targetFundraise} compact />} />
        <Detail label="Information shared" value={o.information_shared || "—"} />
        <Detail label="Version" value={o.info_version || "—"} />
        <Detail label="Shared on" value={o.shared_on ? formatDate(o.shared_on) : "—"} />
        <Detail label="Your indicative amount" value={o.indicative_amount ? <Money paise={o.indicative_amount} compact /> : "—"} />
        <Detail label="Next action" value={o.next_action || "—"} />
      </div>

      {o.questions ? (
        <div className="mt-3 rounded-lg border border-hair bg-surface/50 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Your questions</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-soft">{o.questions}</p>
        </div>
      ) : null}

      {o.meetings.length > 0 ? (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Meetings</p>
          <ul className="mt-1.5 divide-y divide-hair">
            {o.meetings.map((m) => (
              <li key={m.id} className="flex items-start gap-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium text-ink">
                    {m.meeting_type} · {formatDate(m.held_at ?? m.scheduled_at)}
                  </p>
                  <p className="mt-0.5 text-[11.5px] leading-snug text-ink-soft">{m.minutes}</p>
                </div>
                {m.minutes_acknowledged ? (
                  <Badge tone="success">Minutes acknowledged</Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => void onAction("investor_side.acknowledge_minutes", { meeting_id: m.id }, "Minutes acknowledged")}
                  >
                    Acknowledge
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {open ? (
        <div className="mt-4 space-y-3 rounded-lg border border-hair bg-surface/40 p-3">
          <Field label="Your response" required>
            <Select value={response} onChange={setResponse} options={RESPONSE_OPTIONS} placeholder="Choose a response" />
          </Field>
          {response === "Pass" ? (
            <Field label="Reason for passing" required>
              <Textarea value={passReason} onChange={setPassReason} rows={2} placeholder="So the team can match you better next time." />
            </Field>
          ) : null}
          {["Ready to Invest", "Ready to Proceed to the Next Stage", "Information Requested"].includes(response) ? (
            <>
              <Field label="Indicative amount (₹)" hint="Optional. Confirms interest; it is not a commitment or deployed capital.">
                <Input value={amount} onChange={setAmount} type="number" placeholder="e.g. 10000000" />
              </Field>
              <Field label="Questions for the startup" hint="Optional.">
                <Textarea value={questions} onChange={setQuestions} rows={2} />
              </Field>
              <Field label="Documents you need" hint="Optional. Comma separated.">
                <Input value={docs} onChange={setDocs} placeholder="e.g. Audited FY25 statements" />
              </Field>
            </>
          ) : null}
          <InfoNote>
            Ready to Invest confirms interest in amount and terms. It is not deployed or contractually
            committed capital — that comes later, through a written commitment and a verified transfer.
          </InfoNote>
          <div className="flex items-center gap-2">
            <Button onClick={() => void submit()} disabled={busy || !response}>{busy ? "Sending…" : "Submit response"}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}

      <Modal
        open={irrOpen}
        onClose={() => setIrrOpen(false)}
        title={`Investment Readiness Report — ${o.startupName}`}
        subtitle={`Version ${o.info_version || "v1"} · shared ${o.shared_on ? formatDate(o.shared_on) : "not yet"} · view only`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px] sm:grid-cols-3">
            <Detail label="Sector" value={o.sector || "—"} />
            <Detail label="Stage" value={o.stage.replace(/_/g, " ") || "—"} />
            <Detail label="Geography" value={o.geography || "—"} />
            <Detail label="Asking" value={<Money paise={o.targetFundraise} compact />} />
            <Detail label="Match" value={o.matchPct ? `${o.matchPct}%` : "—"} />
            <Detail label="Shared with you" value={o.information_shared || "—"} />
          </div>
          <div className="rounded-lg border border-hair bg-surface/50 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Business summary</p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{o.pitch || "No summary provided."}</p>
          </div>
          {o.questions ? (
            <div className="rounded-lg border border-hair bg-surface/50 px-3 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Open questions</p>
              <p className="mt-1 text-[12.5px] leading-snug text-ink-soft">{o.questions}</p>
            </div>
          ) : null}
          <InfoNote>
            The report is view only: it cannot be downloaded or forwarded. Your view is recorded so
            Investor Relations can follow up. The founder and co-founder personal details are withheld.
          </InfoNote>
        </div>
      </Modal>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{label}</p>
      <p className="mt-0.5 text-[12.5px] text-ink">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Pitches                                                             */
/* ------------------------------------------------------------------ */

function PitchesTab({ data, onAction }: { data: InvestorSideData; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  return (
    <div className="space-y-4">
      <Card title="Virtual pitches" subtitle="Five minutes of pitch and five minutes of Q&A, as the application SOP specifies.">
        {data.pitches.length === 0 ? (
          <EmptyState title="No virtual pitches scheduled" hint="Investor Relations schedules these once a startup is circulated to you." />
        ) : (
          <ul className="divide-y divide-hair">
            {data.pitches.map((p) => (
              <li key={String(p.id)} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12.5px] font-medium text-ink">{String(p.startupName)}</p>
                  <Badge tone={num(p, "attended") ? "success" : "neutral"}>{num(p, "attended") ? "Attended" : "Not attended"}</Badge>
                  <span className="text-[11.5px] text-faint">{formatDate(str(p, "scheduled_at"))} · {num(p, "duration_pitch_min")}+{num(p, "duration_qa_min")} min</span>
                </div>
                {str(p, "material_shared") ? <p className="mt-1 text-[11.5px] text-faint">Material: {str(p, "material_shared")}</p> : null}
                {str(p, "investor_questions") ? (
                  <p className="mt-1.5 text-[12px] leading-snug text-ink-soft"><span className="font-medium text-ink">Your questions: </span>{str(p, "investor_questions")}</p>
                ) : null}
                {str(p, "responses") ? (
                  <p className="mt-1 text-[12px] leading-snug text-ink-soft"><span className="font-medium text-ink">Startup response: </span>{str(p, "responses")}</p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <StatusBadge registry="pitch_response" value={str(p, "response")} />
                  {num(p, "amount_confirmed") ? <Badge tone="info"><Money paise={num(p, "amount_confirmed")} compact /> confirmed</Badge> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Pitch Day" subtitle="Your one-to-one slots, and the outcome you record for each.">
        {data.pitchDaySlots.length === 0 ? (
          <EmptyState title="No Pitch Day slots" hint="Investor Relations allocates one-to-one slots at Pitch Day." />
        ) : (
          <ul className="divide-y divide-hair">
            {data.pitchDaySlots.map((s) => (
              <SlotRow key={String(s.id)} slot={s} onAction={onAction} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function SlotRow({ slot, onAction }: { slot: Record<string, unknown>; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [outcome, setOutcome] = useState(str(slot, "outcome") || "one_to_one_held");
  const [notes, setNotes] = useState(str(slot, "notes"));
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const OUTCOMES = [
    { value: "one_to_one_held", label: "One-to-one meeting held" },
    { value: "golden_pass_issued", label: "Issue a Golden Pass (initial interest)" },
    { value: "follow_on_interest", label: "Follow-on interest" },
    { value: "no_interest", label: "No interest" },
  ];

  const submit = async () => {
    setBusy(true);
    await onAction(
      "investor_side.confirm_slot",
      { slot_id: String(slot.id), outcome, notes, amount: amount ? Math.round(Number(amount) * 100) : 0 },
      "Pitch Day outcome recorded",
    );
    setBusy(false);
    setOpen(false);
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] font-medium text-ink">{str(slot, "startupName")}</p>
        {str(slot, "episode_no") ? <Badge tone="neutral">{str(slot, "episode_no")}</Badge> : null}
        <StatusBadge registry="pitch_day_outcome" value={str(slot, "outcome")} />
        <span className="text-[11.5px] text-faint">{formatDate(str(slot, "pitch_day_on"))} · {str(slot, "slot_time").slice(11, 16)}</span>
        <span className="ml-auto">
          <Button size="sm" variant={open ? "secondary" : "primary"} onClick={() => setOpen((v) => !v)}>
            {open ? "Close" : "Record outcome"}
          </Button>
        </span>
      </div>
      {str(slot, "notes") ? <p className="mt-1 text-[11.5px] text-faint">{str(slot, "notes")}</p> : null}

      {open ? (
        <div className="mt-3 space-y-3 rounded-lg border border-hair bg-surface/40 p-3">
          <Field label="Outcome" required>
            <Select value={outcome} onChange={setOutcome} options={OUTCOMES} />
          </Field>
          {outcome === "golden_pass_issued" ? (
            <>
              <Field label="Amount indicated (₹)" hint="Optional. A Golden Pass is initial interest, not a written commitment.">
                <Input value={amount} onChange={setAmount} type="number" placeholder="e.g. 10000000" />
              </Field>
              <InfoNote tone="warning">
                A Golden Pass records initial interest only. It stays separate from a written
                commitment and never counts as deployed or contractually committed capital.
              </InfoNote>
            </>
          ) : null}
          <Field label="Notes" hint="Optional.">
            <Textarea value={notes} onChange={setNotes} rows={2} />
          </Field>
          <div className="flex items-center gap-2">
            <Button onClick={() => void submit()} disabled={busy}>{busy ? "Saving…" : "Save outcome"}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Commitments & funding                                               */
/* ------------------------------------------------------------------ */

function FundingTab({ data, onAction }: { data: InvestorSideData; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  return (
    <div className="space-y-4">
      <Card title="Your commitments" subtitle="Amounts you have proposed or confirmed. Deployment is verified separately by Finance.">
        {data.commitments.length === 0 ? (
          <EmptyState title="No commitments yet" hint="When you are ready to invest, a written commitment is recorded here." />
        ) : (
          <ul className="divide-y divide-hair">
            {data.commitments.map((c) => (
              <CommitmentRow key={String(c.id)} c={c} onAction={onAction} />
            ))}
          </ul>
        )}
      </Card>

      <Card title="Funding and deployment" subtitle="Each tranche is tracked on its own. Only Finance can mark a transfer verified.">
        {data.deals.length === 0 ? (
          <EmptyState title="No deals yet" hint="A deal opens after a written commitment is confirmed." />
        ) : (
          <div className="space-y-4">
            {data.deals.map((d) => (
              <DealCard key={String(d.id)} d={d} onAction={onAction} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function CommitmentRow({ c, onAction }: { c: Record<string, unknown>; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  const [busy, setBusy] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [reason, setReason] = useState("");
  const status = str(c, "status");

  const confirm = async () => {
    setBusy(true);
    await onAction("investor_side.confirm_commitment", { commitment_id: String(c.id) }, "Commitment confirmed");
    setBusy(false);
  };
  const withdraw = async () => {
    setBusy(true);
    const ok = await onAction("investor_side.withdraw_commitment", { commitment_id: String(c.id), reason }, "Commitment withdrawn");
    setBusy(false);
    if (ok) setWithdrawOpen(false);
  };

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[12.5px] font-medium text-ink">{str(c, "startupName")}</p>
        <StatusBadge registry="commitment" value={status} />
        {num(c, "is_golden_pass") ? <Badge tone="info">Golden Pass</Badge> : null}
        <span className="ss-num ml-auto text-[13px] font-semibold text-ink"><Money paise={num(c, "amount")} compact /></span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-[12px] sm:grid-cols-3">
        <Detail label="Valuation" value={str(c, "valuation") || "—"} />
        <Detail label="Written on" value={str(c, "written_on") ? formatDate(str(c, "written_on")) : "—"} />
        <Detail label="Confirmed on" value={str(c, "confirmed_on") ? formatDate(str(c, "confirmed_on")) : "—"} />
      </div>
      {str(c, "terms") ? <p className="mt-1.5 text-[12px] leading-snug text-ink-soft">{str(c, "terms")}</p> : null}
      {str(c, "revision_reason") ? <p className="mt-1 text-[11.5px] text-faint">Reason: {str(c, "revision_reason")}</p> : null}

      {status === "written_proposed" ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void confirm()} disabled={busy}>{busy ? "Confirming…" : "Confirm this commitment"}</Button>
          <Button size="sm" variant="secondary" onClick={() => setWithdrawOpen((v) => !v)}>Withdraw</Button>
        </div>
      ) : null}

      {withdrawOpen ? (
        <div className="mt-3 space-y-3 rounded-lg border border-hair bg-surface/40 p-3">
          <Field label="Reason for withdrawing" required>
            <Textarea value={reason} onChange={setReason} rows={2} />
          </Field>
          <div className="flex items-center gap-2">
            <Button variant="danger" onClick={() => void withdraw()} disabled={busy || !reason.trim()}>Withdraw commitment</Button>
            <Button variant="ghost" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function DealCard({ d, onAction }: { d: Record<string, unknown>; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  const tranches = (d.tranches as Record<string, unknown>[]) ?? [];
  const verified = tranches.filter((t) => ["verified", "part_verified"].includes(str(t, "status"))).reduce((s, t) => s + num(t, "verified_amount"), 0);
  const committed = num(d, "committed_amount");
  const outstanding = Math.max(0, committed - verified);

  return (
    <div className="rounded-xl border border-hair bg-surface/40 p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[13px] font-semibold text-ink">{str(d, "startupName")}</p>
        <StatusBadge registry="deal" value={str(d, "status")} />
        {str(d, "round_name") ? <Badge tone="neutral">{str(d, "round_name")}</Badge> : null}
        <span className="ml-auto text-[11.5px] text-faint">{str(d, "owner_name") ? `Owner: ${str(d, "owner_name")}` : ""}</span>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Committed" value={<Money paise={committed} compact />} tone="neutral" />
        <Stat label="Deployed" value={<Money paise={verified} compact />} tone={verified > 0 ? "success" : "neutral"} />
        <Stat label="Outstanding" value={<Money paise={outstanding} compact />} tone={outstanding > 0 ? "warning" : "neutral"} />
        <Stat label="Valuation" value={str(d, "valuation") || "—"} tone="neutral" />
      </div>

      {str(d, "agreed_terms") ? <p className="mt-2 text-[12px] leading-snug text-ink-soft">{str(d, "agreed_terms")}</p> : null}
      {str(d, "open_conditions") ? <p className="mt-1 text-[11.5px] text-faint">Open conditions: {str(d, "open_conditions")}</p> : null}
      {str(d, "blocker") ? <p className="mt-1 text-[11.5px] text-risk">Blocker: {str(d, "blocker")}</p> : null}

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">Tranches</p>
        {tranches.length === 0 ? (
          <p className="mt-1 text-[12px] text-faint">No tranches scheduled yet.</p>
        ) : (
          <ul className="mt-1.5 divide-y divide-hair">
            {tranches.map((t) => (
              <TrancheRow key={String(t.id)} t={t} onAction={onAction} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function TrancheRow({ t, onAction }: { t: Record<string, unknown>; onAction: (a: string, p: Record<string, unknown>, d: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(num(t, "scheduled_amount") / 100));
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const status = str(t, "status");

  const report = async () => {
    setBusy(true);
    await onAction(
      "investor_side.report_transfer",
      { tranche_id: String(t.id), reported_amount: Math.round(Number(amount) * 100), evidence },
      "Transfer reported",
    );
    setBusy(false);
    setOpen(false);
  };

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="ss-num text-[12px] font-medium text-ink">Tranche {num(t, "seq")}</span>
        <StatusBadge registry="tranche" value={status} />
        <span className="text-[11.5px] text-faint">
          Scheduled {formatDate(str(t, "scheduled_on"))} · <Money paise={num(t, "scheduled_amount")} compact />
        </span>
        {status !== "verified" ? (
          <span className="ml-auto">
            <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>
              {open ? "Close" : "Report a transfer"}
            </Button>
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 text-[11.5px] text-faint">
        {num(t, "reported_amount") ? <span>Reported: <Money paise={num(t, "reported_amount")} compact /></span> : null}
        {num(t, "verified_amount") ? <span>Verified: <Money paise={num(t, "verified_amount")} compact />{str(t, "verified_on") ? ` on ${formatDate(str(t, "verified_on"))}` : ""}</span> : null}
      </div>
      {str(t, "reversal_reason") ? <p className="mt-1 text-[11.5px] text-warn">Returned: {str(t, "reversal_reason")}</p> : null}

      {open ? (
        <div className="mt-2 space-y-3 rounded-lg border border-hair bg-canvas p-3">
          <Field label="Amount you transferred (₹)" required>
            <Input value={amount} onChange={setAmount} type="number" />
          </Field>
          <Field label="Evidence" hint="Optional. A bank reference or UTR.">
            <Input value={evidence} onChange={setEvidence} placeholder="e.g. UTR 123456789" />
          </Field>
          <InfoNote>
            This records your report to Finance. Deployment is shown as verified only after Finance
            checks the receipt, so a reported transfer is never treated as deployed capital on its own.
          </InfoNote>
          <div className="flex items-center gap-2">
            <Button onClick={() => void report()} disabled={busy || !amount}>{busy ? "Reporting…" : "Report transfer"}</Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

function DocumentsTab({ data }: { data: InvestorSideData }) {
  return (
    <div className="space-y-4">
      <Card title="Your agreements" subtitle="The mandatory document set for your category, verified by Investor Relations.">
        {data.agreements.length === 0 ? (
          <EmptyState title="No agreements recorded" hint="Your participation and confidentiality documents are recorded here once signed." />
        ) : (
          <ul className="divide-y divide-hair">
            {data.agreements.map((a) => (
              <li key={String(a.id)} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="text-[12.5px] font-medium text-ink">{String(a.document_type)}</span>
                <StatusBadge registry="document" value={str(a, "status")} />
                <span className="text-[11.5px] text-faint">
                  {str(a, "signed_on") ? `Signed ${formatDate(str(a, "signed_on"))}` : "Not signed"}
                  {str(a, "reference") ? ` · ${str(a, "reference")}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Documents shared with you" subtitle="Investor Relations keeps a version for each investor, so you always see the version you were given.">
        {data.documents.length === 0 ? (
          <EmptyState title="No documents yet" hint="Documents shared with you appear here with their version." />
        ) : (
          <ul className="divide-y divide-hair">
            {data.documents.map((d) => (
              <li key={String(d.id)} className="flex flex-wrap items-center gap-2 py-2.5">
                <span className="text-[12.5px] font-medium text-ink">{String(d.title)}</span>
                <Badge tone="neutral">{String(d.category || d.purpose || "document")}</Badge>
                <span className="text-[11.5px] text-faint">
                  {str(d, "version") ? `${str(d, "version")} · ` : ""}
                  {str(d, "uploaded_on") ? formatDate(str(d, "uploaded_on")) : ""}
                </span>
                <StatusBadge registry="document" value={str(d, "status")} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
