import { requireRole } from "@/lib/auth";
import { listLiveVendorRecords } from "@/lib/vendorMenus";
import { listPhotosByOwner, photoUrl } from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

// GET /api/vendors/moderation → { vendors: [...] }
// Admin review queue: every live vendor's full published content (profile,
// menu with dish photos, gallery) plus their moderation status, newest first.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  try {
    const records = await listLiveVendorRecords();
    const vendors = await Promise.all(
      records.map(async (r) => ({
        id: r.id,
        business: r.business,
        city: r.city,
        state: r.state,
        cuisines: r.cuisines,
        about: r.about,
        priceFrom: r.priceFrom,
        image: r.image,
        verified: r.verified,
        moderation: r.moderation ?? "Pending",
        updatedAt: r.updatedAt,
        menu: r.menu,
        gallery: r.ownerUserId
          ? (await listPhotosByOwner(r.ownerUserId, "gallery")).map(photoUrl)
          : [],
      })),
    );
    vendors.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return Response.json({ vendors });
  } catch (err) {
    console.error("Failed to list vendors for moderation", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
