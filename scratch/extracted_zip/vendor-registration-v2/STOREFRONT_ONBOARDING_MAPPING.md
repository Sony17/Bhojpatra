# Bhojpatra Storefront → Onboarding Information Mapping

This document provides a comprehensive 1:1 mapping between all customer-facing information displayed across the Bhojpatra storefront (`VendorCatalog`, `VendorDetail`, `MenuBuilder`, `StallBookingWizard`, `BainaBoxDetail`, `ServicePackages`, `Packages`, `data.ts`) and where each piece of information is captured during the revised Version 2 Vendor Onboarding workflow.

## Core Principle: Take Information Only Once
Vendor-level identity is gathered once at the start of onboarding and persistently referenced across all service builders and storefront previews. Service-specific configurations only capture the genuine offerings that make up the customer's booking experience.

---

## 1. Master Information Mapping Table

| Storefront Information | Existing Source in Bhojpatra Codebase | Captured During Onboarding? | Where in Onboarding Flow | Notes & Storefront Usage |
|---|---|---|---|---|
| **Business / Brand Name** | `LiveVendorRecord.business`, `VendorListing.name` | **Yes** (Collected Once) | Step 1: Vendor Identity (`d-biz-name`) | Displayed as the primary brand title on catalog cards, feast pages, stall headers, and search results. |
| **Owner / Legal Contact** | `LiveVendorRecord.ownerUserId`, `vendorApplications.ts` | **Yes** (Collected Once) | Step 1: Vendor Identity (`d-owner-name`, `d-phone`) | Used for KYC, WhatsApp booking alerts, concierges, and legal vendor verification. |
| **Kitchen City & State** | `LiveVendorRecord.city`, `LiveVendorRecord.state` | **Yes** (Collected Once) | Step 1: Vendor Identity (`d-city`, `d-state`) | Used for geo-filtering, "Near you" catalog lens, and delivery logistics. |
| **Service Coverage Cities** | `LiveVendorRecord.serviceCities`, `VendorRegister.tsx` | **Yes** (Collected Once) | Step 1: Operations & Coverage (`d-coverage-cities`) | Determines in which city catalogs the caterer appears. |
| **Primary Cuisines** | `VendorListing.cuisines`, `LiveVendorRecord.cuisines` | **Yes** (Collected Once) | Step 1: Vendor Identity (`cuisines` chips) | Displayed on catalog cards (`cuisines.slice(0, 3).join(" · ")`) and catalog cuisine filters. |
| **Google Rating & Reviews** | `LiveVendorRecord.googleRating`, `googleReviews` | **Yes** (Collected Once) | Step 1: Vendor Identity (`d-google-rating`, `d-google-reviews`) | Displayed on catalog cards as a trust badge until native Bhojpatra reviews accrue. |
| **Verified Partner Badge** | `VendorListing.verified`, `LiveVendorRecord.verified` | **Parked for Future** | Step 3: Statutory KYC (GST & FSSAI upload) | Computed trust marker (Badges such as Verified, Heritage, and City Icon are strictly parked for future scope). |
| **Service Categories Offered** | `LiveVendorRecord.serviceCategories`, `cateringCategories` | **Yes** (Collected Once) | Step 4: Service Selection (`catering`, `stall`, `baina`) | Drives the catalog category lenses (`full-catering`, `single-stall`, `baina-box`). |
| **Package / Feast Name** | `packages[].name`, `PackageTier.name` | **Yes** | Catering: 5A. Package Basics (`cat-pkg-name`) | The commercial name of the feast package (e.g. *"Royal Awadh Wedding Feast"*). |
| **Feast Culinary Description** | `LiveVendorRecord.about`, `VendorListing.about` | **Yes** | Catering: 5A. Package Basics (`cat-pkg-desc`) | Displayed in the "About the Caterer & Feast" section on the vendor detail page. |
| **Best For (Occasions)** | `PackageTier.bestFor`, `servicePackages.bestFor` | **Yes** | Catering: 5A (`cat-best-for` chips) | Rendered as "Perfect for: Weddings · Receptions · Engagements" on the package card. |
| **Guest Capacity (Min/Max Pax)** | `PackageTier.minPax`, `maxPax`, `maxCapacity` | **Yes** | Catering: 5A (`cat-min-pax`, `cat-max-pax`) | Enforces booking boundaries in `/book` wizard and informs large celebration inquiries. |
| **Advance Booking Lead Time** | `packageLeadDays`, `Occasion.leadDays` | **Yes** | Catering: 5A (`cat-lead-hours`) | Prevents booking on dates sooner than the vendor's sourcing buffer. |
| **Package Hero / Cover Image** | `PackageTier.image`, `LiveVendorRecord.image` | **Yes** | Catering: 5A (`cat-hero-photo`) | Main card photo on `/vendors` catalog and hero banner on `/vendors/[id]`. |
| **Course Hierarchy** | `menuCategories` (`welcome`, `starters`, `main`, `breads`, `sweets`) | **Yes** (Platform Standard) | Catering: 5B. Course Hierarchy | Maps directly to the platform's course navigation tabs in the customer booking builder. |
| **Course Dish Allowances / Quotas** | `packageCategoryItems` (Silver, Gold, Platinum) | **Yes** | Catering: 5D. Pricing & Tiers (`tierQuotas`) | Controls how many dishes guests choose per course on each tier (e.g., Starters: 2 on Silver, 5 on Gold). |
| **Plated Menu Dishes** | `VendorMenuSection.items`, `VendorMenuItem` | **Yes** | Catering: 5C. Dish Builder (`+ Add Dish` modal) | The actual dishes customer selects in the `/book` wizard menu building step. |
| **Dietary Classification** | `VendorMenuItem.diet` (`veg` \| `non-veg`) | **Yes** | Catering: 5C (Dietary toggle in dish modal) | Renders official FSSAI green circle / red triangle markers beside each dish. |
| **Dish Description** | `VendorMenuItem.desc` / preparation details | **Yes** | Catering: 5C (Description in dish modal) | Shown when a customer taps a dish for culinary details. |
| **Dish Photos** | `VendorMenuItem.photo` (`/api/vendor/photo`) | **Yes** | Catering: 5C (Photo selector in dish modal) | High-appeal dish photos shown in modal and dish cards. |
| **Dish Tier Availability** | `VendorMenuItem.tiers` (`Silver`, `Gold`, `Platinum`) | **Yes** | Catering: 5C (Tier checkmarks in dish modal) | Restricts premium delicacies to higher tiers (e.g., Galouti Kebab only on Gold/Platinum). |
| **Tier Per-Plate Base Rates** | `packageBasePerPlate` (`silver: 799, gold: 1199, platinum: 1599`) | **Yes** | Catering: 5D. Pricing & Tiers (`cat-tier-price`) | Starting per-guest rate shown on package pricing cards. |
| **Signature Dishes ("Famous For")** | `LiveVendorRecord.featured` (exactly 4 dishes) | **Yes** | Catering: 5C (Signature dish star button) | Surfaced as high-visibility tags directly on catalog cards (`VendorCatalog.tsx:1398`). |
| **Live Food & Beverage Counters** | `LIVE_STALL_CATEGORY_IDS`, `addOns` (category `counter`) | **Yes** (Separated from Extras) | Catering: 5E. Live Counters | Bookable live cooking counters: Chaat Station, Live Tandoor, Pan Counter, Pizza, Chinese Wok, Dosa. |
| **Live Counter Pricing & Uplifts** | `addOns[].price`, `VendorCounter.price` | **Yes** | Catering: 5E (Per-plate rates) | Added directly to the per-plate booking total in `/book` Step Extras. |
| **Live Counter Included Items** | `addOnMenus[id]`, `VendorCounter.items` | **Yes** | Catering: 5E (Spread checklist) | Shows what delicacies the live counter actually prepares (e.g. Golgappa, Tikki, Papdi for Chaat). |
| **Tableware & Cutlery Options** | `servicePackages` (Package A to D), `addOns.tableware` | **Yes** (Separated from Food) | Catering: 5F. Extras, Essentials & Cutlery | Lets vendor declare available cutlery: Eco Disposables, Steel Cutlery, Ceramic Crockery, Luxury Gold/Silver. |
| **Event Service Crew** | `addOns.staff`, `servicePackages.includes` | **Yes** | Catering: 5F. Extras, Essentials & Cutlery | Trained stewards, floor captain, kitchen helpers, and setup/cleanup crew. |
| **Buffet Essentials & Amenities** | `servicePackages.includes` (A–D), `VendorEssentialService` | **Yes** | Catering: 5F. Extras, Essentials & Cutlery | Buffet tables, linens, chafing dishes, food labels, handwash setup, dustbins & waste management. |
| **Stall Brand Name** | `StallOption.name`, `src/lib/stallDraft.ts` | **Yes** | Stall: 6A. Stall Identity | Name of the specialty stall as seen on `/book/stall` and `/vendors?category=single-stall`. |
| **Stall Category Specialty** | `StallOption.category`, `src/lib/data.ts` | **Yes** | Stall: 6A. Stall Identity | E.g. Biryani & Dum Handi, Chaat, Tandoor & Kebabs, South Indian, Pizza & Pasta, Chinese Wok. |
| **Stall Best For** | `StallOption.bestFor`, `data.ts:525` | **Yes** | Stall: 6A. Stall Identity | E.g. *"Any Occasion, One Trusted Stall"* or *"House Parties · Birthdays"*. |
| **Stall Menu Format** | `SingleStallMenuType` (`"fixed"` \| `"varied"`) | **Yes** | Stall: 6B. Menu Format | Fixed = flat per-plate rate for whole spread; Varied = guest chooses individual delicacies priced separately. |
| **Stall Delicacies List** | `StallCourse.items`, `CategoryItem[]` | **Yes** | Stall: 6C. Delicacies Catalog (`+ Add Delicacy`) | The menu items served at the stall with individual item pricing. |
| **Stall Per-Plate Flat Rate** | `StallCourse.perPlate`, `priceFrom` | **Yes** | Stall: 6D. Pricing & Capacity | Charged when Menu Format is Fixed Set Spread. |
| **Stall Minimum Guest Guarantee** | `STALL_MIN_GUESTS` (50 pax), `minPax` | **Yes** | Stall: 6D. Pricing & Capacity | Minimum event guest count required to book the stall. |
| **Stall Counter Photo** | `StallOption.image`, `LiveVendorRecord.image` | **Yes** | Stall: 6A. Stall Identity (`stall-photo`) | Cover photo of the stall setup and food presentation. |
| **Stall Live Equipment & Setup** | `src/components/booking/StallBookingWizard.tsx` | **Yes** | Stall: 6E. Stall Live & Cutlery | On-site cooking equipment (Live Tandoor/Sigdi, Ulta Tawa, Chafing spread). |
| **Stall Disposables & Cutlery** | `servicePackages[0].includes` (Package A) | **Yes** | Stall: 6E. Stall Live & Cutlery | Eco areca nut plates, paper bowls, wooden cutlery, napkins. |
| **Baina Gifting Studio Name** | `BainaBoxVendorData.name`, `bainaBoxData.ts` | **Yes** | Baina: 7A. Gifting Basics | Displayed on `/baina-box` storefront and sweet gifting collections. |
| **Baina Artisanal Story & Heritage** | `BainaBoxVendorData.whyChoose`, `about` | **Yes** | Baina: 7A. Gifting Basics | Sweet-making tradition, pure desi ghee commitments, and craftsmanship story. |
| **Baina Best For** | `BainaBoxVendorData.bestFor` | **Yes** | Baina: 7A. Gifting Basics | E.g. Weddings, Gifting, Festivals, Corporate Favours. |
| **Baina Minimum Order Quantity** | `bainaCart.ts`, bulk packaging notice | **Yes** | Baina: 7A. Gifting Basics | Minimum boxes required for custom hamper orders (e.g. 25 boxes). |
| **Baina Production Lead Time** | `bainaBoxData.ts`, fulfillment days | **Yes** | Baina: 7A. Gifting Basics | Preparation time needed before shipping/delivery (e.g. 3 days). |
| **Baina Box Catalog & Contents** | `VendorBainaBox`, `BainaBoxProduct` | **Yes** | Baina: 7B. Box Catalog (`+ Add Box` modal) | Box name, itemized sweets/dry fruits contents, ½ kg price, 1 kg price, custom sizes. |
| **Baina Hamper Photos** | `VendorBainaBox.photo`, `BainaBoxProduct.image` | **Yes** | Baina: 7B. Box Catalog (`box-photo`) | Displayed on the interactive Baina Box browse and ordering panel. |
| **Baina Luxury Packaging Styles** | `src/lib/bainaBoxData.ts` presentation tiers | **Yes** | Baina: 7C. Packaging Styles | Royal Velvet Finish, Golden Metallic Foil, Eco Kraft, Banarasi Brocade Silk. |
| **Consolidated Review & Edit** | Full vendor profile, all active services | **Yes** | Step 8: Unified Review & Submit | Comprehensive itemized review for all selected offerings with direct `[Edit]` links. |
| **Customer Storefront Preview** | Complete `/vendors/[id]` and `/vendors` card | **Yes** (Optional Action) | Step 8 Action: `[Preview Storefront]` | High-fidelity interactive preview showing the vendor's public catalog card and booking page. |

