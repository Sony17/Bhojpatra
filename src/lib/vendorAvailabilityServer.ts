/**
 * Server side of the Single Stall availability calendar (see
 * `vendorAvailability.ts`): reads the live bookings and the vendor's own
 * days off into one `VendorAvailability`.
 */
import { createStore } from "@/lib/store";
import type { StoredOrder } from "@/app/api/bookings/route";
import type { LiveVendorRecord } from "@/lib/vendorMenus";
import {
  bookedDays,
  cleanBlockedDates,
  todayIsoIST,
  type VendorAvailability,
} from "@/lib/vendorAvailability";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

export async function readVendorAvailability(
  vendor: Pick<LiveVendorRecord, "id" | "blockedDates" | "maxEventsPerDay">,
  now: Date = new Date(),
): Promise<VendorAvailability> {
  const orders = await bookingStore.list();
  return {
    blocked: cleanBlockedDates(vendor.blockedDates, todayIsoIST(now)),
    booked: bookedDays(orders, vendor.id, {
      maxEventsPerDay: vendor.maxEventsPerDay,
      now,
    }),
  };
}
