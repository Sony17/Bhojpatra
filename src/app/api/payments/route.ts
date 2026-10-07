import { isValidVpa, isValidTxnId, normalizeTxnId } from "@/lib/upi";
import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { parseListQuery } from "@/lib/validate";
import { sendPaymentAlert } from "@/lib/email";
import { getBooking, syncBookingWithLedger } from "@/lib/bookingPaymentSync";
import { amountDueNow } from "@/lib/bookingRules";

// Payments are recorded at request time to Postgres (Neon) — never prerender or
// cache this handler.
export const dynamic = "force-dynamic";

export type StoredPaymentMethod = "UPI" | "QR" | "Razorpay";
// A gateway (Razorpay) payment starts life as "Advance Received" — the gateway
// vouches for it. A manual UPI/QR transfer starts as "Pending": it is only the
// customer's word (a UTR they typed) until the team matches it against the
// bank statement and marks it received from the admin payment tracker
// (`/api/payments/[id]`). Pending rows never count toward what a booking has
// paid, so a made-up transaction id confirms nothing. Payments can later be
// settled or refunded from the same tracker. "Failed" rows are written
// only by the Razorpay webhook (payment.failed) as a record of an attempt that
// moved no money — they never count toward what a booking has paid, and the
// admin can't set or change them (they're absent from the settable list below).
export type StoredPaymentStatus =
  | "Advance Received"
  | "Settled"
  | "Pending"
  | "Refunded"
  | "Failed";
/** Statuses an admin may set through PATCH /api/payments/[id]. */
export const STORED_PAYMENT_STATUSES: StoredPaymentStatus[] = [
  "Advance Received",
  "Settled",
  "Pending",
  "Refunded",
];

export interface StoredPayment {
  id: string;
  bookingId: string;
  /** The signed-in account that made (or reported) the payment, from the
   *  session. A booking only counts payments from its own owner, so money paid
   *  against an id can never be claimed by another account. Absent on rows
   *  recorded before payer tracking. */
  userId?: string;
  customer: string;
  method: StoredPaymentMethod;
  type: "Advance";
  amount: number;
  vpa: string;
  txnRef: string;
  // The customer-entered UPI transaction reference (UTR) captured at checkout —
  // proof of the transfer, used to reconcile against the bank statement. The
  // `txnRef` above is our merchant-side reference (idempotency key); this is the
  // number the payer's own app produced. For gateway payments this holds the
  // Razorpay payment id instead (the payer-side reference shown on their receipt).
  customerTxnId?: string;
  // Gateway references, set only on method "Razorpay" (txnRef then holds the
  // order id, which is also the idempotency key across verify + webhook).
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  // Set when this payment was refunded through the Razorpay Refund API.
  razorpayRefundId?: string;
  // Rupees refunded so far, from Razorpay's cumulative `amount_refunded`
  // (set by the refund.processed webhook; less than `amount` for a partial).
  refundedAmount?: number;
  // Gateway's reason for a "Failed" attempt (payment.failed webhook).
  failureReason?: string;
  status: StoredPaymentStatus;
  createdAt: string;
}

const store = createStore<StoredPayment>({
  table: "payments",
  idField: "id",
});

