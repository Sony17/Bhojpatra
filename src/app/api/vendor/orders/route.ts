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

    const pending = mapped.filter((o) => o.status === "Pending");
    const confirmed = mapped.filter((o) => o.status === "Confirmed");
    const completed = mapped.filter((o) => o.status === "Completed");
    const cancelled = mapped.filter((o) => o.status === "Cancelled");

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
