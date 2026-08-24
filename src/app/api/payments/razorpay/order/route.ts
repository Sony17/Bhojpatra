import { requireRole } from "@/lib/auth";
import { upiTxnRef } from "@/lib/upi";
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
