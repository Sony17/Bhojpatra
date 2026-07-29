import { getVendorPhoto, readPhotoFile } from "@/lib/vendorPhotos";

export const dynamic = "force-dynamic";

// GET /api/venues/photo/[id] → stream a venue photo. Public: these are the
// images customers see on venue cards and the detail-page gallery. Bytes live
// in the private Blob store (or the local disk fallback), never under
// `public/`. Every upload mints a fresh id, so a photo URL's content never
// changes — safe to cache hard.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const photo = await getVendorPhoto(id);
  if (!photo || photo.kind !== "venue") {
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
