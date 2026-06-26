/**
 * Admin Panel domain types.
 *
 * Shared between the data layer (`mockData.ts`) and the presentation widgets.
 * Reuses `BookingStatus` from the public data layer so booking statuses can
 * never drift between the customer site and the admin panel.
 */
import type { BookingStatus } from "@/lib/data";

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
  | "menu"
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

/** A vendor awaiting KYC review (approvals panel). */
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
