# Bhojpatra
# September 2026 Technical Effort Audit

---

## 1. Executive Summary

### 1.1 Purpose of this Audit
This report provides an exhaustive, evidence-based inventory of all technical and engineering effort delivered across the Bhojpatra codebase between **September 1, 2026 and September 8, 2026**.

The primary purpose of this document is to serve as an authoritative technical reference for **Sony** to discuss the scope, depth, and volume of engineering enhancements and technical support provided to Bhojpatra with **Ankit**. It is structured specifically so that it can be fed directly to Claude to generate a polished, professional executive PDF report.

### 1.2 Core Audit Principle: Business Use Case != Technical Effort
A single user-facing requirement or business use case (for example, *"Custom Catering Enquiry with PDF upload"*) frequently masks multiple layers of underlying engineering work spanning:
- Frontend user interfaces, interactive modals, responsive states, and client form validation.
- Backend API routes, multipart stream handling, MIME-type and magic-byte security verification.
- Storage layer integrations, cloud blob persistence, and resilient local disk fallbacks.
- Authorization mechanisms, cryptographic token generation, and role-based route guards.
- Admin portal tables, streaming document viewers, and external CRM/WhatsApp dispatch hooks.
- Automated testing suites (unit, integration, and security verification).

This audit explicitly documents the **discrete technical efforts** required to build, secure, debug, and stabilize these features, avoiding premature compression into superficial high-level bullets.

### 1.3 Audit Scope and Methodology
- **Date Range:** September 1, 2026 `00:00:00 +0530` through September 8, 2026 `18:45:00 +0530`.
- **Repository Inspected:** Sony17/Bhojpatra (`c:\Users\Zeeshaan\Bhojpatra`).
- **Branches Analyzed:** All 19 local and remote branches in the repository, including active feature branches, tracking branches, divergent histories, stashes, and the uncommitted working tree.
- **Evidence Verification:** Every documented effort is cross-referenced against actual Git commit hashes, author timestamps, file diffs, line counts, and AST/runtime changes. No speculative or undocumented effort is included.
- **Strict Separation of Concerns:** Production codebase engineering is strictly partitioned from standalone design engineering, architecture audits, and high-fidelity interactive prototypes.

### 1.4 How Numerical Totals Should Be Interpreted (Counting Methodology)
The technical deliverables in this report span multiple engineering perspectives. To avoid misinterpretation or accidental double-counting, the totals must be understood as follows:
- **Primary Production Implementation Inventory (48 Efforts):** Represents the core baseline of new features, schemas, UI components, APIs, payment flows, and admin tools committed to the production codebase.
- **Defect Resolution & Bug Fixes (10 Fixes):** Represents verified software bugs, logic flaws, and regressions resolved. These fixes were implemented within the production codebase (many directly resolving or stabilizing production features) and are cataloged separately to demonstrate defect-resolution rigor.
- **Security & Access Control Hardening (12 Measures):** Represents the comprehensive security posture delivered across authentication, payments, access control, and file handling. Nine of these are implemented directly within production application logic, two represent administrative/payload validation constraints, and one represents prototype privacy sanitization.
- **Automated Testing & QA Suites (6 Suites):** Represents dedicated test suites and automated verification scripts covering 100+ assertions that safeguard features against regression.
- **Prototype & Design Deliverables (10 Deliverables):** Represents completely independent, standalone specifications, architecture audits, high-fidelity HTML/CSS/JS prototypes, and distribution archives created for stakeholder alignment outside the production source code.
- **DevOps, Infrastructure & Maintenance (3 Tasks):** Represents containerization, cloud deployment runbooks, and repository optimization.
- **Synthesized Tracker-Ready Items (40 Deliverables):** Represents the unified, client-ready technical milestones combining multi-layer components (e.g., UI modal + API endpoint + storage fallback) into coherent units of engineering delivery for executive presentation.

These categories reflect distinct dimensions of technical delivery and therefore **must not be added mechanically**.

---

## 2. Repository & Branch Audit

### 2.1 Branch Inventory & Topology
A complete inspection of `git branch -a` reveals eight local branches and eleven remote-tracking branches.

| Branch Name | Type | Latest Commit | Date | Subject / Status |
|---|---|---|---|---|
| `bhojv2` | Local (HEAD) | `5688205` | 2026-09-08 18:34 | feat(mockups): integrate V1-styled vendor dashboard with V2 7-service architecture |
| `origin/bhojv2` | Remote | `4b861e6` | 2026-09-08 14:10 | feat(vendor-v2): update onboarding prototype with sequential tiers and diet gate |
| `main` | Local | `24bf08d` | 2026-09-02 21:28 | fix(payments): sync recorded payments onto the booking, block double charges |
| `origin/main` (HEAD) | Remote | `6b8c41e` | 2026-09-05 17:02 | chore: drop stray images committed to the repo root |
| `origin/feat/craft-my-plate` | Remote | `ccb8db7` | 2026-09-05 16:48 | feat(booking): Craft My Plate — veg/non-veg guest split drives menu filtering |
| `origin/feat/one-email-one-role` | Remote | `584d84e` | 2026-09-05 16:34 | feat(auth): enforce one email = one role = one dashboard |
| `origin/feat/custom-package-enquiry-pdf` | Remote | `de795c1` | 2026-09-05 16:33 | feat(auth): enforce one email = one role = one dashboard |
| `developerr` / `origin/developerr` | Local / Remote | `754c15b` | 2026-08-29 12:13 | Pre-September: Security batches 5 & 6 (auth hardening & session hashing) |
| `proposed-changes` / `origin/...` | Local / Remote | `f17730e` | 2026-08-06 20:41 | Pre-September: Single stall booking UI & guest count init |
| `dev-day4` / `origin/dev-day4` | Local / Remote | `4b604f8` | 2026-07-24 16:06 | Pre-September: Tier decoupling from package selection |
| `dev-day3` / `origin/dev-day3` | Local / Remote | `db22055` | 2026-07-23 18:23 | Pre-September: Partial menu selection & mobile layout fixes |
| `dev-day2` / `origin/dev-day2` | Local / Remote | `09ff1fa` | 2026-07-21 18:58 | Pre-September: Scroll card positioning & single stall renaming |
| `Developer` / `origin/Developer` | Local / Remote | `34e0078` | 2026-07-20 19:43 | Pre-September: Booking wizard category tab scroll prevention |

### 2.2 Branch Relationships and Divergence Analysis
The repository diverged from common commit `265095d` (`feat(payments): gateway refunds from admin, payment-result UX`, committed on August 24, 2026 by Sony Yadav). 

In September 2026, two parallel workstreams operated:
1. **The `bhojv2` Track (Author: Zeeshaan-23):** Contains **18 distinct commits** in September 2026. This track advanced booking resilience, Baina Box eCommerce, Razorpay payment flows, authoritative balance security, customer copy improvements, custom catering enquiry with secure tokenized PDF streaming, FSSAI dietary classification, and the multi-iteration vendor registration and vendor dashboard prototype architecture.
2. **The `main` and Feature Track (Author: Sony Yadav):** Contains **10 commits on `origin/main`** plus **3 feature branch commits** (`origin/feat/craft-my-plate`, `origin/feat/one-email-one-role`, `origin/feat/custom-package-enquiry-pdf`). This track addressed payment ledger synchronization, category artwork missing-image bugs, admin per-vendor dish selection limits, home package PDF upload, auth single-role consolidation, guest veg/non-veg split, customer terminology refactoring, Docker containerization, and stray image removal.

```
                   ┌── 3cd64e6 ── ... ── 795db05 ── a274d1d ── 4974380 ── 5688205 (bhojv2)
                   │   [Booking/Pay, Security, Enquiry, FSSAI, V1/V2 Vendor Prototypes]
265095d (2026-08-24)
                   │
                   └── 24bf08d ── 9fb2304 ── 113e841 ── 8f304f8 ── df87f0c ── 6b8c41e (origin/main)
                       [Ledger Sync, Admin Quotas, Single Role, Guest Split, Docker]
```

Neither stream has merged into the other yet. As documented in Section 14, both streams addressed several complementary or overlapping business requirements with distinct technical implementations.

---

## 3. Production Technical Effort

