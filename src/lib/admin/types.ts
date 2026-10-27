/**
 * Admin Panel domain types.
 *
 * Shared between the data layer (`mockData.ts`) and the presentation widgets.
 * Reuses `BookingStatus` from the public data layer so booking statuses can
 * never drift between the customer site and the admin panel.
 */
import type { BookingStatus } from "@/lib/data";
import type { VendorPayoutAccount } from "@/lib/payoutAccount";

// Re-export so admin components import booking status from a single surface.
export type { BookingStatus } from "@/lib/data";

/** Admin identity shown in the topbar avatar/welcome. */
export interface AdminProfile {
  name: string;
  role: string;
  initials: string;
}

export type VerificationStatus = "Pending" | "Verified" | "Rejected";
export type VendorTier = "Silver" | "Gold" | "Platinum";

/** Canonical display order for tiers (entry → premium). A vendor can sit in
 *  several of these at once — one per price band their packages cover. */
export const TIER_ORDER: VendorTier[] = ["Silver", "Gold", "Platinum"];

/** Normalise an arbitrary set of tiers into canonical order, de-duplicated. */
export function sortTiers(tiers: readonly VendorTier[]): VendorTier[] {
  return TIER_ORDER.filter((t) => tiers.includes(t));
}

/** The tier band a single per-plate price falls into. */
export function tierForPrice(price: number): VendorTier {
  if (price >= 1500) return "Platinum";
  if (price >= 1000) return "Gold";
  return "Silver";
}

/** Keep only valid tier values from arbitrary input, in canonical order. Shared
 *  by the application POST (submit) and PATCH (admin assign) routes. */
export function parseTiers(raw: unknown): VendorTier[] {
  if (!Array.isArray(raw)) return [];
  const valid = raw.filter((t): t is VendorTier =>
    TIER_ORDER.includes(t as VendorTier),
  );
  return sortTiers(valid);
}

/** A vendor awaiting KYC review (compact form used by the dashboard panel). */
export interface PendingVendorApproval {
  id: string;
  business: string;
  owner: string;
  city: string;
  speciality: string;
  requestedTiers: VendorTier[];
  submitted: string;
  status: VerificationStatus;
}

/** A booking row as the admin sees it (adds customer + vendor). */
export interface AdminBookingRow {
  id: string;
  customer: string;
  /** Customer contact captured at booking time, so staff can reach out straight
   *  from the dashboard. Absent on demo/legacy rows. */
  phone?: string;
  email?: string;
  occasion: string;
  date: string;
  vendor: string;
  city: string;
  amount: number;
  status: BookingStatus;
}

export interface RevenueSummary {
  total: number;
  advance: number;
  settled: number;
  pending: number;
}

/* ── Vendor Management (Phase 2) ─────────────────────────────────────────── */

export type VendorDocKind =
  | "GST"
  | "PAN"
  | "Aadhaar"
  | "FSSAI"
  | "Bank Account"
  | "UPI"
  | "ID"
  | "Business Proof";

export interface VendorDocument {
  kind: VendorDocKind;
  number: string;
  status: VerificationStatus;
  /** Admin-only link to the uploaded file (`/api/vendors/kyc/<id>`), when one
   *  was uploaded. */
  fileUrl?: string;
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
  tiers: VendorTier[];
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
  /** Where payouts go — shown with the "Bank Account" document. */
  payoutAccount?: VendorPayoutAccount;
  /** Tiers the admin has explicitly assigned during review. Absent until an
   *  admin decides — the console then defaults the editor to `requestedTiers`
   *  (the price-derived baseline). Once set, this drives the public catalog. */
  assignedTiers?: VendorTier[];
  /** Catering categories the vendor chose at registration. Without
   *  "full-catering" the vendor doesn't offer Feast and has no tiers. */
  cateringCategories?: string[];
  /** Rejected with a request to fix and resubmit (vs. a final rejection). */
  changesRequested?: boolean;
  /** The admin's note to the vendor on the last reject / changes request. */
  reviewReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  history?: VendorApplicationEvent[];
  /** What the vendor is offering, for review (from their saved listing). */
  offerSummary?: VendorOfferSummary;
}

/** One entry in an application's audit trail. */
export interface VendorApplicationEvent {
  at: string;
  /** "vendor" or the reviewing admin's email. */
  by: string;
  action:
    | "submitted"
    | "resubmitted"
    | "verified"
    | "rejected"
    | "changes-requested"
    | "reopened"
    | "document"
    /** The vendor changed the GST rate billed on their food. */
    | "gst-rate";
  note?: string;
}

