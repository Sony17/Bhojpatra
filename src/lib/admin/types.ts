/**
 * Admin Panel domain types.
 *
 * Shared between the data layer (`mockData.ts`) and the presentation widgets.
 * Reuses `BookingStatus` from the public data layer so booking statuses can
 * never drift between the customer site and the admin panel.
 */
import type { BookingStatus } from "@/lib/data";

// Re-export so admin components import booking status from a single surface.
export type { BookingStatus } from "@/lib/data";

/** Admin identity shown in the topbar avatar/welcome. */
export interface AdminProfile {
  name: string;
  role: string;
  initials: string;
}

/** Icon keys understood by the admin icon map (`shared/iconMap`). */
export type AdminIconKey =
  | "vendors"
  | "approvals"
  | "bookings"
  | "revenue"
  | "customers"
  | "coupons"
  | "addons"
  | "payments"
  | "content"
  | "reports"
  | "settings";

/** A single headline metric (KPI card). `value` is a display string
 *  (e.g. "₹42.8L") so <CountUp> can animate it. */
export interface AdminKpi {
  key: string;
  label: string;
  value: string;
  sub: string;
  iconKey: AdminIconKey;
  /** Clicking the card deep-links here. */
  href: string;
}

export type VerificationStatus = "Pending" | "Verified" | "Rejected";
export type VendorTier = "Silver" | "Gold" | "Platinum";

/** A vendor awaiting KYC review (compact form used by the dashboard panel). */
export interface PendingVendorApproval {
  id: string;
  business: string;
  owner: string;
  city: string;
  speciality: string;
  requestedTier: VendorTier;
  submitted: string;
  status: VerificationStatus;
}

/** A booking row as the admin sees it (adds customer + vendor). */
export interface AdminBookingRow {
  id: string;
  customer: string;
  occasion: string;
  date: string;
  vendor: string;
  city: string;
  amount: number;
  status: BookingStatus;
}

export interface AdminNotification {
  id: string;
  message: string;
  time: string;
  unread: boolean;
}

export interface RevenueSummary {
  total: number;
  advance: number;
  settled: number;
  pending: number;
}

export interface QuickAction {
  label: string;
  href: string;
  iconKey: AdminIconKey;
}

/* ── Vendor Management (Phase 2) ─────────────────────────────────────────── */

export type VendorDocKind = "GST" | "FSSAI" | "ID" | "Business Proof";

export interface VendorDocument {
  kind: VendorDocKind;
  number: string;
  status: VerificationStatus;
}

/** A vendor as the admin manages it. Overlapping fields (business/tier/city/…)
 *  are derived from the public `vendorListings`; the rest is admin-only. */
export interface AdminVendor {
  id: string;
  business: string;
  owner: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  tier: VendorTier;
  status: VerificationStatus;
  suspended: boolean;
  cuisines: string[];
  diet: string;
  rating: number;
  reviews: number;
  priceFrom: number;
  joinedDate: string;
  totalBookings: number;
  image: string;
  documents: VendorDocument[];
}

/** Generic paginated envelope — matches the future list-API response shape so
 *  the swap from mock selector to `fetch` needs no component changes. */
export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Query params for the vendor list (mirrors future `?q&tier&status&city…`). */
export interface VendorQuery {
  q?: string;
  tier?: VendorTier | "All";
  status?: VerificationStatus | "All";
  city?: string | "All";
  page?: number;
  pageSize?: number;
}

/* ── Vendor Approvals / KYC (Phase 3) ────────────────────────────────────── */

/** A full vendor application for the KYC review console — the compact
 *  `PendingVendorApproval` plus contact details and uploaded documents. */
export interface VendorApplication extends PendingVendorApproval {
  email: string;
  phone: string;
  documents: VendorDocument[];
}

/** Query params for the approvals queue. */
export interface ApprovalQuery {
  q?: string;
  status?: VerificationStatus | "All";
  page?: number;
  pageSize?: number;
}

/* ── Booking Management ──────────────────────────────────────────────────── */

export interface AdminBooking {
  id: string;
  customer: string;
  occasion: string;
  date: string;
  guests: number;
  vendor: string;
  city: string;
  amount: number;
  paid: number;
  status: BookingStatus;
  /** Referral attribution — present when a partner referred the booking. */
  referralCode?: string;
  referrerName?: string;
  referrerType?: string;
}

export interface BookingQuery {
  q?: string;
  status?: BookingStatus | "All";
  city?: string | "All";
  page?: number;
  pageSize?: number;
}

/* ── Customer Management ─────────────────────────────────────────────────── */

export type CustomerStatus = "Active" | "Inactive";

export interface AdminCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined: string;
  totalBookings: number;
  activeBookings: number;
  lifetimeSpend: number;
  status: CustomerStatus;
}

export interface CustomerQuery {
  q?: string;
  city?: string | "All";
  status?: CustomerStatus | "All";
  page?: number;
  pageSize?: number;
}

/* ── Payments ────────────────────────────────────────────────────────────── */

export type PaymentMethod = "UPI" | "QR" | "Card";
export type PaymentType = "Advance" | "Balance" | "Refund";
export type PaymentStatus = "Settled" | "Pending" | "Advance Received" | "Refunded";

export interface AdminPayment {
  id: string;
  bookingId: string;
  customer: string;
  method: PaymentMethod;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  date: string;
}

export interface VendorSettlement {
  id: string;
  vendor: string;
  bookings: number;
  amount: number;
  status: "Settled" | "Pending";
  period: string;
}

export interface PaymentQuery {
  q?: string;
  status?: PaymentStatus | "All";
  method?: PaymentMethod | "All";
  page?: number;
  pageSize?: number;
}

/* ── Coupons ─────────────────────────────────────────────────────────────── */

export type CouponStatus = "Active" | "Inactive";

export interface AdminCoupon {
  id: string;
  code: string;
  label: string;
  percent: number;
  cap: number;
  eligibility: string;
  startsAt: string;
  expiresAt: string;
  status: CouponStatus;
}

/* ── Catalog (Menu & Add-Ons) ────────────────────────────────────────────── */

export interface CatalogCuisine {
  id: string;
  name: string;
  nameHi: string;
  dishes: number;
  visible: boolean;
}

export interface CatalogDish {
  id: string;
  name: string;
  course: string;
  cuisine: string;
  diet: "veg" | "non-veg";
  visible: boolean;
}

export interface CatalogPackage {
  id: string;
  name: string;
  price: string;
  unit: string;
  popular: boolean;
  features: number;
  visible: boolean;
}

export interface CatalogAddOn {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  price: number;
  perPlate: boolean;
  active: boolean;
}

/* ── Content Management ──────────────────────────────────────────────────── */

export interface ContentBanner {
  id: string;
  title: string;
  subtitle: string;
  placement: string;
  active: boolean;
}

export interface ContentTestimonial {
  id: string;
  name: string;
  city: string;
  rating: number;
  quote: string;
  visible: boolean;
}

export interface ContentFaq {
  id: string;
  question: string;
  answer: string;
  visible: boolean;
}

/* ── Reports ─────────────────────────────────────────────────────────────── */

export interface TrendPoint {
  label: string;
  value: number;
}

export interface VendorPerfRow {
  vendor: string;
  bookings: number;
  revenue: number;
  rating: number;
}

/* ── Settings ────────────────────────────────────────────────────────────── */

export interface BusinessDetails {
  name: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  hours: string;
  instagram: string;
}

export interface AdminRoleInfo {
  name: string;
  description: string;
  members: number;
}
