import { requireRole } from "@/lib/auth";
import { findVendorByOwner, saveVendor } from "@/lib/vendorMenus";
import {
  DISH_MAX_PHOTOS,
  GALLERY_MAX_PHOTOS,
  PHOTO_ALLOWED_TYPES,
  PHOTO_MAX_BYTES,
  isPhotoKind,
  listPhotosByOwner,
  photoUrl,
  saveVendorPhoto,
} from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

// POST /api/vendor/photo → upload a photo for the signed-in vendor.
// multipart/form-data: "file" (JPG/PNG/WebP, ≤5 MB) + optional "kind"
// ("card" default | "dish" | "gallery").
//   card    — replaces the previous card photo; if the vendor already saved a
//             profile, its card image is updated immediately.
//   dish    — appended; referenced from a menu item on the next menu save
//             (orphans are pruned then).
//   gallery — appended, capped at GALLERY_MAX_PHOTOS.
// Returns { ok, url }.
export async function POST(request: Request) {
  const guard = await requireRole("vendor");
  if (guard instanceof Response) return guard;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected a multipart file upload." },
      { status: 400 },
    );
  }

  const rawKind = form.get("kind") ?? "card";
  if (!isPhotoKind(rawKind)) {
    return Response.json({ error: "Unknown photo kind." }, { status: 400 });
  }
  const kind = rawKind;

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No file received." }, { status: 400 });
  }
  if (!PHOTO_ALLOWED_TYPES[file.type]) {
    return Response.json(
      { error: "Unsupported format. Upload a JPG, PNG or WebP image." },
      { status: 415 },
    );
  }
  if (file.size > PHOTO_MAX_BYTES) {
    return Response.json(
      { error: "Image is too large. Maximum size is 5 MB." },
      { status: 413 },
    );
  }

  try {
    if (kind === "gallery") {
      const existing = await listPhotosByOwner(guard.id, "gallery");
      if (existing.length >= GALLERY_MAX_PHOTOS) {
        return Response.json(
          { error: `Gallery is full (${GALLERY_MAX_PHOTOS} photos). Remove one first.` },
          { status: 400 },
        );
      }
    } else if (kind === "dish") {
      const existing = await listPhotosByOwner(guard.id, "dish");
      if (existing.length >= DISH_MAX_PHOTOS) {
        return Response.json(
          { error: "Too many dish photos. Save your menu to clean up unused ones." },
          { status: 400 },
        );
      }
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const photo = await saveVendorPhoto(guard.id, bytes, file.type, kind);
    const url = photoUrl(photo);

    if (kind === "card") {
      const vendor = await findVendorByOwner(guard.id);
      if (vendor) {
        await saveVendor({
          ...vendor,
          image: url,
          updatedAt: new Date().toISOString(),
        });
      }
    }

    return Response.json({ ok: true, url }, { status: 201 });
  } catch (err) {
    console.error("Failed to store vendor photo", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
