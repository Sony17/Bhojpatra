/**
 * Product-launch flags — one place to flip when a flow goes live.
 *
 * Unlike `vendorDashboardFlags` (vendor-console surface toggles), these gate
 * CUSTOMER-facing funnels that are announced but not yet open for business.
 */

/**
 * The full-catering Feast flow (`/book`, the tiered BookingWizard) opens for
 * real bookings in 2027. Until then, tapping Book on a Silver / Gold /
 * Platinum package opens an interest popup (posts to
 * `/api/enquiries/feast-interest`) instead of starting a booking.
 *
 * WHEN FEAST BOOKINGS OPEN (2027): flip this to `true`. Package Book CTAs
 * go straight to `/book`, and the /book notice banner drops out.
 */
export const FEAST_BOOKING_OPEN = false;

/** Legacy `source` on leads captured before enquiries routing (Admin → Leads). */
export const FEAST_INTEREST_SOURCE = "feast-2027-interest";

/** `source` on enquiry records from the Feast interest popup (Admin → Enquiries). */
export const FEAST_PACKAGE_INTEREST_SOURCE = "feast-package-interest";
