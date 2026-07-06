import { requireRole } from "@/lib/auth";
import {
  deleteVendorPhoto,
  getVendorPhoto,
  readPhotoFile,
} from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

// GET /api/vendor/photo/[id] → stream a vendor's card photo. Public: this is
// the image customers see on wizard and catalog cards. Bytes live in the
// private Blob store (or the local disk fallback), never under `public/`.
// Every upload mints a fresh id, so a photo URL's content never changes —
// safe to cache hard.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const photo = await getVendorPhoto(id);
  if (!photo) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }

  const file = await readPhotoFile(photo);
  if (!file) {
    return Response.json(
      { error: "Photo is no longer available." },
      { status: 404 },
    );
  }

  return new Response(file as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}

// DELETE /api/vendor/photo/[id] → remove one of the signed-in vendor's GALLERY
// photos. Card photos are replace-only and dish photos are pruned on menu save,
// so deleting those here would leave dangling references.
export async function DELETE(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  const { id } = await ctx.params;
  const photo = await getVendorPhoto(id);
  if (!photo || photo.ownerUserId !== guard.id) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }
  if (photo.kind !== "gallery") {
    return Response.json(
      { error: "Only gallery photos can be removed here." },
      { status: 400 },
    );
  }

  try {
    await deleteVendorPhoto(photo);
    return Response.json({ ok: true });
  } catch (err) {
    console.error("Failed to delete vendor photo", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
