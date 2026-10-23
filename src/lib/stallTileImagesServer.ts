/**
 * Server-side read of the admin-set stall tile photos for /book/stall, so the
 * tiles render the stored images on first paint. Uploads are stored as their
 * own media rows (see contentMedia), so this row holds only short URLs. The
 * admin route expires the tag on save.
 */
import { unstable_cache } from "next/cache";
import { readSingleton } from "@/lib/store";
import {
  STALL_TILE_IMAGES_KEY,
  resolveStallTileImages,
  type StallTileImages,
} from "@/lib/stallTileImages";

export const STALL_TILE_IMAGES_TAG = "stall-tile-images";

const getImages = unstable_cache(
  async () => resolveStallTileImages(await readSingleton(STALL_TILE_IMAGES_KEY)),
  ["stall-tile-images"],
  { tags: [STALL_TILE_IMAGES_TAG], revalidate: 300 },
);

/** The tile photos, or `{}` (icons only) if the DB is unreachable. */
export async function loadStallTileImages(): Promise<StallTileImages> {
  return getImages().catch(() => ({}));
}
