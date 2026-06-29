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
import {
  vendorListings,
  cuisines,
  menuCourses,
  packages,
  addOns,
  coupons,
} from "@/lib/data";
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
  VendorApplication,
  ApprovalQuery,
  AdminBooking,
  BookingQuery,
  AdminCustomer,
  CustomerQuery,
  AdminPayment,
  VendorSettlement,
  PaymentQuery,
  AdminCoupon,
  CatalogCuisine,
  CatalogDish,
  CatalogPackage,
  CatalogAddOn,
  ContentBanner,
  ContentTestimonial,
  ContentFaq,
  TrendPoint,
  VendorPerfRow,
  BusinessDetails,
  AdminRoleInfo,
} from "./types";

/** Shared helper — slugify a business name for mock emails. Declared at the top
 *  so module-level data built below (applications, vendors) can use it safely. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "");

export const adminProfile: AdminProfile = {
  name: "Ankit Srivastva",
  role: "Super Admin",
  initials: "AS",
};

export const adminKpis: AdminKpi[] = [
  { key: "vendors", label: "Total Vendors", value: "128", sub: "+6 this month", iconKey: "vendors", href: "/admin/vendors" },
  { key: "approvals", label: "Pending Approvals", value: "7", sub: "Awaiting KYC", iconKey: "approvals", href: "/admin/vendor-approvals" },
  { key: "today", label: "Today's Bookings", value: "12", sub: "3 events today", iconKey: "bookings", href: "/admin/customers?tab=bookings" },
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

/* Vendor applications power both the dashboard "Pending Approvals" panel and the
   full Vendor Approvals / KYC console. `pendingApprovals` is DERIVED from this
   (status === "Pending") so there is one source of truth. */
const APPLICATIONS_BASE: PendingVendorApproval[] = [
  { id: "AP-2042", business: "Royal Tandoor Caterers", owner: "Faiz Khan", city: "Lucknow", speciality: "Mughlai & Tandoor", requestedTier: "Gold", submitted: "2 hrs ago", status: "Pending" },
  { id: "AP-2039", business: "Green Leaf Pure Veg", owner: "Anita Joshi", city: "Pune", speciality: "Pure Veg / Jain", requestedTier: "Silver", submitted: "5 hrs ago", status: "Pending" },
  { id: "AP-2035", business: "Coastal Spice Co.", owner: "Rohan Pai", city: "Mangalore", speciality: "South Indian / Coastal", requestedTier: "Gold", submitted: "1 day ago", status: "Pending" },
  { id: "AP-2031", business: "Maratha Spice Caterers", owner: "Sunil More", city: "Pune", speciality: "Continental & Chinese", requestedTier: "Silver", submitted: "1 day ago", status: "Pending" },
  { id: "AP-2028", business: "Grand Nawabi Dawat", owner: "Imtiaz Ahmed", city: "Lucknow", speciality: "Awadhi", requestedTier: "Platinum", submitted: "2 days ago", status: "Pending" },
  { id: "AP-2025", business: "Hyderabadi House", owner: "Mohsin Ali", city: "Hyderabad", speciality: "Hyderabadi Biryani", requestedTier: "Gold", submitted: "3 days ago", status: "Pending" },
  { id: "AP-2019", business: "Annapurna Bhog", owner: "Deepa Nair", city: "Kochi", speciality: "Kerala Sadya", requestedTier: "Silver", submitted: "5 days ago", status: "Verified" },
  { id: "AP-2012", business: "Quick Bites Co.", owner: "Rajat Malhotra", city: "Noida", speciality: "Fast Food", requestedTier: "Silver", submitted: "1 week ago", status: "Rejected" },
];

