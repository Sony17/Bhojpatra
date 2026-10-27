/**
 * Server side of the Single Stall availability calendar (see
 * `vendorAvailability.ts`): reads the live bookings and the vendor's own
 * days off into one `VendorAvailability`.
 */
import { createStore } from "@/lib/store";
import type { StoredOrder } from "@/app/api/bookings/route";
import { findVendorById, type LiveVendorRecord } from "@/lib/vendorMenus";
import { slotConflict } from "@/lib/bookingRules";
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
  excludeOrderId = "",
): Promise<VendorAvailability> {
  const all = await bookingStore.list();
  const orders = excludeOrderId ? all.filter((o) => o.id !== excludeOrderId) : all;
  return {
    blocked: cleanBlockedDates(vendor.blockedDates, todayIsoIST(now)),
    booked: bookedDays(orders, vendor.id, {
      maxEventsPerDay: vendor.maxEventsPerDay,
      now,
    }),
  };
}

/**
 * An open Single Stall checkout holds no slot — the date goes to whoever pays
 * the advance first. So before money moves, re-check the slot against the
 * orders that DO hold one (paid, accepted, submitted pay-later): a checkout
 * whose slot was taken in the meantime is refused with the customer-facing
 * reason. Null when the payment may go ahead (or the order isn't a checkout).
 */
export async function checkoutSlotProblem(
  booking: Pick<StoredOrder, "id" | "awaitingPayment" | "eventDateISO" | "mealTime" | "vendors">,
): Promise<string | null> {
  const vendorId = booking.vendors?.[0]?.id;
  if (!booking.awaitingPayment || !booking.eventDateISO || !vendorId) return null;
  const vendor = await findVendorById(vendorId);
  const name = vendor?.business ?? booking.vendors?.[0]?.name ?? "This stall";
  if (cleanBlockedDates(vendor?.blockedDates, "").includes(booking.eventDateISO)) {
    return `${name} isn't taking orders on this date any more. Please pick another date or another stall.`;
  }
  const conflict = slotConflict(await bookingStore.list(), {
    id: booking.id,
    vendorId,
    eventDateISO: booking.eventDateISO,
    mealTime: booking.mealTime,
    maxEventsPerDay: vendor?.maxEventsPerDay,
  });
  if (!conflict) return null;
  return conflict === "slot"
    ? `Another customer just booked ${name} for ${booking.mealTime ? booking.mealTime.toLowerCase() : "that day"} on this date. Please pick another date or meal time, or another stall.`
    : `${name} just got fully booked on this date. Please pick another date or another stall.`;
}
