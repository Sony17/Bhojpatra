import { requireRole } from "@/lib/auth";
import {
  deriveSettlements,
  displayDate,
  periodKeyOfId,
  settlementStore,
  type StoredSettlement,
} from "@/lib/settlements";
import { VENDOR_PAYOUT_METHODS, type VendorPayoutMethod } from "@/lib/vendorAdvance";
import { isRazorpayXConfigured } from "@/lib/razorpay";
import { sendVendorPayout, type PayoutTarget } from "@/lib/vendorPayouts";

export const dynamic = "force-dynamic";

// PATCH /api/settlements/[id] → { status: "Settled", method?, reference? } —
// admin records a vendor's payout for a period (paid outside the app via the
// Razorpay dashboard / UPI / bank, with its payout id or UTR).
// { status: "Settled", send: true, target: "bank" | "upi" } instead SENDS the
// payout now through RazorpayX to the vendor's verified account. One-way: a Settled payout can't be reopened.
// What gets persisted is a snapshot of the derived row (vendor, period,
// bookings, amount) plus who released it and when, for audit.
export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const admin = guard;
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (body.status !== "Settled") {
    return Response.json({ error: "Invalid status." }, { status: 400 });
  }
  const send = body.send === true;
  const target: PayoutTarget = body.target === "upi" ? "upi" : "bank";
  if (send && !isRazorpayXConfigured()) {
    return Response.json(
      { error: "RazorpayX payouts aren't set up. Add RAZORPAYX_ACCOUNT_NUMBER." },
      { status: 400 },
    );
  }
  const method: VendorPayoutMethod | undefined = send
    ? "Razorpay"
    : VENDOR_PAYOUT_METHODS.includes(body.method as VendorPayoutMethod)
      ? (body.method as VendorPayoutMethod)
      : undefined;
  const reference =
    typeof body.reference === "string" ? body.reference.trim().slice(0, 120) : "";

  // The row must exist in the current derivation — you can only settle a payout
  // that real completed bookings actually produced.
  const settlements = await deriveSettlements();
  const row = settlements.find((s) => s.id === decodeURIComponent(id));
  if (!row) {
    return Response.json({ error: "Settlement not found." }, { status: 404 });
  }
  if (row.status !== "Pending") {
    return Response.json(
      {
        error:
          row.status === "Processing"
            ? "A Razorpay payout for this period is already on its way."
            : "This payout has already been settled.",
      },
      { status: 409 },
    );
  }
  if (send && row.amount <= 0) {
    return Response.json({ error: "Nothing left to pay for this period." }, { status: 400 });
  }

  let razorpayX: StoredSettlement["razorpayX"];
  if (send) {
    // A retry after a failed send gets a fresh idempotency key.
    const previous = await settlementStore.get(row.id).catch(() => null);
    const sent = await sendVendorPayout({
      ref: row.id,
      attempt: (previous?.razorpayX?.attempt ?? 0) + 1,
      vendor: row.vendor,
      amount: row.amount,
      target,
      narration: `Bhojpatra payout ${row.period}`,
    });
    if (!sent.ok) return Response.json({ error: sent.error }, { status: 502 });
    razorpayX = sent.state;
  }

  const now = new Date();
  const record: StoredSettlement = {
    id: row.id,
    vendor: row.vendor,
    period: row.period,
    periodKey: periodKeyOfId(row.id),
    bookings: row.bookings,
    amount: row.amount,
    status: "Settled",
    settledAt: displayDate(now),
    createdAt: now.toISOString(),
    settledBy: admin.id,
    ...(method && { method }),
    ...((razorpayX?.payoutId || reference) && { reference: razorpayX?.payoutId || reference }),
    ...(razorpayX ? { razorpayX } : {}),
  };

  try {
    await settlementStore.upsert(record);
  } catch (err) {
    console.error("Failed to persist settlement", err);
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
    settlement: {
      ...row,
      status: razorpayX?.status === "Processing" ? ("Processing" as const) : ("Settled" as const),
    },
  });
}
