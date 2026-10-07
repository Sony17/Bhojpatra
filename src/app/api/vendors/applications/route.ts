import { requireRole } from "@/lib/auth";
import { randomUUID } from "crypto";
import {
  applicationForOwner,
  readVendorApplications,
  saveVendorApplication,
  toAdminApplication,
  withHistory,
  type VendorApplicationDoc,
  type VendorApplicationRecord,
  type VendorPackageInput,
} from "@/lib/vendorApplications";
import {
  parseTiers,
  sortTiers,
  tierForPrice,
  type VendorDocKind,
  type VendorTier,
} from "@/lib/admin/types";
import {
  listLiveVendorRecords,
  stripBadgeGrants,
  cleanBadges,
  cleanBainaBoxes,
  cleanBainaDetails,
  cleanBestFor,
  cleanCateringCategories,
  cleanCustomOfferings,
  cleanCutleryTier,
  cleanDietaryOffering,
  cleanEssentialService,
  cleanGoogleRating,
  cleanGoogleReviews,
  cleanServiceCities,
  cleanStallConfig,
} from "@/lib/vendorMenus";
import { isValidGst, normalizeGst, parseListQuery } from "@/lib/validate";
import { sendVendorApplicationAlert } from "@/lib/email";
import type { VendorOfferSummary } from "@/lib/admin/types";
import type { LiveVendorRecord } from "@/lib/vendorMenus";
import { cateringCategories, menuCategories } from "@/lib/data";

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

const DOC_FIELDS: { kind: VendorDocKind; key: string }[] = [
  { kind: "GST", key: "gst" },
  { kind: "FSSAI", key: "fssai" },
  { kind: "ID", key: "ownerId" },
  { kind: "Business Proof", key: "businessProof" },
];