The following inventory details all **48 unique technical efforts** applied to the primary production application codebase. Supporting domains (Security, Defect Resolution, Testing, DevOps, and Prototypes) are detailed in their respective dedicated sections.

### 3.1 Primary Production Technical Inventory Table

| ID | Category | Technical Effort | Type | Branch | Commit | Key Files Affected | Status |
|---|---|---|---|---|---|---|---|
| **API-01** | API / Storage | Multipart/form-data PDF upload endpoint with 10 MB cap & magic-byte header validation | Enhancement | `bhojv2` | `4974380` | `src/app/api/contact/route.ts` | Completed |
| **API-02** | API / Security | Dual-mode authorized attachment streaming endpoint with 192-bit scoped `shareToken` | Security / API | `bhojv2` | `4974380` | `src/app/api/enquiries/attachment/[id]/route.ts` | Completed |
| **API-03** | API / Storage | Homepage custom package PDF upload and private serve endpoint | Enhancement | `origin/main` | `8f304f8` | `src/app/api/leads/enquiry-doc/route.ts`, `[id]/route.ts` | Completed |
| **API-04** | API / Admin | Centralized package naming and tagline management API endpoint | Enhancement | `bhojv2` | `b54d321` | `src/app/api/admin/packages/route.ts` | Completed |
| **API-05** | API / Admin | Per-vendor, per-tier dish item limits configuration API | Enhancement | `origin/main` | `113e841` | `src/app/api/admin/vendor-item-limits/route.ts` | Completed |
| **API-06** | API / Payments | Authoritative server-side remaining balance calculation endpoint | Security / Bug Fix | `bhojv2` | `795db05` | `src/app/api/payments/razorpay/order/route.ts` | Completed |
| **API-07** | API / Booking | Booking lead-time validation update for 1-day/same-day notice | Enhancement | `bhojv2` | `3cd64e6` | `src/app/api/bookings/route.ts` | Completed |
| **API-08** | API / Booking | Guest diet split schema validation and persistence in bookings API | Enhancement | `origin/main` | `1f32ace` | `src/app/api/bookings/route.ts` | Completed |
| **API-09** | API / Auth | One-email-one-role enforcement and duplicate signup rejection | Security / Auth | `origin/main` | `df87f0c` | `src/app/api/auth/signup/route.ts` | Completed |
| **API-10** | API / Auth | Removal of multi-role privilege escalation route (`/api/auth/partner-roles`) | Security / Refactor | `origin/main` | `df87f0c` | `src/app/api/auth/partner-roles/route.ts` | Completed |
| **DB-01** | Database / Schema | `EnquiryRecord` Postgres schema expansion with event specs, budget & attachments | Schema | `bhojv2` | `4974380` | `src/lib/enquiries.ts` | Completed |
| **DB-02** | Database / Storage | Resilient storage integration: Vercel Blob with local disk fallback | Storage | `bhojv2` | `4974380` | `src/app/api/contact/route.ts` | Completed |
| **DB-03** | Database / Storage | Settings singleton base64 document storage fallback pattern | Storage | `origin/main` | `8f304f8` | `src/lib/enquiryDocs.ts` | Completed |
| **DB-04** | Database / Schema | Per-vendor tier dish quota settings singleton schema | Schema | `origin/main` | `113e841` | `src/lib/vendorItemLimitsData.ts` | Completed |
| **DB-05** | Database / Schema | Single effective role resolution schema & legacy multi-account collapse | Schema / Auth | `origin/main` | `df87f0c` | `src/lib/users.ts` | Completed |
| **DB-06** | Database / Schema | Booking schema extension for guest diet split pair (`vegGuests`/`nonVegGuests`) | Schema | `origin/main` | `1f32ace` | `src/lib/admin/types.ts` | Completed |
| **DB-07** | Database / Schema | Centralized package naming singleton schema and cache provider | Schema | `bhojv2` | `b54d321` | `src/lib/packages.ts` | Completed |
| **FE-01** | Frontend / UI | Responsive Custom Catering Discovery Modal with drag-and-drop PDF upload | Enhancement | `bhojv2` | `4974380` | `src/components/enquiry/CustomCateringModal.tsx` | Completed |
| **FE-02** | Frontend / UI | Dedicated Custom Catering Homepage Banner component | Enhancement | `bhojv2` | `4974380` | `src/components/sections/CustomCateringBanner.tsx`, `src/app/page.tsx` | Completed |
| **FE-03** | Frontend / UI | Curated package footer PDF enquiry panel on Packages section | Enhancement | `origin/main` | `8f304f8` | `src/components/sections/Packages.tsx` | Completed |
| **FE-04** | Frontend / UI | Standard Indian FSSAI-compliant FoodDietBadge component | Enhancement | `bhojv2` | `f84b222` | `src/components/ui/FoodDietBadge.tsx` | Completed |
| **FE-05** | Frontend / Logic | Automated non-food vendor detection and dietary badge exclusion engine | Enhancement | `bhojv2` | `f84b222` | `src/lib/craftMyPlate.ts`, `src/components/vendors/VendorCatalog.tsx` | Completed |
| **FE-06** | Frontend / UI | Craft My Plate veg/non-veg guest split interactive controls | Enhancement | `origin/main` | `1f32ace` | `src/components/booking/shared/EventBar.tsx` | Completed |
| **FE-07** | Frontend / Logic | Real-time menu course & counter filtering driven by guest diet split | Enhancement | `origin/main` | `1f32ace` | `src/lib/dietSplit.ts`, `src/components/booking/BookingWizard.tsx` | Completed |
| **FE-08** | Frontend / State | Dynamic package naming synchronization across booking wizards and catalogues | Enhancement | `bhojv2` | `b54d321` | `src/components/booking/BookingWizard.tsx`, `VendorCatalog.tsx` | Completed |
| **FE-09** | Frontend / UI | Bilingual occasion navigation search, live filtering, and empty state | Enhancement | `bhojv2` | `3cd64e6` | `src/components/collections/OccasionsExplorer.tsx` | Completed |
| **FE-10** | Frontend / UI | Smooth scroll navigation and deep-linkable occasion anchor IDs | Enhancement | `bhojv2` | `3cd64e6` | `src/components/sections/ChooseOccasion.tsx`, `src/app/globals.css` | Completed |
| **FE-11** | Frontend / State | Persistent sticky Baina cart dock with live total and navigation sync | Enhancement | `bhojv2` | `9f879e3` | `src/components/vendors/BainaStickyCart.tsx`, `src/lib/bainaCart.ts` | Completed |
| **FE-12** | Frontend / Logic | Baina Box checkout promo coupon & partner referral discount engine | Enhancement | `bhojv2` | `87f78e6` | `src/components/vendors/BainaBoxOrderPanel.tsx` | Completed |
| **FE-13** | Frontend / Booking | Next-day and same-day availability support for Stalls and Baina | Bug Fix / Enh | `bhojv2` | `3cd64e6`, `8cdfbcb` | `src/components/DatePicker.tsx`, `StallBookingWizard.tsx`, `data.ts` | Completed |
| **FE-14** | Frontend / Booking | Lower Single Stall and Live Stall guest count minimum to 20 guests | Enhancement | `bhojv2` | `87f78e6` | `src/lib/bookingPricing.ts`, `StallBookingWizard.tsx` | Completed |
| **FE-15** | Frontend / Routing | Dedicated vendor flow classifier and booking link generator | Bug Fix / Enh | `bhojv2` | `9b236fe` | `src/lib/vendorLinks.ts`, `CompareView.tsx`, `BookingWizard.tsx` | Completed |
| **FE-16** | Frontend / UX | Removal of disruptive 15-second auto-redirect from confirmation screen | Bug Fix / UX | `bhojv2` | `be71439` | `src/components/booking/shared/StepDone.tsx` | Completed |
| **FE-17** | Frontend / UX | Baina order auto-selection and quantity selector ergonomics overhaul | Bug Fix / UX | `bhojv2` | `b7cd39c` | `src/components/vendors/BainaBoxOrderPanel.tsx`, `VendorActionRow.tsx` | Completed |
| **FE-18** | Frontend / Booking | Optional booking section bypass allowing feast completion without extras | Bug Fix / UX | `bhojv2` | `9f03135` | `src/components/booking/BookingWizard.tsx` | Completed |
| **FE-19** | Frontend / Copy | Customer-facing plain language and caterer terminology overhaul | Refactor | `bhojv2` / `main` | `b54d321`, `484c3b2` | Site-wide navigation, cards, wizards, review panels | Completed |
| **FE-20** | Frontend / UI | Missing artwork handling on service categories avoiding console crashes | Bug Fix | `origin/main` | `9fb2304` | `src/components/sections/TopCategories.tsx` | Completed |
| **PAY-01** | Payments | Razorpay 10% advance deposit checkout integration for Baina Box | Enhancement | `bhojv2` | `87f78e6` | `src/components/vendors/BainaBoxOrderPanel.tsx` | Completed |
| **PAY-02** | Payments / Security | Secure Pay Balance flow for outstanding bookings via Razorpay | Security / Enh | `bhojv2` | `795db05` | `src/components/bookings/MyBookings.tsx`, `payments/razorpay/order` | Completed |
| **PAY-03** | Payments | Atomic booking payment crediting and idempotent ledger transition | Bug Fix / Sec | `bhojv2` | `795db05` | `src/lib/razorpayPayments.ts` | Completed |
| **PAY-04** | Payments | Server-side ledger reconciliation and double-charge blocking | Bug Fix / Sec | `origin/main` | `24bf08d` | `src/lib/bookingPaymentSync.ts`, `src/lib/razorpayCheckout.ts` | Completed |
| **ADM-01** | Admin | Admin Enquiries table with PDF viewer, download, WhatsApp & CSV actions | Enhancement | `bhojv2` | `4974380` | `src/components/admin/enquiries/Enquiries.tsx` | Completed |
| **ADM-02** | Admin | Per-vendor, per-tier dish quota limits management UI | Enhancement | `origin/main` | `113e841` | `src/components/admin/vendors/VendorItemLimitsEditor.tsx` | Completed |
| **ADM-03** | Admin | Centralized package naming and tagline editor in Admin Settings | Enhancement | `bhojv2` | `b54d321` | `src/components/admin/settings/SettingsView.tsx` | Completed |
| **ADM-04** | Admin | Admin booking management guest diet split breakdown display | Enhancement | `origin/main` | `1f32ace` | `src/components/admin/bookings/BookingManagement.tsx` | Completed |
| **INT-01** | Integration | WhatsApp dispatch generator with formatted customer brief & secure link | Enhancement | `bhojv2` | `4974380` | `src/components/admin/enquiries/Enquiries.tsx` | Completed |
| **INT-02** | Integration | Customer-side WhatsApp message generation for custom package enquiry | Enhancement | `origin/main` | `8f304f8` | `src/components/sections/Packages.tsx` | Completed |
| **INT-03** | Integration | Booking confirmation summary generator with formatted guest diet breakdown | Enhancement | `origin/main` | `1f32ace` | `src/lib/dietSplit.ts`, `BookingWizard.tsx` | Completed |

