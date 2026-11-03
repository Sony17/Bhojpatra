# Hidden surfaces backlog

UI surfaces hidden (not rendered — not greyed out) on 2026-11-03, with exactly
how to bring each one back. The vendor-dashboard hides are central boolean
flags in `src/lib/vendorDashboardFlags.ts`; flip one to `true` and the surface
returns with no other code change. The rest are documented here so nothing is
forgotten.

## 1. Vendor dashboard — Finances tab

- **What's hidden:** the "Finances" (Coming Soon) nav entry in the desktop
  sidebar and the mobile "More" sheet, and the "Pending Payout" metric card
  (desktop Dashboard Home) / tile (mobile Dashboard Home).
- **Where:** `src/components/vendor/VendorDashboard.tsx` — the `SOON` nav
  array, the desktop `metrics` array in `DesktopHome`, and the mobile 2×2
  metrics grid in `MobileHome`.
- **Mechanism:** `SHOW_FINANCES_TAB` in `src/lib/vendorDashboardFlags.ts`.
- **Why:** launch scope — partner finances/payouts aren't live yet, so the
  "Soon" placeholder and payout numbers were dropped from the dashboard.
- **Date:** 2026-11-03.
- **Re-enable:** set `SHOW_FINANCES_TAB = true` in
  `src/lib/vendorDashboardFlags.ts`.
- **Deliberately kept (not finances):** KYC / bank-details / compliance setup
  (onboarding wizard, "Profile & KYC" links) and order-level amount lines on
  the Orders surface (`₹…` per booking, estimated catering total in the
  booking-review sheet) — those belong to Orders. The `pendingPayout` field is
  still fetched from `GET /api/vendor/orders`; only its display is gated.

## 2. Vendor dashboard — Reviews tab

- **What's hidden:** the "Reviews" (Coming Soon) nav entry in the desktop
  sidebar and the mobile "More" sheet, and the "Average Rating" metric card
  (desktop) / "Rating" tile (mobile) on Dashboard Home.
- **Where:** `src/components/vendor/VendorDashboard.tsx` — same three spots as
  Finances (the `SOON` array and the two metrics arrays).
- **Mechanism:** `SHOW_REVIEWS_TAB` in `src/lib/vendorDashboardFlags.ts`.
- **Why:** launch scope — customer reviews/ratings for vendors aren't live.
- **Date:** 2026-11-03.
- **Re-enable:** set `SHOW_REVIEWS_TAB = true` in
  `src/lib/vendorDashboardFlags.ts`.
- **Deliberately kept (not reviews):** the Google Rating / Google Reviews
  listing fields in `MenuBuilder.tsx` — vendor profile data entry, not a
  reviews surface.
- **Note:** `?tab=finances` / `?tab=reviews` can never surface these: the
  dashboard's `Tab` type has no such ids and `VendorDashboard.tsx` falls back
  to the first visible tab for any unknown value
  (`activeTab = nav.some((n) => n.id === tab) ? tab : nav[0].id`).

## 3. Vendor dashboard — services the vendor didn't opt into

- **What's hidden:** every service-specific surface for a service the vendor
  did not opt into at onboarding — service cards/counts on Dashboard Home and
  My Services, the Calendar tab (Single Stall only), the feast tier pill,
  checklist wording, MenuBuilder segment bar categories and feast-only inputs.
- **Where / mechanism:** **per-vendor and automatic, NOT a flag.** Resolved by
  `optedServices()` / `isServiceOpted()` / `hasAnyService()` in
  `src/lib/vendorServices.ts` (unit-tested in `vendorServices.test.ts`),
  consumed by `VendorDashboard.tsx` and `MenuBuilder.tsx`.
- **Why:** a vendor should only see the services they actually sell; leftover
  data for a never-picked service must not surface it.
- **Date:** 2026-11-03.
- **Re-enable:** nothing to flip — the surfaces appear automatically for any
  vendor who opts into the service (onboarding step 3 "Offerings", which
  writes `serviceCategories` / `cateringComponents`). Do not convert this to a
  flag; it is data-driven by design.

## 4. Booking — desktop single-stall top-chrome compaction (documentation only)