// Legacy single-form registration (the orphaned `VendorRegister`). The V2
// wizard submits through POST /api/vendor/application. Both now require a
// signed-in vendor: the application is bound to that account (one per
// account — a repeat submission updates it) and the email comes from the
// session, never the body.
export async function POST(request: Request) {
  const user = await requireRole("vendor");
  if (user instanceof Response) return user;

  let body: Record<string, unknown>;
  try {
    body = ((await request.json()) ?? {}) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const business = str(body.business);
  const owner = str(body.owner);
  const email = user.email.trim().toLowerCase();
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
  const gstNumber = normalizeGst(str(body.gstNumber));
  const fssaiNumber = str(body.fssaiNumber);

  if (!isValidGst(gstNumber)) {
    return Response.json(
      { error: "Please enter a valid 15-digit GST number." },
      { status: 400 },
    );
  }

  // Optional self-declared Google reputation — only stored when a valid,
  // positive rating is given (the count alone shows nothing on the card).
  const googleRating = cleanGoogleRating(body.googleRating);
  const googleReviews = googleRating
    ? cleanGoogleReviews(body.googleReviews)
    : undefined;

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

  // Baina Box menu + Essential Service offer — same cleaners as the dashboard
  // menu save, so a bad box list fails registration with the same message.
  const boxesCheck = cleanBainaBoxes(body.bainaBoxes);
  if (!boxesCheck.ok) {
    return Response.json({ error: boxesCheck.error }, { status: 400 });
  }
  const bainaBoxes = boxesCheck.value;
  const essentialService = cleanEssentialService(body.essentialService);

  const serviceCities = cleanServiceCities(body.serviceCities);
  const dietaryOffering = cleanDietaryOffering(body.dietaryOffering);
  const minPaxNum = Number(body.minPax) || (Number(body.minGuests) || undefined);
  const leadHoursNum = Number(body.leadHours) || undefined;
  const bestFor = cleanBestFor(body.bestFor);
  const packageName = str(body.packageName).slice(0, 80) || undefined;
  const goldSpecialization = str(body.goldSpecialization).slice(0, 80) || undefined;
  const cutleryTier = cleanCutleryTier(body.cutleryTier);
  const customOfferings = cleanCustomOfferings(body.customOfferings);
  const stallConfig = cleanStallConfig(body.stallConfig);
  const bainaDetails = cleanBainaDetails(body.bainaDetails);
  // Vendors can apply for badges but never grant themselves one.
  const badges = stripBadgeGrants(cleanBadges(body.badges));

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
  let existing: VendorApplicationRecord | null;
  try {
    existing = applicationForOwner(await readVendorApplications(), user);
  } catch (err) {
    console.error("Failed to read vendor applications", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
  const record: VendorApplicationRecord = {
    // Admin decisions (assigned tiers, review trail) carry over on resubmit.
    ...(existing ?? {}),
    id: existing?.id ?? `VND-${randomUUID().slice(0, 6).toUpperCase()}`,
    ownerUserId: user.id,
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
    ...(googleRating ? { googleRating } : {}),
    ...(googleReviews !== undefined ? { googleReviews } : {}),
    documents,
    packages,
    minGuests: str(body.minGuests),
    maxGuests: str(body.maxGuests),
    maxEventsPerDay: str(body.maxEventsPerDay),
    serviceCities: serviceCities.length ? serviceCities : strList(body.serviceCities),
    counters: strList(body.counters),
    // Exactly the categories the vendor declared — never inferred from
    // whatever builder data happened to be sent along.
    cateringCategories: cleanCateringCategories(body.cateringCategories),
    ...(bainaBoxes.length ? { bainaBoxes } : {}),
    ...(essentialService ? { essentialService } : {}),
    /* ── V2 Extensions ── */
    ...(dietaryOffering ? { dietaryOffering } : {}),
    ...(minPaxNum ? { minPax: Math.round(minPaxNum) } : {}),
    ...(leadHoursNum ? { leadHours: Math.round(leadHoursNum) } : {}),
    ...(bestFor.length ? { bestFor } : {}),
    ...(packageName ? { packageName } : {}),
    ...(goldSpecialization ? { goldSpecialization } : {}),
    ...(cutleryTier ? { cutleryTier } : {}),
    ...(customOfferings.length ? { customOfferings } : {}),
    ...(stallConfig ? { stallConfig } : {}),
    ...(bainaDetails ? { bainaDetails } : {}),
    ...(badges ? { badges } : {}),
    status: existing?.status === "Verified" ? "Verified" : "Pending",
    changesRequested: undefined,
    submitted: now.toISOString().slice(0, 10),
    submittedAt: now.toISOString(),
  };
  record.history = existing
    ? withHistory(existing, { at: now.toISOString(), by: "vendor", action: "resubmitted" })
    : [{ at: now.toISOString(), by: "vendor", action: "submitted" }];

  try {
    await saveVendorApplication(record);
  } catch (err) {
    console.error("Failed to persist vendor application", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  // New / back-in-queue applications alert the owners (best-effort).
  if (record.status === "Pending") await sendVendorApplicationAlert(record);

  return Response.json({ ok: true, id: record.id }, { status: 201 });
}

// Admin → Vendor Approvals reads the submitted applications here, newest first.
// Backward-compatible `{ applications }`; adds a `Paginated` envelope (over
// `data`) when a filter/pagination param is present.
export async function GET(request: Request) {
  const guard = await requireRole("admin");
  if (guard instanceof Response) return guard;
  const [records, vendors] = await Promise.all([
    readVendorApplications(),
    listLiveVendorRecords().catch((err) => {
      // The summary is a review aid — never fail the queue over it.
      console.error("Failed to load vendors for application summaries", err);
      return [] as LiveVendorRecord[];
    }),
  ]);
  records.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  const applications = records.map((r) => {
    const email = r.email.trim().toLowerCase();
    const vendor =
      (r.ownerUserId && vendors.find((v) => v.ownerUserId === r.ownerUserId)) ||
      (!r.ownerUserId &&
        vendors.find((v) => v.ownerEmail?.trim().toLowerCase() === email)) ||
      null;
    const summary = vendor ? offerSummary(vendor) : null;
    return { ...toAdminApplication(r), ...(summary ? { offerSummary: summary } : {}) };
  });

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

const SERVICE_NAME = new Map(cateringCategories.map((c) => [c.id, c.name]));
const COURSE_NAME = new Map(menuCategories.map((c) => [c.id, c.name]));

/** Compact review summary of a vendor's saved (current, possibly pending)
 *  listing for the approvals console. */
function offerSummary(v: LiveVendorRecord): VendorOfferSummary {
  return {
    vendorId: v.id,
    services: (v.serviceCategories ?? []).map((id) => SERVICE_NAME.get(id) ?? id),
    priceFrom: v.priceFrom,
    ...(v.dietaryOffering ? { dietaryOffering: v.dietaryOffering } : {}),
    serviceCities: v.serviceCities ?? [],
    courses: v.menu
      .filter((s) => !s.hidden && s.items.length)
      .map((s) => ({
        name: COURSE_NAME.get(s.categoryId) ?? s.categoryId,
        dishes: s.items.length,
        perPlate: s.perPlate,
      })),
    stalls: (v.stallConfig?.categories ?? []).map((c) => ({
      name: c,
      ...(v.stallConfig?.categoryPricing?.[c]?.fixedPerPlate
        ? { perPlate: v.stallConfig.categoryPricing[c].fixedPerPlate }
        : {}),
      ...(v.stallConfig?.categoryPricing?.[c]?.minPaxGuarantee
        ? { minPax: v.stallConfig.categoryPricing[c].minPaxGuarantee }
        : {}),
    })),
    bainaBoxes: (v.bainaBoxes ?? []).map((b) => ({ name: b.name, price: b.price })),
    counters: v.counters?.length ?? 0,
    moderation: v.moderation ?? "Pending",
  };
}
