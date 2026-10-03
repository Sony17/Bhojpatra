# Vendor Registration V2 — Gap Report (branch `vendor-flow-integration`)

Source of truth: `mockups/vendor-registration-v2_Final.zip` (10 Sep 2026 handover; byte-identical to the
"vendor-registration-v2 5" handover folder). Audited against commit `30e72e8`.

Legend: **MISSING** = screen/section/control not built. **LABEL** = built, but copy differs from the handover.
**MOBILE** = issue only at 390px.

---

## 1. What is not there in the current branch (desktop)

### Shell / navigation
| # | Handover | Current branch | Gap |
|---|---|---|---|
| S1 | App bar: Bhojpatra logo + tagline "Vendor Partner Onboarding V2" + **Sign In** button | none | MISSING |
| S2 | "Existing Vendor Sign In" modal (Registered Email or Mobile Number, Password, "Sign In →") | only on the gateway page | MISSING inside the flow |
| S3 | 6-phase stepper: Identity · KYC · Offerings · Service Setup · Review & Submit · Go Live (clickable) | "Step N of 4" text + thin bar | MISSING |
| S4 | Vendor Context Header (from step 2 on): name, "City, ST", "★ 4.8 (142 reviews)", **Registered Services:** pills + diet pill, active builder tag (Feast Builder / Feast Extras / Stall Builder / Baina Builder), **Edit Details ✎** | name, owner, diet badge, "Step N of 4", save state; shown on step 1 too | LABEL + MISSING (rating, services pills, builder tag, Edit Details) |
| S5 | Builder breadcrumb pills — Feast: Feast Details › Silver & Gold Tiers › Course Hierarchy › Dishes & Photos › Live Counters › Feast Extras › Essentials › Tableware Add-ons; Stall: Menus › Live & Cutlery; Baina: Studio Story › Box Catalog › Packaging Styles | "5A. Basics", "5B. Pricing" … "6A. Menus Workspace" … "7C. Packaging" | LABEL |
| S6 | Sticky footer: "← Back" / "Continue →" | per-step varied labels ("Save & Continue to KYC →", "Continue to Pricing & Quotas →" …) | LABEL |
| S7 | **08. Consolidated Master Review & Submit** | — | MISSING (whole screen) |
| S8 | **Customer Storefront Preview** modal (catalog card, "Book This Caterer →", "Close Preview") | — | MISSING |
| S9 | **09. Registration successfully submitted!** (Vendor ID, "KYC Status: Under Express Review (12–24h)", "🚀 Enter Vendor Dashboard →", "Preview Live Storefront 👁️") | "Stage 4 Complete: Specialized Service Builders Configured!" placeholder | MISSING / wrong screen |
| S10 | Brand palette only (Red/Cream/Black/White) | emerald / amber / red-50 used in header, step 1, KYC, completion, builder pills | violates `CLAUDE.md` brand rule |

### Step 1 — Vendor Identity & Operations
| Handover | Current | Gap |
|---|---|---|
| Eyebrow "Vendor Identity & Operations", H1 "Your catering business identity", subtext "Enter your business identity once…" | Section titles "1. Brand & Contact Identity", "2. Kitchen Location…", "3. Cuisine Specialities…" | LABEL |
| Banner "Already registered as a Bhojpatra Vendor?" + "Sign In to Dashboard →" | — | MISSING |
| Card "Kitchen Dietary Offering *" + "Mandatory Initial Gate"-style hint; options Pure Vegetarian / Non-Vegetarian Only / Both Veg & Non-Veg with handover sub-copy; error "⚠️ Please select your kitchen's dietary offering before proceeding." | "Dietary Offering", "Veg & Non-Veg (Both)", different sub-copy | LABEL |
| Read-only card "Verified Vendor Account Details" + "Reused from Signup" + Account ID + Primary Account Holder / Registered Business Name / Registered WhatsApp Mobile / Registered Account Email + ℹ️ hint | editable inputs (owner, business, phone) + locked email | LABEL (layout) |
| Card "Commercial Kitchen Operations": **Primary Kitchen City *** (select), **State *** (select), "Primary Culinary Specialties & Cuisines" chips + "+ Custom cuisine", **Serviceable Coverage Cities *** chips "Where can your team travel to cater?" + "+ Other city" + hint, **Google Rating**, **Total Google Reviews Count** | free-text city with datalist, "Operating State", type-ahead city input, "Cuisine Specializations", "Google / External Rating (e.g. 4.8)", "Verified Review Count" | LABEL |

