import { requireRole } from "@/lib/auth";
import {
  changedPublicFields,
  effectiveGstRateOf, listLiveVendorRecords } from "@/lib/vendorMenus";
import { stallMenuId } from "@/lib/stallTypes";
import {
  applicationForOwner,
  readVendorApplications,
} from "@/lib/vendorApplications";
import { listPhotosByOwner, photoUrl } from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

// GET /api/vendors/moderation → { vendors: [...] }
// Admin review queue: every live vendor's full published content (profile,
// menu with dish photos, gallery) plus their moderation status, newest first.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  try {
    const [records, apps] = await Promise.all([
      listLiveVendorRecords(),
      readVendorApplications(),
    ]);
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
        // KYC application status — menu approval requires "Verified".
        applicationStatus: r.ownerUserId
          ? (applicationForOwner(apps, {
              id: r.ownerUserId,
              email: r.ownerEmail ?? "",
            })?.status ?? null)
          : null,
        // A live vendor's last approved content is still what customers see.
        liveSnapshot: Boolean(r.approvedSnapshot),
        // …and what this pending edit changes against it.
        ...(r.approvedSnapshot && r.moderation === "Pending"
          ? { changedFields: changedPublicFields(r.approvedSnapshot, r) }
          : {}),
        // GST on food: the vendor's pick vs what checkout bills (No GST until
        // their GSTIN is verified). Not moderated — shown for context.
        ...(r.gstRate !== undefined ? { gstRatePicked: r.gstRate } : {}),
        gstRateBilled: effectiveGstRateOf(apps, r),
        badges: r.badges ?? null,
        updatedAt: r.updatedAt,
        menu: r.menu,
        // Single Stalls (with their own dish lists) and the admin's per-stall /
        // per-dish disapprovals, for item-level review.
        stalls: (r.stallConfig?.categories ?? []).map((id) => ({
          id,
          courseId: stallMenuId(id),
          dishes: r.stallConfig?.menus?.[id] ?? [],
        })),
        contentReview: r.contentReview ?? null,
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
