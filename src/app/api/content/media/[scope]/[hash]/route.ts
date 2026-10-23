/**
 * Serves a CMS image as real bytes:
 *   • /api/content/media/m/<hash>         — an image stored in its own row
 *   • /api/content/media/<scope>/<hash>   — a legacy inline (base64) image still
 *                                           inside the home/site content row
 * URLs are content-hashed, so responses are immutable and cached for a year.
 */
import { readSingleton } from "@/lib/store";
import {
  MEDIA_SCOPE_KEYS,
  findInlineImage,
  readStoredImage,
  type MediaScope,
} from "@/lib/contentMedia";

// GET /api/content/media/:scope/:hash → the image bytes.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ scope: string; hash: string }> },
) {
  const { scope, hash } = await params;
  let image: { type: string; bytes: Buffer } | null = null;
  if (scope === "m") {
    image = await readStoredImage(hash);
  } else {
    const key = MEDIA_SCOPE_KEYS[scope as MediaScope];
    if (key) image = findInlineImage(await readSingleton(key), hash);
  }
  if (!image) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Content-Type": image.type,
      // s-maxage lets the CDN keep it too, so repeat requests never reach the DB.
      "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      // Admin-supplied bytes: never sniff, never run script (e.g. inside SVG).
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
    },
  });
}
