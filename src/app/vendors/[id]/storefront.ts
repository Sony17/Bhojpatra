import { cache } from "react";
import {
  listingCateringCategories,
  vendorListings,
  type VendorListing,
} from "@/lib/data";
import {
  assembleMenuCategories,
  findVendorById,
  seedStallsHidden,
  readVendorItemLimits,
  toPublicVendorProfile,
  type PublicVendorProfile,
} from "@/lib/vendorMenus";
import { listPhotosByOwner, photoUrl } from "@/lib/vendorPhotos";
import {
  collectStalls,
  resolveBookableStall,
  type BookableStall,
} from "@/lib/vendorStorefront";

/** What a /vendors/[id] (or its /menu) page renders. `stall` is the Single
 *  Stall its Book button sells — resolved against the same `/api/menu` roster
 *  the stall wizard charges from — or null when it has none (the page then
 *  offers the right flow / an enquiry instead of a dead Book button). */
export type Storefront =
  | { kind: "live"; profile: PublicVendorProfile; stall: BookableStall | null }
  | { kind: "sample"; listing: VendorListing; stall: BookableStall | null };

/**
 * One read per request: wrapped in React `cache()` so `generateMetadata` and
 * the page component share the same vendor/roster lookups instead of hitting
 * the database twice.
 */
export const loadStorefront = cache(
  async (id: string): Promise<Storefront | null> => {
    const [record, categories] = await Promise.all([
      findVendorById(id),
      // A roster failure must not take the storefront down — it only means
      // we can't confirm a bookable stall right now.
      assembleMenuCategories().catch((err) => {
        console.error("Storefront: failed to assemble booking roster", err);
        return null;
      }),
    ]);
    const stalls = categories ? collectStalls(categories) : [];

    if (record?.ownerUserId) {
      const [gallery, limits] = await Promise.all([
        listPhotosByOwner(record.ownerUserId, "gallery").catch(() => []),
        readVendorItemLimits(),
      ]);
      const profile = toPublicVendorProfile(
        record,
        gallery.map(photoUrl),
        limits[record.id],
      );
      if (profile) {
        // A real vendor is bookable as a stall only when they sell one (no
        // declared categories = legacy record, trusted) AND the roster has
        // it — matched by id only, never by name.
        const declared = profile.serviceCategories.map((c) => c.id);
        const sellsStall = !declared.length || declared.includes("single-stall");
        const stall = sellsStall
          ? resolveBookableStall(
              { id: profile.id, name: profile.business },
              stalls,
              { allowNameBridge: false },
            )
          : null;
        return { kind: "live", profile, stall };
      }
    }

    // Curated samples go with the seed stalls: once the admin hides those for
    // launch, a sample's old URL is a 404 rather than a demo page.
    const listing = (await seedStallsHidden())
      ? undefined
      : vendorListings.find((v) => v.id === id);
    if (listing) {
      // Curated sample: bridged to its roster counterpart by brand name —
      // exactly the wizard's `?vendor=` bridge, so price and dishes agree.
      const stall = listingCateringCategories(listing).includes("single-stall")
        ? resolveBookableStall(listing, stalls, { allowNameBridge: true })
        : null;
      return { kind: "sample", listing, stall };
    }
    return null;
  },
);
