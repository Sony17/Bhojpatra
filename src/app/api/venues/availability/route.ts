/**
 * Public availability for one venue — which dates are already taken.
 *
 * The venue detail page's calendar paints these red so a customer can see the
 * clashes before picking a date, instead of finding out after they've paid.
 *
 * Deliberately returns *only* dates: this endpoint is unauthenticated (anyone
 * looking at a venue page needs it), so it must never expose who booked, for
 * how much, or anything else on the order.
 */
import { createStore } from "@/lib/store";
import type { StoredOrder } from "@/app/api/bookings/route";
import type { VenueRecord } from "@/lib/venues";
import { staticBookableVenues } from "@/lib/venues";

// Reads live orders — never prerender or cache.
export const dynamic = "force-dynamic";

const bookingStore = createStore<StoredOrder>({
  table: "bookings",
  idField: "id",
});

const venueStore = createStore<VenueRecord>({
  table: "venues",
  idField: "id",
});

const MONTHS = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];

/**
 * Best-effort ISO date for an order. Newer orders persist `eventDateISO`;
 * older ones only kept the display string ("12 Dec 2026"), so parse that back
 * rather than dropping those bookings out of the calendar.
 */
function orderDateISO(order: StoredOrder): string {
  if (order.eventDateISO && /^\d{4}-\d{2}-\d{2}$/.test(order.eventDateISO)) {
    return order.eventDateISO;
  }
  const m = /^(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(
    (order.date ?? "").trim(),
  );
  if (!m) return "";
  const month = MONTHS.indexOf(m[2].toLowerCase());
  if (month < 0) return "";
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Loose name match — venue bookings store the name on `vendor` / `venue`. */
function sameName(a: string | undefined, b: string): boolean {
  return !!a && a.trim().toLowerCase() === b.toLowerCase();
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ error: "Missing venue id." }, { status: 400 });
  }

  // Resolve the venue's name so we also catch orders that only recorded it by
  // name — the catering wizard writes the venue as a plain `venue` string.
  const record = await venueStore.get(id);
  const name = (
    record?.name ?? staticBookableVenues.find((v) => v.id === id)?.name ?? ""
  ).toLowerCase();

  const orders = await bookingStore.list();
  const dates = new Set<string>();
  for (const o of orders) {
    // A cancelled booking frees its date back up.
    if (o.status === "Cancelled") continue;
    const mine =
      o.vendors?.some((v) => v.id === id) ||
      (!!name && (sameName(o.venue, name) || sameName(o.vendor, name)));
    if (!mine) continue;
    const iso = orderDateISO(o);
    if (iso) dates.add(iso);
  }

  return Response.json({ dates: [...dates].sort() });
}