### 3.2 Cross-Cutting & Supporting Engineering Disciplines
In addition to the 48 core production implementation efforts, engineering effort in September 2026 encompassed several specialized supporting domains cataloged in their respective dedicated sections below:
- **Security & Access Control:** 12 dedicated efforts (`SEC-01` through `SEC-12`, detailed in Section 5).
- **Defect Resolution & Bug Fixes:** 10 verified bug fixes (`BUG-01` through `BUG-10`, detailed in Section 4).
- **Automated Testing & QA:** 6 test suites & verification scripts (`TST-01` through `TST-06`, detailed in Section 10).
- **DevOps, Infrastructure & Maintenance:** 3 operational tasks (`OPS-01` through `OPS-03`, detailed in Section 12).
- **Prototypes & Architecture Specifications:** 10 standalone deliverables (`PROTO-01` through `PROTO-10`, detailed in Section 11).

These specialized domains directly safeguard and support the 48 primary production efforts but are maintained as distinct inventories to ensure complete transparency and prevent double-counting.

---

## 4. Bug Fixes

The following inventory details all 10 resolved software defects, logic bugs, regressions, and UI failures addressed during September 2026.

### BUG-01: Payment Balance Bypass and Unauthorized Status Transition
- **What Was Broken:** In `/api/bookings/[id]/route.ts`, a severe financial vulnerability existed where any status transition executed by a client through a raw HTTP `PATCH` triggered `next.paid = order.amount`. This allowed malicious or malformed client requests to mark bookings as fully paid without an actual payment gateway transaction. Furthermore, `/api/payments/razorpay/order` trusted client-provided balance values and did not verify customer ownership or active booking status.
- **What Was Changed:** Removed the unauthorized `next.paid = order.amount` assignment from `src/app/api/bookings/[id]/route.ts` and locked down customer transitions. Implemented authoritative server-side remaining balance derivation (`remainingBalance = max(0, amount - paid)`) in `src/app/api/payments/razorpay/order/route.ts`, strictly rejecting payments for completed, cancelled, or fully paid bookings.
- **Where It Was Changed:** `src/app/api/bookings/[id]/route.ts`, `src/app/api/payments/razorpay/order/route.ts`, `src/lib/razorpayPayments.ts`.
- **Why It Matters:** Eliminated a critical financial exploit that could result in uncollected revenues and fraudulent booking confirmations.

### BUG-02: Stranded Ledger Payments and Double-Charging on Retries
- **What Was Broken:** When payments landed against pre-existing bookings (such as a later balance settlement or a Baina Box order) or when a customer closed their browser tab right after Razorpay authorization, the payment was recorded in the payments ledger but never synchronized to the `bookings` table. The booking remained displayed as unpaid (₹0 paid), prompting customers to pay again.
- **What Was Changed:** Created `src/lib/bookingPaymentSync.ts` with `syncBookingWithLedger()`, ensuring all gateway payments atomically update booking paid amounts and advance pending bookings to confirmed. Added an `alreadyPaid` check returning HTTP 409 Conflict in `src/lib/razorpayCheckout.ts` to halt redundant checkout dialogs if the ledger already shows a successful charge.
- **Where It Was Changed:** `src/lib/bookingPaymentSync.ts`, `src/lib/razorpayCheckout.ts`, `src/lib/razorpayPayments.ts`, `src/app/api/payments/route.ts`.
- **Why It Matters:** Prevented customer double-charging and eliminated customer support tickets caused by desynchronized payment ledgers.

### BUG-03: Booking Wizard Blocked on Skipped Optional Sections
- **What Was Broken:** Customers attempting to book a standard Feast package were prevented from reaching the checkout and confirmation screen if they skipped or only partially filled optional sections (such as Live Stalls or Add-ons & Extras), resulting in high booking abandonment.
- **What Was Changed:** Updated `stepValid(3)` in `src/components/booking/BookingWizard.tsx` so the Live Stall stage is optional. Enhanced `liveNext` to allow advancing past the last live category, added explicit "Skip Live Stalls" buttons, and updated `orderHasItems` so package + caterer selection is sufficient to proceed.
- **Where It Was Changed:** `src/components/booking/BookingWizard.tsx`.
- **Why It Matters:** Removed funnel friction and fixed booking drop-off for customers who only required core feast catering without optional add-ons.

### BUG-04: Date Picker Clamping and Stall Lead-Time Override
- **What Was Broken:** In `src/components/DatePicker.tsx`, `minDaysAhead` was clamped to `Math.max(1, minDaysAhead)`, preventing same-day bookings (`leadDays: 0`). Furthermore, `customOrderLeadDays` in `src/lib/data.ts` did not resolve dynamic vendor records, causing vendor-specific short lead times (1 day) to be overwritten by feast package or occasion defaults (e.g., wedding 30-day requirement).
- **What Was Changed:** Updated `DatePicker.tsx` to allow `Math.max(0, minDaysAhead)`. Enhanced `customOrderLeadDays()` to accept and prioritize `extraVendors`. In `StallBookingWizard.tsx`, isolated Single Stall and Live Stall lead calculation from Feast package minimums.
- **Where It Was Changed:** `src/components/DatePicker.tsx`, `src/components/booking/StallBookingWizard.tsx`, `src/lib/data.ts`, verified via `scratch/test_stall_availability.mjs`.
- **Why It Matters:** Allowed urgent and short-notice bookings for stalls and live food counters without artificial calendar lockouts.

