/**
 * A signed-in customer's own bookings — the DB-backed replacement for the
 * former localStorage "My Bookings" list.
 *
 * Returns only orders owned by the current session user (matched on the
 * server-captured `userId`), newest first. Also runs the past-event
 * auto-complete sweep here (a Confirmed order — i.e. one whose advance is
 * actually in — whose event date has fully passed in IST flips to Completed
 * unless the customer explicitly reopened it) so the review flow opens without
 * any client-side bookkeeping. An unpaid Pending order is never completed.
 */
import { createStore } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import type { StoredOrder } from "../route";
import { bookingStatusFor, isPastEventIST } from "@/lib/bookingRules";

export const dynamic = "force-dynamic";

const store = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

// GET /api/bookings/mine → { orders } — the customer's own orders, newest first.
export async function GET() {
  const guard = await requireRole();
  if (guard instanceof Response) return guard;
  const user = guard;

  const mine = (await store.list()).filter((o) => o.userId === user.id);

  // Auto-complete past-event confirmed orders (persisted, so it sticks). The
  // paid check also guards legacy rows that were stored Confirmed with ₹0.
  for (const o of mine) {
    if (
      o.status === "Confirmed" &&
      bookingStatusFor(o.amount, o.paid) === "Confirmed" &&
      !o.reopened &&
      isPastEventIST(o)
    ) {
      o.status = "Completed";
      try {
        await store.upsert(o);
      } catch (err) {
        console.error("Failed to auto-complete booking", o.id, err);
      }
    }
  }

  return Response.json({ orders: mine.slice().reverse() });
}
