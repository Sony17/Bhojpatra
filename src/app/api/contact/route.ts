import {
  addEnquiry,
  newEnquiryId,
  readEnquiries,
  type EnquiryRecord,
} from "@/lib/enquiries";
import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/validate";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/contact → capture a contact-form enquiry
export async function POST(request: Request) {
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
  } catch (err) {
    console.error("Failed to persist enquiry", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}

// GET /api/contact → list enquiries (newest first) for the admin.
export async function GET() {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const enquiries = await readEnquiries();
  enquiries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ enquiries });
}