### BUG-05: Non-Feast Vendor Profile Routing Failure
- **What Was Broken:** When browsing vendor profiles or the Compare View, clicking "Book Now" on a Baina Box vendor or a Live Counter specialist routed users to `/book?step=menu`. The `/book` wizard only supported 3-tier Feast packages, dead-ending customers on a menu builder that could not configure the selected vendor.
- **What Was Changed:** Created `src/lib/vendorLinks.ts` with `resolveVendorFlow()` and `vendorBookingHref()`. Integrated automatic forwarding in `src/components/booking/BookingWizard.tsx` to redirect Baina specialists to `/baina-box/[slug]#baina-order` and live specialists to `/book/live-stall`. Updated `CompareView.tsx`.
- **Where It Was Changed:** `src/lib/vendorLinks.ts`, `src/components/booking/BookingWizard.tsx`, `src/components/vendors/CompareView.tsx`.
- **Why It Matters:** Eliminated broken links and dead-end redirects for specialty vendors across the marketplace.

### BUG-06: Disruptive 15-Second Auto-Redirect on Booking Confirmation
- **What Was Broken:** After completing checkout, the confirmation screen (`StepDone.tsx`) ran an automated 15-second timer that forcibly navigated users to the home page (`window.location.assign("/")`). This kicked customers off the page while they were attempting to read their booking reference, save receipts, download the menu PDF, or click WhatsApp sharing.
- **What Was Changed:** Removed the automated countdown timer and redirect. Replaced it with permanent action buttons: "View My Bookings" (`/bookings`) and "Back to Home" (`/`).
- **Where It Was Changed:** `src/components/booking/shared/StepDone.tsx`.
- **Why It Matters:** Restored user agency and prevented customer frustration caused by unprompted screen dismissal.

### BUG-07: Baina Product Empty State, Missing Auto-Select & Auth Flash
- **What Was Broken:** On Baina Box vendor pages, if no box was pre-selected, the order panel showed an empty state without an immediate action to begin ordering. The quantity selector was cramped inside product cards. In addition, when authentication was loading, the panel flashed an unauthorized login prompt before resolving.
- **What Was Changed:** Updated `BainaBoxOrderPanel.tsx` with a prominent one-click action to add the primary product. Moved quantity adjustment cleanly into the order summary list. Added a smooth loading skeleton while the session resolves. Added smooth-scrolling to `#baina-order` in `VendorActionRow.tsx`.
- **Where It Was Changed:** `src/components/vendors/BainaBoxOrderPanel.tsx`, `src/components/vendors/VendorActionRow.tsx`.
- **Why It Matters:** Smoothed the festive gifting checkout funnel and eliminated layout jank during session resolution.

### BUG-08: Runtime Crash on Missing Service Category Artwork
- **What Was Broken:** In `TopCategories.tsx`, admin-created service categories with empty image URLs caused Next.js `<Image>` components to throw two console errors per render (`empty string was passed to src attribute`), crashing or corrupting the marquee animation.
- **What Was Changed:** Added conditional check in `TopCategories.tsx` to render a styled maroon typography card without the `<Image>` component when artwork is absent.
- **Where It Was Changed:** `src/components/sections/TopCategories.tsx`.
- **Why It Matters:** Prevented frontend runtime errors when admins create or manage category listings without immediate image uploads.

### BUG-09: Unprotected Vendor Dashboard and Multi-Role Ambiguity
- **What Was Broken:** The `/vendor/dashboard` route had no session verification guard, allowing unauthenticated direct access. Furthermore, users could accumulate conflicting roles (customer, vendor, partner) on a single email, causing dashboard navigation confusion and privilege leakage.
- **What Was Changed:** Added `RequireSession` guard to `src/app/vendor/dashboard/page.tsx`. Re-architected user roles via `src/lib/users.ts` so that one email resolves deterministically to exactly one role and one dashboard.
- **Where It Was Changed:** `src/app/vendor/dashboard/page.tsx`, `src/lib/users.ts`, `src/app/api/auth/signup/route.ts`.
- **Why It Matters:** Secured vendor portal data from unauthenticated access and eliminated identity ambiguities.

### BUG-10: Untracked Customer Upload Exposure in Git Working Tree
- **What Was Broken:** Customer-uploaded menu PDFs in `/data/enquiries/` and `/data/enquiry-docs/` were written to disk without Git ignore rules, leaving sensitive customer documents exposed to accidental repository commits during `git add -A`.
- **What Was Changed:** Added `/data/enquiry-docs/` and `/data/enquiries/` to `.gitignore`.
- **Where It Was Changed:** `.gitignore`.
- **Why It Matters:** Protected customer Personally Identifiable Information (PII) and prevented confidential documents from being leaked into version control.

---

## 5. Security & Validation

Security and validation represent a substantial, mission-critical portion of the technical effort delivered in September 2026. The table below catalogs all 12 dedicated security and hardening measures:

| ID | Security Domain | Specific Engineering Implementation | Reference Commit |
|---|---|---|---|
| **SEC-01** | Financial Integrity | Eliminated unauthenticated payment status bypass via raw HTTP `PATCH` in `/api/bookings/[id]`. | `795db05` (`bhojv2`) |
| **SEC-02** | Payment Protection | Enforced server-authoritative balance calculation in `/api/payments/razorpay/order`, preventing client manipulation of transaction amounts. | `795db05` (`bhojv2`) |
| **SEC-03** | Cryptographic Auth | Implemented server-side HMAC-SHA256 signature verification for Razorpay advance deposits and balance settlements. | `87f78e6`, `795db05` (`bhojv2`) |
| **SEC-04** | Double Charge Guard | Added 409 Conflict locking in checkout orchestration to verify payment ledger state before opening new Razorpay payment sessions. | `24bf08d` (`origin/main`) |
| **SEC-05** | Access Control (RBAC) | Implemented "One Email = One Role = One Dashboard" architecture; removed multi-role escalation route `/api/auth/partner-roles`. | `df87f0c` (`origin/main`) |
| **SEC-06** | Route Protection | Added session and role verification guards to previously unprotected `/vendor/dashboard` route. | `df87f0c` (`origin/main`) |
| **SEC-07** | Dual-Mode Doc Auth | Engineered dual-mode document retrieval (`/api/enquiries/attachment/[id]`): Admin session cookie verification OR unguessable 192-bit cryptographic `shareToken` (`?token=...`). | `4974380` (`bhojv2`) |
| **SEC-08** | File Upload Security | Added magic-byte verification (`%PDF-`), 10 MB/5 MB file size caps, and MIME-type checks to prevent arbitrary file upload vulnerabilities. | `4974380`, `8f304f8` |
| **SEC-09** | PII Quarantine | Excluded runtime customer enquiry documents (`/data/enquiries/`, `/data/enquiry-docs/`) from Git version control. | `4974380`, `7504110` |
| **SEC-10** | Prototype Privacy | Performed complete privacy sweep across vendor prototypes, sanitizing all names, mobile numbers, and emails with fictional demo placeholders. | `56ea7eb`, `5688205` |
| **SEC-11** | Input Normalization | Enforced strict numeric range normalization (0–24) and dirty-state checking in admin vendor dish limit management. | `113e841` (`origin/main`) |
| **SEC-12** | Payload Integrity | Validated guest diet split payloads to guarantee `vegGuests + nonVegGuests === totalGuests`, rejecting tampered requests. | `1f32ace` (`origin/main`) |

---

## 6. Admin / Internal Tools

Technical improvements to administrative consoles and internal operations tools included:

### 6.1 Admin Enquiries Console Overhaul (`ADM-01` — `src/components/admin/enquiries/Enquiries.tsx`)
- **Source Badges:** Added visual indicators distinguishing standard contact form submissions from custom catering PDF enquiries.
- **Attachment Column & Viewer:** Added document indicator column with a one-click inline PDF viewer modal and direct download action.
- **WhatsApp Dispatch Integration:** Built a "Forward to WhatsApp" generator that compiles a formatted event brief (customer name, occasion, guest count, budget, date, notes) and appends the secure, tokenized document link.
- **Data Export:** Integrated attachment metadata and URLs into the administrative CSV export routine.

