/**
 * Helper utilities for vendor order querying and matching.
 *
 * Bridges the central `bookings` store (`StoredOrder`) into vendor-scoped order
 * projections for the Vendor Dashboard Orders & Pipeline workflows.
 */
import type { BookingStatus } from "@/lib/data";
import type { InvoiceData } from "@/lib/invoice";
import type { LiveVendorRecord } from "@/lib/vendorMenus";
import type { StoredOrder } from "@/app/api/bookings/route";

export interface VendorOrderSummary {
  id: string;
  customer: string;
  phone: string;
  email?: string;
  occasion: string;
  date: string;
  eventDateISO?: string;
  mealTime?: string;
  eventTime?: string;
  foodPreference?: string;
  guests: number;
  vegGuests?: number;
  nonVegGuests?: number;
  city: string;
  venue?: string;
  amount: number;
  paid: number;
  paymentMethod: string;
  status: BookingStatus;
  createdAt: string;
  service?: { id: string; name: string; price: number };
  note?: string;
  receipt?: string;
  invoice?: InvoiceData;
  vendorAcknowledged?: boolean;
  acknowledgedAt?: string;
  vendorDeclined?: boolean;
  declinedAt?: string;
  vendorNotes?: string;
}

/**
 * Does a stored order belong to this live vendor? Matched on the vendor's own
 * id only: the booking wizards store each booked vendor as `{ id, name }`, and
 * a live vendor's catalogue id is its record id. Names are never used — a
 * business name is free text, so name matching would let a vendor who
 * registers under another caterer's name read that caterer's customers.
 */
export function orderMatchesVendor(
  order: StoredOrder,
  vendor: LiveVendorRecord,
): boolean {
  const vendorId = vendor?.id?.trim();
  if (!vendorId || !Array.isArray(order?.vendors)) return false;
  return order.vendors.some((v) => v?.id?.trim() === vendorId);
}

/** Map a stored order to the vendor order summary projection. */
export function toVendorOrderSummary(order: StoredOrder): VendorOrderSummary {
  return {
    id: order.id,
    customer: order.customer,
    phone: order.phone,
    email: order.email,
    occasion: order.occasion,
    date: order.date,
    eventDateISO: order.eventDateISO,
    mealTime: order.mealTime,
    eventTime: order.eventTime,
    foodPreference: order.foodPreference,
    guests: order.guests,
    vegGuests: order.vegGuests,
    nonVegGuests: order.nonVegGuests,
    city: order.city,
    venue: order.venue,
    amount: order.amount,
    paid: order.paid,
    paymentMethod: order.paymentMethod,
    status: order.status,
    createdAt: order.createdAt,
    service: order.service,
    note: order.note,
    receipt: order.receipt,
    invoice: order.invoice,
    vendorAcknowledged: order.vendorAcknowledged,
    acknowledgedAt: order.acknowledgedAt,
    vendorDeclined: order.vendorDeclined,
    declinedAt: order.declinedAt,
    vendorNotes: order.vendorNotes,
  };
}
