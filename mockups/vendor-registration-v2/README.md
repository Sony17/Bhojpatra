# Bhojpatra Vendor Registration Experience V2 — Interactive Prototype

## Realignment to Stakeholder Feedback & Bhojpatra Source of Truth

**Version:** 2.0 (Stakeholder Feedback & Source-of-Truth Revision)  
**Location:** `/mockups/vendor-registration-v2/index.html`  
**Related Docs:** [`STOREFRONT_ONBOARDING_MAPPING.md`](file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor-registration-v2/STOREFRONT_ONBOARDING_MAPPING.md), [`DESIGN_DECISIONS.md`](file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor-registration-v2/DESIGN_DECISIONS.md)  
**Target Viewports:** Desktop (1440px) & Mobile (390px iPhone-style)

---

## 1. How to Open and View Version 2

The prototype is completely standalone and runs directly in any modern browser without requiring Node.js, Next.js, or backend servers.

### Direct Browser Viewing
1. Open your web browser (Google Chrome, Microsoft Edge, Safari, or Firefox).
2. Open the file directly:
   ```
   file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor-registration-v2/index.html
   ```
   Or navigate to `c:\Users\Zeeshaan\Bhojpatra\mockups\vendor-registration-v2\` in Windows Explorer and double-click `index.html`.

---

## 2. Top Prototyping Control Bar Features

At the top of the browser window, a persistent control bar provides inspection and presentation tools:

1. **Canvas Viewport Switcher:**
   - **Desktop (1440px):** Full desktop layout with horizontal stepper navigation.
   - **Mobile (390px):** Authentic iPhone-style mobile viewport with bezel, notch, and thumb-friendly touch ergonomics.
   - **Side-by-Side:** Renders both desktop and mobile canvases simultaneously for responsive comparison.
2. **Jump to View Selector:**
   Allows instant navigation to any specific step or sub-step:
   - **General:** 01. Vendor Identity & Ops, 02. Statutory KYC & Docs, 03. Service Offerings
   - **Catering Builder:** 5A. Package Basics & Best For, 5B. Course Hierarchy, 5C. Dish Builder & Photos, 5D. Tier Pricing & Quotas, 5E. Live Counters (Separated), 5F. Extras, Essentials & Cutlery
   - **Dynamic Stall Builder:** 6A. Stall Identity & Specialty, 6B. Menu Format (Fixed/Varied), 6C. Delicacies Catalog, 6D. Pricing & Capacity, 6E. Stall Live & Cutlery
   - **Baina Gifting Builder:** 7A. Studio Story & Best For, 7B. Box Catalog & Sizes, 7C. Packaging Styles
   - **Consolidated Review & Go-Live:** 08. Master Review & Submit, 09. Registration Complete
3. **Demo Scenario Presets:**
   - **Multi-Service Partner (All 3):** Pre-selects Catering, Stall, and Baina demonstrating full sequential multi-branch flow.
   - **Full Feast Caterer:** Pre-selects Catering (5A to 5F).
   - **Specialty Food Stall:** Pre-selects Stall (6A to 6E).
   - **Mithai & Baina Artisan:** Pre-selects Baina (7A to 7C).
4. **`[👁️ Preview Storefront]` Action Button:**
   Opens an interactive modal demonstrating exactly how the onboarded vendor catalog card and booking detail page will appear to customers.

---

## 3. Major UX Enhancements in Version 2

### 3.1 Single Source of Vendor Identity
- Vendor Identity (Legal Trading Name, Owner, Mobile, Email, Kitchen City, State, Service Coverage Cities, Cuisines, Google Reputation) is collected **only once** at Step 1.
- A persistent **Vendor Context Header** appears on all subsequent screens:
  `[ भ ] Royal Awadh Caterers · Lucknow, UP | Catering · Stall · Baina`
- The caterer is **never** re-asked to enter business identity in subsequent steps.

### 3.2 Storefront-First Information Mapping
- Seamlessly integrates storefront customer fields into onboarding:
  - **"Best For" Occasions** (Weddings, Receptions, Engagements, Birthdays, Pujas, Corporate Galas)
  - **Guest Capacity Ranges** (Min Pax / Max Pax)
  - **Culinary Heritage Stories**
  - **Advance Lead Notice Buffers**
  - **FSSAI Dietary Markers** (🟢 Veg / 🔴 Non-Veg)
- Complete 1:1 documentation available in [`STOREFRONT_ONBOARDING_MAPPING.md`](file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor-registration-v2/STOREFRONT_ONBOARDING_MAPPING.md).

### 3.3 Strict Separation of Live Counters and Event Extras
- **5E. Live Counters:** Dedicated selection of platform cooking stations (*Chaat Station, Live Tandoor, Banarasi Paan, Wood-Fired Pizza, Chinese Wok, Live Dosa Bar, Dessert Studio, Mocktail Bar*).
- **5F. Extras, Essentials & Cutlery:** Whole-event services, hospitality crew, and tableware tiers mapped directly to Bhojpatra's 4 official `ServicePackage` tiers (Package A: Disposables, Package B: Ceramic & Steel, Package C: Bone China, Package D: Royal Gold/Silver).

### 3.4 Dynamic Single Stall Builder
- Matching `StallBookingWizard.tsx`:
  - Category Specialty (*Biryani, Chaat, Tandoor & Grills, South Indian, Pizza & Pasta, Chinese Wok*)
  - Menu Format: **Fixed Set Spread** (flat per-plate rate) vs. **Varied Delicacies** (individual item rates)
  - Delicacies Catalog with Veg/Non-Veg indicators, unit prices, descriptions, and photos
  - Live Equipment (charcoal sigdi, inverted ulta tawa) and included eco-cutlery.

### 3.5 Authentic Food & Packaging Photography
- Package Hero Cover photo selector
- Per-dish photo selector in dish builder modal
- Stall counter & food presentation photo
- Baina artisanal gift hamper photography

### 3.6 Single Consolidated Review & Submit (Step 8)
- Replaces redundant intermediate reviews (5F, 6E, 7D) with a single comprehensive master review.
- Displays itemized sub-items (courses, dishes, live counters, extras, cutlery, stall delicacies, baina boxes) with direct `[Edit]` shortcut links back to each builder.

### 3.7 100% Desktop and Mobile Parity
- Every single field and action present on Desktop (1440px) is fully available on Mobile (390px).
- Mobile layout crafted with 44px minimum touch targets, touch-friendly sheets/modals, bottom-fixed action bars, and zero horizontal scroll.

---

## 4. Verification & Testing Checklist

- [x] Version 2 opens cleanly directly in any web browser.
- [x] Desktop canvas (1440px) works flawlessly.
- [x] Mobile canvas (390px) works flawlessly with 44px touch targets.
- [x] Side-by-side mode compares desktop and mobile concurrently.
- [x] Persistent Vendor Context Header displays accurate vendor info on all builder views.
- [x] Service offering toggles dynamically adapt subsequent wizard flows.
- [x] Catering Builder: Package details, courses, dish builder modal, tier quota steppers, live counters, and tableware tiers work reactively.
- [x] Stall Builder: Format picker (fixed vs varied), delicacies catalog modal, pricing, and live equipment work reactively.
- [x] Baina Builder: Studio story, box catalog modal, custom sizes, and packaging styles work reactively.
- [x] Consolidated Review & Submit displays itemized sub-items for all active services with working direct `[Edit]` links.
- [x] Optional Storefront Preview modal renders live catalog card and detail mockup.
- [x] Zero production code modified (`VendorRegister.tsx`, `MenuBuilder.tsx`, etc. remain untouched).
- [x] Version 1 prototype in `/mockups/vendor-registration/` remains completely intact.
