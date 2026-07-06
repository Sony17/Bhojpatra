import { listLiveVendorListings } from "@/lib/vendorMenus";

export const dynamic = "force-dynamic";

// GET /api/vendors → { vendors: VendorListing[] }
// Public: live (account-owned) vendors with a published menu, in the catalog
// card shape. The /vendors page merges these with the curated static listings.
export async function GET() {
  try {
    const vendors = await listLiveVendorListings();
    return Response.json({ vendors });
  } catch (err) {
    console.error("Failed to list live vendors", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
