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
import { readDayAvailability, readVendorAvailability } from "@/lib/vendorAvailabilityServer";
import { isIsoDate } from "@/lib/vendorAvailability";

// Reads live orders — never prerender or cache.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id")?.trim();
  // The caller's own in-progress order (its booking id), left off the
  // calendar. Only ever frees a day in this caller's view — the booking POST
  // still checks every other order.
  const exclude = params.get("exclude")?.trim() ?? "";
  // ?ids=a,b,c&date=YYYY-MM-DD[&meal=] — several vendors on one date, for the
  // /vendors stall cards: `{ unavailable: { [id]: "blocked" | "day" | "slot" } }`.
  const ids = params.get("ids");
  if (ids !== null) {
    const date = params.get("date") ?? "";
    if (!isIsoDate(date)) {
      return Response.json({ error: "Missing date." }, { status: 400 });
    }
    const list = [...new Set(ids.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 100);
    try {
      return Response.json({
        unavailable: await readDayAvailability(list, date, params.get("meal") ?? ""),
      });
    } catch (err) {
      console.error("Failed to read vendor availability", err);
      return Response.json(
        { error: "Couldn't load availability. Please try again." },
        { status: 500 },
      );
    }
  }
  if (!id) {
    return Response.json({ error: "Missing vendor id." }, { status: 400 });
  }
  try {
    // An id with no vendor record (a curated listing bridged by name) simply
    // has nothing on its calendar yet.
    const vendor = (await findVendorById(id)) ?? { id };
    return Response.json(await readVendorAvailability(vendor, new Date(), exclude));
  } catch (err) {
    console.error("Failed to read vendor availability", err);
    return Response.json(
      { error: "Couldn't load availability. Please try again." },
      { status: 500 },
    );
  }
}
