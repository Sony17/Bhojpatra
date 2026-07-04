import path from "path";
import { createStore } from "@/lib/store";

// Leads are captured at request time to Postgres (Neon) — never prerender or
// cache this handler.
export const dynamic = "force-dynamic";

export interface Lead {
  email: string;
  phone: string;
  source: string;
  createdAt: string;
}

// De-duplicated by email (the id-field); a repeat sign-up updates in place.
const store = createStore<Lead>({
  table: "leads",
  file: path.join(process.cwd(), "data", "leads.json"),
  idField: "email",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian mobile: 10 digits starting 6–9, ignoring spaces/dashes and an
// optional +91 / 0 prefix.
const PHONE_RE = /^[6-9]\d{9}$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/^(\+91|0091|91|0)/, "");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { email, phone } = (body ?? {}) as Record<string, unknown>;

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const cleanedPhone =
    typeof phone === "string" ? normalizePhone(phone.trim()) : "";
  if (!PHONE_RE.test(cleanedPhone)) {
    return Response.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }

  const lead: Lead = {
    email: email.trim().toLowerCase(),
    phone: cleanedPhone,
    source: "home-promo",
    createdAt: new Date().toISOString(),
  };

  try {
    const leads = await store.list();
    // Skip duplicates so a repeat sign-up stays idempotent (by email or phone).
    const exists = leads.some(
      (l) => l.email === lead.email || l.phone === lead.phone,
    );
    if (!exists) await store.upsert(lead);
  } catch (err) {
    console.error("Failed to persist lead", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}

// Admin → Lead Generation reads the captured leads here. Newest first so the
// most recent promo sign-ups surface at the top of the table.
export async function GET() {
  const leads = await store.list();
  leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ leads });
}
