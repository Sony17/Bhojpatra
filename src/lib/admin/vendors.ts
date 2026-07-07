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
import { listLiveVendorRecords, toVendorListing } from "@/lib/vendorMenus";
import { readVendorApplications } from "@/lib/vendorApplications";
import { adminVendors } from "@/lib/admin/mockData";
import type { AdminVendor, VerificationStatus } from "@/lib/admin/types";

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
