import { promises as fs } from "fs";
import path from "path";
import type { PartnerRole } from "@/lib/session";

// Referral partners are written at signup and appended to a JSON store on disk
// so the booking wizard can resolve a referral code to a name and the admin can
// see who's referring — never prerender or cache this.
export const dynamic = "force-dynamic";

export interface PartnerRecord {
  code: string;
  name: string;
  type: PartnerRole;
  businessName?: string;
  phone?: string;
  email?: string;
  city?: string;
  /** GST number — collected from Venue Owner partners. */
  gst?: string;
  createdAt: string;
}

const STORE = path.join(process.cwd(), "data", "partners.json");

async function readPartners(): Promise<PartnerRecord[]> {
  try {
    return JSON.parse(await fs.readFile(STORE, "utf8")) as PartnerRecord[];
  } catch {
    // No store yet (or unreadable) — start fresh.
    return [];
  }
}

function isPartnerRole(v: unknown): v is PartnerRole {
  return v === "planner" || v === "individual" || v === "venue";
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

// Resolve a single partner by ?code=… (used by the booking wizard to label a
// referred order), or list every partner (used by the admin).
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  const partners = await readPartners();
  if (code) {
    const partner = partners.find((p) => p.code === code) ?? null;
    return Response.json({ partner });
  }
  return Response.json({ partners: partners.slice().reverse() });
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { code, name, type, businessName, phone, email, city, gst } = (body ??
    {}) as Record<string, unknown>;

  if (typeof code !== "string" || !/^REF-/.test(code)) {
    return Response.json({ error: "Missing referral code." }, { status: 400 });
  }
  if (!isPartnerRole(type)) {
    return Response.json({ error: "Invalid partner type." }, { status: 400 });
  }

  const partner: PartnerRecord = {
    code,
    name: str(name) ?? "Bhojpatra Partner",
    type,
    businessName: str(businessName),
    phone: str(phone),
    email: str(email),
    city: str(city),
    gst: str(gst),
    createdAt: new Date().toISOString(),
  };

  const partners = await readPartners();

  // Idempotent on the referral code so a re-submit updates the existing record
  // rather than duplicating it.
  const idx = partners.findIndex((p) => p.code === partner.code);
  try {
    if (idx >= 0) partners[idx] = { ...partners[idx], ...partner };
    else partners.push(partner);
    await fs.mkdir(path.dirname(STORE), { recursive: true });
    await fs.writeFile(STORE, JSON.stringify(partners, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist partner", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, partner }, { status: idx >= 0 ? 200 : 201 });
}
