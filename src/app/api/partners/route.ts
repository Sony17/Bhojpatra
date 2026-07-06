import path from "path";
import type { PartnerRole } from "@/lib/session";
import { createStore } from "@/lib/store";
import { parseListQuery } from "@/lib/validate";
import { sendPartnerAlert } from "@/lib/email";

// Referral partners are written at signup to Postgres (Neon) so the booking
// wizard can resolve a referral code to a name and the admin can see who's
// referring — never prerender or cache this.
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
  /** Soft-deleted by the admin; hidden from lookups and lists. */
  deleted?: boolean;
}

const store = createStore<PartnerRecord>({
  table: "partners",
  file: path.join(process.cwd(), "data", "partners.json"),
  idField: "code",
});

function isPartnerRole(v: unknown): v is PartnerRole {
  return v === "planner" || v === "individual" || v === "venue";
}

const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : undefined;

// Resolve a single partner by ?code=… (used by the booking wizard to label a
// referred order), or list every partner (used by the admin). Backward-compatible
// `{ partner }` / `{ partners }`; adds a `Paginated` envelope when filtered.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const all = await store.list();
  const live = all.filter((p) => !p.deleted);
  if (code) {
    const partner = live.find((p) => p.code === code) ?? null;
    return Response.json({ partner });
  }
  const partners = live.slice().reverse();
  const { q, type, page, pageSize, hasQuery } = parseListQuery(request.url);
  if (!hasQuery) return Response.json({ partners });

  const needle = q.trim().toLowerCase();
  const filtered = partners.filter((p) => {
    const matchesQ =
      !needle ||
      p.code.toLowerCase().includes(needle) ||
      p.name.toLowerCase().includes(needle) ||
      (p.businessName ?? "").toLowerCase().includes(needle);
    const matchesType = type === "All" || p.type === type;
    return matchesQ && matchesType;
  });
  const start = (page - 1) * pageSize;
  return Response.json({
    partners,
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
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

  // Idempotent on the referral code so a re-submit updates the existing record
  // rather than duplicating it.
  const existing = await store.get(partner.code);
  const merged = existing ? { ...existing, ...partner } : partner;
  try {
    await store.upsert(merged);
  } catch (err) {
    console.error("Failed to persist partner", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Alert the owners on a brand-new partner (not on idempotent re-submits).
  if (!existing) await sendPartnerAlert(merged);

  return Response.json(
    { ok: true, partner: merged },
    { status: existing ? 200 : 201 },
  );
}
