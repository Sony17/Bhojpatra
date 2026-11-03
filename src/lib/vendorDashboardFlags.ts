/**
 * Central backlog switches for vendor-dashboard surfaces hidden for launch
 * (2026-11-03). Every entry is documented in docs/HIDDEN_SURFACES_BACKLOG.md;
 * flipping a flag to `true` brings that surface back — no other code change.
 *
 * NOT a flag: the services-opted gating (service cards, Calendar tab, feast
 * tier pill etc. only exist for services the vendor opted into). That is
 * per-vendor data, resolved by optedServices() in src/lib/vendorServices.ts,
 * and comes back automatically when a vendor opts into the service.
 */

/** Finances: the "Soon" nav entry (desktop sidebar + mobile More sheet) and
 *  the Pending Payout metric card/tile on Dashboard Home. Order-level amounts
 *  on the Orders surface are not gated — they belong to Orders. */
export const SHOW_FINANCES_TAB: boolean = false;

/** Reviews: the "Soon" nav entry (desktop sidebar + mobile More sheet) and
 *  the Average Rating metric card/tile on Dashboard Home. The Google
 *  rating/review listing fields in MenuBuilder are profile data, not gated. */
export const SHOW_REVIEWS_TAB: boolean = false;

/** "Primary Culinary Specialties & Cuisines" editor: the chip picker in
 *  onboarding Step 1 (and its "Primary Cuisines" review row in Step 8) and the
 *  Cuisines chip editor on the dashboard profile (MenuBuilder). Saved cuisines
 *  are preserved and still submitted untouched while hidden. */
export const SHOW_CUISINES_FIELD: boolean = false;

/** "Serviceable Coverage Cities — Where can your team travel to cater?" chip
 *  picker in onboarding Step 1 (and its "Coverage Cities" review row in
 *  Step 8). Saved serviceCities are preserved and still submitted untouched
 *  while hidden; the field is no longer required to continue past Step 1. */
export const SHOW_COVERAGE_CITIES_FIELD: boolean = false;

/** Sidebar / More-sheet "Edit Menu & Services" shortcut. The My Services tab
 *  and its in-page MenuBuilder remain the live edit path when this is off. */
export const SHOW_EDIT_MENU_SERVICES_LINK: boolean = false;

/** Sidebar / More-sheet "Edit Business Profile" shortcut. "Profile & KYC"
 *  (onboarding wizard) remains the live profile path when this is off. */
export const SHOW_EDIT_BUSINESS_PROFILE_LINK: boolean = false;

/** My Services: the "+ Add / Configure Services" header button and the
 *  per-card "Add +" / "Edit in builder →" affordances that jump into the
 *  menu builder. Service status cards stay visible as a read-only summary. */
export const SHOW_ADD_CONFIGURE_SERVICES_CTA: boolean = false;

/** My Services: the in-page MenuBuilder (business/listing details, segment
 *  menus including Single Stall, Signature Dishes, and Save & Publish Menu).
 *  Flip on to restore live menu editing on the dashboard. */
export const SHOW_MENU_BUILDER: boolean = false;

/** Launch scope: every vendor's primary kitchen city (read-only in UI; always
 *  written on save/submit). Documented in HIDDEN_SURFACES_BACKLOG.md §8. */
export const FIXED_PRIMARY_KITCHEN_CITY = "Lucknow" as const;
