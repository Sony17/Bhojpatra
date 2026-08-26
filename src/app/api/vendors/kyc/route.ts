import { randomUUID } from "crypto";
import { requireRole } from "@/lib/auth";
import {
  KYC_ALLOWED_TYPES,
  KYC_MAX_BYTES,
  isKycDocKey,
  publicKycShape,
  readKycDocuments,
  storeKycFile,
  writeKycDocuments,
  type KycDocument,
} from "@/lib/kyc";

// KYC files are uploaded at request time to Vercel Blob (bytes) + Postgres
// (metadata) — never prerender or cache this handler.
export const dynamic = "force-dynamic";

// List uploaded documents, newest first (for the admin KYC review console).
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  const docs = await readKycDocuments();
  return Response.json({
    documents: docs.slice().reverse().map(publicKycShape),
  });
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json(
      { error: "Expected a multipart file upload." },
      { status: 400 },
    );
  }

  const docKey = form.get("docKey");
  if (!isKycDocKey(docKey)) {
    return Response.json({ error: "Unknown document type." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No file received." }, { status: 400 });
  }

  const ext = KYC_ALLOWED_TYPES[file.type];
  if (!ext) {
    return Response.json(
      { error: "Unsupported format. Upload a PDF, JPG or PNG." },
      { status: 415 },
    );
  }

  if (file.size > KYC_MAX_BYTES) {
    return Response.json(
      { error: "File is too large. Maximum size is 5 MB." },
      { status: 413 },
    );
  }

  const business = strField(form.get("business"));
  const email = strField(form.get("email"));

  const id = `KYC-${randomUUID().slice(0, 8).toUpperCase()}`;
  const storedName = `${id}.${ext}`;

  let record: KycDocument;
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const blobUrl = await storeKycFile(storedName, bytes, file.type);

    record = {
      id,
      docKey,
      business,
      email,
      originalName: file.name || `${docKey}.${ext}`,
      storedName,
      ...(blobUrl ? { blobUrl } : {}),
      mimeType: file.type,
      ext,
      size: file.size,
      status: "Pending",
      uploadedAt: new Date().toISOString(),
    };

    // upsertMany([record]) inserts just this one document.
    await writeKycDocuments([record]);
  } catch (err) {
    console.error("Failed to store KYC document", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json(
    { ok: true, document: publicKycShape(record) },
    { status: 201 },
  );
}

function strField(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}
