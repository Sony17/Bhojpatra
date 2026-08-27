/**
 * A signed-in customer's own bookings — the DB-backed replacement for the
 * former localStorage "My Bookings" list.
 *
 * Returns only orders owned by the current session user (matched on the
 * server-captured `userId`), newest first. Also runs the past-event
 * auto-complete sweep here (a Confirmed order whose event date has fully passed
 * flips to Completed unless the customer explicitly reopened it) so the review
 * flow opens without any client-side bookkeeping.
 */
import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import type { StoredOrder } from "../route";

export const dynamic = "force-dynamic";

const store = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** True when a "12 Dec 2026"-style label is strictly before today. Unparseable
 *  labels (e.g. "—") are treated as not-past so they're never auto-completed. */
function isPastEvent(label: string): boolean {
  const [d, mon, y] = label.split(" ");
  const m = MONTHS.indexOf(mon);
  const day = Number(d);
  const year = Number(y);
  if (m < 0 || !Number.isFinite(day) || !Number.isFinite(year)) return false;
  const event = new Date(year, m, day);
  event.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return event.getTime() < today.getTime();
}

import { signInvoiceId } from "@/lib/invoiceSign";

// GET /api/bookings/mine → { orders } — the customer's own orders, newest first.
export async function GET() {
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const user = guard;

  const mine = (await store.list()).filter((o) => o.userId === user.id);

  // Auto-complete past-event confirmed orders (persisted, so it sticks).
  for (const o of mine) {
    if (o.status === "Confirmed" && !o.reopened && isPastEvent(o.date)) {
      o.status = "Completed";
      try {
        await store.upsert(o);
      } catch (err) {
        console.error("Failed to auto-complete booking", o.id, err);
      }
    }
  }

  const enriched = mine
    .slice()
    .reverse()
    .map((o) => ({
      ...o,
      invoiceSig: signInvoiceId(o.id),
    }));

  return Response.json({ orders: enriched });
}
