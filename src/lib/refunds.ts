/**
 * Refund requests — a customer-raised claim against a booking, with its own
 * lifecycle (Requested → Approved → Processed, or Declined at either step).
 * This is distinct from the `payments` ledger, which only records the raw money
 * movement a *processed* refund eventually produces.
 *
 * Persisted in the `refunds` Postgres table via the shared record store. The
 * admin Refund Management console reads these; the customer's My Bookings view
 * raises them. `toAdminRefund` maps a stored record onto the admin display shape
 * (`AdminRefund`) so the console can merge live rows over its demo seed the same
 * way the booking console does.
 */
import { createStore } from "@/lib/store";
import type { AdminRefund, PaymentMethod, RefundStatus } from "@/lib/admin/types";

/** Payment rails a refund can be returned over — mirrors the admin `PaymentMethod`. */
export type RefundMethod = PaymentMethod;

export interface StoredRefund {
  /** `RFD-XXXXXX`. */
  id: string;
  /** The booking this refund is claimed against (`BHJ-…`). */
  bookingId: string;
  /** The signed-in customer who raised it, captured server-side from the
   *  session (never trusted from the client). Authorises them to view it. */
  userId?: string;
  customer: string;
  email?: string;
  phone?: string;
  /** Amount claimed, in whole rupees. Capped server-side at what was paid. */
  amount: number;
  reason: string;
  /** Rail the refund would be returned over — derived from the booking's
   *  original payment where known. */
  method: RefundMethod;
  status: RefundStatus;
  /** Display date the request was raised, e.g. "16 Jul 2026". */
  requestedAt: string;
  /** ISO timestamp — the sortable source of truth behind `requestedAt`. */
  createdAt: string;
  /** Display date set once the refund reaches a terminal state. */
  processedAt?: string;
  /** Optional note the admin left when actioning it. */
  adminNote?: string;
}

export const store = createStore<StoredRefund>({
  table: "refunds",
  idField: "id",
});

const REFUND_STATUSES: RefundStatus[] = [
  "Requested",
  "Approved",
  "Processed",
  "Declined",
];

export function isRefundStatus(v: unknown): v is RefundStatus {
  return typeof v === "string" && (REFUND_STATUSES as string[]).includes(v);
}

/** Statuses that still consume staff attention — the dashboard's "Customer
 *  Refund Requests" KPI counts these. */
export function isOpenRefund(r: { status: RefundStatus }): boolean {
  return r.status === "Requested" || r.status === "Approved";
}

/** Allowed admin transitions. Terminal states (Processed / Declined) can't move. */
const TRANSITIONS: Record<RefundStatus, RefundStatus[]> = {
  Requested: ["Approved", "Declined", "Requested"],
  Approved: ["Processed", "Declined", "Approved"],
  Processed: ["Processed"],
  Declined: ["Declined"],
};

export function canTransition(from: RefundStatus, to: RefundStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07-16T…" (or any Date) → "16 Jul 2026", matching the admin console's
 *  other date columns. */
export function displayDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Map a persisted refund onto the admin display shape. */
export function toAdminRefund(r: StoredRefund): AdminRefund {
  return {
    id: r.id,
    bookingId: r.bookingId,
    customer: r.customer,
    amount: r.amount,
    reason: r.reason,
    method: r.method,
    status: r.status,
    requestedAt: r.requestedAt,
    ...(r.processedAt ? { processedAt: r.processedAt } : {}),
  };
}
