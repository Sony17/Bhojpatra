import {
  isOrderPaymentMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import {
  packageLeadDays,
  customOrderLeadDays,
  occasions as seedOccasions,
  DEFAULT_OCCASION_LEAD_DAYS,
  coupons as seedCoupons,
  type BookingStatus,
} from "@/lib/data";
import type { EmiPlan } from "@/lib/emi";
import type { InvoiceData } from "@/lib/invoice";
import type { BookedVendor, BookingVendorReview } from "@/lib/bookings";
import { createStore, readSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { isSelfReferral, isPhoneSelfReferral } from "@/lib/referral";
import type { PartnerRecord } from "@/app/api/partners/route";
import type { StoredPayment } from "@/app/api/payments/route";
import {
  sendBookingConfirmation,
  sendOrderAlert,
  siteBaseUrl,
} from "@/lib/email";
import { parseListQuery } from "@/lib/validate";
import {
  ADVANCE_RATE,
  isMaterialDifference,
  calculateFeastTotals,
  calculateStallTotals,
  calculateBainaTotals,
  calculateVenueTotals,
} from "@/lib/bookingPricing";
import { signInvoiceId } from "@/lib/invoiceSign";
import { readCoupons } from "@/lib/coupons";
import { customerPercentFor, DEFAULT_REFERRAL_RATES, type ReferralRates } from "@/lib/referralRates";

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

// The payments ledger — the authority on what has actually been paid. Both
// online flows (Razorpay verify, manual UPI) record the payment BEFORE the
// booking is confirmed, so at confirm time any genuine advance is already here.
const paymentStore = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

// List recorded orders, newest first (used by the admin booking console).
// Backward-compatible: always returns `{ orders }` (the full newest-first list).
// When any filter/pagination param is present it ALSO returns a `Paginated`
// envelope (`data/page/pageSize/total`) over the filtered set.
export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  const orders = (await store.list()).slice().reverse();
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
    vendor,
    city,
    venue,
    amount,
    paid,
    paymentMethod,
    paymentRef,
    emiPlan,
    referralCode,
    referrerName,
    referrerType,
    receipt,
    vendors,
    service,
    pricingInputs,
    categoryVendors,
    categoryItems,
    stallId,
    selectedAddOns,
    serviceId,
    venueFee,
    bainaVendorId,
    bainaItems,
    couponCode,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof id !== "string" || !/^BHJ-/.test(id)) {
    return Response.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const amt = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return Response.json({ error: "Invalid amount." }, { status: 400 });
  }

  // Advance-booking rule (server-side backstop for the wizard's date gate). The
  // required notice is computed entirely from our own data — the client's
  // claimed `leadDays` is never trusted. Fixed tiers (Silver/Gold/Platinum) use
  // their authoritative package lead; Single-Stall / Custom (and any unknown
  // package) re-derive it from the vendors actually on the order, so a tampered
  // same-day payload can't slip past a standard stall's 2-day floor. A missing
  // ISO date skips the check (legacy clients) rather than blocking the booking.
  const iso = typeof eventDateISO === "string" ? eventDateISO : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const fixedLead =
      typeof packageId === "string" ? packageLeadDays[packageId] : undefined;
    // Vendor ids on the order, used to re-derive the single-stall notice.
    const vendorIds = Array.isArray(vendors)
      ? (vendors as BookedVendor[])
          .map((v) => (v && typeof v.id === "string" ? v.id : ""))
          .filter(Boolean)
      : [];
    const packageOrVendorLead =
      fixedLead !== undefined && packageId !== "custom"
        ? fixedLead
        : customOrderLeadDays(vendorIds);
    // The stricter of the package/vendor lead and the occasion's own notice —
    // mirrors the wizard's `max(packageLead, occasionLead)`.
    const requiredLead = Math.max(
      packageOrVendorLead,
      await occasionLeadFromName(typeof occasion === "string" ? occasion : ""),
    );
    const days = daysUntilISO(iso);
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

  if (!isOrderPaymentMethod(paymentMethod)) {
    return Response.json({ error: "Invalid payment method." }, { status: 400 });
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
  let phoneSelfReferral = false;
  let referrerRecord: PartnerRecord | null = null;
  if (code && !sameAccountSelfReferral) {
    referrerRecord = await partnerStore.get(code.toUpperCase());
    phoneSelfReferral =
      !!referrerRecord &&
      !referrerRecord.deleted &&
      isPhoneSelfReferral(typeof phone === "string" ? phone : "", referrerRecord);
  }

  const selfReferral = sameAccountSelfReferral || phoneSelfReferral;

  // ── Authoritative Server-Side Pricing Recalculation (BHOJ-SEC-012) ───────────
  const guestCount = Number.isFinite(Number(guests)) ? Math.round(Number(guests)) : 0;
  const rawPricing =
    (pricingInputs && typeof pricingInputs === "object"
      ? pricingInputs
      : {}) as Record<string, unknown>;

  // Resolve coupon server-side from authoritative store / catalog
  const inputCouponCode =
    typeof rawPricing.couponCode === "string" && rawPricing.couponCode.trim()
      ? rawPricing.couponCode.trim()
      : typeof couponCode === "string" && couponCode.trim()
        ? couponCode.trim()
        : "";

  let appliedCoupon: { percent: number; cap: number } | null = null;
  if (inputCouponCode) {
    try {
      const dbCoupons = await readCoupons();
      const match =
        dbCoupons.find(
          (c) => c.code.toUpperCase() === inputCouponCode.toUpperCase(),
        ) ||
        seedCoupons.find(
          (c) => c.code.toUpperCase() === inputCouponCode.toUpperCase(),
        );
      if (match) {
        let isExpired = false;
        let isInactive = false;
        if (
          "expiresAt" in match &&
          typeof match.expiresAt === "string" &&
          match.expiresAt
        ) {
          isExpired = new Date(match.expiresAt).getTime() < Date.now();
        }
        if ("status" in match && match.status !== "Active") {
          isInactive = true;
        }
        if (!isExpired && !isInactive) {
          appliedCoupon = {
            percent: match.percent,
            cap: match.cap,
          };
        }
      }
    } catch {
      // ignore coupon read error
    }
  }

  // Resolve referral discount percentage
  let referralPercent = 0;
  if (code && !selfReferral && referrerRecord && !referrerRecord.deleted) {
    const rates: ReferralRates = DEFAULT_REFERRAL_RATES;
    referralPercent = customerPercentFor(rates, referrerRecord.type);
  }

  const bType =
    (rawPricing.bookingType as string) ||
    (occasion === "Baina Box"
      ? "baina"
      : packageId === "custom" && (stallId || rawPricing.stallId)
        ? "stall"
        : "feast");

  let authoritativeCalc: {
    preDiscount: number;
    couponDiscount: number;
    referralDiscount: number;
    discount: number;
    taxable: number;
    gst: number;
    grandTotal: number;
    subtotal?: number;
    addOnsTotal?: number;
  } = {
    preDiscount: Math.round(amt),
    couponDiscount: 0,
    referralDiscount: 0,
    discount: 0,
    taxable: Math.round(amt),
    gst: 0,
    grandTotal: Math.round(amt),
  };

  if (bType === "baina") {
    const items = (
      Array.isArray(rawPricing.bainaItems)
        ? rawPricing.bainaItems
        : Array.isArray(bainaItems)
          ? bainaItems
          : []
    ) as Array<{ id: string; qty: number; price?: number }>;
    const vId =
      (rawPricing.bainaVendorId as string) ||
      (typeof bainaVendorId === "string" ? bainaVendorId : "");
    const b = calculateBainaTotals({
      bookingType: "baina",
      bainaVendorId: vId,
      bainaItems: items,
    });
    authoritativeCalc = {
      preDiscount: b.subtotal,
      couponDiscount: 0,
      referralDiscount: 0,
      discount: 0,
      taxable: b.subtotal,
      gst: 0,
      grandTotal: b.grandTotal,
      subtotal: b.subtotal,
      addOnsTotal: 0,
    };
  } else if (bType === "stall") {
    const sId =
      (rawPricing.stallId as string) ||
      (typeof stallId === "string" ? stallId : "");
    const cItems = (rawPricing.categoryItems || categoryItems) as
      | Record<string, string[]>
      | undefined;
    const addOnsArr = (
      Array.isArray(rawPricing.selectedAddOns)
        ? rawPricing.selectedAddOns
        : Array.isArray(selectedAddOns)
          ? selectedAddOns
          : []
    ) as string[];
    const svcId =
      (rawPricing.serviceId as string) ||
      (typeof serviceId === "string"
        ? serviceId
        : (service as { id?: string })?.id);
    const vFee = Number(rawPricing.venueFee ?? venueFee ?? 0);

    authoritativeCalc = calculateStallTotals({
      bookingType: "stall",
      stallId: sId,
      categoryItems: cItems,
      guests: guestCount,
      selectedAddOns: addOnsArr,
      serviceId: svcId,
      venueFee: vFee,
      coupon: appliedCoupon,
      referralPercent,
    });
  } else if (bType === "venue") {
    authoritativeCalc = calculateVenueTotals({
      bookingType: "venue",
      venueRate: Number(rawPricing.venueRate ?? amount),
    });
  } else {
    // Feast flow
    const pkgId =
      (rawPricing.packageId as string) ||
      (typeof packageId === "string" ? packageId : "silver");
    const catVendors = (rawPricing.categoryVendors || categoryVendors) as
      | Record<string, string[]>
      | undefined;
    const addOnsArr = (
      Array.isArray(rawPricing.selectedAddOns)
        ? rawPricing.selectedAddOns
        : Array.isArray(selectedAddOns)
          ? selectedAddOns
          : []
    ) as string[];
    const svcId =
      (rawPricing.serviceId as string) ||
      (typeof serviceId === "string"
        ? serviceId
        : (service as { id?: string })?.id);
    const vFee = Number(rawPricing.venueFee ?? venueFee ?? 0);

    authoritativeCalc = calculateFeastTotals({
      bookingType: "feast",
      packageId: pkgId,
      guests: guestCount,
      categoryVendors: catVendors,
      selectedAddOns: addOnsArr,
      serviceId: svcId,
      venueFee: vFee,
      coupon: appliedCoupon,
      referralPercent,
    });
  }

  // Enforce authoritative pricing: reject any material price difference (> ₹1)
  const authoritativeGrandTotal = Math.round(authoritativeCalc.grandTotal);
  if (authoritativeGrandTotal > 0) {
    if (isMaterialDifference(amt, authoritativeGrandTotal)) {
      return Response.json(
        {
          error: "Booking amount does not match authoritative calculated total.",
          expected: authoritativeGrandTotal,
          received: amt,
        },
        { status: 400 },
      );
    }
  }

  const finalAmount =
    authoritativeGrandTotal > 0 ? authoritativeGrandTotal : Math.round(amt);

  // ── Payment Integrity & Decoupled Verification (NEW-SEC-002) ─────────────────
  const paidAmt = typeof paid === "number" ? paid : Number(paid);
  const payments = (await paymentStore.list()).filter((p) => p.bookingId === id);

  const verifiedSum = payments
    .filter((p) => p.status === "Advance Received" || p.status === "Settled")
    .reduce((sum, p) => sum + p.amount, 0);

  const submittedSum = payments
    .filter((p) => p.status === "Submitted")
    .reduce((sum, p) => sum + p.amount, 0);

  if (
    Number.isFinite(paidAmt) &&
    paidAmt > 0 &&
    verifiedSum <= 0 &&
    submittedSum <= 0
  ) {
    return Response.json(
      {
        error:
          "We couldn't verify your payment. If money left your account, don't pay again — contact us with your booking ID and we'll match it.",
      },
      { status: 400 },
    );
  }

  const requiredAdvance = Math.round(finalAmount * ADVANCE_RATE);
  let paidVerified = 0;
  let finalStatus: BookingStatus = "Pending";

  if (paymentMethod === "Connect") {
    // Connect flow: Bhojpatra contacts customer to finalize menu and cash payment
    finalStatus = "Confirmed";
    paidVerified = 0;
  } else if (verifiedSum >= requiredAdvance) {
    // Genuine verified advance payment received
    finalStatus = "Confirmed";
    paidVerified = verifiedSum;
  } else if (submittedSum > 0) {
    // Payment submitted via manual UPI, awaiting admin bank reconciliation
    finalStatus = "Pending";
    paidVerified = verifiedSum;
  } else {
    finalStatus = "Pending";
    paidVerified = 0;
  }

  // ── Authoritative Invoice Generation (BHOJ-SEC-014) ──────────────────────────
  const authoritativeInvoice: InvoiceData = {
    id,
    dateLabel: typeof date === "string" ? date : "",
    customerName:
      typeof customer === "string" && customer.trim()
        ? customer.trim()
        : undefined,
    customerPhone:
      typeof phone === "string" && phone.trim() ? phone.trim() : undefined,
    customerEmail:
      typeof email === "string" && email.trim() ? email.trim() : undefined,
    occasion: typeof occasion === "string" ? occasion : "Feast",
    eventDate: typeof date === "string" ? date : "",
    servingTime:
      typeof mealTime === "string" && mealTime.trim()
        ? mealTime.trim()
        : undefined,
    foodPreference:
      typeof foodPreference === "string" && foodPreference.trim()
        ? foodPreference.trim()
        : undefined,
    city: typeof city === "string" ? city : "—",
    venue: typeof venue === "string" && venue.trim() ? venue.trim() : "—",
    guests: guestCount,
    packageName: typeof vendor === "string" ? vendor : "Bhojpatra",
    lines: [
      {
        label: `${typeof occasion === "string" ? occasion : "Feast"} — ${typeof vendor === "string" ? vendor : "Bhojpatra"}`,
        amount: finalAmount,
      },
    ],
    menu: [],
    subtotal: authoritativeCalc?.subtotal ?? finalAmount,
    addOnsTotal: authoritativeCalc?.addOnsTotal ?? 0,
    discount: authoritativeCalc?.discount ?? 0,
    gst: authoritativeCalc?.gst ?? Math.round(finalAmount * 0.18),
    grandTotal: finalAmount,
    paid: paidVerified,
  };

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
    occasion: typeof occasion === "string" ? occasion : "Feast",
    date: typeof date === "string" ? date : "",
    ...(typeof eventDateISO === "string" && /^\d{4}-\d{2}-\d{2}$/.test(eventDateISO)
      ? { eventDateISO }
      : {}),
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
    vendor: typeof vendor === "string" ? vendor : "Bhojpatra",
    city: typeof city === "string" ? city : "—",
    ...(typeof venue === "string" && venue.trim()
      ? { venue: venue.trim() }
      : {}),
    amount: finalAmount,
    paid: paidVerified,
    paymentMethod,
    ...(typeof paymentRef === "string" && paymentRef.trim()
      ? { paymentRef: paymentRef.trim() }
      : {}),
    ...(isEmiPlan(emiPlan) ? { emiPlan } : {}),
    status: finalStatus,
    createdAt: new Date().toISOString(),
    ...(!selfReferral && typeof referralCode === "string" && referralCode.trim()
      ? {
          referralCode: referralCode.trim(),
          referrerName:
            typeof referrerName === "string" && referrerName.trim()
              ? referrerName.trim()
              : undefined,
          referrerType:
            typeof referrerType === "string" ? referrerType : undefined,
        }
      : {}),
    // Customer-facing receipt preserved for formatting
    ...(typeof receipt === "string" && receipt ? { receipt } : {}),
    // Authoritative server invoice
    invoice: authoritativeInvoice,
    ...(Array.isArray(vendors) ? { vendors: vendors as BookedVendor[] } : {}),
    ...(isServiceSelection(service) ? { service } : {}),
  };

  // Idempotent on the booking id so a repeat confirm (double-tap, retry after a
  // network blip) updates the existing record rather than duplicating it.
  const existing = await store.get(order.id);
  const merged = existing ? { ...existing, ...order } : order;
  try {
    await store.upsert(merged);
  } catch (err) {
    console.error("Failed to persist order", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Email on a brand-new order with HMAC-signed invoice link:
  if (!existing) {
    const sig = signInvoiceId(merged.id);
    const base = siteBaseUrl();
    const invoiceUrl = base
      ? `${base}/bookings/invoice?id=${encodeURIComponent(merged.id)}&sig=${encodeURIComponent(sig)}`
      : null;
    await Promise.all([
      sendOrderAlert(merged, invoiceUrl),
      sendBookingConfirmation(merged, user.email, invoiceUrl),
    ]);
  }

  return Response.json({ ok: true, order: merged }, { status: existing ? 200 : 201 });
}

/** Whole days from today (UTC midnight) until a `YYYY-MM-DD` date. Null for an
 *  unparseable date. UTC keeps the backstop stable regardless of server TZ; the
 *  client already enforces the exact local-day gate. */
function daysUntilISO(dateStr: string): number | null {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return null;
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / 86_400_000);
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

/** Shallow shape-check for an EMI plan posted from the booking wizard. */
function isEmiPlan(v: unknown): v is EmiPlan {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    typeof p.count === "number" &&
    typeof p.balance === "number" &&
    Array.isArray(p.installments)
  );
}
