import { requireRole } from "@/lib/auth";
import { upiTxnRef } from "@/lib/upi";
import { receivedPayments } from "@/lib/bookingPaymentSync";
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

// Create a Razorpay Order for the booking advance. The client then opens
// Razorpay Checkout against the returned order id; the amount is bound to the
// order, so checkout cannot settle a different figure. The booking record
// itself is only created after payment (the wizard derives the id up front),
// so the booking ref travels on the order's notes for the webhook to read.
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

  const { bookingId, amount, customer } = (body ?? {}) as Record<
    string,
    unknown
  >;

  if (typeof bookingId !== "string" || !/^BHJ-/.test(bookingId)) {
    return Response.json(
      { error: "Missing booking reference." },
      { status: 400 },
    );
  }

  const amt = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amt) || amt <= 0 || amt > MAX_AMOUNT) {
    return Response.json({ error: "Invalid amount." }, { status: 400 });
  }

  // Double-charge guard: when the ledger already holds enough received money
  // for this booking to cover the requested charge, refuse to open another
  // checkout — a retry after "nothing updated" was how customers paid the same
  // advance four times over. The recorded total travels back so the client can
  // treat this as a payment that already succeeded and go straight to confirm.
  try {
    const rows = await receivedPayments(bookingId);
    const recorded = rows.reduce((sum, p) => sum + p.amount, 0);
    if (recorded >= Math.round(amt)) {
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
    }
  } catch (err) {
    // The guard is protective, not load-bearing — if the ledger read fails,
    // fall through and let the payment proceed rather than blocking checkout.
    console.error("Failed to check recorded payments before order", err);
  }

  try {
    const order = await createRazorpayOrder({
      amountRupees: amt,
      receipt: upiTxnRef(bookingId, "ADVANCE"),
      notes: {
        bookingId,
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
