// Razorpay audit log — every gateway API call and every webhook event leaves a
// trace, both in the server log (always) and in the `payment_events` table
// (best-effort). Nothing here may ever throw into a payment path: a logging
// failure must not turn a captured payment into an error for the customer.
//
// Rows hold a PII-free summary only (ids, amounts, statuses, error codes) —
// never the customer's email/phone that Razorpay echoes back in its entities.

import { randomUUID } from "crypto";
import { createStore } from "@/lib/store";

export interface PaymentEvent {
  /** `API-…` for an outbound call, `EVT-<razorpay event id>` for a webhook. */
  id: string;
  kind: "api" | "webhook";
  createdAt: string;
  // API calls
  method?: string;
  path?: string;
  httpStatus?: number;
  durationMs?: number;
  ok?: boolean;
  // Webhooks
  event?: string;
  eventId?: string;
  /** What the handler did: "recorded", "duplicate", "skipped:<why>", "error". */
  outcome?: string;
  bookingId?: string;
  // Shared summary of the entity involved.
  summary?: Record<string, string | number | boolean>;
}

const store = createStore<PaymentEvent>({
  table: "payment_events",
  idField: "id",
});

// Entity fields safe to keep. Deliberately excludes email / contact / notes.
const SUMMARY_FIELDS = [
  "id",
  "entity",
  "status",
  "amount",
  "amount_refunded",
  "currency",
  "order_id",
  "payment_id",
  "method",
  "receipt",
  "error_code",
  "error_reason",
  "error_description",
] as const;

/** Reduce a Razorpay response/entity to its non-personal fields. */
export function summarize(data: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!data || typeof data !== "object") return out;
  const rec = data as Record<string, unknown>;
  for (const key of SUMMARY_FIELDS) {
    const v = rec[key];
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      out[key] = v;
    }
  }
  const err = rec.error as Record<string, unknown> | undefined;
  if (err && typeof err === "object") {
    if (typeof err.code === "string") out.error_code = err.code;
    if (typeof err.description === "string") out.error_description = err.description;
  }
  return out;
}

export function newApiEventId(): string {
  return `API-${Date.now()}-${randomUUID().slice(0, 8)}`;
}

/** Write one audit row. Logs to the console too, so a missing table loses nothing. */
export async function logPaymentEvent(event: PaymentEvent): Promise<void> {
  const line =
    event.kind === "api"
      ? `[razorpay] ${event.method} ${event.path} → ${event.httpStatus ?? "network-error"} in ${event.durationMs}ms`
      : `[razorpay] webhook ${event.event} (${event.eventId ?? "no-id"}) → ${event.outcome}`;
  const details = JSON.stringify({ ...event.summary, bookingId: event.bookingId });
  if (event.ok === false || event.outcome === "error") console.error(line, details);
  else console.info(line, details);

  try {
    await store.upsert(event);
  } catch (err) {
    console.error("[razorpay] could not persist payment event", event.id, err);
  }
}

/** True when this webhook event id was already handled successfully — the
 *  handlers are idempotent anyway; this lets redeliveries short-circuit. A
 *  read failure answers false, so the event is simply processed again. */
export async function wasWebhookProcessed(eventId: string): Promise<boolean> {
  try {
    const prior = await store.get(`EVT-${eventId}`);
    return Boolean(prior && prior.outcome && prior.outcome !== "error");
  } catch {
    return false;
  }
}