- **What's hidden:** on desktop (`lg+`) only, the Single Stall booking flow
  compacts its top chrome via a `dense` prop: the wizard hero collapses to one
  slim row (no sub-line, no decorative circles), the stepper card becomes a
  single row without the "Step X of Y" caption, section heads drop their
  eyebrow, and the event brief renders slim (36px controls, no "YOUR EVENT"
  header row). Phones and tablets are untouched.
- **Where:** `src/components/booking/StallBookingWizard.tsx` and
  `StallTypePicker.tsx` pass `dense`; implemented in
  `src/components/booking/shared/WizardChrome.tsx`, `SectionHead.tsx` and
  `EventBar.tsx`.
- **Mechanism:** the `dense` prop (opt-in per call site), not a central flag.
- **Date:** 2026-11-03 (documented this session; code owned by another
  change — do not edit from here).
- **Re-enable:** remove the `dense` prop at the call sites in
  `StallBookingWizard.tsx` / `StallTypePicker.tsx` to restore the full-size
  desktop chrome.

## 5. Vendor catalog — Baina promo & heading hidden in stall view (documentation only)

- **What's hidden:** when `/vendors` is reached from the stall picker
  (`?category=single-stall&counter=…`), the Baina Box promo hero
  (`BainaBoxSpecial variant="search"`) and the generic "Choose your favourite
  caterer" heading are hidden — on phones (existing behaviour) and now on
  desktop too — so the results lead.
- **Where:** `src/components/vendors/VendorCatalog.tsx` — the
  `fromStallPicker` condition plus the `stallListDesktopHide` class string
  applied to the promo and heading wrappers.
- **Mechanism:** conditional CSS classes keyed on `fromStallPicker`, not a
  central flag.
- **Date:** 2026-11-03 (documented this session; code owned by another
  change — do not edit from here).
- **Re-enable:** drop `stallListDesktopHide` from those two wrappers in
  `VendorCatalog.tsx` to show the promo/heading on desktop again (remove the
  whole `fromStallPicker` conditional to also restore them on phones).

## 6. Vendor forms — "Primary Culinary Specialties & Cuisines" field

- **What's hidden:** the cuisines chip picker in onboarding Step 1
  ("Primary Culinary Specialties & Cuisines" — chips + "+ Custom cuisine"
  adder), the "Primary Cuisines" row on the Step 8 master review, and the
  "Cuisines" chip editor on the dashboard profile (MenuBuilder → listing
  details card).
- **Where:** `src/components/vendor/onboarding/steps/Step1IdentityOps.tsx`
  (the `field-cuisines` form group and its "Select at least one cuisine"
  required check), `src/components/vendor/onboarding/steps/Step8MasterReview.tsx`
  (the Primary Cuisines cell), `src/components/vendor/MenuBuilder.tsx` (the
  Cuisines `sm:col-span-2` block).
- **Mechanism:** `SHOW_CUISINES_FIELD` in `src/lib/vendorDashboardFlags.ts`.
- **Why:** launch scope — cuisine specialties aren't collected at launch.
- **Date:** 2026-11-03.
- **Data safety:** saved cuisines are untouched — both forms load the saved
  list into state and resave it verbatim, and neither client nor server
  (`validateSubmission`, `validateVendorMenuInput`) requires a non-empty list.
  Customer surfaces (catalog cards, vendor profile, compare) already render
  nothing for an empty list.
- **Re-enable:** set `SHOW_CUISINES_FIELD = true` in
  `src/lib/vendorDashboardFlags.ts` (restores the editors, the review row and
  the Step 1 required check together).

## 7. Vendor onboarding — "Serviceable Coverage Cities" field

- **What's hidden:** the "Serviceable Coverage Cities — Where can your team
  travel to cater?" chip picker (chips + "+ Other city" adder + hint) in
  onboarding Step 1, and the "Coverage Cities" row on the Step 8 master
  review. The dashboard profile never edited this field, so nothing to hide
  there.