/** Compact review summary of a vendor's saved listing. */
export interface VendorOfferSummary {
  vendorId: string;
  services: string[];
  priceFrom: number;
  dietaryOffering?: string;
  serviceCities: string[];
  courses: { name: string; dishes: number; perPlate: number }[];
  stalls: { name: string; perPlate?: number; minPax?: number }[];
  bainaBoxes: { name: string; price: number }[];
  counters: number;
  moderation: string;
  /** GST on food the vendor picked (18 / 5 / 0; absent = never picked). */
  gstRatePicked?: number;
  /** What checkout actually bills — 0 until the GSTIN is verified. */
  gstRateBilled: number;
}

/** An approved (Verified) vendor who changed KYC details since: the
 *  application stays Verified — they're live — but the changed documents are
 *  back to Pending and need an admin's re-check. */
export function needsReReview(
  a: Pick<VendorApplication, "status" | "documents">,
): boolean {
  return a.status === "Verified" && a.documents.some((d) => d.status === "Pending");
}

/** Status filter value for {@link needsReReview} applications. */
export const RE_REVIEW = "Re-review";

/** Query params for the approvals queue. */
export interface ApprovalQuery {
  q?: string;
  status?: VerificationStatus | "All" | typeof RE_REVIEW;
  page?: number;
  pageSize?: number;
}

/* ── Booking Management ──────────────────────────────────────────────────── */

