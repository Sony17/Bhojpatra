import { readKycDocuments, readKycFile } from "@/lib/kyc";

export const dynamic = "force-dynamic";

// Stream a stored KYC file back for review. Bytes live in Vercel Blob (or the
// local disk fallback), never under `public/`, so this handler is the only way
// to read them — letting access be gated later.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const docs = await readKycDocuments();
  const doc = docs.find((d) => d.id === id);
  if (!doc) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  const file = await readKycFile(doc);
  if (!file) {
    return Response.json(
      { error: "File is no longer available." },
      { status: 404 },
    );
  }

  return new Response(file as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `inline; filename="${encodeURIComponent(doc.originalName)}"`,
      "Cache-Control": "no-store",
    },
  });
}
