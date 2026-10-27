/**
 * Vendor settlements — money Bhojpatra owes OUT to vendors for completed
 * bookings, the mirror image of the `payments` ledger (money coming IN from
 * customers).
 *
 * Settlement rows are not entered by anyone: they are DERIVED at read time from
 * the persisted bookings — every Completed booking's collected money, grouped
 * per vendor per event month. What we owe a vendor for a booking is what we
 * actually collected on it (`paid`) minus any refunds we processed back to the
 * customer; bookings where nothing was collected online (e.g. pure COD) have
 * nothing to settle through the platform and are skipped.
 *
 * Only the "Mark Settled" action persists anything: a snapshot of the payout
 * (vendor, period, bookings, amount, when and by whom) in the `settlements`
 * Postgres table, keyed by the same deterministic id the derivation produces —
 * so persisted status re-attaches to the derived row on every read.
 */
import { createStore, readSingleton } from "@/lib/store";
import { displayDate, store as refundStore } from "@/lib/refunds";
import type { StoredOrder } from "@/app/api/bookings/route";
import type { VendorAdvanceRow, VendorPayee, VendorSettlement } from "@/lib/admin/types";
import { readVendorApplications } from "@/lib/vendorApplications";
import {
  DEFAULT_VENDOR_ADVANCE_RULE,
  VENDOR_ADVANCE_SETTINGS_KEY,
  normalizeVendorAdvanceRule,
  vendorAdvanceFor,
  type VendorAdvanceRule,
  type VendorPayoutMethod,
} from "@/lib/vendorAdvance";

export interface StoredSettlement {
  /** Deterministic `STL-<YYYYMM>-<vendor-slug>` — same id the derivation
   *  produces for that vendor+period, so status merges back onto it. */
  id: string;
  vendor: string;
  /** Display month, e.g. "Nov 2026". */
  period: string;
  /** Sortable month key, e.g. "2026-11". */
  periodKey: string;
  /** Snapshot at settle time — the payout that was actually released. If more
   *  bookings complete in the period afterwards, the derived row can grow past
   *  this; the row stays Settled (the console shows live derived figures). */
  bookings: number;
  amount: number;
  status: "Settled";
  /** Display date the payout was released, e.g. "20 Jul 2026". */
  settledAt: string;
  /** ISO timestamp behind `settledAt`. */
  createdAt: string;
  /** Admin user id that released it, for audit. */
  settledBy?: string;
  /** How the payout was sent (Razorpay / UPI / bank) and its UTR/reference. */
  method?: VendorPayoutMethod;
  reference?: string;
  /** Set when sent through RazorpayX from the console (see vendorPayouts). */
  razorpayX?: RazorpayXState;
}

/** Live state of a payout sent through RazorpayX. A Failed one no longer
 *  counts as paid, so the admin can retry it. Manual records have none. */
export interface RazorpayXState {
  payoutId: string;
  status: "Processing" | "Paid" | "Failed";
  /** Razorpay's raw status (queued / processing / processed / reversed …). */
  rawStatus: string;
  mode: string;
  /** Bank UTR once processed. */
  utr?: string;
  failureReason?: string;
  /** 1, 2, … — each retry uses a fresh idempotency key. */
  attempt: number;
  updatedAt: string;
}

/** True when a stored payout still counts as money sent (not a failed send). */
export const isLivePayout = (r: { razorpayX?: RazorpayXState }) =>
  r.razorpayX?.status !== "Failed";

/**
 * A vendor ADVANCE released before the event, for one booking. Lives in the
 * same `settlements` table as the period payouts (no extra DDL), told apart by
 * its `ADV-<bookingId>` id. One advance per booking.
 */
export interface StoredVendorAdvance {
  /** `ADV-<bookingId>`. */
  id: string;
  kind: "advance";
  bookingId: string;
  vendor: string;
  amount: number;
  method: VendorPayoutMethod;
  /** Razorpay payout id / UPI or bank UTR, as the admin entered it. */
  reference: string;
  /** Display date it was paid out, e.g. "25 Oct 2026". */
  paidAt: string;
  /** ISO timestamp behind `paidAt`. */
  createdAt: string;
  paidBy?: string;
  razorpayX?: RazorpayXState;
}

export const settlementStore = createStore<StoredSettlement>({
  table: "settlements",
  idField: "id",
});

export const vendorAdvanceStore = createStore<StoredVendorAdvance>({
  table: "settlements",
  idField: "id",
});

export function vendorAdvanceId(bookingId: string): string {
  return `ADV-${bookingId}`;
}

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function vendorSlug(vendor: string): string {
  return (
    vendor
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vendor"
  );
}

/** The event month a booking settles under — the event date where known,
 *  falling back to when the booking was placed. */
