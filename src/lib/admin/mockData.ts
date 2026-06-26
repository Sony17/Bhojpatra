/**
 * Mock data for the Admin Panel.
 *
 * SINGLE SOURCE OF TRUTH for all dashboard content. Components never hardcode
 * values — they receive these typed exports as props. Each export is shaped to
 * mirror an eventual API response, so swapping `import { ... } from
 * "@/lib/admin/mockData"` for a `fetch`/server call is a one-line change with
 * no edits to any widget.
 *
 * Figures are illustrative and consistent with the customer/vendor mock data
 * (Lucknow-centric, ₹ INR, same vendor names where sensible).
 */
import { vendorListings } from "@/lib/data";
import type {
  AdminProfile,
  AdminKpi,
  PendingVendorApproval,
  AdminBookingRow,
  AdminNotification,
  RevenueSummary,
  QuickAction,
  AdminVendor,
  VerificationStatus,
  Paginated,
  VendorQuery,
} from "./types";

export const adminProfile: AdminProfile = {
  name: "Ankit Srivastva",
  role: "Super Admin",
  initials: "AS",
};

export const adminKpis: AdminKpi[] = [
  { key: "vendors", label: "Total Vendors", value: "128", sub: "+6 this month", iconKey: "vendors", href: "/admin/vendors" },
  { key: "approvals", label: "Pending Approvals", value: "7", sub: "Awaiting KYC", iconKey: "approvals", href: "/admin/vendor-approvals" },
  { key: "today", label: "Today's Bookings", value: "12", sub: "3 events today", iconKey: "bookings", href: "/admin/bookings" },
  { key: "revenue", label: "Revenue", value: "₹42.8L", sub: "+12% MoM", iconKey: "revenue", href: "/admin/payments" },
  { key: "customers", label: "Customers", value: "3,940", sub: "+128 this week", iconKey: "customers", href: "/admin/customers" },
  { key: "coupons", label: "Active Coupons", value: "5", sub: "2 expiring soon", iconKey: "coupons", href: "/admin/coupons" },
];

export const recentBookings: AdminBookingRow[] = [
  { id: "BHJ-24871", customer: "Ankit Sharma", occasion: "Wedding", date: "12 Dec 2026", vendor: "Awadhi Royal Caterers", city: "Lucknow", amount: 674500, status: "Confirmed" },
  { id: "BHJ-24990", customer: "Priya Verma", occasion: "Reception", date: "20 Dec 2026", vendor: "Nawabi Dawat", city: "Lucknow", amount: 404700, status: "Pending" },
  { id: "BHJ-24655", customer: "Rahul Gupta", occasion: "Engagement", date: "28 Nov 2026", vendor: "Spice Symphony", city: "Lucknow", amount: 179850, status: "Confirmed" },
  { id: "BHJ-23998", customer: "Sneha Singh", occasion: "Birthday Party", date: "05 Aug 2026", vendor: "Bengal Bhoj", city: "Kolkata", amount: 87920, status: "Completed" },
  { id: "BHJ-24120", customer: "Imran Khan", occasion: "Corporate Event", date: "02 Jan 2027", vendor: "Dilli Darbar Caterers", city: "Delhi", amount: 215820, status: "Confirmed" },
  { id: "BHJ-23541", customer: "Meera Nair", occasion: "Reception", date: "18 Jul 2026", vendor: "Namma Ruchi Caterers", city: "Bengaluru", amount: 179800, status: "Cancelled" },
];

export const pendingApprovals: PendingVendorApproval[] = [
  { id: "AP-2042", business: "Royal Tandoor Caterers", owner: "Faiz Khan", city: "Lucknow", speciality: "Mughlai & Tandoor", requestedTier: "Gold", submitted: "2 hrs ago", status: "Pending" },
  { id: "AP-2039", business: "Green Leaf Pure Veg", owner: "Anita Joshi", city: "Pune", speciality: "Pure Veg / Jain", requestedTier: "Silver", submitted: "5 hrs ago", status: "Pending" },
  { id: "AP-2035", business: "Coastal Spice Co.", owner: "Rohan Pai", city: "Mangalore", speciality: "South Indian / Coastal", requestedTier: "Gold", submitted: "1 day ago", status: "Pending" },
  { id: "AP-2031", business: "Maratha Spice Caterers", owner: "Sunil More", city: "Pune", speciality: "Continental & Chinese", requestedTier: "Silver", submitted: "1 day ago", status: "Pending" },
  { id: "AP-2028", business: "Grand Nawabi Dawat", owner: "Imtiaz Ahmed", city: "Lucknow", speciality: "Awadhi", requestedTier: "Platinum", submitted: "2 days ago", status: "Pending" },
];

export const revenueSummary: RevenueSummary = {
  total: 4280000,
  advance: 1180000,
  settled: 2640000,
  pending: 460000,
};

