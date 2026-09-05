import { getEnquiryDoc, readEnquiryDocFile } from "@/lib/enquiryDocs";

export const dynamic = "force-dynamic";

// GET /api/leads/enquiry-doc/[id] → stream a guest's menu & budget PDF.
// Public: this is the link pasted into the WhatsApp enquiry, so the admin must
// be able to open it with no session. Ids are unguessable and each upload
// mints a fresh one, so the URL's content never changes — cache hard.
export async function GET(
  _request: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;

  const doc = await getEnquiryDoc(id);
  if (!doc) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  const file = await readEnquiryDocFile(doc);
  if (!file) {
    return Response.json(
      { error: "Document is no longer available." },
      { status: 404 },
    );
  }

  return new Response(file, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.fileName}"`,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