---

## 2. Key Insights from the Source-of-Truth Audit

1. **Course Structure is Grounded in Platform Constants:**
   - Plated courses: `welcome`, `starters`, `main`, `breads`, `sweets`.
   - Live Counter categories: `live`, `chaat`, `chinese`, `south-indian`, `pizza`, `pasta`.
   - Catering Builder 5B & 5C mirrors this exact division.

2. **Live vs. Extras Separation is Native to Bhojpatra:**
   - In `data.ts:1060`, `AddOnCategory` is explicitly defined as `"counter" | "service"`.
   - Counters are live food & beverage stations (`pan`, `chaat`, `live`, `pizza`, `momo`, `noodle`, `waffle`, `dessert`, `hi-tea`, `coffee`, `mocktail`).
   - Services/Extras are labour, decor, and tableware (`staff`, `tableware`, `decor`).
   - Version 2 makes this architectural separation crystal clear during onboarding.

3. **Essentials & Cutlery Map Directly to `ServicePackage`:**
   - Bhojpatra has 4 official service tiers (Package A: Essential, Package B: Standard, Package C: Premium, Package D: Ultra Luxury) in `data.ts:1278-1400`.
   - Cutlery ranges from Disposable Eco-plates (A), Ceramic & Steel (B), Bone China & Luxury Glassware (C), to Gold/Silver finish (D).
   - Onboarding captures this in sub-step 5F so caterers specify what tableware level they can provide.

4. **Stall Dynamics Mirror `StallBookingWizard.tsx`:**
   - Single Stalls use either `fixed` (whole spread at one per-plate rate) or `varied` (delicacies selected individually).
   - Version 2 gives vendors full control over this choice in 6B and 6C.

5. **Vendor Identity Persists at the Top:**
   - By eliminating repeated Feast/Stall brand prompts and displaying the persistent header (`Royal Awadh Caterers · Lucknow | Catering · Stall · Baina`), vendors experience a streamlined, single-truth onboarding.
