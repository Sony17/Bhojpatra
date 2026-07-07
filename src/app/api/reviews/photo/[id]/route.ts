import { getReviewPhoto, readReviewPhotoFile } from "@/lib/reviewPhotos";

export const dynamic = "force-dynamic";

// GET /api/reviews/photo/[id] → stream a customer review photo. Public: review
// photos appear on public vendor profiles and the home page. Bytes live in the
// private Blob store (or the local disk fallback), never under `public/`. Every
// upload mints a fresh id, so a photo URL's content never changes — cache hard.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const photo = await getReviewPhoto(id);
  if (!photo) {
    return Response.json({ error: "Photo not found." }, { status: 404 });
  }

  const file = await readReviewPhotoFile(photo);
  if (!file) {
    return Response.json(
      { error: "Photo is no longer available." },
      { status: 404 },
    );
  }

  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": photo.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