// List recorded payments, newest first (used by the admin payment tracker).
// Backward-compatible `{ payments }`; adds a `Paginated` envelope when filtered.
export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const payments = (await store.list()).slice().reverse();
  const { q, status, method, page, pageSize, hasQuery } = parseListQuery(
    request.url,
  );
  if (!hasQuery) return Response.json({ payments });

  const needle = q.trim().toLowerCase();
  const filtered = payments.filter((p) => {
    const matchesQ =
      !needle ||
      p.id.toLowerCase().includes(needle) ||
      p.bookingId.toLowerCase().includes(needle) ||
      p.customer.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || p.status === status;
    const matchesMethod = method === "All" || p.method === method;
    return matchesQ && matchesStatus && matchesMethod;
  });
  const start = (page - 1) * pageSize;
  return Response.json({
    payments,
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}

export async function POST(request: Request) {
  // Payments may only be recorded for a signed-in guest — reject anonymous
  // posts (the booking UI gates payment behind login before reaching here).
  const guard = await requireRole();
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { bookingId, amount, method, vpa, txnRef, customerTxnId, customer } =
    (body ?? {}) as Record<string, unknown>;

  if (typeof bookingId !== "string" || !/^BHJ-/.test(bookingId)) {
    return Response.json({ error: "Missing booking reference." }, { status: 400 });
  }

  // Only the booking's own customer may report a payment against it. When the
  // booking already exists (the Single Stall flow creates it before payment),
  // the amount is what it actually owes next — never the client's figure.
  // A booking that doesn't exist yet (the feast wizard still pays first) is
  // tagged with this account, so only this account's booking can count it.
  const booking = await getBooking(bookingId);
  if (booking && booking.userId !== guard.id && guard.role !== "admin") {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  if (booking?.status === "Cancelled") {
    return Response.json(
      { error: "This booking was cancelled — please don't pay for it." },
      { status: 409 },
    );
  }

  const claimed = typeof amount === "number" ? amount : Number(amount);
  const amt = booking ? amountDueNow(booking.amount, booking.paid) : claimed;
  if (!Number.isFinite(amt) || amt <= 0) {
    return Response.json(
      {
        error: booking
          ? "Nothing is due on this booking right now."
          : "Invalid amount.",
      },
      { status: booking ? 409 : 400 },
    );
  }

  if (typeof vpa !== "string" || !isValidVpa(vpa)) {
    return Response.json({ error: "Invalid UPI ID." }, { status: 400 });
  }

  // The customer's own transaction reference is required proof of the transfer —
  // it's captured at checkout before the booking is confirmed.
  if (typeof customerTxnId !== "string" || !isValidTxnId(customerTxnId)) {
    return Response.json(
      { error: "Enter the transaction ID from your UPI app." },
      { status: 400 },
    );
  }
  const customerRef = normalizeTxnId(customerTxnId);

  const normalizedMethod: StoredPaymentMethod = method === "qr" ? "QR" : "UPI";
  const ref =
    typeof txnRef === "string" && txnRef ? txnRef : `${bookingId}-ADVANCE`;

  const payments = await store.list();

  // Idempotent on the transaction reference so a repeat confirmation (e.g. the
  // customer double-taps "I've paid") doesn't create a duplicate record — but
  // only for the same payer; someone else's reference is never echoed back.
  const existing = payments.find((p) => p.txnRef === ref);
  if (existing) {
    if (existing.userId && existing.userId !== guard.id) {
      return Response.json(
        { error: "This payment reference is already in use." },
        { status: 409 },
      );
    }
    return Response.json({ ok: true, payment: existing }, { status: 200 });
  }

  const payment: StoredPayment = {
    id: `PMT-W${(payments.length + 1).toString().padStart(4, "0")}`,
    bookingId,
    userId: guard.id,
    customer:
      typeof customer === "string" && customer.trim()
        ? customer.trim()
        : "Online Booking",
    method: normalizedMethod,
    type: "Advance",
    amount: Math.round(amt),
    vpa: vpa.trim(),
    txnRef: ref,
    customerTxnId: customerRef,
    // Unverified until the team matches the UTR (Payments → Verify).
    status: "Pending",
    createdAt: new Date().toISOString(),
  };

  try {
    await store.upsert(payment);
  } catch (err) {
    console.error("Failed to persist payment", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // The order is now submitted (no longer a checkout in progress) but stays
  // Pending — an unverified transfer moves no money on the booking. Best-effort:
  // the ledger row above is already safe.
  try {
    await syncBookingWithLedger(bookingId, {
      paymentRef: customerRef,
      submitted: true,
    });
  } catch (err) {
    console.error(`Failed to sync booking ${bookingId} after payment`, err);
  }

  // A duplicate txnRef already returned above, so reaching here means a new
  // payment — ask the owners to verify it (best-effort; never blocks).
  await sendPaymentAlert(payment);

  return Response.json({ ok: true, payment }, { status: 201 });
}
