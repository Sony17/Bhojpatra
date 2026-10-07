import { vendorListings } from "@/lib/data";
import {
  assembleMenuCategories,
  listLiveVendorListings,
  seedStallsHidden,
} from "@/lib/vendorMenus";
import { collectStalls, stallBriefsFor } from "@/lib/vendorStorefront";

export const dynamic = "force-dynamic";

// GET /api/vendors → { vendors: VendorListing[], stalls: Record<id, StallBrief | null> }
// Public: live (account-owned) vendors with something published, in the
// catalog card shape. The /vendors page merges these with the curated static
// listings. `stalls` covers BOTH (curated + live) and says which Single Stall
// each card's "Book" sells and at what per-plate price — resolved against the
// same `/api/menu` roster the stall wizard charges from (null = not bookable
// as a stall, so the card offers the right flow / an enquiry instead).
export async function GET() {
  try {
    const [vendors, categories, samplesHidden] = await Promise.all([
      listLiveVendorListings(),
      assembleMenuCategories(),
      seedStallsHidden(),
    ]);
    // `samplesHidden`: the admin has hidden the platform's demo vendors, so the
    // client must not merge the curated SAMPLE listings either.
    const stalls = stallBriefsFor(
      [...(samplesHidden ? [] : vendorListings), ...vendors],
      collectStalls(categories),
    );
    return Response.json({ vendors, stalls, samplesHidden });
  } catch (err) {
    console.error("Failed to list live vendors", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
