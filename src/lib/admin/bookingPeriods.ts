/**
 * Booking-period model + pure date helpers for the admin dashboard's
 * month / calendar filter. No data imports — callers pass booking dates in, so
 * every function here stays trivially testable.
 *
 * A booking carries two dates: the event `date` (when the feast happens, stored
 * as a "12 Dec 2026" display string) and `createdAt` (when the order was
 * placed). The dashboard slices by EVENT date so the Total Bookings figure and
 * the Recent Bookings table below it always agree on what "this month" holds.
 */

/** A selected window. `month` is 0-11; range `from`/`to` are inclusive
 *  `YYYY-MM-DD` day keys. */
export type Period =
  | { kind: "all" }
  | { kind: "month"; year: number; month: number }
  | { kind: "range"; from: string; to: string };

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** The trend delta's shape — direction + rounded absolute percent + caption. */
export interface Trend {
  pct: number;
  direction: "up" | "down" | "flat";
  caption: string;
}

/**
 * Parse a "12 Dec 2026" event-date string into a local Date anchored at midday
 * (so DST shifts never bump it across a day boundary). Returns null for
 * anything we can't read — such rows simply fall outside every dated period.
 */
export function parseEventDate(display: string): Date | null {
  const m = /^\s*(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})\s*$/.exec(display);
  if (!m) return null;
  const day = Number(m[1]);
  const monthIdx = MONTHS_SHORT.findIndex(
    (mm) => mm.toLowerCase() === m[2].slice(0, 3).toLowerCase(),
  );
  const year = Number(m[3]);
  if (monthIdx < 0 || day < 1 || day > 31) return null;
  return new Date(year, monthIdx, day, 12, 0, 0, 0);
}

/** Midday-anchored Date from a `YYYY-MM-DD` key (inverse of {@link toISODate}). */
function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

/** `YYYY-MM-DD` for a Date, in local time (matches how ranges are keyed). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Does an event date fall inside the period? */
export function inPeriod(date: Date, period: Period): boolean {
  if (period.kind === "all") return true;
  if (period.kind === "month")
    return date.getFullYear() === period.year && date.getMonth() === period.month;
  const iso = toISODate(date);
  return iso >= period.from && iso <= period.to;
}

/**
 * The comparison window for the trend delta: the previous calendar month, or
 * the equal-length window immediately before a custom range. Null for "all"
 * (there's no meaningful "previous" for it).
 */
export function previousPeriod(period: Period): Period | null {
  if (period.kind === "all") return null;
  if (period.kind === "month") {
    const month = period.month === 0 ? 11 : period.month - 1;
    const year = period.month === 0 ? period.year - 1 : period.year;
    return { kind: "month", year, month };
  }
  const from = fromISODate(period.from);
  const to = fromISODate(period.to);
  const days = Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1;
  const prevTo = new Date(from.getTime() - 86_400_000);
  const prevFrom = new Date(prevTo.getTime() - (days - 1) * 86_400_000);
  return { kind: "range", from: toISODate(prevFrom), to: toISODate(prevTo) };
}

/** Human label for the period, e.g. "July 2026", "All time", "1 Jul – 15 Jul 2026". */
export function periodLabel(period: Period): string {
  if (period.kind === "all") return "All time";
  if (period.kind === "month") return `${MONTHS_LONG[period.month]} ${period.year}`;
  return `${shortDay(period.from)} – ${shortDay(period.to)}`;
}

function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
}

/** What the trend delta is measured against, for the card's caption. */
export function trendCaption(period: Period): string {
  return period.kind === "month" ? "vs last month" : "vs previous period";
}

/**
 * Percent change of `current` over `previous`. Null when there's no prior
 * window or it was empty — a percentage off zero isn't meaningful, so the card
 * simply omits the delta rather than printing a fake "+100%".
 */
export function computeTrend(
  current: number,
  previous: number,
  caption: string,
): Trend | null {
  if (previous <= 0) return null;
  const raw = ((current - previous) / previous) * 100;
  const pct = Math.round(Math.abs(raw));
  const direction =
    current > previous ? "up" : current < previous ? "down" : "flat";
  return { pct, direction, caption };
}

/** Distinct months present in the given event dates, newest first. */
function monthsWithBookings(
  dates: Date[],
): { year: number; month: number }[] {
  const seen = new Set<string>();
  const out: { year: number; month: number }[] = [];
  for (const d of dates) {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ year: d.getFullYear(), month: d.getMonth() });
  }
  out.sort((a, b) => b.year - a.year || b.month - a.month);
  return out;
}

/**
 * Sensible default on load: the current month when it has bookings, else the
 * most recent month that does, else the current month (empty but predictable).
 * Keeps the dashboard populated with a real month-over-month delta out of the box.
 */
export function defaultPeriod(dates: Date[], today: Date): Period {
  const year = today.getFullYear();
  const month = today.getMonth();
  const hasThisMonth = dates.some(
    (d) => d.getFullYear() === year && d.getMonth() === month,
  );
  if (hasThisMonth || dates.length === 0) return { kind: "month", year, month };
  const [latest] = monthsWithBookings(dates);
  return { kind: "month", year: latest.year, month: latest.month };
}
