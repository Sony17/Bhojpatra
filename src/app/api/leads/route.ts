import { promises as fs } from "fs";
import path from "path";

// Leads are captured at request time and appended to a JSON store on disk —
// never prerender or cache this handler.
export const dynamic = "force-dynamic";

export interface Lead {
  email: string;
  phone: string;
  source: string;
  createdAt: string;
}

const STORE = path.join(process.cwd(), "data", "leads.json");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Indian mobile: 10 digits starting 6–9, ignoring spaces/dashes and an
// optional +91 / 0 prefix.
const PHONE_RE = /^[6-9]\d{9}$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/^(\+91|0091|91|0)/, "");
}

async function readLeads(): Promise<Lead[]> {
  try {
    return JSON.parse(await fs.readFile(STORE, "utf8")) as Lead[];
  } catch {
    // No store yet (or unreadable) — start fresh.
    return [];
  }
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
    const leads = await readLeads();
    // Skip duplicates so a repeat sign-up stays idempotent.
    const exists = leads.some(
      (l) => l.email === lead.email || l.phone === lead.phone,
    );
    if (!exists) {
      leads.push(lead);
      await fs.mkdir(path.dirname(STORE), { recursive: true });
      await fs.writeFile(STORE, JSON.stringify(leads, null, 2), "utf8");
    }
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
  const leads = await readLeads();
  leads.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json({ leads });
}
