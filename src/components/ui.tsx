"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { STATUS_REGISTRIES, type Tone } from "@/lib/domain/statuses";
import { compactINR, rupees } from "@/lib/domain/money";
import { formatDate, formatDateTime, relativeFromNow } from "@/lib/domain/dates";
import { Icon } from "./icons";

/* ------------------------------------------------------------------ */
/* Tone vocabulary                                                     */
/*                                                                     */
/* One place decides what "warning" looks like, so a chip, a dot, a    */
/* bar and a note never drift apart.                                   */
/* ------------------------------------------------------------------ */

const TONE_CHIP: Record<Tone, string> = {
  neutral: "bg-hover text-ink-soft ring-hair-strong",
  info: "bg-info-soft text-info ring-info-line",
  progress: "bg-brand-soft text-brand-ink ring-brand-line",
  success: "bg-ok-soft text-ok ring-ok-line",
  warning: "bg-warn-soft text-warn ring-warn-line",
  danger: "bg-risk-soft text-risk ring-risk-line",
};

const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-hair-strong",
  info: "bg-info",
  progress: "bg-brand",
  success: "bg-ok",
  warning: "bg-warn",
  danger: "bg-risk",
};

const TONE_BAR: Record<Tone, string> = {
  neutral: "bg-hair-strong",
  info: "bg-info",
  progress: "bg-brand",
  success: "bg-ok",
  warning: "bg-warn",
  danger: "bg-risk",
};