### Step 2 — Compliance & Statutory KYC
| Handover | Current | Gap |
|---|---|---|
| Eyebrow "Compliance & Statutory KYC", H1 "Statutory KYC verification", subtext | "1. Statutory Licenses & Tax Identifiers" | LABEL |
| "GSTIN (Goods and Services Tax Identification) *", "FSSAI Food Safety Licence (14 Digits) *", "Document Uploads" (GST Certificate, FSSAI Licence) | "GSTIN (Goods and Services Tax Number)", "FSSAI Food Safety License / Registration", "2. Compliance Document Uploads" with 4 docs | LABEL (extra Owner ID / Business Proof docs kept as optional) |
| Badges are **not** on this step | "3. Bhojpatra Recognition Badges" lives here | moved → Step 3 |

### Step 3 — Commercial Service Offerings
| Handover | Current | Gap |
|---|---|---|
| Eyebrow "Commercial Service Offerings", H1 "What services do you offer?" | "1. Select Your Core Service Lines" | LABEL |
| Cards "Feast Booking" / "Single Specialty Stall" / "Baina Gifting Boxes" with handover blurbs + 4 bullets each | "Complete Feast Catering" / "Single Stall Speciality" / "Artisanal Baina Boxes" | LABEL |
| Inside Feast card: "🍲 Select Feast Components" — 🍳 Live Counters, ✨ Feast Extras, 🛡️ Essentials, 🍽️ Add-ons | separate "Feast Sub-Components" block; "Service Crew Essentials", "Tableware Add-ons" | LABEL / placement |
| Card "🛡️ Badges & Recognition" (Optional) | on KYC step | MISSING here |
| — | "2. Custom Stations & Signature Offerings" | not in handover (kept, collapsed under Feast/Stall? → removed from UI, data kept) |

### Step 5 — Feast Builder
| Screen | Handover eyebrow / H1 | Current | Gap |
|---|---|---|---|
| Feast Details | "Feast Builder · Feast Details" / "Configure your signature feast booking" | "Section 5A · Feast Basics & Specialization" | LABEL; **Minimum Preparation Notice** must be a select (24h / 48h (Standard for feasts) / 72h (3 days) / 7 days (Large weddings only)) — currently number input "Advance Lead Time (Hours)"; Best For chips must be "Weddings, Receptions, Engagements, Birthday Celebrations, Family Pujas & Gatherings, Corporate Galas"; "Package Hero Food Photo" / "Feast Cover Photography" / "Change Photo 📷" |
| Tiers | "Feast Builder · Tiers & Allowances" / "Configure tier allowances & pricing" | "Section 5B · Pricing & Course Quotas" with both tiers side by side | MISSING sequential **Silver → Gold lock** (tabs "1 Silver Tier · Bhoj City (Base) · ₹799 · In Progress", "2 Gold Tier · Bhoj Signature · ₹1,199 · 🔒 Locked", "3 Platinum / Coming Soon"), "Save & Proceed to Gold Tier →", "← Back to Silver (Review/Edit)", Gold read-only allowance badges ("5 dishes included" …) |
| Course Hierarchy | "Feast Builder · Course Hierarchy" / "Feast course hierarchy" | "Section 5C · Course Hierarchy & Catalog Overview" | LABEL; course names Welcome Drinks / Starters & Kebabs / Main Course / Breads & Rice / Sweets & Mithai + handover descriptions |
| Dishes | "Feast Builder · Dishes & Photos" / "Build your dishes with authentic photos" | "Section 5D · Granular Dish Builder" | LABEL; tabs "🥤 Welcome · 🍢 Starters · 🍲 Main Course · 🫓 Breads · 🍬 Sweets", "＋ Add New Dish to this Course" |
| Dish modal | "Configure Dish Details"; Dish Name *, Dietary Type, Course Category, Culinary Preparation Description, Dish Food Photography, Available on Tiers (Check all that apply); "Cancel" / "Save Dish to Menu" | "Add Dish to Menu", "Assigned Course", "Dietary Classification", "Feast Tier Availability", "Add Dish to Roster" | LABEL |
| Live Counters | "Feast Menu Builder · Live Food Counters" / "Configure live food & beverage counters"; "Your Live Counters Catalog", "＋ Add Live Counter", "💡 Popular Station Ideas (Click to customize & add to your catalog):" grid | "Section 5E · Live Food Cooking Counters"; no popular-ideas grid | LABEL + MISSING ideas grid |
| Counter modal | "Configure Live Food Counter"; "Counter Category / Station Name *", "Items Served at this Counter *", "Extra Cost Per Plate (₹ / plate) *", "Save Counter to Catalog" | "Live Counter Category", "Included Delicacies / Inclusions", "Add to Package" | LABEL |
| Feast Extras | "Feast Menu Builder · Hospitality Extras" / "Configure feast hospitality extras"; "✨ Feast Hospitality Extras", "＋ Add Feast Extra", popular ideas (Welcome Drinks & Mocktails, Hi-Tea & Evening Snacks, Buffet Floral & Theme Decor, Banquet Sound & Announcements) | "Section 5F · Hospitality Extras & Event Add-ons" | LABEL + MISSING ideas grid |
| Extra modal | "Configure Feast Hospitality Extra"; "Pricing Model" (Per Plate / Guest · Fixed Event Package Cost), "Save Extra to Catalog" | shared CounterModal | LABEL |
| Essentials | "Feast Menu Builder · Service Essentials" / "Configure feast crew & hygiene essentials"; card "🧑‍🍳 Essential Hospitality & Service Inclusions"; 6 chips | "Section 5G · Service Crew & Banquet Essentials" + "Service Crew Supplement (₹/guest)" | LABEL (per-guest supplement kept under chips) |
| Tableware Add-ons | "Feast Menu Builder · Tableware Add-ons" / "Configure tableware presentation packages"; Package A Eco Disposables · Base Included (₹0) / B Ceramic & Steel +₹40 / C Bone China Crockery +₹90 / D Royal Gold / Silver +₹180 with 3 bullets each | "Section 5H · Tableware & Crockery Tiers", different names & bullets | LABEL |

