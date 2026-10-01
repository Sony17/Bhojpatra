/**
 * Helper utilities for vendor order querying and matching.
 *
 * Bridges the central `bookings` store (`StoredOrder`) into vendor-scoped order
 * projections for the Vendor Dashboard Orders & Pipeline workflows.
 */
import type { BookingStatus } from "@/lib/data";
import type { InvoiceData } from "@/lib/invoice";
import { slugifyName } from "@/lib/bookings";
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
  vendorNotes?: string;
}

/** Check if a stored order belongs to the given live vendor record. */
export function orderMatchesVendor(
  order: StoredOrder,
  vendor: LiveVendorRecord,
): boolean {
  if (!vendor || !order) return false;
  const vendorId = (vendor.id ?? "").trim().toLowerCase();
  const businessName = (vendor.business ?? "").trim().toLowerCase();
  const businessSlug = slugifyName(vendor.business ?? "");

  // 1. Structured vendors array
  if (Array.isArray(order.vendors) && order.vendors.length > 0) {
    const matched = order.vendors.some((v) => {
      if (!v) return false;
      const vId = (v.id ?? "").trim().toLowerCase();
      const vName = (v.name ?? "").trim().toLowerCase();
      const vSlug = slugifyName(v.name ?? "");
      return (
        (vId && vId === vendorId) ||
        (vName && vName === businessName) ||
        (vSlug && vSlug === businessSlug)
      );
    });
    if (matched) return true;
  }

  // 2. Comma-separated vendor label
  if (typeof order.vendor === "string" && order.vendor.trim()) {
    const vendorNames = order.vendor.split(",").map((s) => s.trim().toLowerCase());
    const matched = vendorNames.some((name) => {
      return (
        name === vendorId ||
        name === businessName ||
        slugifyName(name) === businessSlug
      );
    });
    if (matched) return true;
  }

  return false;
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
    vendorNotes: order.vendorNotes,
  };
}
