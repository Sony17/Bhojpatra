import type { PartnerRole } from "@/lib/session";
import { createStore } from "@/lib/store";
import { isValidGst, normalizeGst, parseListQuery } from "@/lib/validate";
import { sendPartnerAlert } from "@/lib/email";
import { getSessionUser, requireRole } from "@/lib/auth";

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
  /** Owner user ID linking this referral code to a specific authenticated user account. */
  ownerUserId?: string;
}

export interface PublicPartner {
  code: string;
  name: string;
  type: PartnerRole;
  businessName?: string;
}

function toPublicPartner(p: PartnerRecord): PublicPartner {
  return {
    code: p.code,
    name: p.name,
    type: p.type,
    ...(p.businessName ? { businessName: p.businessName } : {}),
  };
}

const store = createStore<PartnerRecord>({
  table: "partners",
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

  if (code) {
    const rawCode = code.trim();
    const partner =
      (await store.get(rawCode.toUpperCase())) ?? (await store.get(rawCode));
    if (!partner || partner.deleted) {
      return Response.json({ partner: null });
    }

    const user = await getSessionUser();
    if (user?.role === "admin") {
      return Response.json({ partner });
    }

    return Response.json({ partner: toPublicPartner(partner) });
  }

  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;

  const all = await store.list();
  const live = all.filter((p) => !p.deleted);
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
  const guard = await requireRole("partner", "admin");
  if (guard instanceof Response) return guard;
  const isAdmin = guard.role === "admin";

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

  const gstValue = gst !== undefined ? normalizeGst(str(gst) ?? "") : undefined;
  if (type === "venue" && !isValidGst(gstValue ?? "")) {
    return Response.json(
      { error: "Please enter a valid 15-digit GST number." },
      { status: 400 },
    );
  }

  const existing = await store.get(code);
  // An existing partner may only be updated by its verified owner or an admin.
  if (existing && !isAdmin) {
    const isOwner =
      (existing.ownerUserId && existing.ownerUserId === guard.id) ||
      (existing.email && existing.email.toLowerCase() === guard.email.toLowerCase()) ||
      Boolean(guard.partnerRoles?.some((r) => r.referralCode === existing.code));
    if (!isOwner) {
      return Response.json(
        { error: "This referral code belongs to another partner." },
        { status: 403 },
      );
    }
  }

  const partner: PartnerRecord = {
    code,
    name: str(name) ?? "Bhojpatra Partner",
    type,
    businessName: str(businessName),
    phone: str(phone),
    email: str(email),
    city: str(city),
    gst: gstValue,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    ownerUserId: existing?.ownerUserId ?? guard.id,
  };

  // Idempotent on the referral code so a re-submit updates the existing record
  // rather than duplicating it. Never allow body fields to hijack ownership.
  const merged: PartnerRecord = existing
    ? {
        ...existing,
        ...partner,
        ownerUserId: existing.ownerUserId ?? guard.id,
      }
    : partner;

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
