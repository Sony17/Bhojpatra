import { requireRole } from "@/lib/auth";
import {
  deriveVendorAdvances,
  displayDate,
  vendorAdvanceId,
  vendorAdvanceStore,
  type StoredVendorAdvance,
} from "@/lib/settlements";
import { VENDOR_PAYOUT_METHODS, type VendorPayoutMethod } from "@/lib/vendorAdvance";
import { isRazorpayXConfigured } from "@/lib/razorpay";
import { sendVendorPayout, syncProcessingPayouts, type PayoutTarget } from "@/lib/vendorPayouts";

// Derived from live bookings + persisted advances on every read.
export const dynamic = "force-dynamic";

// GET /api/settlements/advances → { rule, advances, payoutsEnabled } — every
// booking a vendor advance can be released on, with the rule's suggested
// amount, plus the ones already paid. RazorpayX payouts still in flight are
// re-synced first.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const payoutsEnabled = isRazorpayXConfigured();
  if (payoutsEnabled) await syncProcessingPayouts();
  return Response.json({ ...(await deriveVendorAdvances()), payoutsEnabled });
}

// POST /api/settlements/advances → { bookingId, amount, method, reference }
// records an advance the admin paid outside the app (Razorpay dashboard / UPI
// / bank); { bookingId, amount, send: true, target: "bank" | "upi" } SENDS it
// now through RazorpayX to the vendor's verified account. One per booking
// (a failed RazorpayX send can be retried): the amount comes off the booking's
// balance at period settlement.
export async function POST(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const admin = guard;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const bookingId = typeof body.bookingId === "string" ? body.bookingId : "";
  const amount = Math.round(Number(body.amount));
  const send = body.send === true;
  const target: PayoutTarget = body.target === "upi" ? "upi" : "bank";
  const method = (send ? "Razorpay" : body.method) as VendorPayoutMethod;
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";

  if (send && !isRazorpayXConfigured()) {
    return Response.json(
      { error: "RazorpayX payouts aren't set up. Add RAZORPAYX_ACCOUNT_NUMBER." },
      { status: 400 },
    );
  }
  if (!VENDOR_PAYOUT_METHODS.includes(method)) {
    return Response.json({ error: "Choose how the advance was paid." }, { status: 400 });
  }
  if (!send && method !== "Cash" && !reference) {
    return Response.json(
      { error: "Enter the Razorpay payout ID or UTR for this transfer." },
      { status: 400 },
    );
  }

  // The booking must be one the derivation offers an advance on.
  const { advances } = await deriveVendorAdvances();
  const row = advances.find((a) => a.bookingId === bookingId);
  if (!row) {
    return Response.json({ error: "Booking not found." }, { status: 404 });
  }
  if (row.status !== "Pending") {
    return Response.json(
      {
        error:
          row.status === "Processing"
            ? "A Razorpay payout for this advance is already on its way."
            : "An advance has already been paid on this booking.",
      },
      { status: 409 },
    );
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > row.bookingAmount) {
    return Response.json(
      { error: "Enter an amount between ₹1 and the booking value." },
      { status: 400 },
    );
  }

  const id = vendorAdvanceId(bookingId);
  let razorpayX: StoredVendorAdvance["razorpayX"];
  if (send) {
    // A retry after a failed send gets a fresh idempotency key.
    const previous = await vendorAdvanceStore.get(id).catch(() => null);
    const sent = await sendVendorPayout({
      ref: id,
      attempt: (previous?.razorpayX?.attempt ?? 0) + 1,
      vendor: row.vendor,
      amount,
      target,
      narration: `Bhojpatra advance ${bookingId}`,
    });
    if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });
    razorpayX = sent.state;
  }

  const now = new Date();
  const record: StoredVendorAdvance = {
    id,
    kind: "advance",
    bookingId,
    vendor: row.vendor,
    amount,
    method,
    reference: (razorpayX?.payoutId ?? reference).slice(0, 120),
    paidAt: displayDate(now),
    createdAt: now.toISOString(),
    paidBy: admin.id,
    ...(razorpayX ? { razorpayX } : {}),
  };

  // A send that failed immediately is stored (for the reason) but stays
  // retryable; report it as an error.
  try {
    await vendorAdvanceStore.upsert(record);
  } catch (err) {
    console.error("Failed to persist vendor advance", err);
    if (razorpayX) {
      // Money may be moving — never tell the admin to just "try again".
      return Response.json(
        { error: `Payout ${razorpayX.payoutId} was sent but couldn't be saved. Don't resend — check the RazorpayX dashboard.` },
        { status: 500 },
      );
    }
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  if (razorpayX?.status === "Failed") {
    return Response.json(
      { error: `Razorpay couldn't send it: ${razorpayX.failureReason}` },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    advance: {
      ...row,
      status: razorpayX?.status === "Processing" ? ("Processing" as const) : ("Paid" as const),
      paidAmount: record.amount,
      method: record.method,
      reference: record.reference,
      paidAt: record.paidAt,
    },
  });
}
