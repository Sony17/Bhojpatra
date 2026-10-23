import { revalidateTag } from "next/cache";
import { readSingleton, writeSingleton, deleteSingleton } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { extractInlineImages } from "@/lib/contentMedia";
import { stallTypes } from "@/lib/stallTypes";
import {
  STALL_TILE_IMAGES_KEY,
  isValidTileImage,
  resolveStallTileImages,
  type StallTileImages,
} from "@/lib/stallTileImages";
import { STALL_TILE_IMAGES_TAG } from "@/lib/stallTileImagesServer";

// Photos on the /book/stall stall-type tiles. Admin-only: the public page reads
// them server-side (loadStallTileImages). The whole map is rewritten on every
// save — a tile sent empty has no photo (it shows its icon).
export const dynamic = "force-dynamic";

type Stored = { images: StallTileImages };

async function readStored() {
  return readSingleton<Stored>(STALL_TILE_IMAGES_KEY);
}

export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const stored = await readStored();
  return Response.json({
    images: resolveStallTileImages(stored),
    // false → still the starting photos; nothing has been saved yet.
    custom: !!stored,
  });
}

export async function PUT(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const raw = (body as { images?: unknown } | null)?.images;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return Response.json({ error: "Provide an images map." }, { status: 400 });
  }

  const incoming = raw as Record<string, unknown>;
  let images: StallTileImages = {};
  for (const { id, name } of stallTypes) {
    const src = typeof incoming[id] === "string" ? (incoming[id] as string).trim() : "";
    if (!src) continue;
    if (!isValidTileImage(src)) {
      return Response.json(
        { error: `"${name}" needs an https image link or an uploaded JPG/PNG/WebP (under ~1 MB).` },
        { status: 400 },
      );
    }
    images[id] = src;
  }

  try {
    // Uploads (data URIs) become their own media rows; the tile row keeps
    // only short `/api/content/media/m/<hash>` URLs.
    images = await extractInlineImages(images);
    await writeSingleton<Stored>(STALL_TILE_IMAGES_KEY, { images });
    revalidateTag(STALL_TILE_IMAGES_TAG, { expire: 0 });
  } catch (err) {
    console.error("Failed to save stall tile images", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({
    ok: true,
    images,
    custom: true,
  });
}

// DELETE → back to the starting photos.
export async function DELETE() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  try {
    await deleteSingleton(STALL_TILE_IMAGES_KEY);
    revalidateTag(STALL_TILE_IMAGES_TAG, { expire: 0 });
  } catch (err) {
    console.error("Failed to reset stall tile images", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  return Response.json({
    ok: true,
    images: resolveStallTileImages(null),
    custom: false,
  });
}
