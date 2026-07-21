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
import { createStore } from "@/lib/store";
import { displayDate, store as refundStore } from "@/lib/refunds";
import type { StoredOrder } from "@/app/api/bookings/route";
import type { VendorSettlement } from "@/lib/admin/types";

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
}

export const settlementStore = createStore<StoredSettlement>({
  table: "settlements",
  idField: "id",
});

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
export async function deriveSettlements(): Promise<VendorSettlement[]> {
  const orders = await bookingStore.list();

  // Money already returned to customers, per booking — a processed refund comes
  // out of what we'd otherwise owe the vendor.
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

  const groups = new Map<
    string,
    { vendor: string; period: string; periodKey: string; bookings: number; amount: number }
  >();

  for (const order of orders) {
    if (order.status !== "Completed" || !order.vendor) continue;
    const period = periodOf(order);
    if (!period) continue;

    const net =
      (Number(order.paid) || 0) - (refundedByBooking.get(order.id) ?? 0);
    if (net <= 0) continue;

    const id = settlementId(order.vendor, period.key);
    const group = groups.get(id) ?? {
      vendor: order.vendor,
      period: period.label,
      periodKey: period.key,
      bookings: 0,
      amount: 0,
    };
    group.bookings += 1;
    group.amount += net;
    groups.set(id, group);
  }

  // Persisted Settled rows re-attach by id. Before the `settlements` table has
  // been created in the database, everything simply reads as Pending.
  const settledIds = new Set<string>();
  try {
    for (const s of await settlementStore.list()) settledIds.add(s.id);
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
        status: settledIds.has(id) ? ("Settled" as const) : ("Pending" as const),
        period: g.period,
      };
    });
}

export { displayDate };
