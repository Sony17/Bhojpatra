import { requireRole } from "@/lib/auth";
import { upiTxnRef } from "@/lib/upi";
import { createStore } from "@/lib/store";
import type { StoredOrder } from "@/app/api/bookings/route";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  razorpayKeyId,
} from "@/lib/razorpay";

// Talks to the live Razorpay API per request — never prerender or cache.
export const dynamic = "force-dynamic";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

// Sanity ceiling on a single advance/balance payment (₹1 crore) — anything above
// is a bug or abuse, not a booking.
const MAX_AMOUNT = 10_000_000;

// Create a Razorpay Order for a booking advance or remaining balance.
// For initial bookings (not in DB yet), the amount is verified against MAX_AMOUNT.
// For existing bookings (Pay Balance flow), the amount is strictly derived from
// the stored booking's real remaining balance on the server.
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

  // Check if this is an existing booking (Pay Balance flow)
  const existingBooking = await bookingStore.get(bookingId);
  let amt: number;
  let receiptType: "ADVANCE" | "BALANCE" = "ADVANCE";

  if (existingBooking) {
    const isAdmin = guard.role === "admin";
    // Non-admins can only pay balance for their own bookings
    if (!isAdmin && existingBooking.userId && existingBooking.userId !== guard.id) {
      return Response.json({ error: "Not allowed." }, { status: 403 });
    }
    if (existingBooking.status === "Cancelled" || existingBooking.status === "Completed") {
      return Response.json(
        { error: `Cannot pay balance for a ${existingBooking.status.toLowerCase()} booking.` },
        { status: 400 },
      );
    }
    const currentPaid = existingBooking.paid ?? 0;
    const remainingBalance = Math.max(0, existingBooking.amount - currentPaid);
    if (remainingBalance <= 0) {
      return Response.json(
        { error: "This booking is already fully paid." },
        { status: 400 },
      );
    }
    // Authoritative amount is the server-calculated remaining balance
    amt = remainingBalance;
    receiptType = "BALANCE";
  } else {
    // Initial booking checkout flow (booking not in database yet)
    const rawAmt = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(rawAmt) || rawAmt <= 0 || rawAmt > MAX_AMOUNT) {
      return Response.json({ error: "Invalid amount." }, { status: 400 });
    }
    amt = rawAmt;
  }

  try {
    const order = await createRazorpayOrder({
      amountRupees: amt,
      receipt: upiTxnRef(bookingId, receiptType),
      notes: {
        bookingId,
        ...(typeof customer === "string" && customer.trim()
          ? { customer: customer.trim().slice(0, 100) }
          : existingBooking?.customer
            ? { customer: existingBooking.customer.slice(0, 100) }
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