- **Where:** `src/components/vendor/onboarding/steps/Step1IdentityOps.tsx`
  (the `field-serviceCities` form group and its "Select at least one
  serviceable coverage city" required check),
  `src/components/vendor/onboarding/steps/Step8MasterReview.tsx` (the
  Coverage Cities cell).
- **Mechanism:** `SHOW_COVERAGE_CITIES_FIELD` in
  `src/lib/vendorDashboardFlags.ts`.
- **Why:** launch scope — single-city operations (see entry 8); travel
  coverage isn't collected at launch.
- **Date:** 2026-11-03.
- **Data safety:** saved `serviceCities` are untouched — the wizard loads
  them into state and resaves them verbatim; an empty list is simply omitted
  by the PUT parser (`cleanServiceCities`), which keeps whatever the record
  already has. The server-side submit check (`validateSubmission`) never
  required this field.
- **Re-enable:** set `SHOW_COVERAGE_CITIES_FIELD = true` in
  `src/lib/vendorDashboardFlags.ts` (restores the picker, the review row and
  the Step 1 required check together).

## 8b. Vendor dashboard — My Services configure CTA + MenuBuilder

- **What's hidden:** on **My Services**, the "+ Add / Configure Services"
  button, the per-card "Add +" / "Edit in builder →" actions, and the whole
  in-page **MenuBuilder** (business/listing details, Single Stall menu
  controls, Signature Dishes, and Save & Publish Menu). Service status cards
  stay as a read-only summary of opted/configured offerings.
- **Where:** `src/components/vendor/VendorDashboard.tsx` — `ServicesHub`.
- **Mechanism:** `SHOW_ADD_CONFIGURE_SERVICES_CTA` and `SHOW_MENU_BUILDER` in
  `src/lib/vendorDashboardFlags.ts`.
- **Why:** launch scope — menus/profile edits stay in onboarding
  (`/vendor/register`); the dashboard only shows which services are live.
- **Date:** 2026-11-03.
- **Re-enable:** set the flag(s) to `true` in
  `src/lib/vendorDashboardFlags.ts` (both on for the full configure + builder
  experience).

## 8a. Vendor dashboard — Edit Menu & Services / Edit Business Profile shortcuts

- **What's hidden:** the "Edit Menu & Services" and "Edit Business Profile"
  shortcuts in the desktop sidebar footer and the mobile "More" sheet.
- **Where:** `src/components/vendor/VendorDashboard.tsx` — sidebar footer and
  `MoreSheet`.
- **Mechanism:** `SHOW_EDIT_MENU_SERVICES_LINK` and
  `SHOW_EDIT_BUSINESS_PROFILE_LINK` in `src/lib/vendorDashboardFlags.ts`.
- **Why:** launch scope — avoid duplicate edit entry points; menus stay on
  **My Services**, profile/KYC stays on **Profile & KYC**.
- **Date:** 2026-11-03.
- **Deliberately kept:** My Services tab + MenuBuilder, Profile & KYC link,
  ServicesHub edit CTAs on the My Services page.
- **Re-enable:** set the corresponding flag(s) to `true` in
  `src/lib/vendorDashboardFlags.ts`.

## 8. Vendor forms — Primary Kitchen City locked to a single city (documentation only)

- **What changed:** the "Primary Kitchen City" select in onboarding Step 1, the
  legacy `VendorRegister` city picker, and the dashboard profile "City" field
  (MenuBuilder) are read-only and always show **Lucknow**. Every load merge and
  save/submit payload writes `FIXED_PRIMARY_KITCHEN_CITY` (`"Lucknow"`) — including
  vendors who previously saved another city (coverage cities and other city data
  are untouched). Next to each field sits a non-interactive "+ Add more cities
  — coming soon" chip.
- **Where:** `src/lib/vendorDashboardFlags.ts` (`FIXED_PRIMARY_KITCHEN_CITY`),
  `Step1IdentityOps.tsx` (read-only input + chip),
  `VendorOnboarding.tsx` (initial state, fetch merge, draft persist),
  `MenuBuilder.tsx` (load, display, PUT payload),
  `VendorRegister.tsx` (read-only input + chip, application payload).
- **Mechanism:** `FIXED_PRIMARY_KITCHEN_CITY` constant — not a runtime toggle.
- **Why:** launch scope — Bhojpatra launches as a single-city (Lucknow)
  marketplace; multi-city onboarding is a post-launch feature.
- **Date:** 2026-11-03.
- **Re-enable:** restore the `<select>` pickers at the two spots above (git
  history of this change has the exact markup: Step 1's `KITCHEN_CITIES`
  options — the constant is still exported — and MenuBuilder's
  `useLocations()` + "Other" sentinel select) and drop the coming-soon chips
  and the `"Lucknow"` initial values.
