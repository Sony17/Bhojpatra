/**
 * Public Single Stall availability for one vendor — the days they're off and
 * the meal periods already taken.
 *
 * The /vendors "Book" hand-off and the stall wizard's date picker read this so
 * a customer sees a clash the moment they pick the vendor or the date, instead
 * of after building the whole order. Unauthenticated, so it returns dates and
 * meal periods only — never who booked or anything else on an order.
 */
import { findVendorById } from "@/lib/vendorMenus";
import { readVendorAvailability } from "@/lib/vendorAvailabilityServer";

// Reads live orders — never prerender or cache.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) {
    return Response.json({ error: "Missing vendor id." }, { status: 400 });
  }
  try {
    // An id with no vendor record (a curated listing bridged by name) simply
    // has nothing on its calendar yet.
    const vendor = (await findVendorById(id)) ?? { id };
    return Response.json(await readVendorAvailability(vendor));
  } catch (err) {
    console.error("Failed to read vendor availability", err);
    return Response.json(
      { error: "Couldn't load availability. Please try again." },
      { status: 500 },
    );
  }
}
