import { requireRole } from "@/lib/auth";
import { upiTxnRef } from "@/lib/upi";
import { getBooking, receivedPayments } from "@/lib/bookingPaymentSync";
import { advanceDue, amountDueNow } from "@/lib/bookingRules";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  razorpayKeyId,
} from "@/lib/razorpay";

// Talks to the live Razorpay API per request — never prerender or cache.
export const dynamic = "force-dynamic";

// Sanity ceiling on a single advance (₹1 crore) — anything above is a bug or
// abuse, not a booking.
const MAX_AMOUNT = 10_000_000;

// Create a Razorpay Order for what a booking owes next. The client then opens
// Razorpay Checkout against the returned order id; the amount is bound to the
// order, so checkout cannot settle a different figure.
//
// When the booking exists (the Single Stall wizard creates it, server-priced,
// before payment; My Bookings pays a balance) the amount comes from the
// booking — the rest of the 10% advance, then the balance — and the client's
// figure is ignored. Only the feast wizard still pays before its booking
// exists; that charge is taken as asked, and the booking it later creates is
// confirmed only if the ledger holds its full advance. The booking ref and the
// payer's account travel on the order's (server-set) notes, which is what the
// verify route and the webhook bind the payment to.
export async function POST(request: Request) {
  // Same gate as recording a payment — checkout sits behind login.
  const guard = await requireRole();
  if (guard instanceof Response) return guard;

  if (!isRazorpayConfigured()) {
    return Response.json(
      { error: "Online payment is not available right now." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { bookingId, amount, customer, purpose } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof bookingId !== "string" || !/^BHJ-/.test(bookingId)) {
    return Response.json(
      { error: "Missing booking reference." },
      { status: 400 },
    );
  }

  // Someone else's booking — never charge against it, and never report its
  // payments as this customer's ("already paid" would confirm a free booking).
  let booking: Awaited<ReturnType<typeof getBooking>>;
  try {
    booking = await getBooking(bookingId);
  } catch (err) {
    console.error("Failed to read booking before order", err);
    return Response.json(
      { error: "Couldn't start the payment. Please try again." },
      { status: 502 },
    );
  }
  if (booking?.userId && booking.userId !== guard.id) {
    return Response.json(
      {
        error:
          "This booking reference is already in use. Please refresh the page and try again.",
      },
      { status: 409 },
    );
  }
  if (booking?.status === "Cancelled") {
    return Response.json(
      { error: "This booking was cancelled — please don't pay for it." },
      { status: 409 },
    );
  }

  // Only THIS account's received payments ever count (receivedPayments'
  // owner filter) — so a 409 "already paid" below can never hand customer B
  // the money customer A paid against the same id.
  let rows: Awaited<ReturnType<typeof receivedPayments>> = [];
  try {
    rows = await receivedPayments(bookingId, guard.id);
  } catch (err) {
    // The guard is protective, not load-bearing — if the ledger read fails,
    // fall through and let the payment proceed rather than blocking checkout.
    console.error("Failed to check recorded payments before order", err);
  }
  const recorded = rows.reduce((sum, p) => sum + p.amount, 0);
  const alreadyPaid = () => {
    const last = rows[rows.length - 1];
    return Response.json(
      {
        error:
          "This payment is already recorded against your booking — you don't need to pay again.",
        alreadyPaid: {
          amount: recorded,
          paymentId:
            last?.razorpayPaymentId ?? last?.customerTxnId ?? last?.txnRef ?? "",
        },
      },
      { status: 409 },
    );
  };

  let amt: number;
  if (booking) {
    // Server-derived: what this booking owes next. The ledger can be ahead of
    // the booking row (a sync that hasn't landed), so take the larger paid.
    const paidSoFar = Math.max(booking.paid ?? 0, recorded);
    amt = amountDueNow(booking.amount, paidSoFar);
    if (amt <= 0) return alreadyPaid();
    // A checkout opened to pay the ADVANCE (the booking wizard) must never
    // quietly turn into a balance charge because the advance already landed
    // (e.g. a retry after a verify that didn't reach the browser).
    if (purpose === "advance" && paidSoFar >= advanceDue(booking.amount)) {
      return alreadyPaid();
    }
  } else {
    amt = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amt) || amt <= 0 || amt > MAX_AMOUNT) {
      return Response.json({ error: "Invalid amount." }, { status: 400 });
    }
    // Double-charge guard: a retry after "nothing updated" was how customers
    // paid the same advance four times over.
    if (recorded >= Math.round(amt)) return alreadyPaid();
  }
  if (amt > MAX_AMOUNT) {
    return Response.json({ error: "Invalid amount." }, { status: 400 });
  }

  try {
    const order = await createRazorpayOrder({
      amountRupees: amt,
      receipt: upiTxnRef(bookingId, "ADVANCE"),
      notes: {
        bookingId,
        userId: guard.id,
        ...(typeof customer === "string" && customer.trim()
          ? { customer: customer.trim().slice(0, 100) }
          : {}),
      },
    });
    return Response.json(
      {
        ok: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: razorpayKeyId(),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to create Razorpay order", err);
    return Response.json(
      { error: "Couldn't start the payment. Please try again." },
      { status: 502 },
    );
  }
}
