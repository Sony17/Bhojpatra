import {
  isOrderPaymentMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import {
  packageLeadDays,
  customOrderLeadDays,
  occasions as seedOccasions,
  DEFAULT_OCCASION_LEAD_DAYS,
  type BookingStatus,
} from "@/lib/data";
import { buildEmiPlan, emiOptionsForEvent, type EmiPlan } from "@/lib/emi";
import type { InvoiceData } from "@/lib/invoice";
import type { BookedVendor, BookingVendorReview } from "@/lib/bookings";
import { createStore, readSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { isSelfReferral, isPhoneSelfReferral } from "@/lib/referral";
import type { PartnerRecord } from "@/app/api/partners/route";
import { parseListQuery } from "@/lib/validate";
import { MAX_GUESTS, MIN_GUESTS } from "@/lib/bookingPricing";
import { customerPercentFor } from "@/lib/referralRates";
import {
  expectedStallTotal,
  parseStallPricingClaim,
  readReferralRates,
  resolveCoupon,
} from "@/lib/stallOrderPricing";
import {
  advanceDue,
  bookingStatusFor,
  daysUntilIST,
  hoursUntilEventIST,
  slotConflict,
  vendorMinGuests,
} from "@/lib/bookingRules";
import { paymentActivity, receivedPayments } from "@/lib/bookingPaymentSync";
import { notifyOrderPlaced } from "@/lib/bookingNotify";
import { findVendorById } from "@/lib/vendorMenus";

// Orders are written at confirm time to Postgres (Neon) so they show up in the
// admin booking console — never prerender or cache this.
export const dynamic = "force-dynamic";

export interface StoredOrder {
  id: string;
  /** The signed-in user who placed the order, captured server-side from the
   *  session (never trusted from the client). Owner linkage: lets that customer
   *  complete/reopen their own booking via PATCH. Absent on legacy orders saved
   *  before ownership was tracked — those stay admin-only. */
  userId?: string;
  customer: string;
  phone: string;
  /** Contact email captured at booking time (alongside name/phone). Absent on
   *  legacy orders saved before it was collected. */
  email?: string;
  occasion: string;
  date: string;
  /** Raw event date as `YYYY-MM-DD`, kept alongside the display `date` so the
   *  admin console can sort by it and the dashboard can tell upcoming events
   *  from past ones. Absent on legacy orders saved before it was persisted. */
  eventDateISO?: string;
  /** Meal period the feast is served at (Breakfast / Lunch / Dinner). Absent on
   *  legacy orders saved before serving time was captured. */
  mealTime?: string;
  /** Exact serving clock time as a 24-hour `HH:MM` string, when the guest set
   *  one alongside the meal period. */
  eventTime?: string;
  /** Food (diet) preference — "Pure Veg" / "Non-veg" / "Both" — when declared. */
  foodPreference?: string;
  guests: number;
  /** Craft-my-plate split — how many of `guests` eat veg vs non-veg, when the
   *  guest declared one. Always stored as a consistent pair summing to
   *  `guests`; both absent on orders without a declared split. */
  vegGuests?: number;
  nonVegGuests?: number;
  vendor: string;
  city: string;
  /** The event venue the guest chose in the wizard, when one was set. */
  venue?: string;
  amount: number;
  paid: number;
  paymentMethod: OrderPaymentMethod;
  /** Transaction / reference ID of the online payment (UPI/QR), when money was
   *  settled at booking time. Absent for COD / "connect". */
  paymentRef?: string;
  /** Instalment schedule for the balance, when the guest chose an EMI plan. */
  emiPlan?: EmiPlan;
  status: BookingStatus;
  createdAt: string;
  /** Referral attribution — set when the feast was booked via a partner. */
  referralCode?: string;
  referrerName?: string;
  referrerType?: string;
  /* ── Customer-facing extras (previously the localStorage-only fields) ──
   * These are what the customer's My Bookings view needs beyond the admin
   * summary: a pre-built receipt, the itemised invoice, editable notes and the
   * per-vendor review data. Stored on the order so the whole record survives a
   * device change and stays a single source of truth. */
  /** Plain-text order summary — what the per-order "Download receipt" exports. */
  receipt?: string;
  /** Itemised invoice for PDF re-download / share. */
  invoice?: InvoiceData;
  /** The feast-wide service package the customer chose (crew, crockery, setup,
   *  decor, coordination). Its price is already included in `amount`; stored
   *  here so the admin booking detail + My Bookings can show the tier. */
  service?: { id: string; name: string; price: number };
  /** Free-text special requests the customer added when editing the booking. */
  note?: string;
  /** The specific vendors catered, captured so each can be rated individually. */
  vendors?: BookedVendor[];
  /** Per-vendor ratings the customer left for this order (prefill / edit). */
  reviews?: BookingVendorReview[];
  /** Rounded-average summary of the customer's review — drives the card stars. */
  review?: { rating: number; comment: string; createdAt: string };
  /** Set when the customer reopened a Completed booking (stops auto-complete). */
  reopened?: boolean;
  /** Set while a Single Stall order exists only because checkout was opened
   *  (created server-priced BEFORE payment, so the payment always has an order
   *  to land on). Hidden from the vendor and announced to nobody until money
   *  — or a manual transfer claim — lands (see bookingPaymentSync). */
  awaitingPayment?: boolean;
  /** Vendor Portal response. Never moves `status` — Pending/Confirmed track
   *  payment, so a vendor's accept/decline is recorded alongside it. */
  vendorAcknowledged?: boolean;
  acknowledgedAt?: string;
  /** Vendor declined the booking; admin follows up (refund / reassignment). */
  vendorDeclined?: boolean;
  declinedAt?: string;
  vendorNotes?: string;
}

const store = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

// Registered referral partners, keyed by code — used only to resolve the
// referrer behind an applied code so we can compare their phone against the
// booking's (cross-account self-referral guard). Same table the /api/partners
// routes own.
const partnerStore = createStore<PartnerRecord>({
  table: "partners",
  idField: "code",
});

// List recorded orders, newest first (used by the admin booking console).
// Backward-compatible: always returns `{ orders }` (the full newest-first list).
// When any filter/pagination param is present it ALSO returns a `Paginated`
// envelope (`data/page/pageSize/total`) over the filtered set.
export async function GET(request: Request) {
  const guard = await requireRole("admin", "partner");
  if (guard instanceof Response) return guard;
  let orders = (await store.list()).slice().reverse();
  // A partner only ever sees the orders booked with their own referral code
  // (the Partner dashboard) — never anyone else's customer data.
  if (guard.role !== "admin") {
    const codes = new Set(
      (guard.partnerRoles ?? []).map((m) => m.referralCode).filter(Boolean),
    );
    orders = orders.filter((o) => o.referralCode && codes.has(o.referralCode));
  }
  const { q, status, city, page, pageSize, hasQuery } = parseListQuery(
    request.url,
  );
  if (!hasQuery) return Response.json({ orders });

  const needle = q.trim().toLowerCase();
  const filtered = orders.filter((o) => {
    const matchesQ =
      !needle ||
      o.id.toLowerCase().includes(needle) ||
      o.customer.toLowerCase().includes(needle) ||
      o.vendor.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || o.status === status;
    const matchesCity = city === "All" || o.city === city;
    return matchesQ && matchesStatus && matchesCity;
  });
  const start = (page - 1) * pageSize;
  return Response.json({
    orders,
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}

/**
 * POST /api/bookings — place (or, before any payment, update) an order.
 *
 * Money and status are the server's alone: `amount` is re-priced from our own
 * data for a Single Stall order, `paid` is whatever this customer's verified
 * payments in the ledger add up to, and `status` follows from those two —
 * Confirmed only once the 10% advance is in, otherwise Pending. A client's
 * `status` / `paid` / `paymentRef` are ignored.
 *
 * `intent: "pay"` is the Single Stall wizard opening checkout: the order is
 * stored Pending with `awaitingPayment` BEFORE any money moves, so the payment
 * (verify / webhook / manual transfer) always lands on an order that exists,
 * and the ledger sync confirms it. Anything else places the order outright
 * (pay-later "Connect", Baina Box, venue, the feast wizard after it paid).
 */
export async function POST(request: Request) {
  // A booking may only be placed by a signed-in guest — reject anonymous posts
  // (the booking UI asks the visitor to log in before reaching this step).
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const user = guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const {
    id,
    customer,
    phone,
    email,
    occasion,
    date,
    mealTime,
    eventTime,
    foodPreference,
    eventDateISO,
    packageId,
    guests,
    vegGuests,
    nonVegGuests,
    vendor,
    city,
    venue,
    amount,
    paymentMethod,
    emiPlan,
    emiCount,
    intent,
    referralCode,
    referrerName,
    referrerType,
    receipt,
    invoice,
    vendors,
    service,
    pricing,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof id !== "string" || !/^BHJ-[A-Za-z0-9-]{1,60}$/.test(id)) {
    return Response.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const amt = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return Response.json({ error: "Invalid amount." }, { status: 400 });
  }

  if (!isOrderPaymentMethod(paymentMethod)) {
    return Response.json({ error: "Invalid payment method." }, { status: 400 });
  }

  // Only the booking's own customer may update it. A different account
  // landing on an existing id must never overwrite (or inherit the payments
  // of) someone else's order. Legacy rows without an owner stay updatable.
  const existing = await store.get(id);
  if (existing?.userId && existing.userId !== user.id) {
    return Response.json(
      {
        error:
          "This booking reference is already in use. Please refresh the page and try again.",
      },
      { status: 409 },
    );
  }
  if (existing && existing.status !== "Pending" && existing.status !== "Confirmed") {
    return Response.json(
      {
        error: `This booking is already ${existing.status.toLowerCase()}. Please start a new booking.`,
        code: "BOOKING_CLOSED",
      },
      { status: 409 },
    );
  }

  const occasionName = typeof occasion === "string" ? occasion : "";
  const iso =
    typeof eventDateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(eventDateISO)
      ? eventDateISO
      : "";
  const vendorIds = Array.isArray(vendors)
    ? (vendors as BookedVendor[])
        .map((v) => (v && typeof v.id === "string" ? v.id : ""))
        .filter(Boolean)
    : [];

  // Baina Box orders ride the "custom" plan too but are priced per box (the
  // panel posts no Single Stall pricing claim) and are always pay-later.
  const isBainaBox =
    packageId === "custom" &&
    occasionName.trim().toLowerCase() === "baina box" &&
    !pricing;
  const isStall = packageId === "custom" && !isBainaBox;

  // Advance-booking rule (server-side backstop for the wizard's date gate),
  // counted in IST calendar days. The required notice is computed entirely
  // from our own data — the client's claimed `leadDays` is never trusted.
  // Fixed tiers (Silver/Gold/Platinum) use their authoritative package lead;
  // Single-Stall / Custom (and any unknown package) re-derive it from the
  // vendors actually on the order. A missing ISO date skips the check for
  // legacy clients — but a Single Stall order must carry one.
  if (isStall && !iso) {
    return Response.json({ error: "Please pick an event date." }, { status: 400 });
  }
  if (iso && !isBainaBox) {
    const fixedLead =
      typeof packageId === "string" ? packageLeadDays[packageId] : undefined;
    const packageOrVendorLead =
      fixedLead !== undefined && packageId !== "custom"
        ? fixedLead
        : customOrderLeadDays(vendorIds);
    // The stricter of the package/vendor lead and the occasion's own notice —
    // mirrors the wizard's `max(packageLead, occasionLead)`.
    const requiredLead = Math.max(
      packageOrVendorLead,
      await occasionLeadFromName(occasionName),
    );
    const days = daysUntilIST(iso);
    if (days !== null && days < requiredLead) {
      return Response.json(
        {
          error: `This booking needs at least ${requiredLead} day${
            requiredLead === 1 ? "" : "s"
          } of advance notice. Please pick a later date.`,
        },
        { status: 400 },
      );
    }
  }

  // Self-referral guard (authoritative): an Individual Referrer / Event Planner
  // can't credit their own booking. If the applied code belongs to this same
  // account, drop the attribution rather than blocking the booking — the code is
  // optional and the booking should still go through, just without self-credit.
  const code = typeof referralCode === "string" ? referralCode.trim() : "";
  const sameAccountSelfReferral =
    !!code && isSelfReferral(code, user.partnerRoles);

  // Cross-account self-referral guard: the check above only sees the codes on
  // the account that's signed in, so it misses a person who signs up a *second*
  // account to refer themselves. Resolve the code to its partner and drop the
  // credit when that partner's registered phone matches this booking's phone.
  // (The referrer is also what fixes the customer-side discount re-priced below.)
  const storedReferrer = code
    ? await partnerStore.get(code.toUpperCase())
    : undefined;
  const referrer =
    storedReferrer && !storedReferrer.deleted ? storedReferrer : undefined;
  const phoneSelfReferral =
    !!referrer &&
    !sameAccountSelfReferral &&
    isPhoneSelfReferral(typeof phone === "string" ? phone : "", referrer);

  const selfReferral = sameAccountSelfReferral || phoneSelfReferral;

  // Craft-my-plate split — stored only as a consistent pair: both counts
  // finite, non-negative, and summing to the stored head-count. Anything else
  // (a tampered payload, a legacy client sending one half) is dropped whole
  // rather than half-stored.
  const guestCount = Number.isFinite(Number(guests))
    ? Math.round(Number(guests))
    : 0;
  const vegN = Math.round(Number(vegGuests));
  const nonVegN = Math.round(Number(nonVegGuests));
  const dietSplit =
    Number.isFinite(vegN) &&
    Number.isFinite(nonVegN) &&
    vegN >= 0 &&
    nonVegN >= 0 &&
    vegN + nonVegN === guestCount
      ? { vegGuests: vegN, nonVegGuests: nonVegN }
      : null;

  // What this customer has already paid against this id, from the ledger —
  // their own verified rows only. And whether any payment has started at all
  // (incl. an unverified manual transfer): once it has, the price is frozen.
  let ledgerPaid = 0;
  let paymentStarted = false;
  try {
    ledgerPaid = (await receivedPayments(id, user.id)).reduce(
      (sum, p) => sum + p.amount,
      0,
    );
    paymentStarted = (await paymentActivity(id, user.id)).length > 0;
  } catch (err) {
    console.error("Failed to read the payments ledger", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  if (isStall) {
    const rejected = await checkStallOrder({
      id,
      pricing,
      guestCount,
      amount: amt,
      occasion: occasionName,
      iso,
      mealTime: typeof mealTime === "string" ? mealTime.trim() : "",
      eventTime: typeof eventTime === "string" ? eventTime.trim() : "",
      userId: user.id,
      referralPercent:
        !selfReferral && referrer
          ? customerPercentFor(await readReferralRates(), referrer.type)
          : 0,
    });
    if (rejected) return rejected;
  }

  // A payment was taken against this order — its price and contents are
  // frozen. A repeat of the same order (retry, double-tap) is fine; a changed
  // one must start over as a new booking rather than ride on that payment.
  if (existing && paymentStarted && Math.round(amt) !== existing.amount) {
    return Response.json(
      {
        error:
          "A payment has already been made for this booking, so it can't be changed here. See it in My Bookings, or start a new booking.",
        code: "BOOKING_LOCKED",
      },
      { status: 409 },
    );
  }

  const total = Math.round(amt);
  const paid = Math.min(total, Math.max(existing?.paid ?? 0, ledgerPaid));
  // A Confirmed order (ledger- or admin-confirmed) never drops back on a
  // repeat confirm.
  const status =
    existing?.status === "Confirmed" ? "Confirmed" : bookingStatusFor(total, paid);
  // Still just an open checkout: nothing paid or reported yet, and this order
  // was never placed outright before.
  const awaitingPayment =
    intent === "pay" &&
    paid === 0 &&
    !paymentStarted &&
    (!existing || existing.awaitingPayment === true);

  // EMI plan for the balance after the advance — rebuilt here from the chosen
  // instalment count (never the client's schedule), and only where the event
  // is far enough out for that many instalments.
  const emiN = Math.round(
    Number(
      emiCount ??
        (emiPlan && typeof emiPlan === "object"
          ? (emiPlan as { count?: unknown }).count
          : undefined),
    ),
  );
  const plan: EmiPlan | undefined =
    iso && emiN > 1 && emiOptionsForEvent(iso).includes(emiN)
      ? buildEmiPlan(total - advanceDue(total), emiN, iso)
      : undefined;

  const nowIso = new Date().toISOString();
  const order: StoredOrder = {
    id,
    // Owner is taken from the session, not the request body, so it can't be
    // forged — this is what authorises the customer's own complete/reopen later.
    userId: user.id,
    customer:
      typeof customer === "string" && customer.trim()
        ? customer.trim()
        : "Online Booking",
    phone: typeof phone === "string" ? phone.trim() : "",
    ...(typeof email === "string" && email.trim()
      ? { email: email.trim() }
      : {}),
    occasion: occasionName || "Feast",
    date: typeof date === "string" ? date : "",
    ...(iso ? { eventDateISO: iso } : {}),
    ...(typeof mealTime === "string" && mealTime.trim()
      ? { mealTime: mealTime.trim() }
      : {}),
    ...(typeof eventTime === "string" && /^\d{1,2}:\d{2}$/.test(eventTime.trim())
      ? { eventTime: eventTime.trim() }
      : {}),
    ...(typeof foodPreference === "string" && foodPreference.trim()
      ? { foodPreference: foodPreference.trim() }
      : {}),
    guests: guestCount,
    // Craft-my-plate split — kept only as a consistent pair (see above).
    ...(dietSplit ?? {}),
    vendor: typeof vendor === "string" ? vendor : "Bhojpatra",
    city: typeof city === "string" ? city : "—",
    ...(typeof venue === "string" && venue.trim()
      ? { venue: venue.trim() }
      : {}),
    amount: total,
    paid,
    paymentMethod,
    ...(existing?.paymentRef ? { paymentRef: existing.paymentRef } : {}),
    ...(plan ? { emiPlan: plan } : {}),
    status,
    // A checkout that's re-opened keeps a fresh hold on the vendor's slot; a
    // placed order keeps when it was first placed.
    createdAt:
      existing && !existing.awaitingPayment ? existing.createdAt : nowIso,
    ...(awaitingPayment ? { awaitingPayment: true } : {}),
    ...(!selfReferral && code
      ? {
          referralCode: code,
          referrerName:
            typeof referrerName === "string" && referrerName.trim()
              ? referrerName.trim()
              : undefined,
          referrerType:
            typeof referrerType === "string" ? referrerType : undefined,
        }
      : {}),
    // Customer-facing extras carried from the booking flow (replace the old
    // localStorage copy). Stored verbatim; the client built them — the money
    // fields above are what the server stands behind.
    ...(typeof receipt === "string" && receipt ? { receipt } : {}),
    ...(invoice && typeof invoice === "object"
      ? { invoice: { ...(invoice as InvoiceData), paid } }
      : {}),
    ...(Array.isArray(vendors) ? { vendors: vendors as BookedVendor[] } : {}),
    ...(isServiceSelection(service) ? { service } : {}),
  };

  // Idempotent on the booking id so a repeat confirm (double-tap, retry after a
  // network blip) updates the existing record rather than duplicating it. The
  // vendor's response, notes and reviews already on it are kept.
  const merged: StoredOrder = existing ? { ...existing, ...order } : order;
  if (!awaitingPayment) delete merged.awaitingPayment;
  if (!plan) delete merged.emiPlan;
  try {
    await store.upsert(merged);
  } catch (err) {
    console.error("Failed to persist order", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Announce the order once, the moment it's real — never for a checkout
  // that's merely been opened, never again on a repeat confirm.
  const wasPlaced = existing ? !existing.awaitingPayment : false;
  if (!merged.awaitingPayment && !wasPlaced) {
    await notifyOrderPlaced(merged, user.email);
  }

  return Response.json({ ok: true, order: merged }, { status: existing ? 200 : 201 });
}

/**
 * Every server-side rule a Single Stall order must pass, in order: the menu
 * re-prices to the claimed total (with a coupon validated against the live
 * coupon table and the referral discount), the vendor is moderation-Approved,
 * the head-count meets the platform's and the vendor's own minimum, the event
 * is outside the vendor's lead time, and the vendor's slot is free. Returns
 * the rejection response, or null when the order may be stored.
 */
async function checkStallOrder(req: {
  id: string;
  pricing: unknown;
  guestCount: number;
  amount: number;
  occasion: string;
  iso: string;
  mealTime: string;
  eventTime: string;
  userId: string;
  referralPercent: number;
}): Promise<Response | null> {
  const claim = parseStallPricingClaim(req.pricing);
  if (!claim) {
    return Response.json(
      { error: "Missing order details. Please refresh and try again." },
      { status: 400 },
    );
  }
  if (req.guestCount < MIN_GUESTS || req.guestCount > MAX_GUESTS) {
    return Response.json(
      {
        error: `Guests must be between ${MIN_GUESTS} and ${MAX_GUESTS.toLocaleString("en-IN")}.`,
      },
      { status: 400 },
    );
  }

  const all = await store.list();

  // Coupons come from the admin Coupon Manager table, validated here (active,
  // in date, eligible) — never the client's copy of the list.
  const isFirstBooking = !all.some(
    (o) =>
      o.userId === req.userId &&
      o.id !== req.id &&
      o.status !== "Cancelled" &&
      !o.awaitingPayment,
  );
  const { coupon, error: couponError } = await resolveCoupon(claim.couponCode, {
    occasion: req.occasion,
    isFirstBooking,
  });
  if (couponError) {
    return Response.json(
      { error: couponError, code: "COUPON_INVALID" },
      { status: 400 },
    );
  }

  let quote: Awaited<ReturnType<typeof expectedStallTotal>>;
  let vendorRecord: Awaited<ReturnType<typeof findVendorById>>;
  try {
    [quote, vendorRecord] = await Promise.all([
      expectedStallTotal(claim, req.guestCount, req.referralPercent, coupon),
      findVendorById(claim.stallId),
    ]);
  } catch (err) {
    console.error("Failed to re-price stall order", err);
    return Response.json(
      { error: "Couldn't verify the order total. Please try again." },
      { status: 500 },
    );
  }
  // Off the roster (unknown, hidden, or not moderation-Approved).
  if (
    quote === null ||
    !vendorRecord ||
    (vendorRecord.moderation ?? "Approved") !== "Approved"
  ) {
    return Response.json(
      { error: "This stall isn't available to book right now." },
      { status: 400 },
    );
  }
  if (quote.perPlate <= 0) {
    return Response.json(
      { error: "Pick at least one dish from this stall's menu." },
      { status: 400 },
    );
  }
  if (Math.abs(Math.round(quote.grandTotal) - Math.round(req.amount)) > 1) {
    return Response.json(
      {
        error:
          "The price of this order has changed. Please review your order again before confirming.",
        code: "PRICE_CHANGED",
      },
      { status: 409 },
    );
  }

  // The vendor's own stall terms (Vendor Portal → onboarding).
  const minGuests = Math.max(
    MIN_GUESTS,
    vendorMinGuests(vendorRecord, quote.categoryIds),
  );
  if (req.guestCount < minGuests) {
    return Response.json(
      {
        error: `${vendorRecord.business} takes orders of at least ${minGuests} guests. Please raise the guest count.`,
        code: "MIN_GUESTS",
      },
      { status: 400 },
    );
  }
  const leadHours = Number(vendorRecord.leadHours);
  if (Number.isFinite(leadHours) && leadHours > 0) {
    const hours = hoursUntilEventIST(req.iso, {
      eventTime: req.eventTime,
      mealTime: req.mealTime,
    });
    if (hours !== null && hours < leadHours) {
      return Response.json(
        {
          error: `${vendorRecord.business} needs at least ${leadHours} hours' notice. Please pick a later date.`,
          code: "LEAD_TIME",
        },
        { status: 400 },
      );
    }
  }

  // Double-booking: one event per meal slot per vendor (and the vendor's
  // per-day cap, when set). See `slotConflict` for which orders hold a slot.
  const conflict = slotConflict(all, {
    id: req.id,
    vendorId: claim.stallId,
    eventDateISO: req.iso,
    mealTime: req.mealTime,
    maxEventsPerDay: vendorRecord.maxEventsPerDay,
  });
  if (conflict) {
    return Response.json(
      {
        error:
          conflict === "slot"
            ? `${vendorRecord.business} is already booked for ${req.mealTime ? req.mealTime.toLowerCase() : "that day"} on this date. Please pick another date or meal time, or another stall.`
            : `${vendorRecord.business} is fully booked on this date. Please pick another date or another stall.`,
        code: "SLOT_TAKEN",
      },
      { status: 409 },
    );
  }
  return null;
}

/** The occasion's minimum advance notice (days), matched by name against the
 *  admin-managed occasions list (falling back to the seed). Server-side backstop
 *  for the wizard's occasion→date gate, so a wedding can't be slipped past its
 *  lead by a hand-crafted payload. A free-text / unknown occasion matches
 *  nothing → 0, deferring entirely to the package/vendor lead. */
async function occasionLeadFromName(name: string): Promise<number> {
  const key = name.trim().toLowerCase();
  if (!key) return 0;
  const stored = await readSingleton<{
    occasions: { name?: string; leadDays?: number }[];
  }>("occasions");
  const list = stored?.occasions?.length ? stored.occasions : seedOccasions;
  const match = list.find((o) => (o.name ?? "").trim().toLowerCase() === key);
  if (!match) return 0;
  return typeof match.leadDays === "number"
    ? match.leadDays
    : DEFAULT_OCCASION_LEAD_DAYS;
}

/** Shape-check for the chosen service package posted from the booking wizard. */
function isServiceSelection(
  v: unknown,
): v is { id: string; name: string; price: number } {
  if (!v || typeof v !== "object") return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s.id === "string" &&
    typeof s.name === "string" &&
    typeof s.price === "number" &&
    Number.isFinite(s.price)
  );
}
