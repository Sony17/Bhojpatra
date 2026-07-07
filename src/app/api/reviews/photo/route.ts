import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { requireRole } from "@/lib/auth";
import { PHOTO_ALLOWED_TYPES, PHOTO_MAX_BYTES } from "@/lib/vendorPhotos";

// Uploads happen at request time — never prerender or cache.
export const dynamic = "force-dynamic";

const BLOB_TOKEN =
  (process.env.BLOB_READ_WRITE_TOKEN ?? "").match(/vercel_blob_rw_\S+/)?.[0] ??
  undefined;

/**
 * POST /api/reviews/photo → upload one photo for a signed-in customer's review.
 *
 * multipart/form-data: "file" (JPG/PNG/WebP, ≤5 MB). Reviews are public, so the
 * bytes go to the **public** Vercel Blob store and the returned public URL is
 * stored directly on the review (`images[]`) — no metadata table or serving
 * route needed. Requires a customer session to keep the endpoint from being an
 * open upload sink; the review write itself still keys off the booking.
 */
export async function POST(request: Request) {
  const guard = await requireRole("customer");
  if (guard instanceof Response) return guard;

  if (!BLOB_TOKEN) {
    return Response.json(
      { error: "Photo uploads aren’t configured." },
      { status: 503 },
    );
  }

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
    const { url } = await put(
      `review-photos/RPH-${randomUUID().slice(0, 12)}.${ext}`,
      bytes,
      {
        access: "public",
        contentType: file.type,
        addRandomSuffix: true,
        token: BLOB_TOKEN,
      },
    );
    return Response.json({ ok: true, url }, { status: 201 });
  } catch (err) {
    console.error("Failed to store review photo", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