### 6.2 Per-Vendor Tier Dish Quota Limits Editor (`ADM-02` — `VendorItemLimitsEditor.tsx`)
- **Matrix Grid UI:** Developed an administrative editor rendering courses as rows and tiers (Silver, Gold, Platinum) as columns.
- **Inheritance Chain:** Configured a three-level fallback precedence: Administrative Override → Vendor Setting → Platform Default. Setting an override to blank inherits; setting to 0 disables the course.
- **Atomic Persistence:** Added `POST /api/admin/vendor-item-limits` with concurrency re-read protection and input sanitization (`SEC-11`).

### 6.3 Centralized Package Naming Controls (`ADM-03` — `SettingsView.tsx` & `/api/admin/packages`)
- **Settings Panel:** Added a "Packages & Tiers" administrative tab enabling runtime customization of package display names and taglines.
- **Decoupled Architecture:** Allowed marketing names to change dynamically while leaving internal tier identifiers, pricing structures, and payment logic completely untouched.

### 6.4 Admin Booking Management Guest Split Display (`ADM-04` — `BookingManagement.tsx`)
- **Dietary Breakdown:** Updated administrative booking tables and detail views to render guest counts formatted with dietary splits (e.g., `"120 (80 Veg · 40 Non-veg)"`).

---

## 7. Vendor Portal (Mockup & Spec vs Production)

A major portion of September effort was dedicated to vendor registration and vendor portal architecture. To maintain complete clarity, this section distinguishes production code changes from standalone design engineering and prototypes.

### 7.1 Production Vendor Portal Work
- **Route Guarding (`SEC-06`):** Protected `/vendor/dashboard` with active session authentication (`df87f0c`).
- **Quota Reflection (`ADM-02`):** Ensured public vendor menu profiles reflect merged tier limits configured by administrators (`113e841`).

### 7.2 Prototype & Architectural Design Engineering (Standalone)
- **Architecture Audit (`PROTO-01` — `VENDOR_REGISTRATION_CURRENT_STATE.md`):** Comprehensive 674-line audit of existing registration flows, data schemas, API routes, and operational gaps.
- **Vendor Dashboard Requirements (`PROTO-02` — `VENDOR_DASHBOARD_REQUIREMENTS.md`):** 612-line operational specification defining core Jobs-To-Be-Done (JTBD), kitchen prep sheets, fulfillment lifecycles, and phased MVP milestones.
- **UI/UX Specification (`PROTO-03` — `VENDOR_DASHBOARD_UI_SPEC.md`):** 856-line design specification defining visual hierarchies, mobile touch ergonomics, print styling, and strict 4-color palette tokens.
- **Standalone Registration V1 Prototype (`PROTO-04` — `mockups/vendor-registration/`):** 9-step progression featuring desktop (1440px) and mobile (390px) canvases.
- **Standalone Registration V2 Prototype (`PROTO-05` — `mockups/vendor-registration-v2/`):** Multi-iteration prototype addressing stakeholder feedback:
  - Persistent top vendor identity header.
  - Storefront-first field capture (Best For tags, min/max pax, culinary stories).
  - Strict decoupling of 7 top-level service offerings.
  - Sequential tier progression (Silver Base → Gold Featured → Platinum Coming Soon).
  - Four-tier cutlery/tableware packages mapped to Bhojpatra ServicePackages.
  - Dynamic Single Stall builder (Fixed vs. Varied delicacy pricing).
  - Consolidated Master Review & Submit with itemized edit links.
  - 100% desktop and mobile canvas parity.
- **Standalone Vendor Dashboard (`PROTO-06` — `mockups/vendor_dashboard.html`, `public/...`):** 2,243-line high-fidelity dashboard with kitchen prep sheets and booking review modals.
- **Integrated V2 Vendor Dashboard (`PROTO-07` — `mockups/vendor-registration-v2/index.html`):** Integrated V1 dashboard inside V2 prototype with dedicated 7-services hub and state simulator.
- **Field Mapping Documentation (`PROTO-08` — `STOREFRONT_ONBOARDING_MAPPING.md`):** 1:1 mapping between storefront booking schema and onboarding data capture.
- **Design Decisions Documentation (`PROTO-09` — `DESIGN_DECISIONS.md`):** Rationale and constraints documentation across registration iterations.
- **Offline Distribution Archives (`PROTO-10` — `vendor-registration.zip`, `vendor-registration-v2.zip`):** Standalone zip packages prepared for offline stakeholder distribution.

---

## 8. Customer-Facing Enhancements

Customer-facing technical improvements delivered across September 2026:

1. **Custom Catering Discovery & Modal (`FE-01`, `FE-02`):** Integrated a homepage banner and accessible modal allowing customers with bespoke menus or budgets to submit inquiries with PDF briefs.
2. **FSSAI Dietary Badges (`FE-04`):** Implemented standard Indian statutory dietary markers (🟢 Veg, 🔴 Non-Veg, dual Veg/Non-Veg) across vendor cards and detail pages, with automatic non-food vendor suppression.
3. **Craft My Plate Veg/Non-Veg Guest Split (`FE-06`, `FE-07`):** Added interactive split controls that dynamically filter menu courses, disable meat-only counters for pure veg plates, and print itemized splits on receipts and invoices.
4. **Occasion Navigation & Search (`FE-09`, `FE-10`):** Added direct scroll navigation (`#occasions`) and bilingual search filtering across all catered occasions.
5. **Availability & Lead Time Rules (`FE-13`):** Enabled next-day and same-day booking for Single Stalls and Baina Boxes by decoupling vendor lead times from 30-day feast minimums.
6. **Lower Stall Minimums (`FE-14`):** Reduced minimum guest requirements for Single Stalls from 50 to 20 guests.
7. **Canonical Booking Deep-Links (`FE-15`):** Created intelligent link resolution routing specialty vendors directly to their dedicated booking wizards.
8. **Persistent Sticky Baina Cart (`FE-11`, `FE-12`):** Engineered a floating cart dock that synchronizes selected gift boxes, total quantities, and pricing across page transitions.
9. **Enhanced Confirmation Screen (`FE-16`):** Replaced the disruptive auto-redirect timer with permanent review and navigation options.
10. **Customer Copy Refinements (`FE-19`):** Replaced internal technical jargon ("Vendors", "Add-ons") with natural caterer terminology ("Choose your caterer", "Extras").

---

## 9. Integrations

Technical integration efforts delivered across third-party services and APIs:

### 9.1 WhatsApp Business Integrations
- **Admin Dispatch Generator (`INT-01` — `4974380`):** Engineered pre-formatted WhatsApp briefs in the Admin Enquiries console, incorporating customer specs, event details, and secure tokenized document links.
- **Homepage Custom Package WhatsApp Hook (`INT-02` — `8f304f8`):** Formatted customer custom package inquiries into `wa.me` links carrying same-origin document URLs.
- **Booking Confirmation Summary (`INT-03` — `1f32ace`):** Formatted booking confirmation WhatsApp messages to display explicit veg/non-veg guest breakdowns.

### 9.2 Payment Gateway Integrations (Razorpay)
- **Baina Box Checkout (`PAY-01` — `87f78e6`):** Integrated Razorpay payment flow to collect 10% advance deposits with server-side HMAC-SHA256 signature verification (`SEC-03`).
- **Pay Balance Integration (`PAY-02` — `795db05`):** Wired online balance payments for confirmed bookings through Razorpay with real-time UI synchronization.
- **Atomic Payment Crediting (`PAY-03` — `795db05`):** Implemented atomic booking payment crediting and idempotent ledger state transitions.
- **Double-Charge Protection (`PAY-04` — `24bf08d`):** Added 409 Conflict checks preventing duplicate charges on retried checkouts (`SEC-04`).

### 9.3 Cloud & Local Storage Integrations
- **Dual-Path PDF Storage (`DB-02` — `4974380`):** Configured private Vercel Blob storage with automated fallback to local disk storage (`data/enquiries/`).
- **Settings Store Base64 Fallback (`DB-03` — `8f304f8`):** Implemented base64 document persistence in singleton Postgres rows when cloud blob stores are suspended.