export interface AdminBooking {
  id: string;
  customer: string;
  /** Customer contact captured at booking time (absent on demo/legacy rows). */
  phone?: string;
  email?: string;
  occasion: string;
  date: string;
  /** Meal period the feast is served at (Breakfast / Lunch / Dinner), when set. */
  mealTime?: string;
  /** Exact serving clock time (`HH:MM`, 24-hour) alongside the meal, when set. */
  eventTime?: string;
  /** Food (diet) preference — "Pure Veg" / "Non-veg" / "Both" — when declared. */
  foodPreference?: string;
  guests: number;
  /** Craft-my-plate split — veg / non-veg head-counts summing to `guests`,
   *  when the customer declared one. */
  vegGuests?: number;
  nonVegGuests?: number;
  vendor: string;
  city: string;
  /** The event venue the guest chose, when one was set. */
  venue?: string;
  amount: number;
  paid: number;
  status: BookingStatus;
  /** Transaction / reference ID of the online payment (UPI/QR), when one was made. */
  paymentRef?: string;
  /** Referral attribution — present when a partner referred the booking. */
  referralCode?: string;
  referrerName?: string;
  referrerType?: string;
  /** The booked vendor declined it from the Vendor Portal (with their reason)
   *  — the team follows up: reassign, or cancel + refund. */
  vendorDeclined?: boolean;
  declineReason?: string;
  /** Only an open checkout so far (created before payment, nothing paid). */
  awaitingPayment?: boolean;
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

export type PaymentMethod = "UPI" | "QR" | "Card" | "Razorpay";
export type PaymentType = "Advance" | "Balance" | "Refund";
export type PaymentStatus = "Settled" | "Pending" | "Advance Received" | "Refunded" | "Failed";

export interface AdminPayment {
  id: string;
  bookingId: string;
  customer: string;
  method: PaymentMethod;
  type: PaymentType;
  amount: number;
  status: PaymentStatus;
  date: string;
  /** Customer-entered UPI transaction reference (UTR), when captured at checkout. */
  ref?: string;
  /** Razorpay order id, for gateway payments. */
  orderRef?: string;
  /** Gateway's reason, for a Failed attempt. */
  failureReason?: string;
  /** Rupees refunded so far (partial refunds are less than `amount`). */
  refundedAmount?: number;
  /** ISO timestamp — exported to CSV alongside the display date. */
  createdAt?: string;
}

export interface VendorSettlement {
  id: string;
  vendor: string;
  bookings: number;
  amount: number;
  /** Vendor advances already released on these bookings (already deducted
   *  from `amount`). */
  advancePaid?: number;
  status: "Settled" | "Pending" | "Processing";
  period: string;
  payee?: VendorPayee;
  /** Why the last RazorpayX send failed (the row is Pending again). */
  lastFailure?: string;
}

/** Where to send a vendor's money, from their application. Each part is
 *  verified separately (the "Bank Account" and "UPI" documents). */
export interface VendorPayee extends VendorPayoutAccount {
  bankVerified: boolean;
  upiVerified: boolean;
  /** Admin-only link to the vendor's uploaded UPI QR code image. */
  upiQrUrl?: string;
}

/** One booking's vendor advance payout — suggested by the admin's rule, and
 *  once released, what was actually paid and how. */
export interface VendorAdvanceRow {
  /** `ADV-<bookingId>`. */
  id: string;
  bookingId: string;
  vendor: string;
  customer: string;
  eventDate: string;
  eventDateISO: string;
  bookingStatus: BookingStatus;
  bookingAmount: number;
  /** Money collected from the customer so far, net of refunds. */
  collected: number;
  /** What the current rule says to advance on this booking. */
  suggested: number;
  status: "Pending" | "Processing" | "Paid";
  /** Why the last RazorpayX send failed (the row is Pending again). */
  lastFailure?: string;
  paidAmount?: number;
  method?: string;
  reference?: string;
  paidAt?: string;
  payee?: VendorPayee;
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

/* ── Campaigns ───────────────────────────────────────────────────────────── */

export type CampaignStatus = "Active" | "Inactive";

/**
 * A homepage promotional campaign. The admin uploads a picture and (optionally)
 * a click-through link; the most recent *Active* campaign is shown to every
 * homepage visitor as an image popup.
 */
export interface AdminCampaign {
  id: string;
  /** Internal label shown in the admin list (not shown to visitors). */
  name: string;
  /** The popup picture for web/desktop — an uploaded data URL or a pasted URL. */
  image: string;
  /** Optional mobile/portrait variant. "" = fall back to `image` on mobile too. */
  mobileImage: string;
  /** Optional click-through target ("" = the image isn't clickable). */
  linkUrl: string;
  status: CampaignStatus;
}

/* ── Catalog (Menu & Add-Ons) ────────────────────────────────────────────── */

export interface CatalogCuisine {
  id: string;
  name: string;
  nameHi: string;
  dishes: number;
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

/* ── Refunds ─────────────────────────────────────────────────────────────── */

export type RefundStatus = "Requested" | "Approved" | "Processed" | "Declined";

/** A refund against a booking — its own lifecycle (request → approve → process),
 *  distinct from the raw `AdminPayment` ledger row a processed refund produces. */
export interface AdminRefund {
  id: string;
  bookingId: string;
  customer: string;
  amount: number;
  reason: string;
  method: PaymentMethod;
  status: RefundStatus;
  requestedAt: string;
  /** Set once the refund reaches a terminal state (Processed / Declined). */
  processedAt?: string;
  /** Razorpay refund id (`rfnd_…`) when the money went back via the gateway. */
  gatewayRefundId?: string;
  /** Every Razorpay refund issued for this request, with its status. */
  gatewayRefunds?: { id: string; paymentId: string; amount: number; status: "pending" | "processed" | "failed" }[];
  /** Processed, but Razorpay hasn't confirmed the money landed yet. */
  gatewayPending?: boolean;
  /** Why the request reopened after Razorpay reported a refund failed. */
  gatewayFailure?: string;
  /** Where the customer asked a manual (UPI / QR) refund to be paid. */
  payoutTo?: RefundPayoutTo;
  /** UTR of the manual payout, recorded when it was processed. */
  payoutRef?: string;
  /** Rupees paid out by hand (the rest went back via Razorpay). */
  manualAmount?: number;
  adminNote?: string;
}

/** Customer-given destination for a refund that can't go back via Razorpay:
 *  a UPI ID, or a bank account. */
export type RefundPayoutTo =
  | { upiId: string; holderName?: undefined; accountNumber?: undefined; ifsc?: undefined }
  | { upiId?: undefined; holderName: string; accountNumber: string; ifsc: string };

/** A refund as the customer sees it in My Bookings. */
export interface CustomerRefund {
  id: string;
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  status: RefundStatus;
  requestedAt: string;
  createdAt: string;
  processedAt?: string;
  gatewayRefundId?: string;
  /** Rupees sent back via Razorpay. */
  gatewayAmount?: number;
  /** Razorpay hasn't confirmed the money landed yet. */
  gatewayPending?: boolean;
  payoutRef?: string;
  /** Rupees paid out by hand. */
  manualAmount?: number;
  /** One-line payout destination, e.g. "UPI name@okhdfcbank". */
  payoutTo?: string;
}

export interface RefundQuery {
  q?: string;
  status?: RefundStatus | "All";
  page?: number;
  pageSize?: number;
}

/* ── Support Tickets ─────────────────────────────────────────────────────── */

export type SupportTicketStatus = "Open" | "In Progress" | "Resolved";
export type SupportPriority = "Low" | "Medium" | "High";

/** A customer support ticket. Distinct from `Enquiries` (pre-sale Contact-form
 *  messages): a ticket is post-booking, has a lifecycle and a priority, and is
 *  usually tied to a booking. */
export interface SupportTicket {
  id: string;
  subject: string;
  customer: string;
  email: string;
  category: string;
  priority: SupportPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  bookingId?: string;
  message: string;
}