const TONE_NOTE: Record<Tone, string> = {
  neutral: "border-hair bg-surface text-ink-soft",
  info: "border-info-line bg-info-soft text-info",
  progress: "border-brand-line bg-brand-soft text-brand-ink",
  success: "border-ok-line bg-ok-soft text-ok",
  warning: "border-warn-line bg-warn-soft text-warn",
  danger: "border-risk-line bg-risk-soft text-risk",
};

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-0.5 text-[12.5px]">
      {items.map((item, i) => (
        <span key={`${item.label}-${i}`} className="flex items-center gap-0.5">
          {i > 0 ? (
            <Icon name="chevron-right" className="h-3.5 w-3.5 shrink-0 text-hair-strong" strokeWidth={2} />
          ) : null}
          {item.href ? (
            <a href={item.href} className="rounded-md px-1.5 py-0.5 text-faint transition hover:bg-hover hover:text-ink">
              {item.label}
            </a>
          ) : (
            <span className="px-1.5 py-0.5 font-medium text-ink-soft">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
  icon,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <header className="mb-5">
      {breadcrumb ? <div className="mb-2.5">{breadcrumb}</div> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-[21px] font-semibold leading-tight tracking-[-0.021em] text-ink">
            {icon ? <span className="text-[19px] leading-none text-brand">{icon}</span> : null}
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-soft">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/**
 * A quiet panel. Content groups with headings and hairlines rather than heavy cards, so a
 * card is a white surface with a hairline border and the shallowest possible shadow.
 */
export function Card({
  title,
  subtitle,
  actions,
  children,
  padded = true,
  className = "",
  footer,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  className?: string;
  footer?: ReactNode;
}) {
  return (
    <section className={`overflow-hidden rounded-xl border border-hair bg-canvas shadow-card ${className}`}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-hair px-4 py-3">
          <div className="min-w-0">
            {title ? <h2 className="text-[13.5px] font-semibold tracking-[-0.005em] text-ink">{title}</h2> : null}
            {subtitle ? <p className="mt-0.5 text-[12px] text-faint">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
        </div>
      ) : null}
      <div className={padded ? "p-4" : ""}>{children}</div>
      {footer ? <div className="border-t border-hair bg-surface/50 px-4 py-2.5">{footer}</div> : null}
    </section>
  );
}

export function SectionTitle({
  children,
  hint,
  actions,
}: {
  children: ReactNode;
  hint?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">{children}</h3>
      {hint ? <span className="text-[12px] text-faint">{hint}</span> : null}
      {actions ? <div className="flex items-center gap-1.5">{actions}</div> : null}
    </div>
  );
}

/**
 * A sticky toolbar above a list: filters on the left, view actions on the right, so a
 * filter is always reachable while the table scrolls.
 */
export function Toolbar({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-hair bg-canvas px-3 py-2.5">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
      {right ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{right}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone = "neutral",
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: Tone;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group relative block w-full overflow-hidden rounded-xl border border-hair bg-canvas px-3.5 py-3 text-left shadow-card transition ${
        onClick ? "hover:border-hair-strong hover:shadow-raised" : ""
      }`}
    >
      <div className="flex items-center gap-1.5">
        <ToneDot tone={tone} />
        <span className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-faint">{label}</span>
      </div>
      <div className="ss-num mt-1.5 text-[22px] font-semibold leading-none tracking-[-0.025em] text-ink">{value}</div>
      {hint ? <div className="mt-1.5 text-[12px] leading-snug text-ink-soft">{hint}</div> : null}
    </Tag>
  );
}

export function ProgressBar({ value, tone = "progress" }: { value: number; tone?: Tone }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-hair" role="presentation">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${TONE_BAR[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-hair-strong bg-surface/60 px-4 py-10 text-center">
      <p className="text-[13.5px] font-medium text-ink-soft">{title}</p>
      {hint ? <p className="mx-auto mt-1 max-w-sm text-[12.5px] leading-relaxed text-faint">{hint}</p> : null}
      {action ? <div className="mt-3.5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ss-shimmer h-3.5 rounded" style={{ width: `${72 + ((i * 29) % 26)}%` }} />
      ))}
    </div>
  );
}

/** Placeholder rows shaped like a table, so a list does not jump when data lands. */
export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-hair" aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-3 py-2.5">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="ss-shimmer h-3 rounded"
              style={{ width: c === 0 ? "16%" : `${9 + ((r + c * 3) % 7)}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Collapsible page introduction. Long process notes help a first-time reader but get in the
 * way of daily work, so they sit behind a one-line summary.
 */
export function PageIntro({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className="overflow-hidden rounded-xl border border-hair bg-canvas">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition hover:bg-surface"
      >
        <Icon name="book" className="h-[14px] w-[14px] shrink-0 text-faint" />
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink-soft">{summary}</span>
        <span className="shrink-0 text-[11.5px] font-medium text-faint">{open ? "Hide" : "Process notes"}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} className="h-[14px] w-[14px] shrink-0 text-faint" strokeWidth={2} />
      </button>
      {open ? (
        <div id={id} className="border-t border-hair px-3.5 py-3 text-[12.5px] leading-relaxed text-ink-soft">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export function Pagination({
  offset,
  limit,
  total,
  onOffset,
  leading,
}: {
  offset: number;
  limit: number;
  total: number;
  onOffset: (offset: number) => void;
  leading?: ReactNode;
}) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const canPrev = offset > 0;
  const canNext = offset + limit < total;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-hair bg-canvas px-3 py-2">
      <div className="flex flex-wrap items-center gap-3">
        {leading}
        <span className="ss-num text-[12px] text-faint">
          <span className="font-medium text-ink-soft">
            {from}&ndash;{to}
          </span>{" "}
          of <span className="font-medium text-ink-soft">{total}</span>
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="secondary" size="sm" disabled={!canPrev} onClick={() => onOffset(Math.max(0, offset - limit))}>
          <Icon name="chevron-right" className="h-3.5 w-3.5 rotate-180" strokeWidth={2} />
          Previous
        </Button>
        <Button variant="secondary" size="sm" disabled={!canNext} onClick={() => onOffset(offset + limit)}>
          Next
          <Icon name="chevron-right" className="h-3.5 w-3.5" strokeWidth={2} />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-[1.5px] text-[11.5px] font-medium leading-[1.4] ring-1 ring-inset ${TONE_CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * A status chip. The registry supplies the label and the tone, so a raw database value like
 * `info_required` never reaches the screen and one status always looks the same everywhere.
 */
export function StatusBadge({ registry, value }: { registry: string; value: unknown }) {
  if (value === null || value === undefined || value === "") return <span className="text-faint">&ndash;</span>;
  const reg = STATUS_REGISTRIES[registry];
  const meta = reg?.[String(value)];
  const tone = (meta?.tone ?? "neutral") as Tone;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-[2px] text-[11.5px] font-medium leading-[1.45] ring-1 ring-inset ${TONE_CHIP[tone]}`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden />
      {meta?.label ?? String(value).replace(/_/g, " ")}
    </span>
  );
}

export function ToneDot({ tone }: { tone: Tone }) {
  return <span className={`inline-block h-[6px] w-[6px] shrink-0 rounded-full ${TONE_DOT[tone]}`} aria-hidden />;
}

export function Pill({ children, active, onClick }: { children: ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-2.5 py-1 text-[12px] font-medium transition ${
        active ? "bg-ink text-white" : "bg-hover text-ink-soft hover:bg-hair-strong hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** A segmented control for two to five mutually exclusive views. */
export function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-hair bg-surface p-0.5" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12.5px] font-medium transition ${
              active ? "bg-canvas text-ink shadow-card" : "text-ink-soft hover:text-ink"
            }`}
          >
            {o.label}
            {o.count !== undefined ? <span className="ss-num text-[11px] text-faint">{o.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-hover px-1.5 py-[1.5px] font-mono text-[11px] text-ink-soft">
      {children}
    </span>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-hair-strong bg-canvas px-1.5 py-0.5 font-sans text-[10.5px] font-medium text-faint">
      {children}
    </kbd>
  );
}

/* ------------------------------------------------------------------ */
/* Money and dates                                                     */
/* ------------------------------------------------------------------ */

export function Money({ paise, compact = false }: { paise: unknown; compact?: boolean }) {
  const value = Number(paise ?? 0);
  if (!Number.isFinite(value)) return <span className="text-faint">&ndash;</span>;
  if (value === 0) return <span className="ss-num text-faint">&ndash;</span>;
  return <span className="ss-num">{compact ? compactINR(value) : rupees(value)}</span>;
}

export function DateText({ value, relative = false }: { value: unknown; relative?: boolean }) {
  if (!value) return <span className="text-faint">&ndash;</span>;
  const text = String(value);
  if (relative) {
    const overdue = text.split("T")[0] < new Date().toISOString().slice(0, 10);
    return <span className={overdue ? "font-medium text-risk" : ""}>{relativeFromNow(text)}</span>;
  }
  return <span className="ss-num">{text.includes("T") ? formatDateTime(text) : formatDate(text)}</span>;
}

export function Bool({ value }: { value: unknown }) {
  const on = value === 1 || value === true || value === "1";
  return on ? <Badge tone="success">Yes</Badge> : <Badge tone="neutral">No</Badge>;
}

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  type = "button",
  title,
  ariaLabel,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "brand" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  ariaLabel?: string;
}) {
  const variants = {
    primary: "bg-ink text-white hover:bg-black disabled:bg-hair-strong disabled:text-faint",
    brand: "bg-brand text-white hover:bg-brand-dark disabled:bg-hair-strong disabled:text-faint",
    secondary: "border border-hair-strong bg-canvas text-ink hover:bg-hover disabled:text-faint",
    ghost: "text-ink-soft hover:bg-hover hover:text-ink disabled:text-faint",
    danger: "bg-risk text-white hover:brightness-105 disabled:bg-hair-strong disabled:text-faint",
    success: "bg-ok text-white hover:brightness-105 disabled:bg-hair-strong disabled:text-faint",
  } as const;
  return (
    <button
      type={type}
      title={title}
      aria-label={ariaLabel}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:shadow-none ${
        size === "sm" ? "px-2.5 py-[5px] text-[12.5px]" : "px-3 py-[7px] text-[13px]"
      } ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline gap-1 text-[12px] font-medium text-ink-soft">
        {label}
        {required ? <span className="text-risk">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] leading-snug text-faint">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "w-full rounded-lg border border-hair-strong bg-canvas px-2.5 py-[7px] text-[13px] text-ink transition placeholder:text-faint hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15 disabled:cursor-not-allowed disabled:bg-surface disabled:text-faint";

export function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  disabled,
  min,
  step,
}: {
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  min?: number;
  step?: number;
}) {
  return (
    <input
      className={inputClass}
      value={value ?? ""}
      type={type}
      min={min}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Textarea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      className={`${inputClass} leading-relaxed`}
      rows={rows}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select className={inputClass} value={value ?? ""} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-[15px] w-[15px] cursor-pointer rounded border-hair-strong accent-[color:var(--brand)]"
      />
      {label}
    </label>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; count?: number }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-4 border-b border-hair" role="tablist">
      {tabs.map((t) => {
        const on = active === t.key;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`-mb-px inline-flex items-center gap-1.5 border-b-2 pb-2 pt-1 text-[13px] font-medium transition ${
              on ? "border-brand text-ink" : "border-transparent text-faint hover:border-hair-strong hover:text-ink-soft"
            }`}
          >
            {t.label}
            {t.count !== undefined ? (
              <span
                className={`ss-num rounded-full px-1.5 text-[11px] ${on ? "bg-brand-soft text-brand-ink" : "bg-hover text-faint"}`}
              >
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Lock the page behind the dialog so a long form scrolls on its own.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;
  // A portal to <body> keeps the dialog out of any ancestor that has `backdrop-filter`,
  // `transform` or `filter`, each of which would otherwise trap a fixed-position dialog and
  // leave it mispositioned behind the content.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/40 p-4 backdrop-blur-[2px] sm:p-8"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`ss-rise w-full ${wide ? "max-w-4xl" : "max-w-xl"} overflow-hidden rounded-2xl border border-hair bg-canvas shadow-overlay`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hair px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.008em] text-ink">{title}</h2>
            {subtitle ? <p className="mt-0.5 text-[12.5px] leading-snug text-faint">{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-faint transition hover:bg-hover hover:text-ink"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hair bg-surface/60 px-5 py-3.5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/** A right-hand slide-over for inspecting a record without leaving the list. */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end bg-ink/40 backdrop-blur-[2px]" onMouseDown={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        className="ss-rise flex h-full w-full max-w-xl flex-col border-l border-hair bg-canvas shadow-overlay"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-hair px-5 py-3.5">
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-[-0.008em] text-ink">{title}</div>
            {subtitle ? <div className="mt-0.5 text-[12.5px] text-faint">{subtitle}</div> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-faint transition hover:bg-hover hover:text-ink"
            aria-label="Close"
          >
            <Icon name="x" className="h-4 w-4" strokeWidth={2} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-hair bg-surface/60 px-5 py-3">
            {footer}
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}

export interface ToastMessage {
  id: number;
  text: string;
  tone: "success" | "danger" | "info";
}

export function Toaster({ toasts, onDismiss }: { toasts: ToastMessage[]; onDismiss: (id: number) => void }) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="ss-rise pointer-events-auto flex items-start gap-2.5 rounded-xl border border-hair bg-canvas px-3.5 py-2.5 shadow-overlay"
        >
          <ToneDot tone={t.tone === "success" ? "success" : t.tone === "danger" ? "danger" : "info"} />
          <span className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink">{t.text}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="-mr-1 rounded p-0.5 text-faint transition hover:text-ink"
            aria-label="Dismiss"
          >
            <Icon name="x" className="h-3.5 w-3.5" strokeWidth={2} />
          </button>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Data display                                                        */
/* ------------------------------------------------------------------ */

export function KeyValue({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <dl className="divide-y divide-hair">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-1 gap-0.5 py-2 sm:grid-cols-[minmax(8rem,12rem)_1fr] sm:gap-4">
          <dt className="text-[12px] text-faint">{item.label}</dt>
          <dd className="min-w-0 break-words text-[13px] text-ink">
            {item.value ?? <span className="text-faint">&ndash;</span>}
            {item.hint ? <span className="mt-0.5 block text-[11.5px] text-faint">{item.hint}</span> : null}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export interface TableColumn {
  key: string;
  label: string;
  render?: (row: Record<string, unknown>) => ReactNode;
  align?: "left" | "right";
  /** Numeric columns sort by value rather than text. */
  numeric?: boolean;
  sortable?: boolean;
  /** A relative width hint, so a wide text column can take the slack. */
  width?: string;
}

export function Table({
  columns,
  rows,
  onRowClick,
  empty = "No records",
  emptyAction,
  dense,
  sort,
  onSortChange,
  stickyHeader,
}: {
  columns: TableColumn[];
  rows: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
  empty?: string;
  emptyAction?: ReactNode;
  dense?: boolean;
  sort?: { key: string; direction: "asc" | "desc" } | null;
  onSortChange?: (key: string) => void;
  /** Bounds the table height and pins the header; the table then scrolls on its own. */
  stickyHeader?: boolean;
}) {
  if (rows.length === 0) {
    return (
      <div className="px-4 py-14 text-center">
        <p className="text-[13.5px] font-medium text-ink-soft">{empty}</p>
        {emptyAction ? <div className="mt-3.5 flex justify-center">{emptyAction}</div> : null}
      </div>
    );
  }
  return (
    <div className={stickyHeader ? "max-h-[68vh] overflow-auto" : "overflow-x-auto"}>
      <table className="ss-table w-full border-collapse text-[13px]">
        <thead className={stickyHeader ? "sticky top-0 z-10 shadow-[0_1px_0_0_var(--color-hair)]" : undefined}>
          <tr className="border-b border-hair text-left">
            {columns.map((c) => {
              const sortable = Boolean(onSortChange) && c.sortable !== false;
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  aria-sort={active ? (sort?.direction === "asc" ? "ascending" : "descending") : undefined}
                  style={c.width ? { width: c.width } : undefined}
                  className={`whitespace-nowrap px-3 py-2 font-semibold ${c.align === "right" ? "text-right" : ""}`}
                >
                  {sortable ? (
                    <button
                      type="button"
                      onClick={() => onSortChange?.(c.key)}
                      className={`group inline-flex items-center gap-1 transition hover:text-ink-soft ${
                        c.align === "right" ? "flex-row-reverse" : ""
                      } ${active ? "text-ink-soft" : ""}`}
                      title={`Sort by ${c.label}`}
                    >
                      {c.label}
                      <span aria-hidden className={active ? "text-brand" : "text-hair-strong group-hover:text-faint"}>
                        {active ? (sort?.direction === "asc" ? "\u2191" : "\u2193") : "\u2195"}
                      </span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              // Some views (join tables, grouped lists) can repeat an id across rows, so the index
              // is folded in to keep the key unique and silence React's duplicate-key warning.
              key={`${String(row.id ?? "row")}-${i}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-hair last:border-0 ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 ${dense ? "py-1.5" : "py-2.5"} align-middle text-ink-soft ${
                    c.align === "right" ? "text-right" : ""
                  }`}
                >
                  {c.render ? c.render(row) : defaultCell(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function defaultCell(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return <span className="text-faint">&ndash;</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return <span className="font-mono text-[11.5px]">{JSON.stringify(value)}</span>;
  const text = String(value);
  if (text.length > 120) return <span title={text}>{text.slice(0, 120)}&hellip;</span>;
  return text;
}

export function useToasts() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const push = (text: string, tone: ToastMessage["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 6000);
  };
  const dismiss = (id: number) => setToasts((prev) => prev.filter((t) => t.id !== id));
  return { toasts, push, dismiss };
}

export function useHash(initial: string): [string, (v: string) => void] {
  const [value, setValue] = useState(initial);
  return [value, setValue];
}

export function JsonBlock({ value }: { value: unknown }) {
  const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  let pretty = text;
  try {
    pretty = JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    pretty = text;
  }
  return (
    <pre className="max-h-64 overflow-auto rounded-lg border border-hair bg-surface p-3 font-mono text-[11.5px] leading-relaxed text-ink-soft">
      {pretty}
    </pre>
  );
}

export function InfoNote({ children, tone = "info" }: { children: ReactNode; tone?: Tone }) {
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[12.5px] leading-relaxed ${TONE_NOTE[tone]}`}>
      <span className="mt-[5px]">
        <ToneDot tone={tone} />
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  );
}

export function BrandHero({
  eyebrow,
  title,
  tagline,
  children,
}: {
  eyebrow?: string;
  title: string;
  tagline?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-xl border border-hair bg-canvas px-5 py-5">
      <div className="ss-rule absolute inset-x-0 top-0 h-[3px]" aria-hidden />
      {eyebrow ? <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-faint">{eyebrow}</p> : null}
      <h1 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
      {tagline ? <p className="mt-1.5 max-w-2xl text-[13px] text-ink-soft">{tagline}</p> : null}
      {children ? <div className="mt-4">{children}</div> : null}
    </section>
  );
}

export function Accordion({
  title,
  children,
  defaultOpen,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(Boolean(defaultOpen));
  const id = useId();
  return (
    <div className="overflow-hidden rounded-xl border border-hair">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-[13px] font-medium text-ink transition hover:bg-surface"
      >
        <span className="min-w-0">{title}</span>
        <Icon name={open ? "chevron-up" : "chevron-down"} className="h-4 w-4 shrink-0 text-faint" strokeWidth={2} />
      </button>
      {open ? (
        <div id={id} className="border-t border-hair px-3.5 py-3">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** A small confirmation used before a destructive action. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
  busy,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? "Working\u2026" : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-ink-soft">{message}</p>
    </Modal>
  );
}