export const adminNotifications: AdminNotification[] = [
  { id: "an1", message: "New vendor application from Royal Tandoor Caterers (Lucknow).", time: "2 min ago", unread: true },
  { id: "an2", message: "Advance payment of ₹1,68,625 received for BHJ-24871.", time: "1 hr ago", unread: true },
  { id: "an3", message: "Green Leaf Pure Veg passed FSSAI verification.", time: "3 hrs ago", unread: true },
  { id: "an4", message: "Booking BHJ-23541 was cancelled by the customer.", time: "Yesterday", unread: false },
];

export const quickActions: QuickAction[] = [
  { label: "Review Approvals", href: "/admin/vendor-approvals", iconKey: "approvals" },
  { label: "Add Coupon", href: "/admin/coupons", iconKey: "coupons" },
  { label: "Manage Menu", href: "/admin/menu", iconKey: "menu" },
  { label: "Add-On Manager", href: "/admin/add-ons", iconKey: "addons" },
  { label: "View Reports", href: "/admin/reports", iconKey: "reports" },
];

/* ───────────────────────────────────────────────────────────────────────
   VENDOR MANAGEMENT (Phase 2)

   `adminVendors` is DERIVED from the public `vendorListings` (single source of
   truth for the overlapping fields: business/tier/city/state/cuisines/diet/
   rating/reviews/priceFrom/image) and ENRICHED with admin-only fields (owner,
   contact, KYC documents, verification status, join date, bookings).

   Enrichment is fully deterministic (index-based, no randomness) so the mock is
   stable across renders/builds. `queryVendors` / `getVendorById` are pure
   selectors that mirror the future API contract.
─────────────────────────────────────────────────────────────────────── */

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

const VENDOR_OWNERS = [
  "Imtiaz Ahmed", "Rehana Begum", "Vikram Sethi", "Aarav Joshi",
  "Lakshmi Rao", "Anjan Dutta", "Syed Akbar", "Bhanu Pratap",
  "Karthik Iyer", "Sunil More", "Harpreet Gill", "Ramesh Tiwari",
];

const VENDOR_JOINED = [
  "12 Jan 2025", "03 Mar 2025", "21 Apr 2025", "18 May 2025",
  "09 Jun 2025", "27 Jul 2025", "14 Aug 2025", "02 Sep 2025",
  "19 Oct 2025", "30 Nov 2025", "15 Dec 2025", "08 Jan 2026",
];

export const adminVendors: AdminVendor[] = vendorListings.map((v, i) => {
  // Verification status: verified → Verified; otherwise Pending. One Rejected
  // and one Suspended example for realistic UI coverage.
  let status: VerificationStatus = v.verified ? "Verified" : "Pending";
  if (v.id === "vl-10") status = "Rejected";
  const suspended = v.id === "vl-7";

  const stateCode = (9 + i).toString().padStart(2, "0");
  const docStatus: VerificationStatus = status;

  return {
    id: v.id,
    business: v.name,
    owner: VENDOR_OWNERS[i % VENDOR_OWNERS.length],
    phone: `+91 9${String(100000000 + i * 7654321).slice(0, 9)}`,
    email: `hello@${slug(v.name)}.in`,
    city: v.city,
    state: v.state,
    tier: v.tier,
    status,
    suspended,
    cuisines: v.cuisines,
    diet: v.diet,
    rating: v.rating,
    reviews: v.reviews,
    priceFrom: v.priceFrom,
    joinedDate: VENDOR_JOINED[i % VENDOR_JOINED.length],
    totalBookings: Math.round(v.reviews * 0.55),
    image: v.image,
    documents: [
      { kind: "GST", number: `${stateCode}ABCDE${1000 + i}F1Z${(i % 9) + 1}`, status: docStatus },
      { kind: "FSSAI", number: `1${String(10000000000000 + i).slice(0, 13)}`, status: docStatus },
      { kind: "ID", number: `XXXX XXXX ${1000 + i}`, status: "Verified" },
    ],
  };
});

/** Unique cities present in the vendor set (for the city filter). */
export const vendorCities: string[] = Array.from(
  new Set(adminVendors.map((v) => v.city)),
).sort();

/** Paginated, filtered vendor query. Pure — swap the body for a `fetch` later
 *  and the `Paginated<AdminVendor>` shape stays identical. */
export function queryVendors(params: VendorQuery = {}): Paginated<AdminVendor> {
  const { q = "", tier = "All", status = "All", city = "All", page = 1, pageSize = 8 } = params;
  const needle = q.trim().toLowerCase();

  const filtered = adminVendors.filter((v) => {
    const matchesQ =
      !needle ||
      v.business.toLowerCase().includes(needle) ||
      v.owner.toLowerCase().includes(needle) ||
      v.city.toLowerCase().includes(needle);
    const matchesTier = tier === "All" || v.tier === tier;
    const matchesStatus = status === "All" || v.status === status;
    const matchesCity = city === "All" || v.city === city;
    return matchesQ && matchesTier && matchesStatus && matchesCity;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { data: filtered.slice(start, start + pageSize), page, pageSize, total };
}

/** Single vendor lookup. */
export function getVendorById(id: string): AdminVendor | undefined {
  return adminVendors.find((v) => v.id === id);
}
