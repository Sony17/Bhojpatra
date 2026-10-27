import { createHash } from "crypto";
import { razorpayXWebhookSecret, verifyWebhookSignature, type RazorpayXPayout } from "@/lib/razorpay";
import { applyPayoutUpdate } from "@/lib/vendorPayouts";
import { logPaymentEvent, summarize, wasWebhookProcessed } from "@/lib/paymentEvents";

// Signature-verified server-to-server events — never prerender or cache.
export const dynamic = "force-dynamic";

// RazorpayX payouts webhook — moves a vendor advance / settlement sent from
// the Settlements console from Processing to Paid (with the bank UTR) or
// Failed (retryable). Subscribe the RazorpayX webhook to payout.processed,
// payout.failed, payout.reversed, payout.rejected and payout.updated, pointed
// at https://<your-domain>/api/payouts/razorpay/webhook.
//
// The console also re-syncs in-flight payouts whenever it loads, so a missed
// event only delays the update. Idempotent: event ids are remembered in
// payment_events, and applying the same payout state twice is a no-op.
// Auth is the signature: HMAC of the raw body with RAZORPAYX_WEBHOOK_SECRET
// (or RAZORPAY_WEBHOOK_SECRET when one webhook secret serves both).

interface PayoutEvent {
  event?: string;
  payload?: { payout?: { entity?: RazorpayXPayout & { notes?: Record<string, string> | unknown[] } } };
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature, razorpayXWebhookSecret())) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: PayoutEvent;
  try {
    event = JSON.parse(rawBody) as PayoutEvent;
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const eventId =
    request.headers.get("x-razorpay-event-id") ||
    createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
  const name = event.event ?? "unknown";
  if (await wasWebhookProcessed(eventId)) {
    return Response.json({ ok: true, duplicate: true });
  }

  const payout = event.payload?.payout?.entity;
  const log = (outcome: string) =>
    logPaymentEvent({
      id: `EVT-${eventId}`,
      kind: "webhook",
      createdAt: new Date().toISOString(),
      event: name,
      eventId,
      outcome,
      summary: summarize(payout),
    });

  if (!name.startsWith("payout.") || !payout?.id) {
    await log(`skipped:${name}`);
    return Response.json({ ok: true, skipped: name });
  }

  // Our ref rides in the payout notes (reference_id is capped at 40 chars).
  const notes = payout.notes && !Array.isArray(payout.notes) ? payout.notes : {};
  const ref = (notes as Record<string, string>).ref || payout.reference_id || "";

  try {
    const updated = await applyPayoutUpdate(ref, payout);
    await log(updated ? `applied:${payout.status}` : "skipped:no-match");
    return Response.json({ ok: true });
  } catch (err) {
    // Storage failed — 5xx so RazorpayX redelivers; "error" isn't "processed".
    console.error(`Failed to handle RazorpayX webhook ${name}`, err);
    await log("error");
    return Response.json({ error: "Storage failed." }, { status: 500 });
  }
}
