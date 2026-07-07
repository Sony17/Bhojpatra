import { requireRole } from "@/lib/auth";
import { PHOTO_ALLOWED_TYPES, PHOTO_MAX_BYTES } from "@/lib/vendorPhotos";
import { saveReviewPhoto, reviewPhotoUrl } from "@/lib/reviewPhotos";

// Uploads happen at request time — never prerender or cache.
export const dynamic = "force-dynamic";

/**
 * POST /api/reviews/photo → upload one photo for a signed-in customer's review.
 *
 * multipart/form-data: "file" (JPG/PNG/WebP, ≤5 MB). The bytes go to the
 * project's private Vercel Blob store (or the local-disk fallback) and are
 * served back through the public `GET /api/reviews/photo/[id]` route; that
 * same-origin URL is what gets stored on the review (`images[]`). Requires a
 * customer session to keep the endpoint from being an open upload sink; the
 * review write itself still keys off the booking.
 */
export async function POST(request: Request) {
  const guard = await requireRole("customer");
  if (guard instanceof Response) return guard;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No file received." }, { status: 400 });
  }
  const ext = PHOTO_ALLOWED_TYPES[file.type];
  if (!ext) {
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
    const bytes = Buffer.from(await file.arrayBuffer());
    const photo = await saveReviewPhoto(bytes, file.type);
    return Response.json(
      { ok: true, url: reviewPhotoUrl(photo) },
      { status: 201 },
    );
  } catch (err) {
    console.error("Failed to store review photo", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