---

## 10. Testing / QA

Automated tests and verification suites developed in September 2026:

| ID | Test Suite File | Test Type | Coverage & Scenarios Verified | Status |
|---|---|---|---|---|
| **TST-01** | `src/lib/enquiries.test.ts` | Unit | PDF magic byte verification (`%PDF-`), invalid byte rejection, unguessable `shareToken` cryptographic entropy. | Passing |
| **TST-02** | `src/lib/enquiriesRoute.test.ts` | Integration | Multipart/form-data upload handling, 10 MB payload limits, JSON fallback compatibility, dual-mode authorized streaming. | Passing |
| **TST-03** | `src/lib/craftMyPlate.test.ts` | Unit | Vendor dietary classification, non-food vendor detection (decor/service exclusion), counter extra classification. | Passing |
| **TST-04** | `src/lib/dietSplit.test.ts` | Unit | Guest split math derivation, menu course filtering, set-menu exclusion, receipt summary formatting. | Passing |
| **TST-05** | `src/lib/vendorItemLimitsData.test.ts` | Unit | Course quota normalization, band bounds (0–24), fallback hierarchy (override → vendor → platform). | Passing |
| **TST-06** | `scratch/test_stall_availability.mjs` | Verification | Next-day stall booking (1 day), same-day booking (0 days), custom vendor lead times, feast package isolation. | Passing |

---

## 11. Prototype / Mockup Engineering

The table below catalogs the 10 standalone design engineering deliverables, interactive prototypes, and architecture specifications created in September 2026 (completely decoupled from production source code):

| ID | Prototype Deliverable | Files Involved | Scope & Functionality |
|---|---|---|---|
| **PROTO-01** | Architecture Audit Document | `VENDOR_REGISTRATION_CURRENT_STATE.md` | 674-line analysis of existing registration tables, APIs, and functional gaps. |
| **PROTO-02** | Requirements Specification | `VENDOR_DASHBOARD_REQUIREMENTS.md` | 612-line specification of vendor operations, kitchen prep sheets, and lifecycle states. |
| **PROTO-03** | Design Tokens & UI Spec | `VENDOR_DASHBOARD_UI_SPEC.md` | 856-line design guide adhering to Bhojpatra's strict 4-color palette tokens. |
| **PROTO-04** | Vendor Registration Prototype V1 | `mockups/vendor-registration/` (HTML, JS, CSS) | 9-step standalone onboarding prototype with dual desktop (1440px) and mobile (390px) viewports. |
| **PROTO-05** | Vendor Registration Prototype V2 | `mockups/vendor-registration-v2/` (HTML, JS, CSS) | Full realignment to stakeholder feedback: 7 decoupled service offerings, sequential tiers, and master review. |
| **PROTO-06** | Standalone Vendor Dashboard | `mockups/vendor_dashboard.html`, `public/...` | 2,243-line high-fidelity dashboard with kitchen prep sheets and booking review modals. |
| **PROTO-07** | Integrated V2 Vendor Dashboard | `mockups/vendor-registration-v2/index.html` | Integrated V1 dashboard inside V2 prototype with dedicated 7-services hub and state simulator. |
| **PROTO-08** | Field Mapping Documentation | `STOREFRONT_ONBOARDING_MAPPING.md` | 1:1 mapping between storefront booking schema and onboarding data capture. |
| **PROTO-09** | Design Decisions Documentation | `DESIGN_DECISIONS.md` | Rationale and constraints documentation across registration iterations. |
| **PROTO-10** | Offline Distribution Archives | `vendor-registration.zip`, `vendor-registration-v2.zip` | Standalone zip packages prepared for offline stakeholder distribution. |

---

## 12. Technical Investigation, Support & DevOps

Meaningful technical support and infrastructure tasks performed during September 2026:

### 12.1 September Infrastructure Deliverables

| ID | Infrastructure Task | Files / Commits | Nature & Scope |
|---|---|---|---|
| **OPS-01** | Docker Containerization | `Dockerfile`, `.dockerignore` (`4fbe2c6`) | Created a multi-stage production `Dockerfile` utilizing Next.js standalone output (`NEXT_OUTPUT=standalone`) and optimized `.dockerignore`. |
| **OPS-02** | AWS App Runner Runbook | `AWS-DEPLOY.md` (`4fbe2c6`) | Authored a 92-line operational deployment guide detailing container builds, ECR pushing, App Runner service creation, and environment variable configuration. |
| **OPS-03** | Repository Bloat Cleanup | Root directory (`6b8c41e`) | Removed 5 MB of dead image assets committed to the repository root (`Bhoj_hero.png`, `Screenshot...`, `WhatsApp Image...`, `public/hero-bg.png`). |


### 12.2 Immediate Pre-Audit Baseline Context
- **Build & Typecheck Optimization (`8ae58a4` — August 31, 2026 `23:24:17 +0530`):** Updated `.gitignore` and build configurations to exclude scratch scripts and subagent workspaces from TypeScript type checking immediately prior to the September audit window. (Not counted in the September totals).

---

## 13. Uncommitted / In-Progress Work

Inspection of the current working tree (`git status`) identifies the following uncommitted items:

| ID | Item | Path | Nature | Status |
|---|---|---|---|---|
| **UNCOMMITTED-01** | Updated V2 Archive | `mockups/vendor-registration-v2.zip` | Re-compressed archive bundling the latest 6:45 PM prototype updates and integrated dashboard. | In-Progress / Ready to Deliver |
| **UNCOMMITTED-02** | Bundled Standalone Dashboard | `mockups/vendor-registration-v2/vendor_dashboard.html` | Copied standalone high-fidelity dashboard into the V2 package for offline redundancy. | In-Progress / Ready to Deliver |
| **STASH-01** | Git Stash Entry | `stash@{0}` | Formatting adjustments in `src/components/bookings/MyBookings.tsx`. | Stashed / Suspended |

---

## 14. Duplicate & Overlap Analysis

Because development occurred across parallel branches, this section compares overlapping implementations to ensure accurate, non-duplicated accounting.

### 14.1 Custom Catering / Enquiry PDF Upload
- **Track A (`4974380` on `bhojv2`):** Implemented via `CustomCateringBanner.tsx` and `CustomCateringModal.tsx` on homepage; routes through `POST /api/contact` (multipart stream, 10 MB cap, `%PDF-` magic bytes); persists in `EnquiryRecord` in Postgres; serves via dual-mode `GET /api/enquiries/attachment/[id]` (admin session OR 192-bit `shareToken`); includes admin table with inline PDF viewer, WhatsApp forwarding, and CSV export.
- **Track B (`8f304f8` on `origin/main`):** Implemented at the foot of `Packages.tsx`; routes through `POST /api/leads/enquiry-doc` (5 MB cap, `%PDF-` check); persists in `vendor_photos` under kind "enquiry" with base64 settings fallback; serves via `GET /api/leads/enquiry-doc/[id]`; links directly to WhatsApp `wa.me`.
- **Accounting Verdict:** **Counted Separately.** These represent two entirely independent architectural implementations created on separate branches with distinct endpoints, storage patterns, and authorization models.

### 14.2 Payment Reconciliation and Balance Security
- **Track A (`795db05` on `bhojv2`):** Tightened `/api/payments/razorpay/order` with authoritative server-side balance derivation; eliminated financial bypass in `/api/bookings/[id]`; updated `recordRazorpayPayment` in `razorpayPayments.ts`; wired `PayBalanceButton` in `MyBookings.tsx`.
- **Track B (`24bf08d` on `origin/main`):** Created `src/lib/bookingPaymentSync.ts` with `syncBookingWithLedger()`; added 409 Conflict double-charge check in `startRazorpayCheckout`; updated manual `POST /api/payments` endpoint.
- **Accounting Verdict:** **Counted Separately.** Track A addresses financial endpoint security and client balance settlement, while Track B addresses ledger-to-booking reconciliation and double-charge prevention.

