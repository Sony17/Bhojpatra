import {
  addEnquiry,
  newEnquiryId,
  readEnquiries,
  newAttachmentId,
  generateShareToken,
  isValidPdfHeader,
  storeEnquiryFile,
  ENQUIRY_MAX_BYTES,
  type EnquiryRecord,
  type EnquiryAttachment,
} from "@/lib/enquiries";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/validate";
import { sendEnquiryAlert } from "@/lib/email";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/contact → capture a contact-form enquiry or custom catering enquiry
export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: "Invalid multipart form data." }, { status: 400 });
    }

    const name = str(form.get("name"));
    const phone = str(form.get("phone") || form.get("mobile"));
    const email = str(form.get("email"));
    const eventType = str(form.get("eventType") || form.get("occasion"));
    const eventDate = str(form.get("eventDate") || form.get("date"));
    const city = str(form.get("city") || form.get("location"));
    const guestsRaw = form.get("guests");
    const guests = guestsRaw ? Number(guestsRaw) || undefined : undefined;
    const budget = str(form.get("budget"));
    const message = str(form.get("message") || form.get("requirements"));
    const subject =
      str(form.get("subject")) ||
      (eventType ? `Custom Catering: ${eventType}` : "Custom Catering Enquiry");

    if (!name) {
      return Response.json({ error: "Please enter your name." }, { status: 400 });
    }
    if (!isValidPhone(phone)) {
      return Response.json(
        { error: "Please enter a valid 10-digit mobile number." },
        { status: 400 },
      );
    }
    if (email && !isValidEmail(email)) {
      return Response.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    // Handle optional PDF attachment
    let attachment: EnquiryAttachment | undefined;
    const file = form.get("menuPdf") || form.get("file");

    if (file instanceof File && file.size > 0) {
      if (file.size > ENQUIRY_MAX_BYTES) {
        return Response.json(
          { error: "File is too large. Maximum size is 10 MB." },
          { status: 413 },
        );
      }

      const isPdfMime =
        file.type === "application/pdf" ||
        file.type === "application/x-pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (!isPdfMime) {
        return Response.json(
          { error: "Only PDF files are accepted for menu and budget uploads." },
          { status: 415 },
        );
      }

      try {
        const bytes = Buffer.from(await file.arrayBuffer());
        if (!isValidPdfHeader(bytes)) {
          return Response.json(
            { error: "The uploaded file does not appear to be a valid PDF." },
            { status: 415 },
          );
        }

        const attId = newAttachmentId();
        const storedName = `${attId}.pdf`;
        const blobUrl = await storeEnquiryFile(
          storedName,
          bytes,
          "application/pdf",
        );

        // Sanitize original filename (remove path traversal or control characters)
        const safeOriginalName =
          file.name
            .replace(/[/\\?%*:|"<>]/g, "-")
            .trim() || "menu-budget.pdf";

        attachment = {
          id: attId,
          originalName: safeOriginalName,
          storedName,
          ...(blobUrl ? { blobUrl } : {}),
          mimeType: "application/pdf",
          size: file.size,
          shareToken: generateShareToken(),
          uploadedAt: new Date().toISOString(),
        };
      } catch (err) {
        console.error("Failed to store menu PDF", err);
        return Response.json(
          { error: "Failed to upload your PDF. Please try again." },
          { status: 500 },
        );
      }
    }

    const record: EnquiryRecord = {
      id: newEnquiryId(),
      name,
      email: email.toLowerCase(),
      phone: normalizePhone(phone),
      subject,
      message,
      source: "custom-catering",
      createdAt: new Date().toISOString(),
      ...(eventType ? { eventType } : {}),
      ...(eventDate ? { eventDate } : {}),
      ...(city ? { city } : {}),
      ...(guests ? { guests } : {}),
      ...(budget ? { budget } : {}),
      ...(attachment ? { attachment } : {}),
    };

    try {
      await addEnquiry(record);
      await sendEnquiryAlert(record);
    } catch (err) {
      console.error("Failed to persist custom catering enquiry", err);
      return Response.json(
        { error: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    return Response.json({ ok: true, id: record.id }, { status: 201 });
  }

  // Standard JSON contact-page flow
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!name) {
    return Response.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isValidEmail(body.email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!isValidPhone(body.phone)) {
    return Response.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }
  if (!message) {
    return Response.json({ error: "Please enter a message." }, { status: 400 });
  }

  const record: EnquiryRecord = {
    id: newEnquiryId(),
    name,
    email: (body.email as string).trim().toLowerCase(),
    phone: normalizePhone((body.phone as string).trim()),
    subject: typeof body.subject === "string" ? body.subject.trim() : "General",
    message,
    source: "contact-page",
    createdAt: new Date().toISOString(),
  };

  try {
    await addEnquiry(record);
    // Alert the owners so a new enquiry is actioned promptly (best-effort).
    await sendEnquiryAlert(record);
  } catch (err) {
    console.error("Failed to persist enquiry", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, id: record.id }, { status: 201 });
}

function str(val: FormDataEntryValue | null): string {
  return typeof val === "string" ? val.trim() : "";
}


// GET /api/contact → list enquiries (newest first) for the admin.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const enquiries = await readEnquiries();
  enquiries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ enquiries });
}
