/** Server-authoritative booking rules, kept pure so they can be unit-tested and
 *  shared with the client where it needs the same answer (what's due now).
 *
 *  Everything here takes `now` explicitly and works in India Standard Time —
 *  the business, its vendors and its customers all live on IST, and a server
 *  running in UTC must never decide "today" or "the event has passed" five and
 *  a half hours off.
 */

import { ADVANCE_RATE } from "@/lib/bookingPricing";

/* ── IST calendar ─────────────────────────────────────────────────────── */

/** IST is a fixed UTC+05:30 (no DST). */
const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 86_400_000;

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/** Today's date in IST as `YYYY-MM-DD`. */
export function istTodayISO(now: Date = new Date()): string {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** A `YYYY-MM-DD` or "12 Dec 2026"-style label → `YYYY-MM-DD`, or null when
 *  it is neither (e.g. "—"). */
export function parseEventDate(value: string | undefined): string | null {
  const s = (value ?? "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (iso) {
    const [, y, m, d] = iso.map(Number);
    return validYmd(y, m, d) ? s : null;
  }
  const label = /^(\d{1,2})\s+([A-Za-z]{3})[A-Za-z]*\s+(\d{4})$/.exec(s);
  if (!label) return null;
  const d = Number(label[1]);
  const m = MONTHS.indexOf(label[2].toLowerCase()) + 1;
  const y = Number(label[3]);
  if (!validYmd(y, m, d)) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function validYmd(y: number, m: number, d: number): boolean {
  if (!y || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** Whole IST calendar days from today until a `YYYY-MM-DD` date (negative when
 *  it has passed). Null for an unparseable date. */
export function daysUntilIST(dateISO: string, now: Date = new Date()): number | null {
  const iso = parseEventDate(dateISO);
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const [ty, tm, td] = istTodayISO(now).split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / DAY_MS);
}

/** Default serving clock time per meal period, when no exact time was given. */
const MEAL_DEFAULT_TIME: Record<string, string> = {
  breakfast: "08:00",
  lunch: "12:00",
  "hi-tea": "16:00",
  dinner: "19:00",
};

/** Hours from `now` until the event starts in IST. The start is the exact
 *  serving time when given, else the meal period's usual hour, else the start
 *  of the day (the strictest reading). Null for an unparseable date. */
export function hoursUntilEventIST(
  dateISO: string,
  opts: { eventTime?: string; mealTime?: string } = {},
  now: Date = new Date(),
): number | null {
  const iso = parseEventDate(dateISO);
  if (!iso) return null;
  const clock =
    (opts.eventTime && /^\d{1,2}:\d{2}$/.test(opts.eventTime.trim())
      ? opts.eventTime.trim()
      : MEAL_DEFAULT_TIME[(opts.mealTime ?? "").trim().toLowerCase()]) ?? "00:00";
  const [hh, mm] = clock.split(":").map(Number);
  const [y, m, d] = iso.split("-").map(Number);
  const startUtc = Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MS;
  return (startUtc - now.getTime()) / 3_600_000;
}

/** True when the event's date is strictly before today in IST. Takes the ISO
 *  date when stored, else the display label; anything unparseable is never
 *  "past" (so it's never auto-completed by mistake). */
export function isPastEventIST(
  order: { eventDateISO?: string; date?: string },
  now: Date = new Date(),
): boolean {
  const iso = parseEventDate(order.eventDateISO) ?? parseEventDate(order.date);
  if (!iso) return false;
  return iso < istTodayISO(now);
}

/* ── Money → status ───────────────────────────────────────────────────── */

/** The advance (10%) that confirms a booking of `amount` rupees. */
export function advanceDue(amount: number): number {
  const total = Math.round(amount);
  if (!(total > 0)) return 0;
  return Math.max(1, Math.round(total * ADVANCE_RATE));
}

/** A booking is Confirmed only once the ledger holds at least its advance;
 *  anything less (nothing, a Connect/pay-later order, an unverified manual
 *  transfer) keeps it Pending. Never decided by the client. */
export function bookingStatusFor(
  amount: number,
  paid: number,
): "Confirmed" | "Pending" {
  const due = advanceDue(amount);
  return due > 0 && paid >= due ? "Confirmed" : "Pending";
}

/** What the customer should pay next: the rest of the advance while it is
 *  short, then the remaining balance. 0 once fully paid. */
export function amountDueNow(amount: number, paid: number): number {
  const total = Math.round(amount);
  const p = Math.max(0, Math.round(paid));
  const adv = advanceDue(total);
  if (p < adv) return adv - p;
  return Math.max(0, total - p);
}

/* ── Coupons ──────────────────────────────────────────────────────────── */

export interface CouponTerms {
  code: string;
  percent: number;
  cap: number;
  status?: string;
  eligibility?: string;
  startsAt?: string;
  expiresAt?: string;
}

const ELIGIBILITY_FILLER = new Set(["all", "only", "occasion", "occasions", "and", "or", "booking", "bookings"]);

/** Whether an admin coupon may be used on this order. Validity dates are free
 *  text in the Coupon Manager ("01 Jul 2026" / "2026-07-01"); a bound that
 *  doesn't parse is ignored rather than voiding the coupon. Eligibility:
 *  "All occasions" → any; anything mentioning "first" → the customer's first
 *  booking; otherwise its words ("Weddings only") must name the occasion. */
export function couponUsable(
  c: CouponTerms,
  ctx: { todayISO: string; occasion: string; isFirstBooking: boolean },
): { ok: true } | { ok: false; reason: string } {
  if (c.status && c.status !== "Active") {
    return { ok: false, reason: "This coupon is no longer active." };
  }
  if (!(c.percent > 0) || !(c.cap >= 0)) {
    return { ok: false, reason: "This coupon is no longer active." };
  }
  const starts = parseEventDate(c.startsAt);
  if (starts && ctx.todayISO < starts) {
    return { ok: false, reason: "This coupon isn't valid yet." };
  }
  const expires = parseEventDate(c.expiresAt);
  if (expires && ctx.todayISO > expires) {
    return { ok: false, reason: "This coupon has expired." };
  }
  const elig = (c.eligibility ?? "").trim().toLowerCase();
  if (!elig || /^all\b/.test(elig)) return { ok: true };
  if (/\bfirst\b/.test(elig)) {
    return ctx.isFirstBooking
      ? { ok: true }
      : { ok: false, reason: "This coupon is for your first booking only." };
  }
  const occasion = ctx.occasion.toLowerCase();
  const words = elig
    .split(/[^a-z]+/)
    .filter((w) => w.length > 2 && !ELIGIBILITY_FILLER.has(w))
    .map((w) => w.replace(/s$/, ""));
  if (!words.length || words.some((w) => occasion.includes(w))) return { ok: true };
  return {
    ok: false,
    reason: `This coupon is valid for ${c.eligibility} only.`,
  };
}

/* ── Vendor terms & calendar ──────────────────────────────────────────── */

/** The slice of a vendor record the booking rules read. */
export interface VendorTerms {
  minPax?: number;
  leadHours?: number;
  maxEventsPerDay?: number;
  stallConfig?: {
    categoryPricing?: Record<string, { minPaxGuarantee?: number }>;
  };
}

/** The vendor's own minimum head-count for an order taking `categoryIds`:
 *  their general minimum, raised by any per-stall guarantee on a course they
 *  sell. 0 when the vendor set none (the platform minimum still applies). */
export function vendorMinGuests(
  v: VendorTerms | null | undefined,
  categoryIds: readonly string[],
): number {
  if (!v) return 0;
  let min = Number.isFinite(v.minPax) ? Number(v.minPax) : 0;
  const pricing = v.stallConfig?.categoryPricing ?? {};
  for (const id of categoryIds) {
    const g = Number(pricing[id]?.minPaxGuarantee);
    if (Number.isFinite(g)) min = Math.max(min, g);
  }
  return Math.max(0, Math.round(min));
}

/** An order as the calendar check sees it. */
export interface CalendarOrder {
  id: string;
  status: string;
  eventDateISO?: string;
  mealTime?: string;
  paid?: number;
  vendors?: { id?: string }[];
  vendorAcknowledged?: boolean;
  vendorDeclined?: boolean;
  awaitingPayment?: boolean;
  createdAt?: string;
}

/** How long an unpaid, unaccepted Pending order holds the vendor's slot: a
 *  checkout in progress briefly, a submitted pay-later (Connect) order long
 *  enough for the team to call. After that the slot is free again, so an
 *  abandoned order can't lock a vendor's calendar for good. */
export const CHECKOUT_HOLD_MS = 30 * 60 * 1000;
export const SUBMITTED_HOLD_MS = 48 * 60 * 60 * 1000;

/** Does this existing order occupy its vendor's slot right now? */
export function holdsSlot(o: CalendarOrder, now: Date = new Date()): boolean {
  if (o.status === "Cancelled" || o.vendorDeclined) return false;
  if (o.status === "Confirmed" || o.status === "Completed") return true;
  if ((o.paid ?? 0) > 0 || o.vendorAcknowledged) return true;
  const created = Date.parse(o.createdAt ?? "");
  if (!Number.isFinite(created)) return true;
  const hold = o.awaitingPayment ? CHECKOUT_HOLD_MS : SUBMITTED_HOLD_MS;
  return now.getTime() - created < hold;
}

/**
 * Capacity rule for a stall vendor: ONE event per meal slot (breakfast /
 * lunch / dinner) on a date — a single kitchen can't serve two parties at
 * once — and, when the vendor declared `maxEventsPerDay`, no more than that
 * many across the day. An order without a meal time is treated as taking
 * every slot that day. Returns the reason, or null when the slot is free.
 */
export function slotConflict(
  orders: readonly CalendarOrder[],
  req: {
    id: string;
    vendorId: string;
    eventDateISO: string;
    mealTime?: string;
    maxEventsPerDay?: number;
  },
  now: Date = new Date(),
): "slot" | "day" | null {
  const meal = (req.mealTime ?? "").trim().toLowerCase();
  const sameDay = orders.filter(
    (o) =>
      o.id !== req.id &&
      o.eventDateISO === req.eventDateISO &&
      (o.vendors ?? []).some((v) => v?.id === req.vendorId) &&
      holdsSlot(o, now),
  );
  const clash = sameDay.some((o) => {
    const other = (o.mealTime ?? "").trim().toLowerCase();
    return !meal || !other || other === meal;
  });
  if (clash) return "slot";
  const cap = Number(req.maxEventsPerDay);
  if (Number.isFinite(cap) && cap > 0 && sameDay.length >= cap) return "day";
  return null;
}
