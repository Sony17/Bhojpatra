/**
 * Server-side reads of owner-registered venues — shared by `/api/venues` and
 * the /venues page, which renders the live catalogue on its first frame
 * instead of the static seed swapping to it after a client fetch.
 */
import { createStore } from "@/lib/store";
import {
  sanitizeVenueImage,
  isServableVenueImage,
  isVenuePublic,
  type VenueRecord,
} from "@/lib/venues";

const store = createStore<VenueRecord>({
  table: "venues",
  idField: "id",
});

/** Every non-deleted venue, images sanitised so a stored non-servable URL can
 *  never reach `next/image` and crash the page. */
export async function listVenueRecords(): Promise<VenueRecord[]> {
  return (await store.list())
    .filter((v) => !v.deleted)
    .map((v) => ({
      ...v,
      image: sanitizeVenueImage(v.image),
      ...(v.images
        ? { images: v.images.filter((s) => isServableVenueImage(s)) }
        : {}),
    }));
}

/** The public catalogue: approved (and grandfathered legacy) venues, newest
 *  first. Null if the DB is unavailable — the client then fetches as before. */
export async function listPublicVenueRecords(): Promise<VenueRecord[] | null> {
  try {
    return (await listVenueRecords()).filter(isVenuePublic).reverse();
  } catch (err) {
    console.error("Failed to list public venues", err);
    return null;
  }
}
