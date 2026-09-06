# Bhojpatra Vendor Registration & Onboarding: Current-State Architectural Audit

**Document Version:** 1.0  
**Date:** September 2026  
**Subject:** Vendor Onboarding, Registration Flow, Service Offerings & Dashboard Integration  
**Deliverable Type:** Current-State Audit & Product Architecture Analysis  
**Repository:** `Sony17/Bhojpatra`

---

## 1. Executive Summary

Bhojpatra is currently redesigning its vendor experience to transform the platform from a one-way listing directory into a modern, full-service catering marketplace and vendor operating system. 

This audit provides an exhaustive investigation of the current vendor registration flow ([`/vendor/register`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/vendor/register/page.tsx)), its underlying data models, schemas, APIs, related UI components ([`VendorRegister.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorRegister.tsx), [`MenuBuilder.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/MenuBuilder.tsx), [`VendorDashboard.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorDashboard.tsx)), and the customer-facing offerings (Full Catering, Single Stall, Baina Boxes, Live Counters, Essential Services).

### Key Findings of the Audit

1. **Severe Architectural Disconnect Between Registration and Menu Construction:**
   - At registration ([`VendorRegister.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorRegister.tsx)), vendors enter high-level packages with free-text comma-separated dishes (`{ name: "Silver Veg Package", dishes: "Paneer Tikka, Dal...", price: "799" }`).
   - When the vendor enters the dashboard ([`MenuBuilder.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/MenuBuilder.tsx)), these registration packages are **completely ignored and discarded**. The vendor is confronted with an entirely separate 3,200-line form requiring dish-by-dish, course-by-course entry, quotas, dietary tags, photos, and tier uplifts from scratch.
2. **Data Leaks & Lost Inputs:**
   - Photo gallery selections made in Step 4 of registration are never uploaded or posted to the backend API (`galleryNames` is stored in React state but excluded from the JSON payload).
   - Serviceable cities (`serviceCities`) and minimum guest capacity (`minGuests`) collected in registration are permanently lost because the live vendor model ([`LiveVendorRecord`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L194-L244)) only supports a single `city` string and `maxCapacity`.
3. **The Onboarding Gatekeeping Bug:**
   - Prospective vendors clicking "Partner With Us" → "As a Vendor" in the site navigation are directed to [`/vendor/register`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/vendor/register/page.tsx), which is wrapped in `<RequireSession role="vendor">`. Unauthenticated visitors are silently bounced to `/login` with zero guidance, creating a major drop-off funnel.
4. **Current 5-Step Wizard vs. Stakeholder Vision:**
   - The current registration wizard consists of 5 long, scrolling steps inside a single form card.
   - The stakeholder's new direction calls for **separate, dedicated pages/views on both mobile and desktop** to eliminate vertical scrolling fatigue, ensure one clear task per view, and introduce an upfront **Service Offering Selection** ("What do you provide?": Catering, Stall, Baina) that dynamically branches into dedicated configuration steps.
5. **Operational Blind Spot in the Dashboard:**
   - Once onboarded and approved, vendors have no orders tab, no incoming booking requests, no financial settlement dashboard, and no calendar availability management. The existing [`/vendor/dashboard`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/vendor/dashboard/page.tsx) is merely a thin shell around the static `MenuBuilder` form.

---

## 2. Current Registration Flow

### 2.1 The End-to-End User Journey (Current State)

```
[Public Website: Header / Navigation]
         │
         ├─► Click "Partner With Us" ──► "As a Vendor" (/vendor/register)
         │     ⚠️ BLOCKER: <RequireSession role="vendor"> bounces signed-out visitor to /login
         │
         ▼
[Authentication: Sign Up (/signup?type=vendor)]
         │
         ├─► Collects: Full Name, Email, Mobile, Password, Confirm Password
         ├─► Creates user in Neon Postgres `users` table (role="vendor", accounts=["customer","vendor"])
         │
         ▼
[Signup Success Screen]
         │
         ├─► Option A: "Go to My Dashboard" (/dashboard) ──► Customer Merged Hub with mock stats ("₹18.4L")
         └─► Option B: "Complete Vendor Registration" ──► /vendor/register
         │
         ▼
[Vendor Registration Wizard (/vendor/register)]
         │ (Pre-authenticated session; email read-only, owner prefilled)
         │
         ├─► Step 1: Business Details (Name, Owner, Phone, City, State, Cuisines, Google Reviews)
         ├─► Step 2: KYC & Documents (GST No, FSSAI No, Upload GST/FSSAI/ID/Proof to /api/vendors/kyc)
         ├─► Step 3: Menu & Pricing (Catering Categories, Packages list, Capacity, Baina Boxes, Essential Rate)
         ├─► Step 4: Photos & Coverage (Gallery file select [BUG: not sent], Service Cities, Counters)
         └─► Step 5: Review & Submit ──► POST /api/vendors/applications
         │
         ▼
[Application Success Screen]
         │
         ├─► Displays generated Vendor ID (e.g. VND-928172)
         ├─► Status: "Pending" verification
         └─► CTA: "Go to Dashboard" (/vendor/dashboard) or WhatsApp Support
         │
         ▼
[Admin Review Queue (/admin/vendor-approvals)]
         │
         ├─► Admin inspects documents via /api/vendors/applications/[id]
         ├─► Admin marks status: "Verified" (or "Rejected")
         └─► Admin assigns marketplace tiers: ["Silver", "Gold", "Platinum"]
         │
         ▼
[Menu Construction in Vendor Dashboard (/vendor/dashboard)]
         │
         ├─► Vendor loads /vendor/dashboard
         ├─► GET /api/vendor/menu returns application data as `prefill`
         ├─► ⚠️ Packages entered at registration are IGNORED
         ├─► Vendor builds full course menu (Starters, Mains, Desserts, Uplifts, Dish Photos)
         └─► Vendor clicks "Publish Menu" ──► PUT /api/vendor/menu (moderation="Pending")
         │
         ▼
[Admin Menu Approval (/admin/menus)]
         │
         ├─► Admin approves menu changes (moderation="Approved")
         └─► Vendor profile and dishes go live on /vendors catalog and /book wizard
```

---

## 3. Step-by-Step Existing UI

The current registration form is implemented as a 5-step client-side wizard in [`src/components/vendor/VendorRegister.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorRegister.tsx) (1,916 lines).

### Step 1: Business Details
- **Step Name:** Business Details (`step === 0`)
- **Purpose:** Capture the legal trading name, verified identity, contact channels, regional presence, and cuisine specialities of the catering enterprise.
- **Visible Fields:**
  1. `businessName` (Text input): Business Name (e.g., "Awadhi Royal Caterers")
  2. `ownerName` (Text input): Owner / Primary Contact Name (Prefilled from session, editable)
  3. `mobile` (Tel input): 10-digit mobile contact number
  4. `email` (Email input): Account Email (Read-only, disabled styling, bound to signed-in account)
  5. `city` ([`ThemedSelect`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ThemedSelect.tsx)): Primary operating city (options drawn from [`cities`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts))
  6. `state` ([`ThemedSelect`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ThemedSelect.tsx)): Operating state (options drawn from [`indianStates`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts))
  7. `cuisines` (Interactive Chip Multi-select + [`CustomAdder`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorRegister.tsx#L107)): Cuisine specialities (Presets: North Indian, South Indian, Chinese, Continental, Mughlai, Punjabi, Bengali, Sweets, Baina Boxes, Chaat, Beverages, Decor + free text)
  8. `googleRating` (Number input, 0–5, step 0.1): Self-declared Google star rating
  9. `googleReviews` (Number input, integer): Self-declared Google review count
- **Required vs Optional:**
  - *Required:* Business Name, Owner Name, Contact Number, City, State, at least 1 Cuisine Speciality.
  - *Optional:* Google Rating, Google Reviews count. Account Email is locked/read-only.
- **Validation Rules:**
  - `!businessName.trim() || !ownerNameValue.trim() || !mobile.trim() || !email.trim()`
  - `!city`
  - `!state`
  - `cuisines.length === 0`
- **Existing Components Used:**
  - [`ThemedSelect`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ThemedSelect.tsx), custom `Chip`, custom `CustomAdder`, [`Button`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Button.tsx).
- **Destination:** Stored in component React state; posted to `POST /api/vendors/applications` on final submit; written to Neon table `vendor_applications`.
- **Dependencies on Previous Steps:** Requires active user session with role `vendor` (from `/signup`).

---

### Step 2: KYC & Documents
- **Step Name:** KYC & Documents (`step === 1`)
- **Purpose:** Collect statutory tax compliance identifiers and verification documents for manual administrative vetting.
- **Visible Fields:**
  1. `doc-gst` (File upload zone): GST Certificate (PDF, JPG, PNG)
  2. `doc-fssai` (File upload zone): FSSAI Food Safety Licence (PDF, JPG, PNG)
  3. `doc-ownerId` (File upload zone): Owner Government ID Proof (Aadhaar, PAN, Passport)
  4. `doc-businessProof` (File upload zone): Business Registration / Shop Act License
  5. `gstNumber` (Text input): 15-character GSTIN number
  6. `fssaiNumber` (Text input): 14-digit FSSAI licence number
  7. Verification notice card: Explains pending verification lifecycle
- **Required vs Optional:**
  - *Required:* GST Number (must pass 15-character regex), FSSAI Number.
  - *Optional / Asynchronous:* File uploads are uploaded immediately upon selection. Validation requires any ongoing upload to finish before proceeding (`status !== 'uploading'`), though blank documents do not hard-block `next()`.
- **Validation Rules:**
  - `!gstNumber.trim()`
  - `!isValidGst(gstNumber)` (Regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`)
  - `!fssaiNumber.trim()`
  - `Object.values(docFiles).some(d => d.status === 'uploading')`
- **Existing Components Used:**
  - Custom dashed dropzone `<label>`, hidden `<input type="file">`, [`Badge`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Badge.tsx), status glyphs (`✓`, `…`, `⬆`).
- **Destination:**
  - Files are uploaded immediately via `POST /api/vendors/kyc` (multipart FormData), stored in Vercel Blob, recorded in Neon Postgres table `kyc_documents`.
  - Returned document IDs (`docIds: { gst, fssai, ownerId, businessProof }`) are saved in state and submitted with application.
- **Dependencies on Previous Steps:** `uploadDoc()` passes `businessName` and `email` from Step 1 in the FormData.

---

### Step 3: Menu & Pricing
- **Step Name:** Menu & Pricing (`step === 2`)
- **Purpose:** Select high-level service offerings, initial menu package templates, operational capacity limits, and conditional offerings (Baina Boxes & Essential Service).
- **Visible Fields:**
  1. `cateringCats` (Button Cards Grid): Multi-select catering categories from [`cateringCategories`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts#L2438-L2479):
     - Full Catering (`full-catering`, 🍲)
     - Single Stall (`single-stall`, 🍢)
     - Live Stall (`live-stall`, 🍳)
     - Baina Box (`baina-box`, 🎁)
     - Essential Service (`essential`, 🍽️)
  2. `packages` (Repeater Card List): Initial menu packages (defaults to 1 package):
     - Package Name (e.g. "Silver Veg Package")
     - Per-Plate Price (₹)
     - Dishes (Free-text comma-separated string, e.g. "Paneer Tikka, Dal Makhani, Veg Biryani, Gulab Jamun")
     - "+ Add Package" button
     - Remove "×" button per package
  3. Capacity Grid (3 numeric inputs):
     - `minGuests`: Minimum guest threshold per booking
     - `maxGuests`: Maximum guest handling limit per event
     - `maxEventsPerDay`: Maximum concurrent/same-day events
  4. **Conditional Baina Box Section** (Rendered ONLY if `cateringCats.includes("baina-box")`):
     - Card repeater for up to 12 boxes
     - Box Photo upload button (uploads directly to `POST /api/vendor/photo?kind=dish`)
     - Box Name (e.g. "Royal Baina Box")
     - ½ kg Box Price (₹)
     - 1 kg Box Price (₹, optional)
     - Custom Sizes Repeater (up to 4 extra sizes): Label (e.g. "250 g", "2 kg") + Price (₹)
     - Box Contents (text, e.g. "Kaju Katli, Motichoor Ladoo, Dry Fruits")
     - "+ Add Box" button (disabled at 12)
  5. **Conditional Essential Service Section** (Rendered ONLY if `cateringCats.includes("essential")`):
     - `essentialRate`: Per-guest rate in ₹ (e.g. ₹40/guest)
     - `essentialIncludes`: Checklist chips from [`ESSENTIAL_SUGGESTIONS`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorRegister.tsx#L58-L59) + `CustomAdder`
- **Required vs Optional:**
  - *Required:* At least 1 catering category selected; at least 1 menu package with both name and per-plate price; all 3 capacity fields (`minGuests`, `maxGuests`, `maxEventsPerDay`).
  - *Conditional Requirements:* If any Baina Box row has a name or contents, it must have a name and ½ kg price > 0. Any custom box size row must have both label and price > 0.
- **Validation Rules:**
  - `cateringCats.length === 0`
  - `packages.length === 0`
  - `packages.some(p => !p.name.trim() || !p.price.trim())`
  - `!minGuests.trim() || !maxGuests.trim() || !maxEventsPerDay.trim()`
  - Baina box validity check (`badBox`, `badSize`)
- **Existing Components Used:**
  - Custom category toggle buttons, package card repeater, capacity grid, nested box photo uploader, custom size adder, `Chip`, `CustomAdder`, [`Button`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Button.tsx).
- **Destination:** Submitted as part of `VendorApplicationRecord` in `POST /api/vendors/applications`.
- **Dependencies on Previous Steps:** None directly, but conditional UI depends on `cateringCats` selection within this step.

---

### Step 4: Photos & Coverage
- **Step Name:** Photos & Coverage (`step === 3`)
- **Purpose:** Select showcase event photos, declare serviceable geographical cities, and toggle offered live food counters.
- **Visible Fields:**
  1. `gallery` (Multiple file input): Food and event photo selector
  2. Selected file tags: Chips showing selected file names
  3. `serviceCities` (Interactive Chip Multi-select + `CustomAdder`): Serviceable cities (presets from `cities` + custom input)
  4. `counters` (Interactive Chip Multi-select + `CustomAdder`): Add-on counter offerings (presets from `registrationCounters` / `vendorOfferings` + custom input)
- **Required vs Optional:**
  - *Required:* At least 1 serviceable city.
  - *Optional:* Photo gallery, add-on live counters.
- **Validation Rules:**
  - `serviceCities.length === 0`
- **Existing Components Used:**
  - Dashed file selector, file pills, `Chip`, `CustomAdder`, [`Button`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Button.tsx).
- **Destination:**
  - `serviceCities` and `counters` are posted in payload to `POST /api/vendors/applications`.
  - **CRITICAL BUG IDENTIFIED:** `galleryNames` is stored in React state, but **never uploaded to Blob and never included in the JSON payload** in `handleSubmit()`. Photos selected here are completely lost!
- **Dependencies on Previous Steps:** None.

---

### Step 5: Review & Submit
- **Step Name:** Review (`step === 4`)
- **Purpose:** Full visual inspection of all collected business, legal, menu, capacity, and coverage parameters prior to non-reversible application dispatch.
- **Visible Fields:**
  - Definition list (`<dl>`) displaying:
    - Business Name
    - City / State
    - Cuisine Specialities
    - Catering Categories
    - Baina Boxes summary (if applicable)
    - Essential Service summary (if applicable)
    - Menu Packages count
    - Capacity range (`minGuests–maxGuests guests · maxEventsPerDay events/day`)
    - Serviceable Cities list
    - Add-On Counters list
    - Google Reviews reputation (if entered)
  - Submission disclaimer explaining administrative verification queue.
  - "Submit Application" primary button.
- **Required vs Optional:** All required fields validated prior to enabling submission.
- **Validation Rules:** Executes `validateStep()` covering all prior rules before setting `submitting = true`.
- **Destination:** Sends full payload to `POST /api/vendors/applications`.
- **Success Screen:** Replaces form with confirmation panel displaying minted `Vendor ID` (e.g. `VND-849201`), pending status message, button to `/vendor/dashboard`, and WhatsApp support link.

---

## 4. Existing Vendor Data & Functionality

The Bhojpatra codebase stores vendor information across several specialized stores and database tables (persisted in Neon Postgres via `jsonb` records):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Neon Postgres Tables                            │
├───────────────────────┬────────────────────────────────────────────────┤
│ Table Name            │ Primary Purpose                                │
├───────────────────────┼────────────────────────────────────────────────┤
│ `vendor_applications` │ Initial onboarding submissions & KYC records   │
│ `vendors`             │ Live public vendor profiles & published menus  │
│ `kyc_documents`       │ KYC file metadata & Blob storage links         │
│ `vendor_photos`       │ Dish and gallery photo metadata & Blob links   │
│ `users`               │ Authentication credentials & role mappings     │
│ `bookings`            │ Customer orders referencing vendor assignments │
│ `settlements`         │ Financial payout records derived from orders   │
└───────────────────────┴────────────────────────────────────────────────┘
```

### 4.1 Schema Comparison: Application vs. Live Vendor Profile

| Field Category | Registration Application ([`VendorApplicationRecord`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorApplications.ts#L36-L86)) | Live Vendor Catalog ([`LiveVendorRecord`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L194-L244)) | Data Pipeline Status |
|---|---|---|---|
| **ID** | `VND-XXXXXX` | `VEN-XXXXXXXX` | Mismatched ID namespaces |
| **Owner Auth ID** | Absent (only email captured) | `ownerUserId` | Re-linked via login session |
| **Owner Name** | `owner` (string) | **Missing** | Lost after registration |
| **Phone Number** | `phone` (normalized string) | **Missing** | Lost after registration |
| **Business Name** | `business` | `business` | Retained |
| **City** | `city` (string) | `city` (string) | Retained |
| **State** | `state` (string) | `state` (string) | Retained |
| **Service Cities** | `serviceCities` (string[]) | **Missing** | **Permanently dropped** |
| **Cuisines** | `cuisines` (string[]) | `cuisines` (string[]) | Retained |
| **GST Number** | `gstNumber` (string) | **Missing** | Kept in application only |
| **FSSAI Number** | `fssaiNumber` (string) | **Missing** | Kept in application only |
| **KYC Documents** | `documents` (array with blob IDs) | **Missing** | Kept in application only |
| **Google Rating** | `googleRating`, `googleReviews` | `googleRating`, `googleReviews` | Prefilled into menu API |
| **Min Guests** | `minGuests` (string) | **Missing** | **Permanently dropped** |
| **Max Capacity** | `maxGuests` (string) | `maxCapacity` (number) | Transferred |
| **Max Events/Day** | `maxEventsPerDay` (string) | `maxEventsPerDay` (number) | Transferred |
| **Categories** | `cateringCategories` (string[]) | `serviceCategories` (string[]) | Retained |
| **Menu Packages** | `packages` (`{name, dishes, price}`) | **Missing** | **Discarded by MenuBuilder** |
| **Detailed Menu** | **Missing** | `menu` ([`VendorMenuSection[]`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L79-L108)) | Must be re-created in builder |
| **Live Counters** | `counters` (string[]) | `counters` ([`VendorCounter[]`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L163-L182)) | Only names prefilled |
| **Baina Boxes** | `bainaBoxes` ([`VendorBainaBox[]`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L135-L147)) | `bainaBoxes` ([`VendorBainaBox[]`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L135-L147)) | Retained |
| **Essential Service**| `essentialService` | `essentialService` | Retained |
| **Signature Dishes**| **Missing** | `featured` (4 dish names) | Builder only |

---

## 5. Existing Catering Functionality (Full Catering / Feast)

Full Catering represents Bhojpatra's flagship multi-course event offering.

### 5.1 Platform Tiers & Pricing Bands
- **Tier Structure:**
  - `Silver`: < ₹1,000 / plate
  - `Gold`: ₹1,000 – ₹1,499 / plate
  - `Platinum`: ₹1,500+ / plate
- **Automatic vs Explicit Assignment:**
  - In registration, `deriveTiers(packages)` inspects package prices and infers tiers automatically.
  - In Admin Approvals ([`/admin/vendor-approvals`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/vendors/applications/%5Bid%5D/route.ts#L54-L63)), an administrator explicitly assigns or overrides the approved tiers (`assignedTiers`).
  - In [`MenuBuilder.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/MenuBuilder.tsx), the vendor can check/uncheck their active tiers.

### 5.2 Menu Courses Architecture
In [`src/lib/data.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts), the platform defines standard courses (`menuCategories`):
1. Welcome Drinks (`welcome`)
2. Starters (`starters`)
3. Main Course (`main`)
4. Breads & Rice (`breads-rice`)
5. Desserts (`desserts`)
6. Accompaniments (`accompaniments`)
7. Beverages (`beverages`)
8. Chaat Counter (`chaat`)
9. Live Counters (`live`)

### 5.3 Advanced Course Configurations in `MenuBuilder.tsx`
- **Course Uplift:** `perPlate` (₹) added to base plate price for that course.
- **Tier-Specific Quotas (`tierItems`):** The vendor specifies how many dishes a customer may choose on each tier (e.g. Silver gets 2 starters, Gold gets 4, Platinum gets 6).
- **Tier-Specific Uplifts (`tierPerPlate`):** Allows different per-plate course pricing per tier.
- **Dish-Level Tier Restrictions (`tiers`):** A vendor can restrict individual premium dishes (e.g. "Galouti Kebab") to Platinum-only so they cannot be picked on cheaper packages.
- **Dietary Flags:** Every dish item mandates `diet: "veg" | "non-veg"`.
- **Signature Dishes:** Vendor selects exactly 4 dishes (`featured`) to display on their catalog card.

---

## 6. Existing Stall Functionality (Single Stall)

The "Single Stall" offering represents a dedicated food station provided by a single vendor brand (e.g. a specialized Biryani stall, Chaat stall, or Dosa station).

### 6.1 Data Model & Architecture
- **Catalog Representation:** Catalog listings have `cateringCategories: ["single-stall"]` or derive it if they serve meal types.
- **Customer Flow:** Handled via `/book?package=custom` and managed in session storage via [`src/lib/stallDraft.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/stallDraft.ts) (`StallDraft`).
- **Menu Configurations (`SingleStallMenuType`):**
  1. `fixed` (Platform Default): The stall serves its entire published dish spread. The customer does not pick individual dishes; the stall bills at the section's flat `perPlate` rate.
  2. `varied`: A build-your-own model where the customer selects specific delicacies and pays each dish's individual `dish.price`.

### 6.2 Current State in Registration vs. Dashboard
- **In Registration ([`VendorRegister.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorRegister.tsx)):** Only an icon card button (`single-stall`). No stall menu configuration, no menu type selection, and no stall pricing fields exist.
- **In Dashboard ([`MenuBuilder.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/MenuBuilder.tsx)):** Each course section contains an accordion setting for Single Stall (`menuType`: "Fixed Spread" vs "Customer Picks Delicacies") and each dish has a conditional per-delicacy price input (`price?: number`).

---

## 7. Existing Baina Functionality (Baina Boxes)

Baina Boxes are gifting and sweet hampers traditionally distributed during weddings and religious functions.

### 7.1 Data Structure ([`VendorBainaBox`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L135-L147))
```typescript
interface VendorBainaBox {
  name: string;              // e.g. "Royal Dry Fruit & Kaju Box"
  contents: string;          // e.g. "Kaju Katli, Pista Roll, Roasted Almonds"
  price: number;             // Base price for ½ kg box (₹)
  price1kg?: number;         // Optional price for 1 kg box (₹)
  customSizes?: {            // Up to 4 custom sizes
    label: string;           // e.g. "250 g", "2 kg"
    price: number;           // Price in ₹
  }[];
  photo?: string;            // Vercel Blob URL from /api/vendor/photo
}
```

### 7.2 Customer-Facing Integration
- When a customer visits `/baina-box/[slug]`, the function `bainaProductsFromVendorBoxes()` ([`src/lib/bainaBoxData.ts:240`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/bainaBoxData.ts#L240)) automatically unpacks each box into distinct orderable items for every size variant (`½ kg`, `1 kg`, `custom`), complete with photos and descriptions, directly into the cart system ([`src/lib/bainaCart.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/bainaCart.ts)).
- **Registration Status:** Fully functional. When `baina-box` is checked in Step 3 of `VendorRegister.tsx`, the inline box builder collects photos, sizes, prices, and contents. This data successfully transfers into `vendor_applications` and prefills `MenuBuilder.tsx`.

---

## 8. Existing Live Counter / Essential Service Functionality

### 8.1 Live Counters
- **Platform Vocabulary:** 11 live food/beverage stations defined in [`addOns`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts#L1079-L1094):
  - Pan Counter (`pan`, ₹40/plate)
  - Chaat Station (`chaat`, ₹60/plate)
  - Live Counters (`live`, ₹90/plate)
  - Pizza Counter (`pizza`, ₹120/plate)
  - Momo Counter (`momo`, ₹70/plate)
  - Chinese Wok (`noodle`, ₹85/plate)
  - Waffle & Pancake Bar (`waffle`, ₹80/plate)
  - Dessert Counter (`dessert`, ₹70/plate)
  - Hi-tea (`hi-tea`, ₹75/plate)
  - Coffee & Chai Bar (`coffee`, ₹45/plate)
  - Mocktail & Juice Bar (`mocktail`, ₹65/plate)
- **Current Registration State:** Vendors only select simple label chips in Step 4.
- **Dashboard State:** In `MenuBuilder.tsx`, vendors can customize pricing (`price`), filter which sub-items from `addOnMenus` they cook, add up to 12 custom extra items (`extras: { name, diet }`), and pause counter availability (`hidden: true`).

### 8.2 Essential Services
- **Platform Vocabulary:** 3 event infrastructure services:
  - Service Staff (`staff`, ₹8,000 flat)
  - Premium Tableware (`tableware`, ₹25/plate)
  - Decoration (`decor`, ₹35,000 flat)
- **Vendor Essential Service Package ([`VendorEssentialService`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts#L152-L157)):**
  - Allows caterers to offer crew and buffet equipment at their own per-guest rate (`perGuest`).
  - Includes a checklist of items (`includes: string[]`), prefilled from platform suggestions with custom item additions.
  - Fully collected in Step 3 of `VendorRegister.tsx` and prefilled in `MenuBuilder.tsx`.

---

## 9. Current MenuBuilder Relationship

The relationship between the registration flow and [`MenuBuilder.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/MenuBuilder.tsx) is currently the most problematic friction point in the vendor lifecycle.

```
[Vendor Registration Step 3]
Collects:
  packages: [
    { name: "Silver Veg", price: "799", dishes: "Paneer, Dal, Rice, Sweet" }
  ]
       │
       ▼ (POST /api/vendors/applications)
Stored in `vendor_applications` table
       │
       ▼ (GET /api/vendor/menu)
Prefill loads into `MenuBuilder.tsx`:
  prefill = {
    business, city, cuisines, about,
    counters, serviceCategories, bainaBoxes, essentialService
  }
       │
       ▼
❌ `packages` IS NEVER INCLUDED IN PREFILL
❌ Vendor arrives at dashboard with ZERO courses and ZERO dishes
❌ Must re-type every dish, set up courses, configure quotas manually
```

### Key MenuBuilder Pain Points
1. **Redundant Workload:** Caterers feel deceived that the packages they entered during registration vanished upon entering the dashboard.
2. **Extreme Cognitive Load:** `MenuBuilder.tsx` is a monolithic 3,206-line single view requiring hundreds of inputs across 9 courses, uplifts, quotas, delicacy prices, and photo uploads.
3. **No Progressive Disclosure:** Every option is visible simultaneously, causing high mobile drop-off.
4. **Moderation Lock:** Every save on an active menu automatically sets `moderation = 'Pending'`, removing the vendor from public search until an admin manually re-approves.

---

## 10. Current Vendor Dashboard Relationship

### 10.1 What `/vendor/dashboard` Actually Is Today
Currently, [`src/app/vendor/dashboard/page.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/vendor/dashboard/page.tsx) renders [`VendorDashboard.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/VendorDashboard.tsx) (136 lines). It contains:
1. A top header card showing business name, verification badge (`Verified` / `Pending verification`), and assigned tier pills.
2. A promotional banner ([`BainaBoxSpecial`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/BainaBoxSpecial.tsx)).
3. The monolithic `MenuBuilder` component.

It is **solely a menu configuration screen**. It contains no order intake, no calendar, no payouts, and no operational controls.

### 10.2 What Sony's Proposed Dashboard Needs to Display
Based on [`mockups/vendor_dashboard.html`](file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor_dashboard.html) and [`VENDOR_DASHBOARD_REQUIREMENTS.md`](file:///c:/Users/Zeeshaan/Bhojpatra/VENDOR_DASHBOARD_REQUIREMENTS.md), the target vendor dashboard is a multi-tab business management portal:

```
PROPOSED VENDOR DASHBOARD ARCHITECTURE
├── 1. Overview (Dashboard Home)
│   ├── Operational Status Banner (Verified / Live on Marketplace / Tier Badges)
│   ├── Urgent Action Alert (e.g. "1 new booking requires confirmation in 24h")
│   ├── Next Upcoming Event Spotlight (Date, Time, Occasion, City, Pax, Prep Sheet CTA)
│   ├── Metrics Grid (Upcoming Bookings, Total Fulfilled, Average Rating, Pending Payout)
│   ├── Upcoming Bookings Feed (Upcoming events list with date badges)
│   └── Profile & Menu Health (Completeness tracker, KYC status, quick checklist)
│
├── 2. Orders & Bookings (/vendor/orders)
│   ├── Order Intake Pipeline (Incoming requests, Confirmed, Fulfilled, Cancelled)
│   └── Order Detail Sheet (Customer name, phone, pax, exact course dishes, custom notes)
│
├── 3. Event Calendar & Availability (/vendor/calendar)
│   ├── Monthly calendar with event tags
│   ├── Date blackout tool (Mark kitchen fully booked)
│   └── Daily event capacity counter (vs maxEventsPerDay)
│
├── 4. Menu & Food (/vendor/menu)
│   ├── Course & Dish catalog editor (Modularized MenuBuilder)
│   ├── Offering managers (Catering Feast, Single Stall, Live Counters, Baina Boxes)
│   └── Signature dish selector
│
├── 5. Finances & Settlements (/vendor/finances)
│   ├── Outstanding balance, completed payouts, per-order financial breakdown
│   └── Bank account & UPI payout settings
│
├── 6. Reviews & Reputation (/vendor/reviews)
│   └── Itemized customer ratings, review feed, dish feedback
│
└── 7. Profile & KYC (/vendor/profile)
    ├── Business bio, service cities, gallery management
    └── KYC document compliance drawer (resubmit rejected docs)
```

---

## 11. Current APIs & Data Flow

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             Current API Architecture                             │
├──────────────────────────────┬────────┬───────────┬──────────────────────────────┤
│ Endpoint                     │ Method │ Auth Role │ Function                     │
├──────────────────────────────┼────────┼───────────┼──────────────────────────────┤
│ `/api/auth/signup`           │ POST   │ Public    │ Creates user in `users`      │
│ `/api/vendors/kyc`           │ POST   │ Public/Vnd│ Uploads document to Blob     │
│ `/api/vendor/photo`          │ POST   │ Vendor    │ Uploads dish/box/gallery img │
│ `/api/vendors/applications`  │ POST   │ Public/Vnd│ Submits onboarding app       │
│ `/api/vendors/applications`  │ GET    │ Admin     │ Lists pending applications   │
│ `/api/vendors/applications/id│ PATCH  │ Admin     │ Verifies KYC & assigns tiers │
│ `/api/vendor/menu`           │ GET    │ Vendor    │ Loads profile or prefill     │
│ `/api/vendor/menu`           │ PUT    │ Vendor    │ Upserts live vendor record   │
│ `/api/bookings/mine`         │ GET    │ Customer  │ Customer orders only         │
│ `/api/settlements`           │ GET    │ Admin     │ Admin settlement reports     │
└──────────────────────────────┴────────┴───────────┴──────────────────────────────┘
```

---

## 12. What Can Be Reused

1. **Design Tokens & System Components:**
   - 4-Color Bhojpatra palette strictly defined in [`mockups/vendor_dashboard.html`](file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor_dashboard.html) and [`globals.css`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/globals.css): Maroon/Red (`#B92025`), Cream (`#F0D09E`), Black (`#000000`), White (`#FFFFFF`).
   - Reusable UI primitives: [`Button`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Button.tsx), [`Card`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Card.tsx), [`Badge`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Badge.tsx), [`Chip`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/Chip.tsx), [`ThemedSelect`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ThemedSelect.tsx).
2. **KYC & Photo Upload Services:**
   - [`POST /api/vendors/kyc`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/vendors/kyc/route.ts) for secure PDF/image document uploads to Vercel Blob.
   - [`POST /api/vendor/photo`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/vendor/photo/route.ts) for dish, Baina box, and gallery uploads.
3. **Data Vocabularies & Helper Constants:**
   - Geographic lists: [`cities`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts), [`indianStates`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts).
   - Offering lists: [`cateringCategories`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts), [`vendorOfferings`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts), [`addOnMenus`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts), [`registrationCuisines`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts).
4. **Validation Logic:**
   - GST validation ([`isValidGst`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/validate.ts)).
   - Data sanitizers in [`src/lib/vendorMenus.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts): `cleanBainaBoxes()`, `cleanEssentialService()`, `cleanCateringCategories()`.
5. **Database Models & Persistence Layers:**
   - Neon Postgres stores for `vendor_applications`, `vendors`, `kyc_documents`, `vendor_photos`.

---

## 13. What Needs UX Restructuring

1. **Eliminate Step Bloat & Vertical Scrolling (Stakeholder Requirement):**
   - The current 5 steps must be broken down so that **each registration step is a separate page/view on BOTH mobile and desktop**.
   - No view should require excessive scrolling. One clear task per page.
2. **Move Service Offering Selection Upfront:**
   - Introduce an explicit **"What do you provide?"** screen early in the flow where the vendor selects their service branches:
     - 🍲 **Catering** (Full multi-course feasts)
     - 🍢 **Stall** (Single stall / food station)
     - 🎁 **Baina** (Sweet and gifting boxes)
   - Do not display Baina Box or Stall form inputs if the vendor does not provide them.
3. **Branching Configuration:**
   - Based on the initial selection, the wizard must route the vendor through the relevant detailed configuration screens (e.g. Catering setup, Stall setup, or Baina setup) before review.
4. **Fix Registration Access Guard:**
   - Remove `<RequireSession role="vendor">` from blocking `/vendor/register`. Allow prospective vendors to start registration directly, collecting credentials either on Step 1 or linking auth smoothly.
5. **Bridge Registration Menu Directly to Live Profile:**
   - Replace the arbitrary `packages` text input with structured course/offering records that seamlessly populate the vendor's profile upon approval, eliminating the need to start over in `MenuBuilder`.

---

## 14. What Is Actually New (Needs to be Built)

1. **Step Engine & State Machine:**
   - A modular, step-by-step wizard supporting discrete pages/routes (e.g. `/vendor/register/details`, `/vendor/register/kyc`, `/vendor/register/services`, `/vendor/register/configure/[service]`, `/vendor/register/review`).
2. **Upfront Service Offering Selection Screen:**
   - High-impact selection UI presenting Catering, Stall, and Baina with rich descriptions and visual iconography.
3. **Dedicated Configuration Flow for Catering:**
   - Clean, lightweight per-plate package and course selection designed specifically for quick onboarding.
4. **Dedicated Configuration Flow for Single Stall:**
   - Dedicated configuration for stall menu type (`fixed` vs `varied`), per-plate/dish pricing, and signature stall delicacies.
5. **Dedicated Configuration Flow for Baina Boxes:**
   - Clean box creation screen focusing on box name, sizes, photo, and contents.
6. **Gallery Upload Pipeline at Registration:**
   - Proper wiring of file uploads to `/api/vendor/photo` during registration so event photos are actually saved.
7. **Vendor Operational APIs (for Dashboard):**
   - `GET /api/vendor/bookings` (query vendor's assigned orders from `bookings` table).
   - `PATCH /api/vendor/bookings/[id]` (operational acknowledgment states: Acknowledged, In Prep, Ready).
   - Vendor blackout dates/calendar persistence store.
   - Vendor bank account and UPI payout details store.

---

## 15. Gaps / Missing Functionality

1. **Missing Booking Access for Vendors:** Bookings are recorded in the `bookings` table, but vendors have no API or UI to view orders assigned to them.
2. **Missing Payout Data Model:** The database contains no fields or tables to store a vendor's Bank Account number, IFSC code, or UPI ID.
3. **Dropped Registration Fields:** `serviceCities`, `minGuests`, `owner`, and `phone` are discarded when transitioning from `vendor_applications` to `LiveVendorRecord`.
4. **Unsaved Registration Gallery:** Step 4 gallery file inputs do not trigger uploads and are omitted from the submission payload.
5. **Unguarded Dashboard Route:** [`src/app/vendor/dashboard/page.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/vendor/dashboard/page.tsx) lacks an auth guard, while `/vendor/register` is over-guarded.

---

## 16. Ambiguities Requiring Product Decision from Sony

The following product and business logic questions must be clarified with the stakeholder (Sony) before finalizing the interactive HTML prototype:

1. **Multi-Selection vs Single-Selection in Service Offerings:**
   - *Question:* Can a vendor choose **multiple** service offerings (e.g., both Full Catering AND Baina Boxes, or Stall AND Catering), or must they choose exactly one primary business model during initial registration?
   - *Impact on Flow:* Multi-select requires sequential configuration sub-steps for each chosen offering; single-select routes directly to a single configuration step.
2. **Depth of Menu Configuration at Onboarding:**
   - *Question:* How detailed should the initial menu configuration be during onboarding?
     - *Option A (Lightweight Onboarding):* Vendor enters package names, starting price, and dietary types. Detailed course-by-course dish rosters are configured later in the dashboard.
     - *Option B (Full Menu at Registration):* Vendor enters all individual dishes and courses during registration before their application is submitted.
     - *Option C (Curated Templates):* Vendor picks a standard regional template (e.g., "Classic Awadhi Feast") and modifies plate prices.
3. **Account Creation Timing:**
   - *Question:* Should vendor account creation (password and email authentication) happen **before** starting the registration wizard, as Step 1 of the wizard, or at the **very end** when reviewing and submitting?
   - *Impact on Drop-off:* Capturing auth upfront allows draft saving; capturing at the end reduces initial registration friction.
4. **KYC Document Strictness:**
   - *Question:* Are document file uploads (GST certificate, FSSAI licence) mandatory to complete registration, or can vendors enter their GST/FSSAI numbers first and upload document files later from the dashboard?
5. **Single Stall Service Scope:**
   - *Question:* How should a "Stall" be configured at registration? Is it treated as a single signature dish category (e.g., "Chaat Counter" or "Biryani Corner") with a set menu, or does it require selecting custom courses?
6. **Multi-City Coverage Indexing:**
   - *Question:* Vendors currently select multiple "Serviceable Cities" during registration, but the public catalog only filters on a single vendor `city`. Should the search engine index all serviceable cities for discovery?
7. **Payout Details Collection:**
   - *Question:* Should bank account and UPI details be collected during onboarding (under KYC), or post-approval inside the vendor dashboard?

---

## 17. Proposed Mapping: Current Flow → Stakeholder Flow

The table below provides a complete cross-reference showing how existing components, fields, and capabilities will map into the stakeholder's intended architecture:

| Current Functionality / Field | Current Code Location | Stakeholder Target Location | Reuse / Modify / New | Notes & Architectural Rationale |
|---|---|---|---|---|
| **Vendor Sign Up / Auth** | [`src/app/(auth)/signup`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/%28auth%29/signup/page.tsx) | Step 1 / Pre-Registration | **Modify** | Remove redirect gate from `/vendor/register`; allow smooth inline account creation. |
| **Business Name & Contact** | `VendorRegister.tsx` (Step 1) | Registration: Vendor Details | **Reuse** | Clean input form; keep business name, owner name, phone, city, state. |
| **Cuisine Specialities** | `VendorRegister.tsx` (Step 1) | Registration: Vendor Details | **Reuse** | Retain chip multi-select + `CustomAdder` pattern. |
| **Google Reviews Import** | `VendorRegister.tsx` (Step 1) | Registration: Vendor Details | **Reuse** | Retain optional Google rating & review count for new vendor reputation badge. |
| **GST & FSSAI Numbers** | `VendorRegister.tsx` (Step 2) | Registration: Basic Info & KYC | **Reuse** | Retain `isValidGst` 15-char regex and normalization. |
| **KYC Document Uploads** | `VendorRegister.tsx` (Step 2) | Registration: Basic Info & KYC | **Reuse API / Modify UI** | Reuse `POST /api/vendors/kyc`. Redesign into clean single-task card with clear upload progress. |
| **Catering Category Pick** | `VendorRegister.tsx` (Step 3) | Registration: Service Offering Selection | **Modify (Promote)** | **Major change:** Elevate upfront into primary branching question: "What do you provide?" (Catering, Stall, Baina). |
| **Feast Package Configuration** | `VendorRegister.tsx` (Step 3) | Registration: Catering Configuration | **Modify** | Replace free-text dishes with structured tier/package setup compatible with `LiveVendorRecord`. |
| **Single Stall Configuration** | `MenuBuilder.tsx` (nested) | Registration: Stall Configuration | **New in Reg (From Builder)** | Extract stall setup (`fixed` spread vs `varied` delicacy) into a dedicated onboarding view. |
| **Baina Box Configuration** | `VendorRegister.tsx` (Step 3) | Registration: Baina Configuration | **Modify** | Retain box data model, photo upload, ½ kg / 1 kg / custom sizes, but make it a dedicated page. |
| **Live Counters & Extras** | `VendorRegister.tsx` (Step 4) | Optional Add-on Step or Dashboard | **Modify** | Provide clean toggle chips; defer granular extra dish configuration to dashboard. |
| **Essential Service Offer** | `VendorRegister.tsx` (Step 3) | Optional Add-on Step or Dashboard | **Modify** | Retain per-guest rate and inclusion checklist if service is selected. |
| **Photo Gallery Uploads** | `VendorRegister.tsx` (Step 4) | Registration: Media & Photos | **Modify / Fix** | Fix bug: wire files to `POST /api/vendor/photo?kind=gallery` so photos are genuinely persisted. |
| **Serviceable Cities** | `VendorRegister.tsx` (Step 4) | Registration: Coverage | **Modify** | Retain multi-city chips; update `LiveVendorRecord` schema so cities aren't lost. |
| **Registration Review** | `VendorRegister.tsx` (Step 5) | Registration: Review & Submit | **Modify** | Update review summary to reflect branched offerings and package structures. |
| **Submission Confirmation** | `VendorRegister.tsx` (Success) | Post-Submit Screen | **Reuse** | Display generated Vendor ID, next steps, and direct dashboard access link. |
| **Admin Review Queue** | [`src/app/admin/vendor-approvals`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/vendors/applications/route.ts) | Admin Console | **Reuse** | Retain document verification and tier assignment workflow. |
| **Vendor Operational Dashboard** | **Completely Missing** | Future Vendor Dashboard Home | **New** | Implement operational status banner, urgent booking alerts, and hero event card from mockup. |
| **Order Intake & Prep Sheet** | **Completely Missing** | Dashboard: Orders Tab | **New** | Implement vendor order query endpoint and order breakdown view. |
| **Kitchen Availability Calendar**| **Completely Missing** | Dashboard: Calendar Tab | **New** | Implement date blackout toggle and daily event capacity tracker. |
| **Menu & Food Catalog** | `MenuBuilder.tsx` (3,200 lines) | Dashboard: Menu & Food Tab | **Modify (Modularize)** | Break monolithic form into modular sub-tabs (Courses, Stalls, Baina, Add-ons). |
| **Earnings & Settlements** | **Completely Missing** | Dashboard: Finances Tab | **New** | Surface settlement statements and capture bank account / UPI payout information. |

---

## 18. Architectural Summary & Action Plan

### Summary of Current State
- **What Already Exists:**
  - Robust database schema in Neon Postgres for applications, live vendors, KYC documents, and photo storage.
  - Functional asynchronous document and photo upload pipelines (`/api/vendors/kyc`, `/api/vendor/photo`).
  - Comprehensive data vocabularies for catering categories, live counters, service packages, and cuisines.
  - Functional Baina box data models and ordering logic.
  - Complete visual design system and high-fidelity desktop/mobile mockup ([`mockups/vendor_dashboard.html`](file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor_dashboard.html)).
- **What Needs Restructuring:**
  - The monolithic 5-step registration form must be broken into discrete, single-task pages/views on both mobile and desktop.
  - Service Offering Selection ("What do you provide?") must happen upfront, driving conditional branching into dedicated configuration views.
  - The registration data pipeline must be harmonized with `LiveVendorRecord` so menu configurations transfer cleanly into the vendor dashboard without manual re-entry.
  - Authentication flow must be adjusted to allow prospective vendors to enter registration without being blocked by `/login`.
- **What Needs to Be Newly Built:**
  - Step-by-step registration prototype with separate pages/views for mobile and desktop.
  - Dedicated configuration pages for Catering, Stall, and Baina offerings.
  - Operational vendor dashboard endpoints for bookings, order acknowledgment, calendar blackout dates, and payout details.
- **Decisions Needed from Sony Before Designing the Final Prototype:**
  1. Multi-select vs single-select service offerings at registration.
  2. Level of menu detail required during onboarding (lightweight packages vs full dish rosters).
  3. Timing of credential/account creation.
  4. Mandatory vs optional KYC uploads at initial submission.
  5. Single Stall configuration parameters.
  6. Multi-city search indexing rules.
  7. Timing of payout (Bank/UPI) collection.