export const vendorApplications: VendorApplication[] = APPLICATIONS_BASE.map(
  (a, i) => {
    const gst: VerificationStatus =
      a.status === "Verified" ? "Verified" : a.status === "Rejected" ? "Rejected" : "Pending";
    const fssai: VerificationStatus = a.status === "Verified" ? "Verified" : "Pending";
    return {
      ...a,
      email: `hello@${slug(a.business)}.in`,
      phone: `+91 9${String(120000000 + i * 5432109).slice(0, 9)}`,
      documents: [
        { kind: "GST", number: `${(20 + i).toString()}ABCDE${2000 + i}F1Z${(i % 9) + 1}`, status: gst },
        { kind: "FSSAI", number: `2${String(10000000000000 + i).slice(0, 13)}`, status: fssai },
        { kind: "ID", number: `XXXX XXXX ${2000 + i}`, status: "Verified" },
      ],
    };
  },
);

export const pendingApprovals: PendingVendorApproval[] = vendorApplications.filter(
  (a) => a.status === "Pending",
);

/** Filtered, paginated approvals query. Accepts an optional `source` so a
 *  component holding locally-mutated state can reuse the same filter logic. */
export function queryApprovals(
  params: ApprovalQuery = {},
  source: VendorApplication[] = vendorApplications,
): Paginated<VendorApplication> {
  const { q = "", status = "All", page = 1, pageSize = 6 } = params;
  const needle = q.trim().toLowerCase();

  const filtered = source.filter((a) => {
    const matchesQ =
      !needle ||
      a.business.toLowerCase().includes(needle) ||
      a.owner.toLowerCase().includes(needle) ||
      a.city.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || a.status === status;
    return matchesQ && matchesStatus;
  });

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { data: filtered.slice(start, start + pageSize), page, pageSize, total };
}

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
  { label: "Manage Content", href: "/admin/content", iconKey: "content" },
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

/* ───────────────────────────────────────────────────────────────────────
   BOOKING MANAGEMENT
─────────────────────────────────────────────────────────────────────── */

export const adminBookings: AdminBooking[] = [
  { id: "BHJ-24871", customer: "Ankit Sharma", occasion: "Wedding", date: "12 Dec 2026", guests: 500, vendor: "Awadhi Royal Caterers", city: "Lucknow", amount: 674500, paid: 168625, status: "Confirmed" },
  { id: "BHJ-24990", customer: "Priya Verma", occasion: "Reception", date: "20 Dec 2026", guests: 300, vendor: "Nawabi Dawat", city: "Lucknow", amount: 404700, paid: 0, status: "Pending" },
  { id: "BHJ-24655", customer: "Rahul Gupta", occasion: "Engagement", date: "28 Nov 2026", guests: 150, vendor: "Spice Symphony", city: "Lucknow", amount: 179850, paid: 179850, status: "Confirmed" },
  { id: "BHJ-23998", customer: "Sneha Singh", occasion: "Birthday Party", date: "05 Aug 2026", guests: 80, vendor: "Bengal Bhoj", city: "Kolkata", amount: 87920, paid: 87920, status: "Completed" },
  { id: "BHJ-24120", customer: "Imran Khan", occasion: "Corporate Event", date: "02 Jan 2027", guests: 180, vendor: "Dilli Darbar Caterers", city: "Delhi", amount: 215820, paid: 53955, status: "Confirmed" },
  { id: "BHJ-23541", customer: "Meera Nair", occasion: "Reception", date: "18 Jul 2026", guests: 200, vendor: "Namma Ruchi Caterers", city: "Bengaluru", amount: 179800, paid: 0, status: "Cancelled" },
  { id: "BHJ-24777", customer: "Vikas Yadav", occasion: "Wedding", date: "14 Feb 2027", guests: 650, vendor: "Bengal Bhoj", city: "Kolkata", amount: 844350, paid: 211087, status: "Confirmed" },
  { id: "BHJ-24310", customer: "Pooja Reddy", occasion: "Haldi", date: "09 Sep 2026", guests: 120, vendor: "Nizami Daawat", city: "Hyderabad", amount: 141600, paid: 35400, status: "Confirmed" },
  { id: "BHJ-24501", customer: "Arjun Mehta", occasion: "Corporate Event", date: "22 Oct 2026", guests: 250, vendor: "Marathi Mejwani", city: "Mumbai", amount: 249750, paid: 0, status: "Pending" },
  { id: "BHJ-23880", customer: "Kavya Iyer", occasion: "Engagement", date: "30 Jun 2026", guests: 100, vendor: "Chettinad Feast Co.", city: "Chennai", amount: 109000, paid: 109000, status: "Completed" },
  { id: "BHJ-24655B", customer: "Sahil Kapoor", occasion: "Birthday Party", date: "11 Nov 2026", guests: 60, vendor: "Tandoor Tales", city: "Delhi", amount: 53940, paid: 13485, status: "Confirmed" },
  { id: "BHJ-24902", customer: "Neha Joshi", occasion: "Wedding", date: "03 Mar 2027", guests: 800, vendor: "Rajwada Rasoi", city: "Jaipur", amount: 759200, paid: 0, status: "Pending" },
  { id: "BHJ-23770", customer: "Rohit Sinha", occasion: "Reception", date: "26 Jul 2026", guests: 220, vendor: "Sattvik Bhojan", city: "Lucknow", amount: 242000, paid: 242000, status: "Completed" },
  { id: "BHJ-24988", customer: "Anjali Das", occasion: "Festival", date: "19 Jan 2027", guests: 400, vendor: "Awadhi Royal Caterers", city: "Lucknow", amount: 539600, paid: 134900, status: "Confirmed" },
];