function periodOf(order: StoredOrder): { key: string; label: string } | null {
  const iso = order.eventDateISO || order.createdAt;
  const m = /^(\d{4})-(\d{2})/.exec(iso ?? "");
  if (!m) return null;
  const monthIndex = Number(m[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;
  return { key: `${m[1]}-${m[2]}`, label: `${MONTHS[monthIndex]} ${m[1]}` };
}

export function settlementId(vendor: string, periodKey: string): string {
  return `STL-${periodKey.replace("-", "")}-${vendorSlug(vendor)}`;
}

/** Recover the sortable "YYYY-MM" period key from a settlement id. */
export function periodKeyOfId(id: string): string {
  const m = /^STL-(\d{4})(\d{2})-/.exec(id);
  return m ? `${m[1]}-${m[2]}` : "";
}

/**
 * Derive the current settlement rows from the persisted bookings and merge the
 * persisted Settled statuses on top. Newest period first, then vendor A→Z.
 */
/** Money already returned to customers, per booking — a processed refund
 *  comes out of what we'd otherwise owe the vendor. */
async function processedRefundsByBooking(): Promise<Map<string, number>> {
  const refundedByBooking = new Map<string, number>();
  try {
    for (const r of await refundStore.list()) {
      if (r.status !== "Processed") continue;
      refundedByBooking.set(
        r.bookingId,
        (refundedByBooking.get(r.bookingId) ?? 0) + (Number(r.amount) || 0),
      );
    }
  } catch {
    // No refunds table / transient failure — derive without the deduction.
  }
  return refundedByBooking;
}

/** Ids of settlement rows an admin has marked Settled. Before the
 *  `settlements` table exists, nothing is settled. */
async function settledSettlementIds(): Promise<Set<string>> {
  const settledIds = new Set<string>();
  try {
    for (const s of await settlementStore.list()) {
      if (s.id.startsWith("STL-") && isLivePayout(s)) settledIds.add(s.id);
    }
  } catch {
    // Table missing / transient failure — show all rows as Pending.
  }
  return settledIds;
}

/** Vendor advances already paid out (or on their way), keyed by booking id.
 *  `includeFailed` also returns failed RazorpayX sends, for the console. */
export async function paidAdvancesByBooking(
  includeFailed = false,
): Promise<Map<string, StoredVendorAdvance>> {
  const byBooking = new Map<string, StoredVendorAdvance>();
  try {
    for (const r of await vendorAdvanceStore.list()) {
      if (r.kind !== "advance" || !r.bookingId) continue;
      if (includeFailed || isLivePayout(r)) byBooking.set(r.bookingId, r);
    }
  } catch {
    // Table missing / transient failure — treat as no advances paid.
  }
  return byBooking;
}

/** Each vendor's payout account, keyed by lower-cased business name (bookings
 *  carry the vendor's display name, not an id). The newest application wins. */
async function payeesByVendor(): Promise<Map<string, VendorPayee>> {
  const byName = new Map<string, VendorPayee>();
  try {
    const apps = (await readVendorApplications())
      .filter((a) => a.payoutAccount || a.upiQrDocId)
      .sort((a, b) => (a.submittedAt ?? "").localeCompare(b.submittedAt ?? ""));
    for (const a of apps) {
      const verified = (kind: string) =>
        a.documents.find((d) => d.kind === kind)?.status === "Verified";
      byName.set(a.business.trim().toLowerCase(), {
        ...a.payoutAccount,
        bankVerified: verified("Bank Account"),
        upiVerified: verified("UPI"),
        ...(a.upiQrDocId ? { upiQrUrl: `/api/vendors/kyc/${a.upiQrDocId}` } : {}),
      });
    }
  } catch {
    // Applications unavailable — rows simply show no payee.
  }
  return byName;
}

const payeeOf = (payees: Map<string, VendorPayee>, vendor: string) =>
  payees.get(vendor.trim().toLowerCase());

/** The admin's current advance rule (off until configured). */
export async function readVendorAdvanceRule(): Promise<VendorAdvanceRule> {
  try {
    const stored = await readSingleton<VendorAdvanceRule>(VENDOR_ADVANCE_SETTINGS_KEY);
    return normalizeVendorAdvanceRule(stored ?? DEFAULT_VENDOR_ADVANCE_RULE);
  } catch {
    return DEFAULT_VENDOR_ADVANCE_RULE;
  }
}

/** What a Completed booking still owes its vendor: collected money, minus
 *  refunds, minus any advance already released. */
function balanceOwed(
  order: StoredOrder,
  refunded: Map<string, number>,
  advances: Map<string, StoredVendorAdvance>,
): number {
  return (
    (Number(order.paid) || 0) -
    (refunded.get(order.id) ?? 0) -
    (Number(advances.get(order.id)?.amount) || 0)
  );
}

/**
 * What Bhojpatra still owes a vendor across the given bookings, by the same
 * rules as `deriveSettlements`: Completed bookings' collected money minus
 * processed refunds and advances already paid, excluding months an admin has
 * already marked Settled.
 */
export async function pendingPayoutFor(orders: StoredOrder[]): Promise<number> {
  const [refunded, settledIds, advances] = await Promise.all([
    processedRefundsByBooking(),
    settledSettlementIds(),
    paidAdvancesByBooking(),
  ]);
  let total = 0;
  for (const order of orders) {
    if (order.status !== "Completed" || !order.vendor) continue;
    const period = periodOf(order);
    if (!period || settledIds.has(settlementId(order.vendor, period.key))) continue;
    const net = balanceOwed(order, refunded, advances);
    if (net > 0) total += net;
  }
  return total;
}

/**
 * Bookings a vendor advance can be (or has been) released on: every live,
 * vendor-assigned booking that isn't Cancelled — Confirmed ones are where an
 * advance is normally paid; Completed ones still show so a paid advance stays
 * visible until its period settles. Newest event first.
 */
export async function deriveVendorAdvances(): Promise<{
  rule: VendorAdvanceRule;
  advances: VendorAdvanceRow[];
}> {
  const [orders, refunded, stored, rule, payees] = await Promise.all([
    bookingStore.list(),
    processedRefundsByBooking(),
    paidAdvancesByBooking(true),
    readVendorAdvanceRule(),
    payeesByVendor(),
  ]);

  const rows: VendorAdvanceRow[] = [];
  for (const order of orders) {
    if (!order.vendor || order.awaitingPayment || order.vendorDeclined) continue;
    const record = stored.get(order.id);
    // A failed RazorpayX send isn't money out — the row is Pending again.
    const advance = record && isLivePayout(record) ? record : undefined;
    const failed = record?.razorpayX?.status === "Failed" ? record.razorpayX : undefined;
    // Pending (advance not in yet) / Cancelled bookings only show once an
    // advance went out on them — then they're money to recover.
    if (!advance && order.status !== "Confirmed") continue;
    const collected = Math.max(
      0,
      (Number(order.paid) || 0) - (refunded.get(order.id) ?? 0),
    );
    rows.push({
      id: vendorAdvanceId(order.id),
      bookingId: order.id,
      vendor: order.vendor,
      customer: order.customer,
      eventDate: order.date,
      eventDateISO: order.eventDateISO ?? "",
      bookingStatus: order.status,
      bookingAmount: Number(order.amount) || 0,
      collected,
      suggested: vendorAdvanceFor(rule, Number(order.amount) || 0),
      status: !advance
        ? "Pending"
        : advance.razorpayX?.status === "Processing"
          ? "Processing"
          : "Paid",
      payee: payeeOf(payees, order.vendor),
      ...(advance && {
        paidAmount: advance.amount,
        method: advance.method,
        reference: advance.razorpayX?.utr || advance.reference,
        paidAt: advance.paidAt,
      }),
      ...(failed && { lastFailure: failed.failureReason || "Payout failed" }),
    });
  }
  rows.sort((a, b) => b.eventDateISO.localeCompare(a.eventDateISO));
  return { rule, advances: rows };
}

function settlementStatus(s: StoredSettlement | undefined): VendorSettlement["status"] {
  if (!s || !isLivePayout(s)) return "Pending";
  return s.razorpayX?.status === "Processing" ? "Processing" : "Settled";
}

export async function deriveSettlements(): Promise<VendorSettlement[]> {
  const [orders, refundedByBooking, advances, payees] = await Promise.all([
    bookingStore.list(),
    processedRefundsByBooking(),
    paidAdvancesByBooking(),
    payeesByVendor(),
  ]);

  const groups = new Map<
    string,
    {
      vendor: string;
      period: string;
      periodKey: string;
      bookings: number;
      amount: number;
      advancePaid: number;
    }
  >();

  for (const order of orders) {
    if (order.status !== "Completed" || !order.vendor) continue;
    const period = periodOf(order);
    if (!period) continue;

    const net =
      (Number(order.paid) || 0) - (refundedByBooking.get(order.id) ?? 0);
    if (net <= 0) continue;
    // An advance released before the event comes off this booking's balance.
    const advancePaid = Math.min(net, Number(advances.get(order.id)?.amount) || 0);

    const id = settlementId(order.vendor, period.key);
    const group = groups.get(id) ?? {
      vendor: order.vendor,
      period: period.label,
      periodKey: period.key,
      bookings: 0,
      amount: 0,
      advancePaid: 0,
    };
    group.bookings += 1;
    group.amount += net - advancePaid;
    group.advancePaid += advancePaid;
    groups.set(id, group);
  }

  // Persisted Settled rows re-attach by id (a failed RazorpayX send doesn't).
  const settledById = new Map<string, StoredSettlement>();
  try {
    for (const s of await settlementStore.list()) {
      if (s.id.startsWith("STL-")) settledById.set(s.id, s);
    }
  } catch {
    // Table missing / transient failure — show all rows as Pending.
  }

  return [...groups.values()]
    .sort((a, b) =>
      a.periodKey === b.periodKey
        ? a.vendor.localeCompare(b.vendor)
        : b.periodKey.localeCompare(a.periodKey),
    )
    .map((g) => {
      const id = settlementId(g.vendor, g.periodKey);
      return {
        id,
        vendor: g.vendor,
        bookings: g.bookings,
        amount: g.amount,
        advancePaid: g.advancePaid,
        status: settlementStatus(settledById.get(id)),
        period: g.period,
        ...(settledById.get(id)?.razorpayX?.status === "Failed" && {
          lastFailure: settledById.get(id)!.razorpayX!.failureReason || "Payout failed",
        }),
        payee: payeeOf(payees, g.vendor),
      };
    });
}

export { displayDate };
