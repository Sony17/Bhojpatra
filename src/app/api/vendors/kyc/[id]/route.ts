import { promises as fs } from "fs";
import path from "path";
import { KYC_FILES_DIR, readKycDocuments } from "@/lib/kyc";

export const dynamic = "force-dynamic";

// Stream a stored KYC file back for review. Files live outside `public/`, so
// this handler is the only way to read them — letting access be gated later.
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

  // Only ever read the recorded file name — `basename` defends against any
  // path-traversal sneaking in through a tampered store.
  const safeName = path.basename(doc.storedName);
  let file: Buffer;
  try {
    file = await fs.readFile(path.join(KYC_FILES_DIR, safeName));
  } catch {
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