### 14.3 Customer Terminology & Copy Realignment
- **Track A (`b54d321` on `bhojv2`):** Replaced "Pick a Vendor" with "Choose your caterer" across `BookingWizard.tsx`, `StallBookingWizard.tsx`, `FinalisedPackages.tsx`, and `VendorCatalog.tsx`.
- **Track B (`484c3b2` on `origin/main`):** Comprehensive site-wide plain language overhaul covering 27 files (nav, errors, reviews, venue bookings, FloatingChat, FAQs).
- **Accounting Verdict:** **Counted as One Continuous Effort.** Track B subsumes and expands the initial terminology adjustments initiated in Track A.

### 14.4 Remote Feature Branches vs `origin/main`
- `origin/feat/craft-my-plate` (`ccb8db7`) was rebased into `1f32ace` on `origin/main`.
- `origin/feat/one-email-one-role` (`584d84e`) and `origin/feat/custom-package-enquiry-pdf` (`de795c1`) were refined into `df87f0c` on `origin/main`.
- **Accounting Verdict:** **Do NOT Double Count.** The intermediate commits on remote feature branches are direct precursors of the commits merged into `origin/main`. Only the final merged commits are counted.

### 14.5 Prototype Iteration Evolution
- Registration V1 (`34152e9`) was followed by Registration V2 (`4b861e6`, `c688226`, `56ea7eb`) and Integrated Dashboard (`5688205`).
- **Accounting Verdict:** Counted as **3 Progressive Design Milestones** (Initial V1 Architecture → V2 Realignment & Service Decoupling → V2 Dashboard Integration).

---

## 15. Business Use Case Mapping

This secondary mapping connects high-level business initiatives to their underlying technical efforts using globally unique IDs:

### Business Initiative 1: Custom Catering & Bespoke Menu Enquiries
- **Underlying Technical Efforts:** `API-01`, `API-02`, `API-03`, `DB-01`, `DB-02`, `DB-03`, `FE-01`, `FE-02`, `FE-03`, `SEC-07`, `SEC-08`, `SEC-09`, `ADM-01`, `INT-01`, `INT-02`, `TST-01`, `TST-02`, `BUG-10`.

### Business Initiative 2: Baina Box Festive Gifting eCommerce
- **Underlying Technical Efforts:** `FE-11`, `FE-12`, `FE-13`, `FE-17`, `PAY-01`, `BUG-07`.

### Business Initiative 3: Payment Gateway Resilience & Balance Clearance
- **Underlying Technical Efforts:** `API-06`, `PAY-02`, `PAY-03`, `PAY-04`, `SEC-01`, `SEC-02`, `SEC-03`, `SEC-04`, `BUG-01`, `BUG-02`.

### Business Initiative 4: Craft My Plate & Dietary Transparency
- **Underlying Technical Efforts:** `API-08`, `DB-06`, `FE-04`, `FE-05`, `FE-06`, `FE-07`, `SEC-12`, `ADM-04`, `INT-03`, `TST-03`, `TST-04`.

### Business Initiative 5: Dedicated Specialty Stall & Counter Booking
- **Underlying Technical Efforts:** `API-07`, `FE-13`, `FE-14`, `FE-15`, `BUG-04`, `BUG-05`, `TST-06`.

### Business Initiative 6: Booking Funnel Friction Removal
- **Underlying Technical Efforts:** `FE-09`, `FE-10`, `FE-16`, `FE-18`, `FE-19`, `FE-20`, `BUG-03`, `BUG-06`, `BUG-08`.

### Business Initiative 7: Administrative Quota & Content Management
- **Underlying Technical Efforts:** `API-04`, `API-05`, `DB-04`, `DB-07`, `FE-08`, `SEC-11`, `ADM-02`, `ADM-03`, `TST-05`.

### Business Initiative 8: Account Identity & Access Control Hardening
- **Underlying Technical Efforts:** `API-09`, `API-10`, `DB-05`, `SEC-05`, `SEC-06`, `BUG-09`.

### Business Initiative 9: Vendor Portal Architecture & Prototypes
- **Underlying Technical Efforts:** `PROTO-01`, `PROTO-02`, `PROTO-03`, `PROTO-04`, `PROTO-05`, `PROTO-06`, `PROTO-07`, `PROTO-08`, `PROTO-09`, `PROTO-10`, `SEC-10`, `UNCOMMITTED-01`, `UNCOMMITTED-02`.

### Business Initiative 10: Infrastructure, DevOps & Deployment
- **Underlying Technical Efforts:** `OPS-01`, `OPS-02`, `OPS-03`.

---

## 16. September Technical Effort Summary

### 16.1 Category Totals
- **Total Git Commits Reviewed Across All Branches:** 31 commits (18 on `bhojv2`, 10 on `origin/main`, 3 remote feature branch precursors) + 2 stash objects.
- **Distinct Production Technical Efforts Identified:** **48 efforts**
  - *Backend & API Routes:* 10 (`API-01` through `API-10`)
  - *Database, Schemas & Storage:* 7 (`DB-01` through `DB-07`)
  - *Frontend Interfaces, State & Logic:* 20 (`FE-01` through `FE-20`)
  - *Payments & Financial Processing:* 4 (`PAY-01` through `PAY-04`)
  - *Administration & Internal Consoles:* 4 (`ADM-01` through `ADM-04`)
  - *External & WhatsApp Integrations:* 3 (`INT-01` through `INT-03`)
- **Distinct Security & Access Control Efforts:** **12 efforts** (`SEC-01` through `SEC-12`)
- **Verified Software Bug Fixes:** **10 distinct bug fixes** (`BUG-01` through `BUG-10`)
- **Automated Test & Verification Suites:** **6 test suites** (`TST-01` through `TST-06`)
- **Prototype & Design Engineering Deliverables:** **10 major deliverables** (`PROTO-01` through `PROTO-10`)
- **DevOps, Infrastructure & Maintenance Tasks:** **3 tasks** (`OPS-01` through `OPS-03`)
- **Uncommitted / In-Progress Items:** **2 deliverables** (`UNCOMMITTED-01`, `UNCOMMITTED-02`) + 1 stash (`STASH-01`)
- **Branch Overlaps Reconciled / Deduplicated:** **5 analyses** (Section 14)
- **Synthesized Tracker-Ready Deliverables:** **40 deliverables** (Section 17)

### 16.2 Count Reconciliation & Category Independence Matrix

| Engineering Dimension | Count | Nature of Category | Relationship to Production Inventory |
|---|---|---|---|
| **Primary Production Implementation** | **48** | Core application codebase changes | Baseline inventory of all new features, APIs, schemas, and UI components. |
| **Defect Resolution & Bug Fixes** | **10** | Defect resolution | Overlaps with production records (`BUG-01`–`BUG-10` resolved code in production). Categorized separately for QA tracking. |
| **Security & Access Control** | **12** | Cross-cutting defense & verification | 9 measures embedded in production code (`SEC-01`–`SEC-09`), 2 validation guards (`SEC-11`, `SEC-12`), 1 prototype privacy sweep (`SEC-10`). |
| **Automated Testing & QA** | **6** | Verification test suites | Dedicated test suites (`TST-01`–`TST-06`) validating production APIs, schemas, and booking rules against regression. |
| **Prototype & Architecture Specs** | **10** | Standalone design deliverables | 100% independent of production code (`PROTO-01`–`PROTO-10`). High-fidelity HTML/CSS/JS mockups and architecture markdown docs. |
| **DevOps & Infrastructure** | **3** | Operational infrastructure | Independent deployment configs, Dockerfile, App Runner runbook, and repo bloat cleanup (`OPS-01`–`OPS-03`). |
| **Tracker-Ready Deliverables** | **40** | Client-ready work packages | Synthesized engineering milestones representing underlying multi-layer tasks in cohesive units for executive presentation. |

---

## 17. Tracker-Ready Technical Effort List

The following list is written in simple, objective language for direct extraction into an operational tracker or executive presentation, with technical effort types and IDs clearly identified:

