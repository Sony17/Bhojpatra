import {
  findVendorById,
  toPublicVendorProfile,
} from "@/lib/vendorMenus";
import { listPhotosByOwner, photoUrl } from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

// GET /api/vendors/[id] → { vendor: PublicVendorProfile }
// Public detail-page payload for a live vendor: profile, gallery and the
// visible menu. 404 for seeds, taken-down vendors, or nothing published.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  try {
    const record = await findVendorById(id);
    if (!record || !record.ownerUserId) {
      return Response.json({ error: "Vendor not found." }, { status: 404 });
    }
    const gallery = (await listPhotosByOwner(record.ownerUserId, "gallery")).map(
      photoUrl,
    );
    const vendor = toPublicVendorProfile(record, gallery);
    if (!vendor) {
      return Response.json({ error: "Vendor not found." }, { status: 404 });
    }
    return Response.json({ vendor });
  } catch (err) {
    console.error("Failed to load vendor profile", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
