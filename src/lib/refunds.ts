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
import type {
  AdminRefund,
  CustomerRefund,
  PaymentMethod,
  RefundPayoutTo,
  RefundStatus,
} from "@/lib/admin/types";
import {
  ACCOUNT_NUMBER_RE,
  IFSC_RE,
  maskAccountNumber,
  UPI_RE,
  normalizeAccountNumber,
  normalizeIfsc,
  normalizeUpi,
} from "@/lib/payoutAccount";

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
  /** Who opened it — absent on older rows, which were all customer-raised. */
  raisedBy?: "customer" | "admin";
  /** Razorpay refund id (`rfnd_…`) of the first gateway refund — kept for
   *  older rows; {@link gatewayRefunds} is the full list. */
  gatewayRefundId?: string;
  /** Every Razorpay refund this request issued (one per captured payment it
   *  was spread across), with Razorpay's latest status for each. */
  gatewayRefunds?: GatewayRefundLeg[];
  /** Rupees paid out by hand (recorded with {@link payoutRef}) — the part
   *  Razorpay couldn't send back, or all of it for UPI / QR bookings. */
  manualAmount?: number;
  /** Set when Razorpay reported a refund failed and the request reopened. */
  gatewayFailure?: string;
  /** Where a manual (non-Razorpay) refund should be sent — given by the
   *  customer when they raise it. Razorpay refunds need none: the money goes
   *  back to the instrument the customer paid with. */
  payoutTo?: RefundPayoutTo;
  /** UTR / transaction reference of the manual payout, entered by the admin
   *  when marking a non-gateway refund Processed. */
  payoutRef?: string;
}

/** One Razorpay refund issued for a request. `pending` until Razorpay's
 *  refund.processed webhook confirms the money left. */
export interface GatewayRefundLeg {
  id: string;
  paymentId: string;
  /** Rupees. */
  amount: number;
  status: "pending" | "processed" | "failed";
}

/** Rupees already sent back via Razorpay (pending or landed) on a request. */
export function gatewayRefunded(r: Pick<StoredRefund, "gatewayRefunds">): number {
  return (r.gatewayRefunds ?? [])
    .filter((l) => l.status !== "failed")
    .reduce((sum, l) => sum + l.amount, 0);
}

/** A processed refund whose Razorpay money hasn't landed yet. */
export function isGatewayPending(r: Pick<StoredRefund, "status" | "gatewayRefunds">): boolean {
  return r.status === "Processed" && !!r.gatewayRefunds?.some((l) => l.status === "pending");
}

/** Next free `RFD-<year>NNNN` id. Derived from the highest existing number,
 *  not the row count, so a deleted row can never make two refunds share an
 *  id (the upsert would silently overwrite the older one). */
export function nextRefundId(existing: { id: string }[], now: Date): string {
  const prefix = `RFD-${now.getFullYear()}`;
  const max = existing.reduce((m, r) => {
    if (!r.id.startsWith(prefix)) return m;
    const n = Number(r.id.slice(prefix.length));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
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

const str = (v: unknown, max: number) =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** Parse + validate where a manual refund should be paid. Returns the payout
 *  destination, `null` when nothing was given, or an error message. */
export function parseRefundPayout(
  v: unknown,
): RefundPayoutTo | null | { error: string } {
  if (!v || typeof v !== "object" || Array.isArray(v)) return null;
  const raw = v as Record<string, unknown>;
  const upi = normalizeUpi(str(raw.upiId, 120));
  if (upi) {
    return UPI_RE.test(upi)
      ? { upiId: upi }
      : { error: "That UPI ID doesn't look right (e.g. name@okhdfcbank)." };
  }
  const accountNumber = normalizeAccountNumber(str(raw.accountNumber, 30));
  const ifsc = normalizeIfsc(str(raw.ifsc, 20));
  const holderName = str(raw.holderName, 100);
  if (!accountNumber && !ifsc && !holderName) return null;
  if (!holderName) return { error: "Add the account holder's name." };
  if (!ACCOUNT_NUMBER_RE.test(accountNumber)) {
    return { error: "Account number must be 9–18 digits." };
  }
  if (!IFSC_RE.test(ifsc)) return { error: "Invalid IFSC (e.g. HDFC0001234)." };
  return { holderName, accountNumber, ifsc };
}

/** UTR / reference for a manual payout: 6–40 letters, digits or dashes. */
export function parsePayoutRef(v: unknown): string {
  const ref = str(v, 40).replace(/\s/g, "");
  return /^[A-Za-z0-9-]{6,40}$/.test(ref) ? ref : "";
}

/** One-line description of a payout destination, e.g. for emails. */
export function describePayout(p: RefundPayoutTo): string {
  return p.upiId
    ? `UPI ${p.upiId}`
    : `A/c ${maskAccountNumber(p.accountNumber ?? "")} · ${p.ifsc} (${p.holderName})`;
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
    ...(r.gatewayRefundId ? { gatewayRefundId: r.gatewayRefundId } : {}),
    ...(r.gatewayRefunds?.length ? { gatewayRefunds: r.gatewayRefunds } : {}),
    ...(isGatewayPending(r) ? { gatewayPending: true } : {}),
    ...(r.gatewayFailure ? { gatewayFailure: r.gatewayFailure } : {}),
    ...(r.payoutTo ? { payoutTo: r.payoutTo } : {}),
    ...(r.payoutRef ? { payoutRef: r.payoutRef } : {}),
    ...(r.manualAmount ? { manualAmount: r.manualAmount } : {}),
    ...(r.adminNote ? { adminNote: r.adminNote } : {}),
  };
}

/** The customer's own view of a refund — status and where the money went,
 *  never the admin's internal note. */
export function toCustomerRefund(r: StoredRefund): CustomerRefund {
  return {
    id: r.id,
    bookingId: r.bookingId,
    amount: r.amount,
    method: r.method,
    status: r.status,
    requestedAt: r.requestedAt,
    createdAt: r.createdAt,
    ...(r.processedAt ? { processedAt: r.processedAt } : {}),
    ...(r.gatewayRefundId ? { gatewayRefundId: r.gatewayRefundId } : {}),
    ...(gatewayRefunded(r) ? { gatewayAmount: gatewayRefunded(r) } : {}),
    ...(isGatewayPending(r) ? { gatewayPending: true } : {}),
    ...(r.payoutRef ? { payoutRef: r.payoutRef } : {}),
    ...(r.manualAmount ? { manualAmount: r.manualAmount } : {}),
    ...(r.payoutTo ? { payoutTo: describePayout(r.payoutTo) } : {}),
  };
}
