import {
  isOrderPaymentMethod,
  type OrderPaymentMethod,
} from "@/lib/orderPayment";
import {
  packageLeadDays,
  DEFAULT_VENDOR_LEAD_DAYS,
  type BookingStatus,
} from "@/lib/data";
import type { EmiPlan } from "@/lib/emi";
import type { InvoiceData } from "@/lib/invoice";
import type { BookedVendor, BookingVendorReview } from "@/lib/bookings";
import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { isSelfReferral } from "@/lib/referral";
import { sendOrderAlert, siteBaseUrl } from "@/lib/email";
import { parseListQuery } from "@/lib/validate";

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
  occasion: string;
  date: string;
  guests: number;
  vendor: string;
  city: string;
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

// List recorded orders, newest first (used by the admin booking console).
// Backward-compatible: always returns `{ orders }` (the full newest-first list).
// When any filter/pagination param is present it ALSO returns a `Paginated`
// envelope (`data/page/pageSize/total`) over the filtered set.
export async function GET(request: Request) {
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
    occasion,
    date,
    eventDateISO,
    packageId,
    leadDays,
    guests,
    vendor,
    city,
    amount,
    paid,
    paymentMethod,
    paymentRef,
    emiPlan,
    status,
    referralCode,
    referrerName,
    referrerType,
    invoiceToken,
    receipt,
    invoice,
    vendors,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof id !== "string" || !/^BHJ-/.test(id)) {
    return Response.json({ error: "Missing booking reference." }, { status: 400 });
  }

  const amt = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return Response.json({ error: "Invalid amount." }, { status: 400 });
  }

  // Advance-booking rule (server-side backstop for the wizard's date gate). The
  // fixed tiers (Silver/Gold/Platinum) use our own authoritative lead — the
  // client can't shorten them. Custom carries no fixed package lead, so we trust
  // the vendor-derived lead the client computed, clamped to a sane floor of
  // "no same-day unless a real lead was sent". A missing ISO date skips the
  // check (legacy clients) rather than blocking the booking.
  const iso = typeof eventDateISO === "string" ? eventDateISO : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const fixedLead =
      typeof packageId === "string" ? packageLeadDays[packageId] : undefined;
    const clientLead =
      typeof leadDays === "number" && Number.isFinite(leadDays)
        ? Math.max(0, Math.min(365, Math.round(leadDays)))
        : DEFAULT_VENDOR_LEAD_DAYS;
    // Non-custom tiers: enforce the server's own value. Custom / unknown: honour
    // the client's per-vendor lead (bounded above).
    const requiredLead =
      fixedLead !== undefined && packageId !== "custom" ? fixedLead : clientLead;
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

  const paidAmt = typeof paid === "number" ? paid : Number(paid);

  // Self-referral guard (authoritative): an Individual Referrer / Event Planner
  // can't credit their own booking. If the applied code belongs to this same
  // account, drop the attribution rather than blocking the booking — the code is
  // optional and the booking should still go through, just without self-credit.
  const selfReferral =
    typeof referralCode === "string" &&
    isSelfReferral(referralCode, user.partnerRoles);

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
    occasion: typeof occasion === "string" ? occasion : "Feast",
    date: typeof date === "string" ? date : "",
    guests: Number.isFinite(Number(guests)) ? Math.round(Number(guests)) : 0,
    vendor: typeof vendor === "string" ? vendor : "Bhojpatra",
    city: typeof city === "string" ? city : "—",
    amount: Math.round(amt),
    paid: Number.isFinite(paidAmt) && paidAmt > 0 ? Math.round(paidAmt) : 0,
    paymentMethod,
    ...(typeof paymentRef === "string" && paymentRef.trim()
      ? { paymentRef: paymentRef.trim() }
      : {}),
    ...(isEmiPlan(emiPlan) ? { emiPlan } : {}),
    status: isBookingStatus(status) ? status : "Confirmed",
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
    // Customer-facing extras carried from the booking flow (replace the old
    // localStorage copy). Stored verbatim; the client built + validated them.
    ...(typeof receipt === "string" && receipt ? { receipt } : {}),
    ...(invoice && typeof invoice === "object"
      ? { invoice: invoice as InvoiceData }
      : {}),
    ...(Array.isArray(vendors) ? { vendors: vendors as BookedVendor[] } : {}),
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

  // Alert the owners on a brand-new order (not on idempotent repeat confirms).
  // The client sends only the invoice token; we rebuild the URL from our own
  // trusted origin so this public endpoint can't inject an arbitrary link.
  if (!existing) {
    const token =
      typeof invoiceToken === "string" &&
      invoiceToken.length <= 8192 &&
      /^[A-Za-z0-9_-]+$/.test(invoiceToken)
        ? invoiceToken
        : "";
    const base = siteBaseUrl();
    const invoiceUrl = token && base ? `${base}/bookings/invoice?d=${token}` : null;
    await sendOrderAlert(merged, invoiceUrl);
  }

  return Response.json({ ok: true, order: merged }, { status: existing ? 200 : 201 });
}

function isBookingStatus(v: unknown): v is BookingStatus {
  return (
    v === "Pending" ||
    v === "Confirmed" ||
    v === "Completed" ||
    v === "Cancelled"
  );
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