1. **[Enhancement / UI] Custom Catering Discovery UI:** Built a responsive homepage banner and accessible modal allowing customers to submit custom event requirements and upload menu/budget PDFs. *(FE-01, FE-02)*
2. **[Enhancement / API & Security] Secure PDF Upload Handling:** Added a backend multipart file receiver validating PDF magic bytes (`%PDF-`) with a 10 MB upload cap and resilient local disk fallback. *(API-01, DB-02, SEC-08)*
3. **[Security / Access Control] Dual-Mode Document Access:** Implemented secure attachment access guarded by admin session authentication OR a private, unguessable 192-bit cryptographic share token for WhatsApp recipients. *(API-02, SEC-07)*
4. **[Enhancement / Admin] Admin Enquiries Console:** Enhanced the admin enquiries table with source badges, inline PDF preview modal, file downloading, and CSV export. *(ADM-01)*
5. **[Enhancement / Integration] WhatsApp Enquiry Forwarding:** Created an administrative action to generate formatted WhatsApp messages containing customer event briefs and secure document links. *(INT-01)*
6. **[Enhancement / Full-Stack] Homepage Package PDF Enquiry:** Built a curated package footer form supporting PDF uploads with base64 storage fallback and direct WhatsApp customer inquiries. *(API-03, DB-03, FE-03, INT-02)*
7. **[Enhancement / UI] Statutory FSSAI Dietary Badges:** Created standard Indian FSSAI-compliant Veg (🟢) and Non-Veg (🔴) visual markers across vendor cards and detail menus. *(FE-04)*
8. **[Enhancement / Logic] Non-Food Vendor Detection:** Built an automated classification engine suppressing food dietary badges on decor, photography, and service-only vendor listings. *(FE-05)*
9. **[Enhancement / Logic & UI] Craft My Plate Guest Split:** Added interactive veg and non-veg guest counters with mathematical integrity validation, dynamically updating menu choices and plate costs. *(FE-06, DB-06, API-08, SEC-12, ADM-04)*
10. **[Enhancement / Logic] Menu Filtering by Diet Split:** Built strict filtering logic hiding non-veg dishes and meat-only counters when a customer selects a pure veg event plate. *(FE-07)*
11. **[Enhancement / State] Baina Box Sticky Cart:** Created a persistent floating cart dock displaying live box counts, vendor name, and price totals across page transitions and catalog browsing. *(FE-11)*
12. **[Enhancement / Payments & Security] Baina Box Razorpay Checkout:** Integrated online Razorpay payments collecting a 10% advance deposit for Baina gift boxes with HMAC-SHA256 signature verification. *(PAY-01, SEC-03)*
13. **[Enhancement / Logic] Promotions & Referral Discounts:** Added promo coupon codes and partner referral discount engines to the Baina Box checkout panel. *(FE-12)*
14. **[Bug Fix / UX] Baina Quantity Selector Ergonomics:** Streamlined Baina box selection with one-click auto-select, loading skeleton, and list-based quantity adjustments. *(FE-17, BUG-07)*
15. **[Security Fix / Payments] Pay Balance Financial Lockdown:** Removed an unauthenticated financial bypass in booking PATCH updates and enforced authoritative server-side remaining balance calculations. *(SEC-01, SEC-02, BUG-01, PAY-02, API-06)*
16. **[Bug Fix / Payments] Ledger-to-Booking Reconciliation:** Built automated synchronization ensuring payments recorded in the payments ledger immediately reflect on customer booking balances. *(PAY-04, BUG-02)*
17. **[Security Fix / Payments] Double Charge Prevention:** Added payment gateway checks returning HTTP 409 Conflict to block duplicate charges on retried checkouts. *(SEC-04, BUG-02)*
18. **[Bug Fix & Enhancement / Booking] Next-Day & Same-Day Booking Availability:** Adjusted booking calendar rules to allow next-day and same-day bookings for single food stalls and gift boxes by isolating vendor lead times from feast package minimums. *(FE-13, API-07, BUG-04)*
19. **[Enhancement / Booking] Lower Stall Guest Minimum:** Lowered the minimum guest threshold for single stall and live counter bookings from 50 to 20 guests. *(FE-14)*
20. **[Bug Fix / Routing] Dedicated Vendor Booking Links:** Fixed vendor profile booking buttons across the catalog and Compare View to route customers directly to stall or gift box wizards rather than dead-ending on feast packages. *(FE-15, BUG-05)*
21. **[Bug Fix / UX] Confirmation Screen Timer Removal:** Eliminated a disruptive 15-second auto-redirect timer from the booking confirmation screen, replacing it with permanent navigation buttons. *(FE-16, BUG-06)*
22. **[Bug Fix / Booking] Optional Booking Steps Bypass:** Fixed booking wizard validation to allow customers to complete feast bookings if they skip optional add-on sections like live food stalls. *(FE-18, BUG-03)*
23. **[Bug Fix / UI] Missing Category Image Crash Guard:** Prevented browser console crashes and broken marquees when admin-created service categories are displayed without uploaded artwork. *(FE-20, BUG-08)*
24. **[Enhancement / Copy] Customer-Friendly Terminology Overhaul:** Rewrote site-wide interface copy from internal technical jargon ("Vendors", "Add-ons") to natural caterer language ("Choose your caterer", "Extras"). *(FE-19)*
25. **[Enhancement / Admin & Security] Admin Dish Limits Management:** Built an administrative matrix editor and API allowing custom dish quotas per vendor, course, and tier with numeric range bounds validation. *(ADM-02, API-05, DB-04, SEC-11)*
26. **[Enhancement / Admin] Centralized Package Naming:** Created an administrative settings interface and caching provider to update marketing package names and taglines dynamically without breaking tier identifiers. *(ADM-03, API-04, DB-07, FE-08)*
27. **[Security & Architecture] One Email = One Role Authentication:** Redesigned user accounts so each email address resolves deterministically to exactly one distinct role and dashboard, removing privilege escalation routes. *(SEC-05, API-09, API-10, DB-05)*
28. **[Security Fix / Auth] Vendor Dashboard Route Guard:** Added session authentication and role verification checks to protect `/vendor/dashboard` from unauthenticated direct access. *(SEC-06, BUG-09)*
29. **[Security Fix / Privacy] Customer Document Privacy Quarantine:** Added `.gitignore` rules ensuring uploaded customer enquiry PDFs are never accidentally committed to version control. *(SEC-09, BUG-10)*
30. **[Enhancement / Navigation] Occasions Navigation & Search:** Added smooth-scrolling deep-link navigation and live bilingual search for catered event occasions. *(FE-09, FE-10)*
31. **[Prototype / Architecture Spec] Vendor Registration Architecture Audit:** Authored a 674-line technical review of existing vendor onboarding flows, data schemas, API endpoints, and operational gaps. *(PROTO-01)*
32. **[Prototype / Operations Spec] Vendor Dashboard Operational Specification:** Authored a 612-line operational specification defining vendor kitchen prep sheets, order fulfillment lifecycles, and phased milestones. *(PROTO-02)*
33. **[Prototype / Design Spec] Vendor Portal UI/UX Specification:** Created an 856-line design specification defining visual hierarchies, mobile touch ergonomics, and Bhojpatra's strict 4-color design tokens. *(PROTO-03)*
34. **[Prototype / Standalone UI] Vendor Registration Prototype V1:** Built a standalone 9-step registration prototype featuring dual desktop (1440px) and mobile (390px) responsive viewports. *(PROTO-04)*
35. **[Prototype / Standalone UI] Vendor Registration Prototype V2:** Upgraded the prototype to decouple 7 independent service offerings, sequential tier progression, and master review. *(PROTO-05)*
36. **[Prototype / Standalone UI] Interactive V2 Vendor Dashboard:** Built a complete high-fidelity vendor dashboard directly inside the V2 prototype with service management and caterer state simulation. *(PROTO-07, PROTO-06)*
37. **[Prototype / Packaging] Offline Distribution Packages:** Created standalone zip archives bundling the complete prototype suites for offline stakeholder review. *(PROTO-10)*
38. **[Prototype / Schema Doc] Storefront-to-Onboarding Mapping:** Authored a comprehensive field-by-field schema mapping matching onboarding data capture to live marketplace displays. *(PROTO-08)*
39. **[DevOps / Infrastructure] Docker & App Runner Deployment:** Created a production multi-stage Next.js standalone Dockerfile and an AWS App Runner operational deployment guide. *(OPS-01, OPS-02)*
40. **[Maintenance] Repository Asset Cleanup:** Removed 5 MB of obsolete image files committed to the repository root to optimize repository clone performance. *(OPS-03)*
