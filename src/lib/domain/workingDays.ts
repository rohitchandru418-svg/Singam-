import { type ISODate, addDays, isWeekend, parseISO } from "./dates";

/**
 * Working-day calendar.
 *
 * SOP deadlines are expressed in working days (Legal AMA on the fourth working day,
 * signing on the seventh), so the deadline engine must skip weekends and the
 * holidays configured for the calendar in use.
 */

export interface CalendarLike {
  /** ISO dates treated as non-working. */
  holidays: string[];
  /** ISO weekday numbers that are working days (1 = Monday ... 7 = Sunday). */
  workingDays: number[];
}

export const DEFAULT_CALENDAR: CalendarLike = {
  holidays: [
    // Representative national holidays for the season.
    "2026-01-26", "2026-03-04", "2026-03-21", "2026-04-03", "2026-04-14",
    "2026-05-01", "2026-08-15", "2026-10-02", "2026-10-20", "2026-11-08",
    "2026-12-25",
  ],
  workingDays: [1, 2, 3, 4, 5],
};

export function isWorkingDay(iso: ISODate, cal: CalendarLike = DEFAULT_CALENDAR): boolean {
  const d = parseISO(iso);
  const isoWeekday = d.getUTCDay() === 0 ? 7 : d.getUTCDay();
  if (!cal.workingDays.includes(isoWeekday)) return false;
  return !cal.holidays.includes(iso);
}

/** Advance `count` working days from `from`. A count of 0 returns the next working day. */
export function addWorkingDays(
  from: ISODate,
  count: number,
  cal: CalendarLike = DEFAULT_CALENDAR,
): ISODate {
  let cursor = from;
  let remaining = Math.max(0, count);
  if (remaining === 0) {
    while (!isWorkingDay(cursor, cal)) cursor = addDays(cursor, 1);
    return cursor;
  }
  while (remaining > 0) {
    cursor = addDays(cursor, 1);
    if (isWorkingDay(cursor, cal)) remaining -= 1;
  }
  return cursor;
}

/** Count working days between two dates (exclusive of `from`, inclusive of `to`). */
export function workingDaysBetween(
  from: ISODate,
  to: ISODate,
  cal: CalendarLike = DEFAULT_CALENDAR,
): number {
  if (to <= from) return 0;
  let cursor = from;
  let count = 0;
  while (cursor < to) {
    cursor = addDays(cursor, 1);
    if (isWorkingDay(cursor, cal)) count += 1;
  }
  return count;
}

export function describeDeadline(due: ISODate, todayIso: ISODate): string {
  if (due < todayIso) {
    const overdue = workingDaysBetween(due, todayIso, DEFAULT_CALENDAR);
    return `${overdue} working day${overdue === 1 ? "" : "s"} overdue`;
  }
  if (due === todayIso) return "due today";
  const left = workingDaysBetween(todayIso, due, DEFAULT_CALENDAR);
  return `${left} working day${left === 1 ? "" : "s"} remaining`;
}

export { isWeekend };
