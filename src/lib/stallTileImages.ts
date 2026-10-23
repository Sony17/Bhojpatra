/**
 * Photos on the /book/stall "What stall do you want?" tiles — one per stall
 * type (`stallTypes` id), set by the admin in Content Control → Single Stall Tiles.
 *
 * ONE state: the `stall-tile-images` settings row. Once the admin has saved it,
 * that row is the whole truth — a tile the admin left empty shows its icon, it
 * never falls back to a stock photo. `DEFAULT_STALL_TILE_IMAGES` is only the
 * row's starting value, used while it has never been saved (or after Reset).
 *
 * SERVER-SAFE (no "use client", no DB): shared by the API route, the page's
 * server loader and the admin editor.
 */
import { stallTypes } from "@/lib/stallTypes";

export const STALL_TILE_IMAGES_KEY = "stall-tile-images";

/** Stall type id → image src (URL, `/path`, or inline `data:image/…`). */
export type StallTileImages = Record<string, string>;

const unsplash = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=600&q=70`;

/** Starting photos, until the admin saves their own set. */
export const DEFAULT_STALL_TILE_IMAGES: StallTileImages = {
  chaat: unsplash("photo-1601050690597-df0568f70950"),
  juices: unsplash("photo-1544145945-f90425340c7e"),
  beverages: unsplash("photo-1437418747212-8d9709afab22"),
  "south-indian": unsplash("photo-1630383249896-424e482df921"),
  "north-indian": unsplash("photo-1585937421612-70a008356fbe"),
  chinese: unsplash("photo-1585032226651-759b368d7246"),
  snacks: unsplash("photo-1565895405227-31cffbe0cf86"),
  desserts: unsplash("photo-1631452180519-c014fe946bc7"),
  "ice-cream": unsplash("photo-1578985545062-69928b1d9587"),
  "street-food": unsplash("photo-1490645935967-10de6ba17061"),
  live: unsplash("photo-1567188040759-fb8a883dc6d8"),
  breakfast: unsplash("photo-1556910103-1c02745aae4d"),
  regional: unsplash("photo-1555939594-58d7cb561ad1"),
  pizza: unsplash("photo-1513104890138-7c749659a591"),
  pasta: unsplash("photo-1473093295043-cdd812d0e601"),
};

/** Inline uploads are downscaled by the admin ImageField (1280px JPEG), so a
 *  real photo is ~100–300 KB of base64; the cap keeps the row bounded. */
const MAX_INLINE_CHARS = 1_500_000;
const INLINE_IMAGE_RE = /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/;

/** An image src the tiles can render: https URL, site path, or inline image. */
export function isValidTileImage(src: string): boolean {
  if (src.startsWith("data:")) {
    return src.length <= MAX_INLINE_CHARS && INLINE_IMAGE_RE.test(src);
  }
  if (src.startsWith("/")) return !src.startsWith("//");
  try {
    return new URL(src).protocol === "https:";
  } catch {
    return false;
  }
}

/** The stored row read as tile images: only known stall types, only valid
 *  srcs. No row yet → the starting photos. */
export function resolveStallTileImages(
  stored: { images?: unknown } | null,
): StallTileImages {
  const raw = stored?.images;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STALL_TILE_IMAGES };
  const out: StallTileImages = {};
  for (const { id } of stallTypes) {
    const src = (raw as Record<string, unknown>)[id];
    if (typeof src === "string" && isValidTileImage(src.trim())) {
      out[id] = src.trim();
    }
  }
  return out;
}