export const bookingCities: string[] = Array.from(
  new Set(adminBookings.map((b) => b.city)),
).sort();

/** Filtered, paginated bookings. Accepts an optional `source` so a component
 *  holding locally-mutated state can reuse the same filter logic. */
export function queryBookings(
  params: BookingQuery = {},
  source: AdminBooking[] = adminBookings,
): Paginated<AdminBooking> {
  const { q = "", status = "All", city = "All", page = 1, pageSize = 8 } = params;
  const needle = q.trim().toLowerCase();
  const filtered = source.filter((b) => {
    const matchesQ =
      !needle ||
      b.id.toLowerCase().includes(needle) ||
      b.customer.toLowerCase().includes(needle) ||
      b.vendor.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || b.status === status;
    const matchesCity = city === "All" || b.city === city;
    return matchesQ && matchesStatus && matchesCity;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { data: filtered.slice(start, start + pageSize), page, pageSize, total };
}

/* ───────────────────────────────────────────────────────────────────────
   CUSTOMER MANAGEMENT
─────────────────────────────────────────────────────────────────────── */

export const adminCustomers: AdminCustomer[] = [
  { id: "CU-1001", name: "Ankit Sharma", email: "ankit.sharma@example.com", phone: "+91 98110 11001", city: "Lucknow", joined: "12 Jan 2025", totalBookings: 4, activeBookings: 1, lifetimeSpend: 1284500, status: "Active" },
  { id: "CU-1002", name: "Priya Verma", email: "priya.verma@example.com", phone: "+91 98110 11002", city: "Lucknow", joined: "03 Feb 2025", totalBookings: 2, activeBookings: 1, lifetimeSpend: 584550, status: "Active" },
  { id: "CU-1003", name: "Rahul Gupta", email: "rahul.gupta@example.com", phone: "+91 98110 11003", city: "Lucknow", joined: "21 Mar 2025", totalBookings: 3, activeBookings: 0, lifetimeSpend: 459700, status: "Active" },
  { id: "CU-1004", name: "Sneha Singh", email: "sneha.singh@example.com", phone: "+91 98110 11004", city: "Kolkata", joined: "18 Apr 2025", totalBookings: 1, activeBookings: 0, lifetimeSpend: 87920, status: "Inactive" },
  { id: "CU-1005", name: "Imran Khan", email: "imran.khan@example.com", phone: "+91 98110 11005", city: "Delhi", joined: "09 May 2025", totalBookings: 2, activeBookings: 1, lifetimeSpend: 395620, status: "Active" },
  { id: "CU-1006", name: "Meera Nair", email: "meera.nair@example.com", phone: "+91 98110 11006", city: "Bengaluru", joined: "27 May 2025", totalBookings: 1, activeBookings: 0, lifetimeSpend: 0, status: "Inactive" },
  { id: "CU-1007", name: "Vikas Yadav", email: "vikas.yadav@example.com", phone: "+91 98110 11007", city: "Kolkata", joined: "14 Jun 2025", totalBookings: 2, activeBookings: 1, lifetimeSpend: 844350, status: "Active" },
  { id: "CU-1008", name: "Pooja Reddy", email: "pooja.reddy@example.com", phone: "+91 98110 11008", city: "Hyderabad", joined: "02 Jul 2025", totalBookings: 3, activeBookings: 1, lifetimeSpend: 512300, status: "Active" },
  { id: "CU-1009", name: "Arjun Mehta", email: "arjun.mehta@example.com", phone: "+91 98110 11009", city: "Mumbai", joined: "19 Jul 2025", totalBookings: 1, activeBookings: 1, lifetimeSpend: 249750, status: "Active" },
  { id: "CU-1010", name: "Kavya Iyer", email: "kavya.iyer@example.com", phone: "+91 98110 11010", city: "Chennai", joined: "30 Aug 2025", totalBookings: 2, activeBookings: 0, lifetimeSpend: 318000, status: "Active" },
  { id: "CU-1011", name: "Sahil Kapoor", email: "sahil.kapoor@example.com", phone: "+91 98110 11011", city: "Delhi", joined: "11 Sep 2025", totalBookings: 1, activeBookings: 1, lifetimeSpend: 53940, status: "Active" },
  { id: "CU-1012", name: "Neha Joshi", email: "neha.joshi@example.com", phone: "+91 98110 11012", city: "Jaipur", joined: "03 Oct 2025", totalBookings: 1, activeBookings: 1, lifetimeSpend: 0, status: "Active" },
];

export const customerCities: string[] = Array.from(
  new Set(adminCustomers.map((c) => c.city)),
).sort();

export function queryCustomers(params: CustomerQuery = {}): Paginated<AdminCustomer> {
  const { q = "", city = "All", status = "All", page = 1, pageSize = 8 } = params;
  const needle = q.trim().toLowerCase();
  const filtered = adminCustomers.filter((c) => {
    const matchesQ =
      !needle ||
      c.name.toLowerCase().includes(needle) ||
      c.email.toLowerCase().includes(needle) ||
      c.phone.toLowerCase().includes(needle);
    const matchesCity = city === "All" || c.city === city;
    const matchesStatus = status === "All" || c.status === status;
    return matchesQ && matchesCity && matchesStatus;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { data: filtered.slice(start, start + pageSize), page, pageSize, total };
}

export function getCustomerById(id: string): AdminCustomer | undefined {
  return adminCustomers.find((c) => c.id === id);
}

/** Cross-module: a vendor's bookings (matched by business name). */
export function getBookingsByVendor(vendor: string): AdminBooking[] {
  return adminBookings.filter((b) => b.vendor === vendor);
}

/** Cross-module: a customer's bookings (matched by name). */
export function getBookingsByCustomer(customer: string): AdminBooking[] {
  return adminBookings.filter((b) => b.customer === customer);
}

/* ───────────────────────────────────────────────────────────────────────
   PAYMENTS
─────────────────────────────────────────────────────────────────────── */

export const paymentsSummary = {
  collected: 2480000,
  advance: 1180000,
  settled: 2640000,
  pending: 460000,
  refunded: 92000,
};

export const adminPayments: AdminPayment[] = [
  { id: "PMT-5001", bookingId: "BHJ-24871", customer: "Ankit Sharma", method: "UPI", type: "Advance", amount: 168625, status: "Advance Received", date: "10 Nov 2026" },
  { id: "PMT-5002", bookingId: "BHJ-24655", customer: "Rahul Gupta", method: "Card", type: "Balance", amount: 179850, status: "Settled", date: "01 Nov 2026" },
  { id: "PMT-5003", bookingId: "BHJ-23998", customer: "Sneha Singh", method: "UPI", type: "Balance", amount: 87920, status: "Settled", date: "06 Aug 2026" },
  { id: "PMT-5004", bookingId: "BHJ-24120", customer: "Imran Khan", method: "QR", type: "Advance", amount: 53955, status: "Advance Received", date: "20 Dec 2026" },
  { id: "PMT-5005", bookingId: "BHJ-23541", customer: "Meera Nair", method: "UPI", type: "Refund", amount: 0, status: "Refunded", date: "19 Jul 2026" },
  { id: "PMT-5006", bookingId: "BHJ-24777", customer: "Vikas Yadav", method: "Card", type: "Advance", amount: 211087, status: "Advance Received", date: "12 Jan 2027" },
  { id: "PMT-5007", bookingId: "BHJ-24310", customer: "Pooja Reddy", method: "UPI", type: "Advance", amount: 35400, status: "Advance Received", date: "08 Aug 2026" },
  { id: "PMT-5008", bookingId: "BHJ-23880", customer: "Kavya Iyer", method: "Card", type: "Balance", amount: 109000, status: "Settled", date: "30 May 2026" },
  { id: "PMT-5009", bookingId: "BHJ-24501", customer: "Arjun Mehta", method: "QR", type: "Advance", amount: 62437, status: "Pending", date: "—" },
  { id: "PMT-5010", bookingId: "BHJ-23770", customer: "Rohit Sinha", method: "UPI", type: "Balance", amount: 242000, status: "Settled", date: "26 Jun 2026" },
  { id: "PMT-5011", bookingId: "BHJ-24988", customer: "Anjali Das", method: "Card", type: "Advance", amount: 134900, status: "Advance Received", date: "18 Dec 2026" },
  { id: "PMT-5012", bookingId: "BHJ-24655B", customer: "Sahil Kapoor", method: "UPI", type: "Advance", amount: 13485, status: "Advance Received", date: "10 Oct 2026" },
];

export const vendorSettlements: VendorSettlement[] = [
  { id: "STL-3001", vendor: "Awadhi Royal Caterers", bookings: 3, amount: 612000, status: "Settled", period: "Oct 2026" },
  { id: "STL-3002", vendor: "Bengal Bhoj", bookings: 2, amount: 498000, status: "Pending", period: "Nov 2026" },
  { id: "STL-3003", vendor: "Nawabi Dawat", bookings: 2, amount: 286000, status: "Pending", period: "Nov 2026" },
  { id: "STL-3004", vendor: "Spice Symphony", bookings: 1, amount: 161000, status: "Settled", period: "Oct 2026" },
  { id: "STL-3005", vendor: "Dilli Darbar Caterers", bookings: 2, amount: 204000, status: "Pending", period: "Nov 2026" },
  { id: "STL-3006", vendor: "Namma Ruchi Caterers", bookings: 1, amount: 96000, status: "Settled", period: "Sep 2026" },
];

export function queryPayments(params: PaymentQuery = {}): Paginated<AdminPayment> {
  const { q = "", status = "All", method = "All", page = 1, pageSize = 8 } = params;
  const needle = q.trim().toLowerCase();
  const filtered = adminPayments.filter((p) => {
    const matchesQ =
      !needle ||
      p.id.toLowerCase().includes(needle) ||
      p.bookingId.toLowerCase().includes(needle) ||
      p.customer.toLowerCase().includes(needle);
    const matchesStatus = status === "All" || p.status === status;
    const matchesMethod = method === "All" || p.method === method;
    return matchesQ && matchesStatus && matchesMethod;
  });
  const total = filtered.length;
  const start = (page - 1) * pageSize;
  return { data: filtered.slice(start, start + pageSize), page, pageSize, total };
}

/* ───────────────────────────────────────────────────────────────────────
   COUPONS  (derived from public `coupons` + enriched)
─────────────────────────────────────────────────────────────────────── */

const COUPON_META = [
  { id: "CPN-01", eligibility: "All occasions", startsAt: "01 Jun 2026", expiresAt: "31 Dec 2026", status: "Active" as const },
  { id: "CPN-02", eligibility: "First booking only", startsAt: "01 Jan 2026", expiresAt: "31 Dec 2026", status: "Active" as const },
  { id: "CPN-03", eligibility: "Weddings only", startsAt: "01 Jul 2026", expiresAt: "31 Mar 2027", status: "Active" as const },
];

export const adminCoupons: AdminCoupon[] = [
  ...coupons.map((c, i) => ({
    code: c.code,
    label: c.label,
    percent: c.percent,
    cap: c.cap,
    ...COUPON_META[i % COUPON_META.length],
  })),
  { id: "CPN-04", code: "DIWALI20", label: "20% off festive feasts, up to ₹15,000", percent: 20, cap: 15000, eligibility: "Festivals", startsAt: "01 Oct 2026", expiresAt: "15 Nov 2026", status: "Inactive" },
  { id: "CPN-05", code: "MONSOON10", label: "10% off, up to ₹3,000", percent: 10, cap: 3000, eligibility: "All occasions", startsAt: "01 Jun 2026", expiresAt: "31 Aug 2026", status: "Inactive" },
];

/* ───────────────────────────────────────────────────────────────────────
   MENU & CATALOG  (derived from public catalog data)
─────────────────────────────────────────────────────────────────────── */

const dishCountByCuisine = new Map<string, number>();
for (const course of menuCourses) {
  for (const d of course.dishes) {
    dishCountByCuisine.set(d.cuisineId, (dishCountByCuisine.get(d.cuisineId) ?? 0) + 1);
  }
}
const cuisineName = new Map(cuisines.map((c) => [c.id, c.name]));

export const catalogCuisines: CatalogCuisine[] = cuisines.map((c) => ({
  id: c.id,
  name: c.name,
  nameHi: c.nameHi,
  dishes: dishCountByCuisine.get(c.id) ?? 0,
  visible: true,
}));

export const catalogDishes: CatalogDish[] = menuCourses.flatMap((course) =>
  course.dishes.map((d) => ({
    id: d.id,
    name: d.name,
    course: course.name,
    cuisine: cuisineName.get(d.cuisineId) ?? d.cuisineId,
    diet: d.diet,
    visible: true,
  })),
);

export const catalogPackages: CatalogPackage[] = packages.map((p) => ({
  id: p.id,
  name: p.name,
  price: p.price,
  unit: p.unit,
  popular: Boolean(p.popular),
  features: p.features.length,
  visible: true,
}));

export const catalogAddOns: CatalogAddOn[] = addOns.map((a) => ({
  id: a.id,
  name: a.name,
  nameHi: a.nameHi,
  description: a.description,
  price: a.price,
  perPlate: a.perPlate,
  active: true,
}));

/* ───────────────────────────────────────────────────────────────────────
   CONTENT MANAGEMENT
─────────────────────────────────────────────────────────────────────── */

export const contentBanners: ContentBanner[] = [
  { id: "BN-01", title: "Different Specialists. One Celebration.", subtitle: "Book verified caterers for any occasion", placement: "Homepage Hero", active: true },
  { id: "BN-02", title: "Wedding Season Offer", subtitle: "Up to 25% off on wedding feasts", placement: "Homepage Strip", active: true },
  { id: "BN-03", title: "Become a Partner", subtitle: "List your catering business for free", placement: "Partner Page", active: false },
];

export const contentTestimonials: ContentTestimonial[] = [
  { id: "TS-01", name: "Ritu Agarwal", city: "Lucknow", rating: 5, quote: "Bhojpatra made our wedding catering effortless — verified vendors and transparent pricing.", visible: true },
  { id: "TS-02", name: "Sandeep Rao", city: "Bengaluru", rating: 5, quote: "Compared five caterers in minutes and booked the best. Highly recommended.", visible: true },
  { id: "TS-03", name: "Farah Sheikh", city: "Hyderabad", rating: 4, quote: "Loved the live counters. The team handled everything end to end.", visible: true },
  { id: "TS-04", name: "Manish Patel", city: "Mumbai", rating: 5, quote: "Great experience for our corporate event. Smooth and professional.", visible: false },
];

export const contentFaqs: ContentFaq[] = [
  { id: "FQ-01", question: "How do I book a caterer?", answer: "Choose your occasion, build a menu, compare vendors and pay an advance to confirm.", visible: true },
  { id: "FQ-02", question: "Are vendors verified?", answer: "Yes — every vendor passes GST and FSSAI verification before going live.", visible: true },
  { id: "FQ-03", question: "Can I customise the menu?", answer: "Absolutely. Pick dishes course-by-course and add live counters and extras.", visible: true },
  { id: "FQ-04", question: "What payment methods are supported?", answer: "UPI, QR code and cards, with advance and balance payment options.", visible: true },
];

/* ───────────────────────────────────────────────────────────────────────
   REPORTS
─────────────────────────────────────────────────────────────────────── */

export const revenueTrend: TrendPoint[] = [
  { label: "Jan", value: 28 }, { label: "Feb", value: 31 }, { label: "Mar", value: 38 },
  { label: "Apr", value: 35 }, { label: "May", value: 42 }, { label: "Jun", value: 47 },
  { label: "Jul", value: 44 }, { label: "Aug", value: 52 }, { label: "Sep", value: 49 },
  { label: "Oct", value: 58 }, { label: "Nov", value: 63 }, { label: "Dec", value: 71 },
];

export const bookingsTrend: TrendPoint[] = [
  { label: "Jan", value: 120 }, { label: "Feb", value: 138 }, { label: "Mar", value: 162 },
  { label: "Apr", value: 150 }, { label: "May", value: 184 }, { label: "Jun", value: 205 },
  { label: "Jul", value: 192 }, { label: "Aug", value: 228 }, { label: "Sep", value: 214 },
  { label: "Oct", value: 256 }, { label: "Nov", value: 281 }, { label: "Dec", value: 312 },
];

export const topCitiesTrend: TrendPoint[] = [
  { label: "Lucknow", value: 86 }, { label: "Delhi", value: 64 }, { label: "Mumbai", value: 58 },
  { label: "Kolkata", value: 47 }, { label: "Bengaluru", value: 41 }, { label: "Jaipur", value: 33 },
];

export const vendorPerformance: VendorPerfRow[] = adminVendors
  .slice()
  .sort((a, b) => b.totalBookings - a.totalBookings)
  .slice(0, 6)
  .map((v) => ({
    vendor: v.business,
    bookings: v.totalBookings,
    revenue: v.totalBookings * v.priceFrom,
    rating: v.rating,
  }));

/* ───────────────────────────────────────────────────────────────────────
   SETTINGS
─────────────────────────────────────────────────────────────────────── */

export const businessDetails: BusinessDetails = {
  name: "Bhojpatra",
  tagline: "India's Feast Booking Platform",
  phone: "+91 99183 59017",
  email: "ankit23690@gmail.com",
  address: "C-59, Sec K, Aliganj, Lucknow",
  hours: "10 AM – 7 PM (Open all days)",
  instagram: "@bhojpatraofficial",
};

export const adminRoles: AdminRoleInfo[] = [
  { name: "Super Admin", description: "Full access to every module and setting.", members: 1 },
  { name: "Manager", description: "Manage vendors, bookings, payments and content.", members: 3 },
  { name: "Support", description: "View bookings and customers; respond to enquiries.", members: 5 },
];
