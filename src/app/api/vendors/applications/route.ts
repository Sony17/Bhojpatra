import { randomUUID } from "crypto";
import {
  readVendorApplications,
  toAdminApplication,
  writeVendorApplications,
  type VendorApplicationDoc,
  type VendorApplicationRecord,
  type VendorPackageInput,
} from "@/lib/vendorApplications";
import {
  TIER_ORDER,
  sortTiers,
  tierForPrice,
  type VendorDocKind,
  type VendorTier,
} from "@/lib/admin/types";
import { parseListQuery } from "@/lib/validate";
import { sendVendorApplicationAlert } from "@/lib/email";

// Applications are submitted at request time and appended to a JSON store on
// disk — never prerender or cache this handler.
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[6-9]\d{9}$/;

function normalizePhone(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/^(\+91|0091|91|0)/, "");
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.map(str).filter(Boolean) : [];
}

/** A caterer sits in every tier band their packages span — a menu with a
 *  ₹800 and a ₹1,600 package serves both Silver and Platinum. Falls back to
 *  Silver when no priced package is present. */
function deriveTiers(packages: VendorPackageInput[]): VendorTier[] {
  const tiers = new Set<VendorTier>();
  for (const p of packages) {
    const price = Number(p.price);
    if (Number.isFinite(price) && price > 0) tiers.add(tierForPrice(price));
  }
  const derived = sortTiers([...tiers]);
  return derived.length ? derived : ["Silver"];
}

/** Keep only valid tier values, in canonical order. */
function parseTiers(raw: unknown): VendorTier[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((t): t is VendorTier =>
    TIER_ORDER.includes(t as VendorTier),
  );
  return sortTiers(valid);
}

const DOC_FIELDS: { kind: VendorDocKind; key: string }[] = [
  { kind: "GST", key: "gst" },
  { kind: "FSSAI", key: "fssai" },
  { kind: "ID", key: "ownerId" },
  { kind: "Business Proof", key: "businessProof" },
];

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const business = str(body.business);
  const owner = str(body.owner);
  const email = str(body.email).toLowerCase();
  const phone = normalizePhone(str(body.phone));

  if (!business || !owner) {
    return Response.json(
      { error: "Business and owner name are required." },
      { status: 400 },
    );
  }
  if (!EMAIL_RE.test(email)) {
    return Response.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }
  if (!PHONE_RE.test(phone)) {
    return Response.json(
      { error: "Please enter a valid 10-digit mobile number." },
      { status: 400 },
    );
  }

  const cuisines = strList(body.cuisines);
  const gstNumber = str(body.gstNumber);
  const fssaiNumber = str(body.fssaiNumber);

  // Map uploaded KYC ids (keyed by doc field) onto the per-document records the
  // approvals console reviews.
  const docIds = (body.docIds ?? {}) as Record<string, unknown>;
  const documents: VendorApplicationDoc[] = DOC_FIELDS.map(({ kind, key }) => ({
    kind,
    number:
      kind === "GST" ? gstNumber : kind === "FSSAI" ? fssaiNumber : "Uploaded",
    status: "Pending",
    docId: str(docIds[key]) || undefined,
  }));

  const rawPackages = Array.isArray(body.packages) ? body.packages : [];
  const packages: VendorPackageInput[] = rawPackages.map((p) => {
    const pkg = (p ?? {}) as Record<string, unknown>;
    return {
      name: str(pkg.name),
      dishes: str(pkg.dishes),
      price: str(pkg.price),
    };
  });

  // Tiers are auto-derived from the packages' price bands, but an explicit
  // `tiers` array (e.g. an admin assigning bands by hand) overrides that.
  const overrideTiers = parseTiers(body.tiers);
  const requestedTiers = overrideTiers.length
    ? overrideTiers
    : deriveTiers(packages);

  const now = new Date();
  const record: VendorApplicationRecord = {
    id: `VND-${randomUUID().slice(0, 6).toUpperCase()}`,
    business,
    owner,
    email,
    phone,
    city: str(body.city),
    state: str(body.state),
    cuisines,
    speciality: cuisines.slice(0, 2).join(", ") || "Catering",
    requestedTiers,
    gstNumber,
    fssaiNumber,
    documents,
    packages,
    minGuests: str(body.minGuests),
    maxGuests: str(body.maxGuests),
    serviceCities: strList(body.serviceCities),
    counters: strList(body.counters),
    status: "Pending",
    submitted: now.toISOString().slice(0, 10),
    submittedAt: now.toISOString(),
  };

  try {
    const records = await readVendorApplications();
    records.push(record);
    await writeVendorApplications(records);
  } catch (err) {
    console.error("Failed to persist vendor application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // Every submission is a new application — alert the owners (best-effort).
  await sendVendorApplicationAlert(record);

  return Response.json({ ok: true, id: record.id }, { status: 201 });
}

// Admin → Vendor Approvals reads the submitted applications here, newest first.
// Backward-compatible `{ applications }`; adds a `Paginated` envelope (over
// `data`) when a filter/pagination param is present.
export async function GET(request: Request) {
  const records = await readVendorApplications();
  records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const applications = records.map(toAdminApplication);

  const { q, status, page, pageSize, hasQuery } = parseListQuery(request.url);
  if (!hasQuery) return Response.json({ applications });

  const needle = q.trim().toLowerCase();
  const filtered = applications.filter((a) => {
    const matchesQ =
      !needle ||
      a.id.toLowerCase().includes(needle) ||
      a.business.toLowerCase().includes(needle) ||
      a.owner.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || a.status === status;
    return matchesQ && matchesStatus;
  });
  const start = (page - 1) * pageSize;
  return Response.json({
    applications,
    data: filtered.slice(start, start + pageSize),
    page,
    pageSize,
    total: filtered.length,
  });
}
