import {
  ENQUIRY_DOC_MAX_BYTES,
  enquiryDocUrl,
  looksLikePdf,
  saveEnquiryDoc,
} from "@/lib/enquiryDocs";
import { addEnquiry, newEnquiryId, type EnquiryRecord } from "@/lib/enquiries";
import { isValidPhone, normalizePhone } from "@/lib/validate";

// Uploads happen at request time — never prerender or cache.
export const dynamic = "force-dynamic";

/**
 * POST /api/leads/enquiry-doc → upload the menu & budget PDF for a
 * custom-package WhatsApp enquiry.
 *
 * multipart/form-data: "file" (PDF, ≤5 MB) plus the guest's "name" and
 * "phone". No session — the guest hasn't signed in when they reach out from the
 * homepage (same posture as the lead-capture POST), so the name and number are
 * what identify them; PDF-only with a magic-byte check keeps the open endpoint
 * from becoming a general file-hosting sink.
 *
 * The upload also files an enquiry (`source: "custom-package"`) so the request
 * lands in the admin Enquiries console with the PDF linked — the admin sees it
 * even if the guest never sends the WhatsApp message. The returned same-origin
 * URL is what the client appends to that message.
 */
export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Expected a file upload." }, { status: 400 });
  }

  const name = String(form.get("name") ?? "").trim();
  const rawPhone = String(form.get("phone") ?? "").trim();
  if (!name) {
    return Response.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidPhone(rawPhone)) {
    return Response.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "No file received." }, { status: 400 });
  }
  if (file.type && file.type !== "application/pdf") {
    return Response.json(
      { error: "Unsupported format. Upload a PDF." },
      { status: 415 },
    );
  }
  if (file.size > ENQUIRY_DOC_MAX_BYTES) {
    return Response.json(
      { error: "File is too large. Maximum size is 5 MB." },
      { status: 413 },
    );
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!looksLikePdf(bytes)) {
      return Response.json(
        { error: "That file doesn't look like a PDF." },
        { status: 415 },
      );
    }
    const doc = await saveEnquiryDoc(bytes, file.name);
    const url = enquiryDocUrl(doc);

    const record: EnquiryRecord = {
      id: newEnquiryId(),
      name,
      // Not collected — the home-page box asks only for a name and number so
      // the attach stays one step. The admin table renders this as "—".
      email: "",
      phone: normalizePhone(rawPhone),
      subject: "Custom package",
      message: "Curated-package request from the home page, with a menu & budget PDF attached.",
      source: "custom-package",
      createdAt: new Date().toISOString(),
      documentUrl: url,
      documentName: doc.fileName,
    };
    await addEnquiry(record);

    return Response.json({ ok: true, url }, { status: 201 });
  } catch (err) {
    console.error("Failed to store enquiry document", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
