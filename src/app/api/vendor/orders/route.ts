import { requireRole } from "@/lib/auth";
import { createStore } from "@/lib/store";
import { findVendorByOwner } from "@/lib/vendorMenus";
import type { StoredOrder } from "@/app/api/bookings/route";
import { orderMatchesVendor, toVendorOrderSummary } from "@/lib/vendorOrders";

export const dynamic = "force-dynamic";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

/**
 * GET /api/vendor/orders
 * Returns all bookings associated with the authenticated vendor,
 * categorized into pending and confirmed/upcoming pipelines.
 */
export async function GET() {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  try {
    const vendor = await findVendorByOwner(guard.id);
    if (!vendor) {
      return Response.json({
        pending: [],
        confirmed: [],
        completed: [],
        cancelled: [],
        orders: [],
      });
    }

    const allBookings = (await bookingStore.list()).slice().reverse();
    const vendorBookings = allBookings.filter((b) => orderMatchesVendor(b, vendor));
    const mapped = vendorBookings.map(toVendorOrderSummary);

    // Buckets follow the vendor's response, not `status` (which tracks payment:
    // Pending = advance paid, balance due).
    const active = (o: (typeof mapped)[number]) =>
      (o.status === "Pending" || o.status === "Confirmed") && !o.vendorDeclined;
    const pending = mapped.filter((o) => active(o) && !o.vendorAcknowledged);
    const confirmed = mapped.filter((o) => active(o) && o.vendorAcknowledged);
    const completed = mapped.filter((o) => o.status === "Completed");
    const cancelled = mapped.filter(
      (o) => o.status === "Cancelled" || (o.vendorDeclined && o.status !== "Completed"),
    );

    return Response.json({
      pending,
      confirmed,
      completed,
      cancelled,
      orders: mapped,
    });
  } catch (err) {
    console.error("Failed to load vendor orders", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
