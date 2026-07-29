import { requireRole } from "@/lib/auth";
import {
  PHOTO_ALLOWED_TYPES,
  PHOTO_MAX_BYTES,
  VENUE_OWNER_MAX_PHOTOS,
  listPhotosByOwner,
  saveVendorPhoto,
} from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

// POST /api/venues/photo → upload a venue photo for the signed-in Venue-Owner
// partner. multipart/form-data: "file" (JPG/PNG/WebP, ≤5 MB). The returned
// same-origin URL goes into the venue's photo list on the next venue save;
// bytes share the private store + serve pattern with vendor photos.
// Returns { ok, url }.
export async function POST(request: Request) {
  const guard = await requireRole("partner");
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
    const existing = await listPhotosByOwner(guard.id, "venue");
    if (existing.length >= VENUE_OWNER_MAX_PHOTOS) {
      return Response.json(
        { error: "Photo limit reached. Contact support to raise it." },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const photo = await saveVendorPhoto(guard.id, bytes, file.type, "venue");
    return Response.json(
      { ok: true, url: `/api/venues/photo/${photo.id}` },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to store venue photo", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