### Step 6 — Single Stall
| Handover | Current | Gap |
|---|---|---|
| "Single Stall · Menus & Stations" / "Build your stall menus"; "📂 Choose your stall categories", "N categories selected", "✨ Need a Custom Stall Category?" + "＋ Add Category", "Select stall to configure:", "Currently configuring: X · Active Configuration", "🍽️ Your Dishes" + "＋ Add Dish" / "＋ Add Dish to Stall", "🏷️ Stall Pricing & Pax Guarantee" + "Independent per stall", "Fixed Per-Plate Rate (₹) *", "Minimum Guest Guarantee (Min Pax) *", footer "← Back to Offerings" / "Continue to Setup & Cutlery →" | "Section 6A · Single Stall Menus & Category Workspace", "Fixed Spread Rate (₹/guest)" … | LABEL |
| Stall item modal "Configure Stall Menu Item": Dish Name *, Dietary Type, **Dish Cost (₹ / plate) *** (required), Dish Description, Dish Photo; "Save Dish" | "Add Stall Delicacy", price optional | LABEL + price required |
| "Stall Builder · Setup & Cutlery" / "On-site equipment & stall cutlery"; "Live Cooking Equipment Included" chips (Live Charcoal Sigdi / Tandoor, Inverted Ulta Tawa Griddle, Copper Degchis & Chafers, Commercial Gas Burner); "Stall Tableware & Disposables Inclusions" (text); "← Back to Menus" / "Continue →" | "Section 6B · Stall Equipment & Service Cutlery", 6 apparatus cards, 4 cutlery cards | LABEL |

### Step 7 — Baina
| Handover | Current | Gap |
|---|---|---|
| "Baina Builder · Studio Story" / "Artisanal gifting studio & traditions"; Gifting Studio Brand Name *, Production Notice (Days) *, Heritage Confectionery Story, Best For (Gifting Occasions): Wedding Announcements, Festival Sweets (Diwali/Eid), Corporate Favours, Family Ceremonies | "Section 7A · Artisan Baina Studio Story" + different occasions | LABEL |
| "Baina Builder · Box Catalog" / "Artisanal gifting box hampers"; "＋ Add New Gifting Box Hamper"; "Maximum 5 selections allowed." | "Section 7B · Curated Baina Box Catalog" | LABEL |
| Box modal "Configure Gifting Box": Hamper Box Name *, Itemized Contents Description *, ½ kg Box Price (₹) *, 1 kg Box Price (₹), Hamper Photo; "Save Box" | "Add Baina Box to Catalog" … | LABEL |
| "Baina Builder · Packaging Presentation" / "Select luxury packaging presentation"; Royal Velvet Finish / Golden Metallic Foil / Eco-Friendly Kraft Board / Banarasi Brocade Silk | "Royal Velvet Casing", "Golden Foil Embossed", "Artisanal Eco Kraft", … | LABEL |

