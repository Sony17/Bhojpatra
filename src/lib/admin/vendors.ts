/**
 * Admin "Vendor Management" data — the real, account-owned caterers as the admin
 * manages them.
 *
 * Each row is assembled live from a vendor's catalog record (`vendorMenus`) plus
 * the linked KYC application (`vendorApplications`, matched by login email), so a
 * caterer who was just verified/approved shows up immediately. These are appended
 * to the curated platform catalog (`adminVendors`) so the console is never empty
 * while real registrations are still trickling in.
 *
 * Server-only: reads the vendor store. Imported by the admin API route and the
 * admin vendor detail page (both server-side).
 */
import {
  findVendorById,
  listLiveVendorRecords,
  readVendorItemLimits,
  toVendorListing,
} from "@/lib/vendorMenus";
import { readVendorApplications } from "@/lib/vendorApplications";
import { adminVendors } from "@/lib/admin/mockData";
import { menuCategories } from "@/lib/data";
import { dishOnTier, effectiveTiers } from "@/lib/tiers";
import type { CourseTierLimits } from "@/lib/vendorItemLimitsData";
import type {
  AdminVendor,
  VendorTier,
  VerificationStatus,
} from "@/lib/admin/types";

/** Format an ISO timestamp as the "12 Jan 2025" display date the table uses. */
function joinedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Real (account-owned) vendors as admin rows, newest registration first. Tier
 *  bands and diet reuse the catalog projection so they match the public card. */
async function realAdminVendors(): Promise<AdminVendor[]> {
  const [records, apps] = await Promise.all([
    listLiveVendorRecords(),
    readVendorApplications(),
  ]);
  const appByEmail = new Map(
    apps.map((a) => [a.email.trim().toLowerCase(), a] as const),
  );

  return [...records]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((r) => {
      const listing = toVendorListing(r);
      const app = r.ownerEmail
        ? appByEmail.get(r.ownerEmail.trim().toLowerCase())
        : undefined;
      const status: VerificationStatus =
        app?.status ?? (r.verified ? "Verified" : "Pending");
      return {
        id: r.id,
        business: r.business,
        owner: app?.owner ?? r.business,
        phone: app?.phone ?? "—",
        email: r.ownerEmail ?? app?.email ?? "—",
        city: r.city,
        state: r.state,
        tiers: listing.tiers,
        status,
        // "Hidden" is the moderation takedown — the console reads it as suspended
        // (the vendor is off every customer surface until restored).
        suspended: r.moderation === "Hidden",
        cuisines: r.cuisines,
        diet: listing.diet,
        rating: r.rating,
        reviews: r.reviews,
        priceFrom: r.priceFrom,
        joinedDate: joinedDate(r.createdAt),
        totalBookings: 0,
        image: r.image,
        documents: (app?.documents ?? []).map((d) => ({
          kind: d.kind,
          number: d.number,
          status: d.status,
        })),
      } satisfies AdminVendor;
    });
}

/** Every vendor the admin manages: real account-owned caterers (assembled live)
 *  followed by the curated platform catalog. */
export async function listAdminVendors(): Promise<AdminVendor[]> {
  const real = await realAdminVendors();
  return [...real, ...adminVendors];
}

/** Single admin-vendor lookup across real + curated vendors, for the detail page. */
export async function getAdminVendorById(
  id: string,
): Promise<AdminVendor | null> {
  const all = await listAdminVendors();
  return all.find((v) => v.id === id) ?? null;
}

/* ── Per-vendor dish-quota overrides (detail page → Menu tab) ────────────── */

/** One bookable course of a vendor, as the selection-limits editor needs it. */
export interface AdminCourseLimitRow {
  categoryId: string;
  name: string;
  icon: string;
  /** Dishes the vendor actually serves on each band (their dish `tiers`
   *  narrowing applied) — the ceiling a quota is clamped to in the wizard. */
  dishCount: Partial<Record<VendorTier, number>>;
  /** The caterer's own dashboard quota (`tierItems`) — what applies on a band
   *  the admin leaves blank. */
  vendorQuota: CourseTierLimits;
  /** The admin override currently stored for this course. */
  adminQuota: CourseTierLimits;
}

export interface AdminVendorItemLimits {
  /** Feast bands this vendor sells — the editable columns. */
  bands: VendorTier[];
  courses: AdminCourseLimitRow[];
}

/** The selection-limits editor's data for one vendor: their bookable courses
 *  (the same visibility rule the wizard applies: not hidden, has dishes) with
 *  current platform/vendor/admin numbers. `null` when the id has no menu
 *  record behind it (a curated console row that isn't bookable). */
export async function getAdminVendorItemLimits(
  id: string,
): Promise<AdminVendorItemLimits | null> {
  const record = await findVendorById(id);
  if (!record) return null;
  const visible = record.menu.filter((s) => !s.hidden && s.items.length > 0);
  if (!visible.length) return null;
  const mine = (await readVendorItemLimits())[id] ?? {};
  const bands = effectiveTiers(record.tiers, record.priceFrom);
  const courses = visible.flatMap((s) => {
    const cat = menuCategories.find((c) => c.id === s.categoryId);
    if (!cat) return [];
    const dishCount: Partial<Record<VendorTier, number>> = {};
    for (const tier of bands) {
      dishCount[tier] = s.items.filter((it) => dishOnTier(it, tier)).length;
    }
    return [
      {
        categoryId: s.categoryId,
        name: cat.name,
        icon: cat.icon,
        dishCount,
        vendorQuota: s.tierItems ?? {},
        adminQuota: mine[s.categoryId] ?? {},
      },
    ];
  });
  return courses.length ? { bands, courses } : null;
}
