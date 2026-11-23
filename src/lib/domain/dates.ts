/**
 * Date helpers. All domain dates are ISO `YYYY-MM-DD` strings so they sort and
 * compare lexicographically and survive the JSON round trip through SQLite.
 */

export type ISODate = string;

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function parseISO(iso: ISODate): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export function addDays(iso: ISODate, days: number): ISODate {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toISO(d);
}

export function addMonths(iso: ISODate, months: number): ISODate {
  const d = parseISO(iso);
  d.setUTCMonth(d.getUTCMonth() + months);
  return toISO(d);
}

export function daysBetween(from: ISODate, to: ISODate): number {
  const a = parseISO(from).getTime();
  const b = parseISO(to).getTime();
  return Math.round((b - a) / 86_400_000);
}

/** Positive when `iso` is before today (overdue by that many days). */
export function daysOverdue(iso: ISODate, today: ISODate): number {
  return daysBetween(iso, today);
}

export function isWeekend(d: Date): boolean {
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}

export function today(): ISODate {
  return toISO(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const [datePart] = iso.split("T");
  const d = parseISO(datePart);
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return formatDate(iso);
  return `${formatDate(iso)}, ${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes(),
  ).padStart(2, "0")} UTC`;
}

export function relativeFromNow(iso: string | null | undefined, todayIso: ISODate = today()): string {
  if (!iso) return "\u2014";
  const diff = daysBetween(todayIso, iso.split("T")[0]);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  if (diff > 0) return `in ${diff} days`;
  return `${Math.abs(diff)} days ago`;
}

export function financialYearFor(iso: ISODate): string {
  const d = parseISO(iso);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + 1;
  const startYear = month >= 4 ? year : year - 1;
  return `FY${String(startYear).slice(2)}-${String(startYear + 1).slice(2)}`;
}

export function ageInDays(fromISO: string, todayIso: ISODate = today()): number {
  return daysBetween(fromISO.split("T")[0], todayIso);
}

export function clamp(iso: ISODate, min: ISODate, max: ISODate): ISODate {
  if (iso < min) return min;
  if (iso > max) return max;
  return iso;
}

export function startOfMonth(iso: ISODate): ISODate {
  const d = parseISO(iso);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)));
}

export function endOfMonth(iso: ISODate): ISODate {
  const d = parseISO(iso);
  return toISO(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)));
}
