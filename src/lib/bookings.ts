/**
 * Client-side store for the customer's own bookings.
 *
 * There's no bookings backend yet — when a guest completes the booking wizard
 * we persist the order in localStorage so it shows up on the My Bookings page
 * (/bookings). The list starts empty; only feasts the user actually books
 * appear. Each record carries a pre-built plain-text receipt so the "Download"
 * action can export that one order on its own.
 */

import type { Booking } from "@/lib/data";

/** A booked order, plus the receipt text used by the per-order download. */
export interface StoredBooking extends Booking {
  /** Plain-text order summary — what "Download" saves for this booking alone. */
  receipt: string;
}

const KEY = "bhojpatra.bookings";

/** Notify any open My Bookings view that the stored list changed. */
const CHANGED_EVENT = "bhojpatra:bookings-changed";

export function getStoredBookings(): StoredBooking[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredBooking[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Prepend a new booking so the most recent order shows first. */
export function addStoredBooking(booking: StoredBooking): void {
  if (typeof window === "undefined") return;
  try {
    const next = [booking, ...getStoredBookings().filter((b) => b.id !== booking.id)];
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CHANGED_EVENT));
  } catch {
    /* storage unavailable (private mode) — ignore for the mock */
  }
}

/** Subscribe to stored-booking changes (same tab + other tabs). Returns an
 *  unsubscribe function. */
export function onStoredBookingsChange(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const storage = (e: StorageEvent) => {
    if (e.key === KEY) listener();
  };
  window.addEventListener(CHANGED_EVENT, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(CHANGED_EVENT, listener);
    window.removeEventListener("storage", storage);
  };
}

/** Trigger a browser download of a single order's receipt as a .txt file. */
export function downloadReceipt(booking: Pick<StoredBooking, "id" | "receipt">): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([booking.receipt], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Bhojpatra-${booking.id}.txt`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