### Post-submit — Vendor Portal
| Handover | Current | Gap |
|---|---|---|
| Sidebar: Dashboard · My Services · Orders · Calendar (Soon) · Finances (Soon) · Reviews (Soon) · Profile & KYC (Soon); footer "Partner Helpdesk", "Edit Onboarding Data" | single page: header card + Baina card + MenuBuilder | MISSING portal shell |
| Dashboard Home: status banner ("Live on Marketplace", tier, diet), pending-booking alert ("Review Booking" / "Decline"), next event spotlight, 4 metric tiles (Upcoming Bookings, Completed Events, Average Rating, Pending Payout), "Active Booking Pipeline", "Services & Catalog Health", "Profile Completeness" | — | MISSING |
| "My Services & Offerings" hub, "Orders & Booking Pipeline" (Review & Accept / Decline, Prep Sheet) | — | MISSING |

---

## 2. What is not there in mobile view (390px)

| # | Handover mobile behaviour | Current branch |
|---|---|---|
| M1 | Compact mobile copy per screen (e.g. "Vendor Identity / Business details / Collected once and reflected everywhere.", "Statutory KYC / Compliance", "Commercial Offerings / What do you offer?", "Feast Details / Package info", "Tiers & Allowances / Pricing & allowances", "Course Hierarchy / Course hierarchy", "Dishes & Photos / Dish builder", "Live Counters / Live stations", "Feast Extras / Hospitality Extras", "Feast Essentials / Service Crew", "Tableware Presentation / Tableware Add-on", "Single Stall Menus / Build stall menus", "Stall Setup / Stall setup & cutlery", "Gifting Story", "Gift Boxes", "Box Styles", "Review / Master review", "Registration Submitted!") | desktop copy only |
| M2 | Compact Vendor Context Header: name + city + "Edit ✎" only | full desktop header stacks to ~5 rows, sticky, eats ~40% of viewport |
| M3 | Horizontally scrollable breadcrumb pills with short names (Basics · Tiers · Courses · Dishes · Live · Extras · Essentials · Add-ons / Categories · Menus / Story · Boxes · Styles) | "5A. Basics"… pills inside a separate card |
| M4 | Bottom-fixed action bar "← Back" / "Continue →" on every screen, 44px targets | footer not fixed in builders; Back/Save Draft/Continue stack vertically (3 full-width buttons ≈ 160px) |
| M5 | Bottom-sheet modals (dish, counter, extra, stall item, box, sign-in) | centred dialogs; some exceed viewport height without internal scroll |
| M6 | Short chip labels in Essentials (Stewards, Tables, Labels, Handwash, Dustbins, Cleaners) & short tableware names | long labels wrap to 3 lines |
| M7 | Mobile dashboard: bottom tab bar Dashboard · My Services · Orders (badge) · More | no mobile portal |
| M8 | Course tabs/quota steppers fit 390px; Gold/Silver tier tabs condensed "Silver (Base) · ₹799" | 5B renders two tier cards side by side → horizontal overflow at 390px |
| M9 | Touch targets ≥ 44px | stepper ± buttons 32px, chip remove "×" 20px, header error close 32px |

---

## 3. Backend impact

All handover fields map to existing `LiveVendorRecord` fields already accepted by `PUT /api/vendor/menu`
(`dietaryOffering`, `serviceCities`, `googleRating/Reviews`, `bestFor`, `minPax`, `maxCapacity`, `leadHours`,
`goldSpecialization`, `menu[].tierItems`, `counters[]`, `essentialService`, `cutleryTier`, `stallConfig`,
`bainaDetails` incl. `occasions`, `bainaBoxes`, `cateringComponents`, `badges`).
**No backend change was needed.** Gold-tier lock state is UI-only (derived: Gold unlocks after Silver is saved).
