/* ─── Single Stall vendor availability ────────────────────────────────────
 * One calendar, read three ways: the customer's date picker (paints the
 * vendor's taken dates before they build an order), the vendor portal's
 * Calendar tab (where the vendor switches a day off), and the booking POST
 * (the backstop). They all derive from the same two inputs:
 *
 *   • `blockedDates` — days the vendor marked themselves unavailable, and
 *   • live orders — a slot is held exactly when `holdsSlot` says so, the same
 *     rule `slotConflict` applies at checkout.
 *
 * Deliberately dates + meal periods only: the public endpoint serving this is
 * unauthenticated, so nothing about who booked or for how much leaves here.
 */
import { holdsSlot, istTodayISO, type CalendarOrder } from "@/lib/bookingRules";

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A day off can be marked at most this far ahead (a year and a bit). */
const MAX_BLOCKED = 400;

/** One day that already carries orders for the vendor. */
export interface BookedDay {
  date: string;
  /** Meal periods taken that day ("Dinner", …), as the orders stored them. */
  meals: string[];
  /** No slot left: an order without a meal period takes the whole day, as
   *  does reaching the vendor's own events-per-day cap. */
  full: boolean;
}

export interface VendorAvailability {
  /** Days the vendor switched off themselves (YYYY-MM-DD, sorted). */
  blocked: string[];
  /** Days with orders on them, sorted. */
  booked: BookedDay[];
}

/** Why a date / meal can't be booked, or null when it can. */
export type Unavailable = "blocked" | "slot" | "day";

/** Today's calendar date in India — every event date here is an IST day. */
export const todayIsoIST = istTodayISO;

/** A real calendar day ("2026-02-30" is not). */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_DATE.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Valid, unique, sorted days from today on — past days fall away on their
 *  own, so the list never grows without bound. */
export function cleanBlockedDates(v: unknown, today: string): string[] {
  if (!Array.isArray(v)) return [];
  const days = new Set(v.filter((d) => isIsoDate(d) && d >= today));
  return [...days].sort().slice(0, MAX_BLOCKED);
}

/** The days, from today on, on which `vendorId`'s live orders hold slots. */
export function bookedDays(
  orders: readonly CalendarOrder[],
  vendorId: string,
  opts: { maxEventsPerDay?: number; now?: Date } = {},
): BookedDay[] {
  const now = opts.now ?? new Date();
  const today = todayIsoIST(now);
  const byDate = new Map<string, { meals: Set<string>; count: number; all: boolean }>();
  for (const o of orders) {
    const date = o.eventDateISO ?? "";
    if (!ISO_DATE.test(date) || date < today) continue;
    if (!(o.vendors ?? []).some((v) => v?.id === vendorId)) continue;
    if (!holdsSlot(o, now)) continue;
    const day = byDate.get(date) ?? { meals: new Set<string>(), count: 0, all: false };
    const meal = (o.mealTime ?? "").trim();
    if (meal) day.meals.add(meal);
    else day.all = true;
    day.count += 1;
    byDate.set(date, day);
  }
  const cap = Number(opts.maxEventsPerDay);
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      meals: [...d.meals],
      full: d.all || (Number.isFinite(cap) && cap > 0 && d.count >= cap),
    }));
}

/**
 * Can this vendor take an order on `date` (for `mealTime`, when given)?
 * Mirrors `slotConflict`: an order without a meal period clashes with any
 * order that day, and one with a period only with the same period.
 */
export function availabilityFor(
  av: VendorAvailability | null | undefined,
  date: string,
  mealTime?: string,
): Unavailable | null {
  if (!av || !date) return null;
  if (av.blocked.includes(date)) return "blocked";
  const day = av.booked.find((d) => d.date === date);
  if (!day) return null;
  if (day.full) return "day";
  const meal = (mealTime ?? "").trim().toLowerCase();
  if (!meal) return day.meals.length ? "slot" : null;
  return day.meals.some((m) => m.toLowerCase() === meal) ? "slot" : null;
}

/** Days with nothing left to book — painted red, not pickable. */
export function unavailableDates(av: VendorAvailability | null | undefined): string[] {
  if (!av) return [];
  return [
    ...new Set([...av.blocked, ...av.booked.filter((d) => d.full).map((d) => d.date)]),
  ].sort();
}

/** Days that are open, but only for some meal periods. */
export function partlyBookedDates(av: VendorAvailability | null | undefined): string[] {
  if (!av) return [];
  const off = new Set(unavailableDates(av));
  return av.booked.filter((d) => !off.has(d.date)).map((d) => d.date);
}

/** Meal periods already taken on `date` (empty when the day is open). */
export function takenMeals(
  av: VendorAvailability | null | undefined,
  date: string,
): string[] {
  return av?.booked.find((d) => d.date === date)?.meals ?? [];
}
