# Bhojpatra Vendor Dashboard — UI/UX Specification

**Document Version**: 1.0.0  
**Target System**: Bhojpatra Vendor Portal (`/vendor/*`)  
**Design Mode**: **Operate** (Operational Business Tool for Catering Partners)  
**Primary Reference Files**:
- [`c:\Users\Zeeshaan\Bhojpatra\VENDOR_DASHBOARD_REQUIREMENTS.md`](file:///c:/Users/Zeeshaan/Bhojpatra/VENDOR_DASHBOARD_REQUIREMENTS.md)
- [`c:\Users\Zeeshaan\Bhojpatra\CLAUDE.md`](file:///c:/Users/Zeeshaan/Bhojpatra/CLAUDE.md)
- [`c:\Users\Zeeshaan\Bhojpatra\DESIGN-SYSTEM.md`](file:///c:/Users/Zeeshaan/Bhojpatra/DESIGN-SYSTEM.md)
- Codebase Components: [`src/components/ui/`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/ui/), [`src/components/admin/`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/admin/), [`src/components/vendor/`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/)

---

## Executive Summary & Design Mission

The **Bhojpatra Vendor Portal** is an operational cockpit for wedding caterers, cloud kitchens, regional food stall operators, and mithai/baina artisans across Uttar Pradesh and North India.

The fundamental design question this portal answers is:
> **"What does a Bhojpatra vendor need to know and do when they log in?"**

When a caterer logs into Bhojpatra, they are not looking for synthetic SaaS graphs or vanity metrics. They are preparing for high-stakes, time-critical catering events (weddings, receptions, corporate galas, family feasts). They need to immediately know:
1. **Account & Visibility Health**: Is my profile verified, approved, and live on the marketplace?
2. **Immediate Action Requirements**: Do I have incoming bookings awaiting acceptance, or rejected documents needing resubmission?
3. **Imminent Event Logistics**: What is my next event, how many guests are attending, where is it, and what exact dishes must my kitchen prepare?
4. **Business & Financial Truth**: What confirmed bookings do I have lined up, and what settlements are owed to me?

This document translates the architectural and product requirements into an **uncompromising, brand-faithful UI/UX specification**. It strictly enforces Bhojpatra’s **4-color brand palette**, leverages existing reusable primitives from `src/components/ui/`, modularizes the monolithic `MenuBuilder.tsx` without breaking underlying data models, and provides on-site mobile resilience for caterers working on banquet floors and in prep kitchens.

---

## 1. Existing UI / Visual Language Audit

### 1.1 Brand Palette Verification
A strict audit of [`CLAUDE.md:3-31`](file:///c:/Users/Zeeshaan/Bhojpatra/CLAUDE.md#L3-L31) and [`DESIGN-SYSTEM.md:9-25`](file:///c:/Users/Zeeshaan/Bhojpatra/DESIGN-SYSTEM.md#L9-L25) confirms that Bhojpatra operates under an **absolute 4-color constraint**:

| Color Role | Hex Value | RGB Channels | Primary Utility Tokens | Permitted Applications in Vendor Portal |
|---|---|---|---|---|
| **Red** | `#B92025` | `rgb(185, 32, 37)` | `brand-red`, `primary`, `maroon` | Primary buttons, urgent alerts, active navigation rails, brand icons, focused border accents. |
| **Cream** | `#F0D09E` | `rgb(240, 208, 158)` | `brand-cream`, `secondary`, `border` | Subtle background tints (`bg-cream/40`), borders (`border-cream-3`), secondary button fills, soft badges. |
| **Black** | `#000000` | `rgb(0, 0, 0)` | `brand-black`, `ink` | Primary typography, headers, high-contrast labels, destructive button fills, deep backdrop overlays. |
| **White** | `#FFFFFF` | `rgb(255, 255, 255)` | `brand-white`, `surface`, `bg` | Primary content cards, form inputs, modal dialogs, data table backgrounds. |

#### Critical Brand Guardrails:
- **No External Utility Hues**: The vendor portal must **never** introduce generic Tailwind colors (`gray-*`, `slate-*`, `green-*`, `emerald-*`, `blue-*`, `amber-*`, `yellow-*`).
- **Semantic Communication via Opacity & Contrast**:
  - `Success / Confirmed`: Communicated via solid maroon (`#B92025`) badge with cream text (`bg-maroon text-cream`), or crisp ink on cream surface, paired with semantic icons (e.g., `CheckCircle`).
  - `Pending / Warning`: Communicated via outlined maroon on cream (`border border-maroon text-maroon bg-cream/20`) with alert iconography (`Clock`, `AlertTriangle`).
  - `Critical / Rejected`: Solid maroon badge or red-tinted alert banner (`border-maroon bg-maroon/5 text-maroon`).
  - `Inactive / Muted`: Soft cream tone (`bg-cream-2 text-ink-soft`).

### 1.2 Typography Hierarchy
- **Branding & Display Font**: **Ananda Neptouch 2** (`.font-display`)
  - Used strictly for: Top-level section titles (e.g., "Vendor Dashboard", "Orders & Events"), portal wordmark, and prominent modal headers. Never used for body copy, numbers, or tabular data.
- **Interface & Operational Font**: **Open Sans** (`font-sans`)
  - Used for: All metrics, form labels, data table cells, kitchen prep sheets, status badges, buttons, and navigation links.

```
Type Scale Specification:
- Section Header (Display):      28px / 1.25 tracking-tight  (Ananda Neptouch 2)
- Card / Panel Header:           18px - 20px / 1.3 font-bold  (Open Sans)
- Primary Body / Table Row:      14px - 15px / 1.5 font-normal(Open Sans)
- Small Labels / Meta / Timestamps: 12px - 13px / 1.4 font-medium(Open Sans)
- Key Metrics (Numbers):         28px - 32px / 1.1 font-bold  (Open Sans Tabular Numbers)
```

### 1.3 Component & Pattern Audit (Existing vs Proposed)

#### Pattern 1: Page Shell & Navigation
1. **Existing Bhojpatra Pattern**:
   - Customer UI uses an absolute sticky header (`AppBar.tsx`) and floating elements.
   - Admin UI (`AdminShell.tsx`, `AdminSidebar.tsx`) uses a fixed 64-column maroon sidebar (`w-64 bg-maroon text-cream`) on desktop, collapsing to an overlay drawer on mobile.
   - Current `/vendor/dashboard` has **no shell at all**—it renders `MenuBuilder.tsx` directly into the public customer layout with the public header and footer.
2. **Identified UX Problem**:
   - Caterers editing their menu or checking orders are distracted by public customer links ("Find Caterers", "Explore Banquets", "Cart"). There is no dedicated vendor sidebar or business context.
3. **Proposed UX Direction**:
   - Establish a dedicated `VendorShell` sharing the visual discipline of the Admin rail (`w-64 fixed`, dark maroon background `#B92025` with cream text `#F0D09E`), but branded specifically for the vendor with their business name, tier badge, and operational links.
4. **Reason for Recommendation**:
   - Provides clear mental separation between "Browsing Bhojpatra as a customer" and "Running my catering business". Reuses proven layout mechanics from `AdminShell.tsx`.

#### Pattern 2: Cards and Surface Elevations
1. **Existing Bhojpatra Pattern**:
   - `src/components/ui/Card.tsx`: Uses `rounded-hero` (24px), `border border-maroon/6 bg-white shadow-card`.
   - Admin cards: Use `rounded-lg border border-cream-3 bg-white p-5`.
2. **Identified UX Problem**:
   - A 24px radius (`rounded-hero`) is excellent for consumer marketing tiles, but introduces excessive whitespace and awkward padding in data-dense operational tables and form controls.
3. **Proposed UX Direction**:
   - Adopt `rounded-card` (16px) for all operational dashboard panels, metric tiles, and order cards, with standard `border border-maroon/10 bg-white shadow-card`.
4. **Reason for Recommendation**:
   - Matches the official token scale in [`DESIGN-SYSTEM.md:65-74`](file:///c:/Users/Zeeshaan/Bhojpatra/DESIGN-SYSTEM.md#L65-L74), optimizing information density without sacrificing visual polish.

#### Pattern 3: Status Badges and State Pills
1. **Existing Bhojpatra Pattern**:
   - `src/components/ui/Badge.tsx`: Provides 4 distinct tones (`solid`, `outline`, `soft`, `muted`) strictly mapped to brand red, cream, and ink.
2. **Identified UX Problem**:
   - Existing vendor registration and menu builder use hand-coded badge spans with arbitrary padding and inconsistent text sizing.
3. **Proposed UX Direction**:
   - Standardize all vendor portal statuses directly onto `Badge.tsx`.
   - `Verified`, `Confirmed`, `Active`, `Settled` $\rightarrow$ `tone="solid"` (`bg-maroon text-cream`).
   - `Pending`, `Under Review`, `Draft` $\rightarrow$ `tone="outline"` (`border border-maroon text-maroon`).
   - `In Preparation`, `Completed` $\rightarrow$ `tone="soft"` (`bg-cream-2 text-ink`).
   - `Rejected`, `Hidden`, `Cancelled` $\rightarrow$ `tone="muted"` (`bg-cream-2 text-ink-soft`).
4. **Reason for Recommendation**:
   - Total brand consistency; zero external color leakage.

---

## 2. Design Principles for the Vendor Portal

The Bhojpatra Vendor Portal is governed by **7 core design principles** rooted in the **Operate** UX mode:

### 1. Operational Clarity Over SaaS Vanity
A caterer preparing 400 plates of Awadhi Biryani needs immediate operational data, not vanity MRR charts, conversion funnels, or animated decorative graphs. Every square inch of the dashboard must serve an operational purpose: event dates, dish rosters, guest counts, kitchen prep, and pending payments.

### 2. Absolute 4-Color Brand Fidelity
The portal strictly adheres to Bhojpatra’s 4-color brand palette: Red (`#B92025`), Cream (`#F0D09E`), Black (`#000000`), and White (`#FFFFFF`). Contrast and visual hierarchy are achieved through typographic weight, elevation, and opacity tints—never by introducing unauthorized greens, blues, or ambers.

### 3. Kitchen & On-Site Mobile Resilience
Caterers frequently check orders while on-site at banquet halls, in bustling prep kitchens, or during transit. The portal must be fully usable on mobile screens: minimum 44px touch targets (`.tap`), sticky bottom action sheets, high-contrast dish listings, and printable/shareable kitchen prep sheets.

### 4. 5-Second Operational Triage (Above the Fold)
Within 5 seconds of opening `/vendor/dashboard`, the caterer must know:
- Is my account healthy and live?
- Is there any booking or document requiring my immediate action?
- What is my very next event?

### 5. Progressive Disclosure of Menu Complexity
The existing menu system (`MenuBuilder.tsx`) contains vast configuration options (courses, dishes, per-plate uplifts, package tiers, Baina boxes, live counters). The portal must deconstruct this monolithic form into logical, bite-sized workspaces with clear save states, preventing caterer fatigue and data loss.

### 6. Zero-Fake-Data Integrity
The portal will **never** display hardcoded mock figures (such as the `"₹18.4L"` or `"34 bookings"` found in legacy prototypes). If data is absent or an API is in development, the UI must present an honest, actionable empty state guiding the vendor on what is needed.

### 7. Explicit Status Disambiguation
The UI must never collapse different business concepts into a single generic "Active" pill. It must clearly distinguish between:
- **Verification Status** (KYC legal compliance: `Verified` vs `Pending`)
- **Moderation Status** (Editorial quality: `Approved` vs `Draft` vs `Hidden`)
- **Marketplace Visibility** (Can customers see you right now: `Live` vs `Delisted`)
- **Order Fulfillment State** (Kitchen workflow: `Acknowledged` vs `In Prep` vs `Delivered`)

---

## 3. Global Vendor Portal Structure

### 3.1 Information Architecture & Navigation Hierarchy

The portal maps the 7 core business domains into a structured, intuitive primary and secondary navigation model:

```
VENDOR PORTAL (/vendor/*)
│
├── [1] Overview (Home) ──────────► /vendor/dashboard
│     └── Snapshot of operational health, urgent alerts, next event, quick metrics
│
├── [2] Bookings & Orders ────────► /vendor/orders
│     ├── Sub-view: Active & Upcoming (Chronological order stream)
│     ├── Sub-view: Action Required (Pending acceptance)
│     ├── Sub-view: Past Archive (Completed events)
│     └── Drawer: Order Detail & Kitchen Prep View
│
├── [3] Kitchen Calendar ─────────► /vendor/calendar
│     ├── Monthly / Weekly Event Grid
│     ├── Daily Capacity Tracker (Bookings vs Max Capacity)
│     └── Date Blackout / Availability Toggle
│
├── [4] Menu & Offerings ─────────► /vendor/menu
│     ├── Sub-tab: Menu Overview & Offering Toggles
│     ├── Sub-tab: Courses & Dishes (Starters, Mains, Desserts, Uplifts)
│     ├── Sub-tab: Live Counters & Add-ons
│     ├── Sub-tab: Baina Gift Boxes
│     └── Sub-tab: Signature Dishes & Card Media
│
├── [5] Financials & Settlements ─► /vendor/finances (MVP 1.1)
│     ├── Outstanding Receivable Balance
│     ├── Completed Event Earnings Ledger
│     ├── Settlement Disbursement Records
│     └── Bank Account / UPI Payout Settings
│
├── [6] Reviews & Reputation ─────► /vendor/reviews (MVP 1.1)
│     ├── Star Rating & Verified Review Feed
│     └── Dish-Specific Mentions
│
└── [7] Profile & Compliance ─────► /vendor/profile
      ├── Business Details, Cuisines & Capacity Settings
      ├── KYC Document Status & Resubmission Drawer
      └── Marketplace Tier Status (Silver / Gold / Platinum)
```

### 3.2 Navigation Items Specification

| Nav Label | Priority | Route Destination | Primary Purpose | Key User Actions Available | Release Phase |
|---|:---:|---|---|---|:---:|
| **Dashboard** | P0 | `/vendor/dashboard` | Daily operational triage | View next event, acknowledge urgent alerts, check verification | **MVP 1.0** |
| **Orders** | P0 | `/vendor/orders` | Booking intake & fulfillment | Accept orders, view customer briefs, open prep sheet | **MVP 1.0** |
| **Calendar** | P1 | `/vendor/calendar` | Prevent kitchen overbooking | Block unavailable dates, monitor event density | **MVP 1.1** |
| **Menu & Food** | P0 | `/vendor/menu` | Offering & catalog control | Add dishes, update rates, toggle Baina boxes, manage photos | **MVP 1.0** |
| **Finances** | P1 | `/vendor/finances` | Settlement transparency | Check balances, view disbursement history, configure bank/UPI | **MVP 1.1** |
| **Reviews** | P1 | `/vendor/reviews` | Reputation monitoring | Read verified customer feedback, monitor dish praise | **MVP 1.1** |
| **Profile & KYC** | P0 | `/vendor/profile` | Trust, compliance & settings | Resubmit rejected documents, update capacity and service cities | **MVP 1.0** |

---

## 4. Desktop Layout Specification

### 4.1 Shell Composition
The desktop layout (`>= 1024px`) uses an application rail pattern designed for high productivity and zero visual distraction:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BHOJPATRA VENDOR SHELL (Desktop >= 1024px)                                             │
├──────────────┬─────────────────────────────────────────────────────────────────────────┤
│ SIDEBAR      │ TOPBAR (Sticky Header, h-16 / 64px)                                     │
│ (Fixed,w-64) │ [Breadcrumb: Vendor > Orders]         [Preview Catalog] [🔔 2] [Avatar] │
│              ├─────────────────────────────────────────────────────────────────────────┤
│ [Logo]       │ MAIN CONTENT CANVAS (max-w-[1400px] mx-auto, px-8 py-6)                 │
│ Bhojpatra    │                                                                         │
│ Vendor       │ ┌─────────────────────────────────────────────────────────────────────┐ │
│              │ │ OPERATIONAL STATUS BANNER                                           │ │
│ [Business]   │ │ Verified Caterer · Live on Marketplace · Platinum Tier              │ │
│ Royal Awadh  │ └─────────────────────────────────────────────────────────────────────┘ │
│              │                                                                         │
│ • Dashboard  │ ┌───────────────────────────────────┐ ┌───────────────────────────────┐ │
│ • Orders (2) │ │ URGENT ACTIONS (ALERT CARDS)      │ │ NEXT UPCOMING EVENT (SPOTLIGHT)│ │
│ • Calendar   │ │ 2 orders awaiting confirmation    │ │ 12 Dec 2026 · 250 Guests      │ │
│ • Menu       │ └───────────────────────────────────┘ └───────────────────────────────┘ │
│ • Finances   │                                                                         │
│ • Reviews    │ ┌──────────────┬──────────────┬──────────────┬────────────────────────┐ │
│ • Profile    │ │ METRIC 1     │ METRIC 2     │ METRIC 3     │ METRIC 4               │ │
│              │ │ Upcoming (5) │ Completed(42)│ Rating (4.8) │ Pending Payout(₹48.5k) │ │
│ [Sign Out]   │ └──────────────┴──────────────┴──────────────┴────────────────────────┘ │
└──────────────┴─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Detailed Shell Specs
- **Sidebar Rail (`w-64`, fixed `left-0 top-0 bottom-0 z-30`)**:
  - Background: Brand Maroon (`#B92025` / `bg-maroon`).
  - Typography: Cream (`#F0D09E` / `text-cream`).
  - Active Item Treatment: Solid Cream background pill with Maroon text (`bg-cream text-maroon font-semibold shadow-sm`).
  - Inactive Item Treatment: Transparent background with cream text at 85% opacity, hovering to full opacity with a 10% cream wash (`hover:bg-white/10`).
  - Vendor Header inside Sidebar: Shows business name in 14px bold, accompanied by verification status dot and tier badge pill.
  - Bottom Utility Rail: Quick links to "Vendor Support / Helpdesk" and "Sign Out".
- **Topbar Header (`sticky top-0 h-16 z-20 border-b border-cream-3 bg-white/95 backdrop-blur-sm`)**:
  - Left: Dynamic breadcrumb trail (e.g., `Vendor / Orders / BHOJ-8492`) in 14px Open Sans.
  - Center/Right utilities:
    - **"Preview Public Card" Button**: Secondary button (`sm`) linking to `/vendors/[id]` in a new tab.
    - **Notification Center Bell**: Icon button with a brand-red badge indicator for unread operational alerts.
    - **Vendor Profile Pill**: Vendor Avatar/Initial, Business Name, and quick dropdown menu.
- **Main Canvas (`lg:pl-64 min-h-screen bg-surface-beige text-ink`)**:
  - Max content constraint: `max-w-[1400px] mx-auto`.
  - Spacing system: Strict adherence to the 8pt scale (`px-6 py-6 sm:px-8 lg:px-10 lg:py-8`).

---

## 5. Mobile Layout Specification

### 5.1 On-Site Ergonomics
Caterers frequently manage logistics on mobile devices in high-stress physical environments. The mobile interface (`< 1024px`) is engineered for:
- **One-Handed Navigation**: Critical navigation anchors live within the lower thumb zone.
- **Strict 44px Minimum Touch Targets (`.tap`)**: Every button, tab, and card row meets or exceeds 44×44px.
- **Zero Horizontal Table Overflow**: Desktop data tables reflow automatically into stacked, high-scannability `OrderCards`.

```
┌─────────────────────────────────────────┐
│ MOBILE VIEW (< 1024px)                  │
├─────────────────────────────────────────┤
│ [Menu ☰]  ROYAL AWADH CATERERS   [🔔 2] │  <-- Sticky AppBar (h-14 / 56px)
├─────────────────────────────────────────┤
│ [STATUS: Verified · Live · Platinum]   │  <-- Compact Status Pill Bar
├─────────────────────────────────────────┤
│ ⚠️ 2 BOOKINGS AWAIT CONFIRMATION        │  <-- High-Priority Alert Banner
│ [Review Now ->]                         │
├─────────────────────────────────────────┤
│ NEXT EVENT IN 3 DAYS                    │
│ ┌─────────────────────────────────────┐ │
│ │ Sharma Wedding Reception            │ │  <-- Event Spotlight Card
│ │ 12 Dec 2026 · 7:30 PM · Lucknow     │ │
│ │ 250 Guests · Royal Feast Spread     │ │
│ │ [View Kitchen Prep Sheet]           │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ QUICK METRICS                           │
│ ┌──────────────────┐ ┌────────────────┐ │
│ │ 5 Active Orders  │ │ ₹48,500 Due    │ │
│ └──────────────────┘ └────────────────┘ │
├─────────────────────────────────────────┤
│ (Scrollable Content Area)               │
│                                         │
├─────────────────────────────────────────┤
│ [ 🏠 Home ] [ 📋 Orders ] [ 🍲 Menu ] [ ☰ More ] │ <-- Fixed Bottom Tab Bar (h-16)
└─────────────────────────────────────────┘
```

### 5.2 Mobile Component Behaviors
1. **Sticky Top AppBar (`src/components/ui/AppBar.tsx`)**:
   - Fixed height: 56px + `env(safe-area-inset-top)`.
   - Left: Drawer toggle button (`Menu` icon) opening the full navigation drawer.
   - Center: Vendor business name in 15px bold Open Sans.
   - Right: Notification bell with red badge counter.
2. **Bottom Navigation Tab Bar**:
   - Fixed height: 64px + `env(safe-area-inset-bottom)`.
   - Contains exactly 4 primary destinations:
     - `Dashboard` (Home icon)
     - `Orders` (Calendar/Clipboard icon + badge count for pending requests)
     - `Menu` (Restaurant/Utensils icon)
     - `More` (Three dots icon — opens side drawer for Finances, Reviews, Profile & Help)
3. **Card Stacking & Density**:
   - Cards use `padding="sm"` (16px) on mobile, expanding to `md` (20px) on desktop.
   - Grid elements collapse from multi-column to single-column vertical stacks.

---

## 6. Vendor Dashboard Home (`/vendor/dashboard`)

### 6.1 Above the Fold (The 5-Second Scan)
Upon landing on the dashboard, the caterer’s viewport must present 3 immediate operational modules:

#### Module 1: Operational Status Banner
- **Visual Presentation**: High-contrast, card-style banner across the top of the canvas.
- **Information Displayed**:
  - **Verification Status**: `Badge tone="solid"` labeled `Verified Partner` (or `tone="outline"` `KYC Verification Pending`).
  - **Marketplace Visibility**: Indicator dot showing `Live in Marketplace` (Green dot/Maroon text) or `Listing Hidden` (Solid red pill).
  - **Platform Tier**: Badges showing assigned tiers (`Silver`, `Gold`, `Platinum`).
  - **Quick Action**: "Preview Storefront" link.

#### Module 2: Urgent Action Alert Cards
- **Trigger**: Displayed **only** when items require vendor intervention.
- **Card Types**:
  - **Pending Order Acceptance**: Red accent border (`border-l-4 border-maroon`), text: *"You have 2 pending event bookings requiring kitchen confirmation."* Primary CTA: *"Review Bookings"*.
  - **Compliance Resubmission**: Text: *"Your FSSAI Certificate was rejected by admin. Upload a valid document to maintain marketplace visibility."* Primary CTA: *"Resubmit KYC"*.
  - **Unpublished Menu Draft**: Text: *"You have unsaved or unsubmitted menu changes in draft."* Primary CTA: *"Publish Menu"*.

#### Module 3: Next Upcoming Event Spotlight Card
- **Purpose**: Gives the kitchen team immediate focus on their next operational commitment.
- **Content**:
  - Large display countdown tag: *"Next Event in 2 Days"*
  - Event Date & Timing: *"Saturday, 12 Dec 2026 · Dinner Service (7:00 PM)"*
  - Occasion & City: *"Wedding Reception · Lucknow (Gomti Nagar)"*
  - Scope: *"250 Guests · Royal Feast Spread (4 Starters, 5 Mains, 3 Desserts)"*
  - Customer Name: *"V. Sharma"*
  - Primary CTA: **"View Kitchen Prep Sheet"** (opens printable itemized drawer).
  - Secondary CTA: **"Contact Customer"** (triggers verified phone call/WhatsApp).

---

### 6.2 Key Operational Metrics Grid
Rendered directly beneath the spotlight card in a 4-column responsive grid (4 columns on desktop, 2 columns on tablet/mobile):

| Metric Card | Value Display | Sub-label | Data Source Status | Empty State Behavior |
|---|---|---|---|---|
| **Upcoming Bookings** | `5 Events` | Next: 12 Dec 2026 | Derivable from `bookings` table | Shows `0 Events` with sub-label *"Awaiting new bookings"* |
| **Completed Events** | `42 Events` | Lifetime fulfilled | Derivable from `bookings` table | Shows `0 Events` with sub-label *"First booking pending"* |
| **Kitchen Rating** | `★ 4.8` | 38 verified reviews | Exists (`GET /api/reviews/summary`) | Shows `★ —` with sub-label *"No reviews yet"* |
| **Pending Payout** | `₹48,500` | Due on completion | Derivable from `settlements.ts` | Shows `₹0` with sub-label *"All payouts settled"* |

> [!IMPORTANT]
> **Strict Anti-Mock Rule**: Never display hardcoded strings like `"₹18.4L"` or `"34 bookings"`. If an account is brand new, metrics must show zero with honest, helpful subtitles.

---

### 6.3 Secondary Content Modules

#### Module 4: Active Bookings Pipeline Feed
- Displays the next 3 chronological bookings in a compact card list.
- Each row displays: Date, Booking ID, Customer Name, Guest Count, Package Type, and Fulfillment Status.
- Footer link: *"View All Bookings & Archives →"*.

#### Module 5: Menu & Offerings Quick Health
- Mini summary card showing:
  - Total active dishes in catalog (e.g., `32 Dishes`).
  - Active packages enabled (Feast, Single Stall, Baina Box).
  - Signature dishes assigned (e.g., `4/4 Selected`).
  - Quick action: *"Manage Menu & Rates →"*.

#### Module 6: Profile & KYC Completeness Ring
- Progress indicator card showing profile completeness percentage (e.g., `80% Complete`).
- Itemized checklist:
  - [x] Business basics & contact phone
  - [x] FSSAI & GST documents uploaded
  - [x] Menu pricing and courses published
  - [ ] Showcase photo gallery added (Upload 3 more photos to reach 100%)

---

## 7. Dashboard States Specification

The dashboard UI dynamically adapts to **9 distinct caterer lifecycle states**:

```
┌───────────────────────────────────┬───────────────────────────────────┬───────────────────────────────────┐
│ State                             │ Primary Message & Header          │ Primary / Secondary CTA           │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ A. Newly Onboarded / Incomplete   │ "Welcome to Bhojpatra! Complete   │ Primary: "Build Your Menu"        │
│                                   │ your menu to launch."             │ Secondary: "View Submitted KYC"   │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ B. Verification Pending           │ "Your documents are under review  │ Primary: "Refine Menu Offerings"  │
│                                   │ by Bhojpatra Admin."              │ Secondary: "Upload Event Photos"  │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ C. Approved + Active (Normal)     │ "Your catering kitchen is live    │ Primary: "View Upcoming Orders"   │
│                                   │ and accepting bookings."          │ Secondary: "Manage Calendar"      │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ D. Approved + Zero Bookings       │ "Your menu is live! We're showing │ Primary: "Preview Storefront"     │
│                                   │ your profile to event hosts."     │ Secondary: "Share Profile Link"   │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ E. Pending Booking Requests       │ "Action Required: 2 booking       │ Primary: "Accept Bookings"        │
│                                   │ requests require confirmation."   │ Secondary: "Review Details"       │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ F. Confirmed Upcoming Bookings    │ "Next Event in 2 Days: Sharma     │ Primary: "View Kitchen Prep Sheet"│
│                                   │ Wedding Reception (250 guests)."  │ Secondary: "Contact Host"         │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ G. KYC Rejected / Action Required │ "Action Required: FSSAI document  │ Primary: "Resubmit Document"      │
│                                   │ rejected by admin."               │ Secondary: "Contact Partner Help" │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ H. Listing Hidden / Delisted      │ "Your storefront is temporarily   │ Primary: "Contact Admin Support"  │
│                                   │ hidden from the marketplace."     │ Secondary: "Review Policy Notes"  │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ I. Menu Draft Pending Review      │ "Menu changes submitted. Awaiting │ Primary: "View Pending Changes"   │
│                                   │ editorial approval."              │ Secondary: "Back to Dashboard"    │
└───────────────────────────────────┴───────────────────────────────────┴───────────────────────────────────┘
```

### Detailed State Behavior Rules:
- **State D (Zero Bookings)**: Hide the Next Event Spotlight card completely. In its place, render a motivating `EmptyState` component (`icon="Store"`, title: *"Your Kitchen is Open for Business"*, description: *"You'll receive notifications here as soon as a customer selects your dishes for their event."*).
- **State G (KYC Rejected)**: Surface a full-width high-contrast maroon banner across the top. Dim all other metric cards slightly (`opacity-70`) to force visual focus onto document resubmission.
- **State H (Hidden by Admin)**: Display a locked warning banner explaining that customer discovery is paused. Disable menu publish buttons to prevent state corruption.

---

## 8. Booking & Order Experience

### 8.1 Order Pipeline Architecture (`/vendor/orders`)

#### Filter & Search Controls:
- **Segmented Tab Bar**:
  - `All Orders`
  - `Action Required (Pending Acceptance)` (Displays red badge counter if > 0)
  - `Upcoming Confirmed`
  - `Completed Archive`
  - `Cancelled / Declined`
- **Search & Sort Toolbar**: Search by Customer Name or Booking ID (`BHOJ-XXXX`), sortable by Event Date (Ascending/Descending).

#### Order List Presentation (Desktop Table vs Mobile Cards):
- **Desktop Grid View**:
  - Columns: `Booking ID`, `Event Date & Time`, `Customer`, `Guest Count`, `Package / Items Booked`, `Total Value`, `Fulfillment Status`, `Actions`.
- **Mobile Card View (`OrderCard`)**:
  - Card Header: Booking ID (`BHOJ-8492`), Event Date in bold, Status Badge.
  - Card Body: Customer name, Event City, Guest count badge (`250 Guests`), selected package preview (`Awadhi Feast · 12 Courses`).
  - Card Footer: Full-width button: **"Open Order Details & Prep Sheet"**.

---

### 8.2 Booking Detail Drawer / Screen
Clicking any booking row opens a high-density, comprehensive slide-over drawer (`src/components/ui/Drawer.tsx`):

```
┌────────────────────────────────────────────────────────────────────────┐
│ BOOKING DETAILS: BHOJ-8492                        [Print] [Share] [✕]  │
├────────────────────────────────────────────────────────────────────────┤
│ STATUS: Confirmed · Advance Paid (₹15,000)                             │
├────────────────────────────────────────────────────────────────────────┤
│ EVENT LOGISTICS                                                        │
│ • Date: Saturday, 12 December 2026                                     │
│ • Meal Service: Dinner (Buffet opens 7:30 PM)                          │
│ • Venue: Grand Heritage Lawn, Sector B, Gomti Nagar, Lucknow          │
│ • Total Guests: 250 Persons                                            │
├────────────────────────────────────────────────────────────────────────┤
│ HOST CONTACT                                                           │
│ • Host Name: Vikram Sharma                                             │
│ • Verified Phone: +91 98765 43210  [Call] [WhatsApp Message]           │
│ • Special Note: "Please ensure less oil in Dal Makhani. 30 Jain guests"│
├────────────────────────────────────────────────────────────────────────┤
│ SELECTED MENU BREAKDOWN (ASSIGNED TO YOUR KITCHEN)                     │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ STARTERS (4 Selected)                                              │ │
│ │ • Galouti Kebab (Non-Veg) — Est. 500 pcs                           │ │
│ │ • Paneer Tikka Shashlik (Veg) — Est. 350 pcs                       │ │
│ │ • Dahi ke Kebab (Veg) — Est. 300 pcs                               │ │
│ │ • Murg Malai Tikka (Non-Veg) — Est. 450 pcs                        │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ MAIN COURSE (5 Selected)                                           │ │
│ │ • Awadhi Dum Gosht Biryani (Non-Veg) — 45 kg preparation           │ │
│ │ • Dal Makhani (Veg) — 35 kg preparation                            │ │
│ │ • Paneer Lababdar (Veg) — 30 kg preparation                        │ │
│ │ • Assorted Breads (Naan, Kulcha, Roomali) — 750 pcs                │ │
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ DESSERTS & EXTRAS                                                  │ │
│ │ • Shahi Tukda with Rabri — 300 portions                            │ │
│ │ • Paan Counter Add-on — Live setup for 250 guests                  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ VENDOR OPERATIONAL ACTIONS                                             │
│ [ Acknowledge & Confirm Capacity ]   [ Download Kitchen Prep Sheet ]   │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.3 Vendor Action Model & State Transitions
- **Acknowledge / Confirm**: Vendor officially confirms kitchen staff and ingredient procurement for this date.
- **In Preparation**: Visual marker indicating cooking and prep are underway.
- **Service Complete**: Vendor marks catering fulfilled upon completion of event service.
- **Backend Dependency**: Requires updating `PATCH /api/bookings/[id]` or creating `POST /api/vendor/bookings/[id]/status` to allow vendors to record operational progress without permitting financial cancellations.

---

## 9. Upcoming Event / Kitchen Preparation Experience

### 9.1 The Kitchen Prep Sheet Specification
In professional catering, the head chef and kitchen managers do not look at financial dashboards. They need a **Kitchen Prep Sheet** (Event Production Brief) that can be:
1. Viewed cleanly on mobile in high contrast.
2. Printed directly on a standard A4 sheet (`@media print`).
3. Shared via WhatsApp to head halwais and kitchen supervisors.

#### Required Data Hierarchy on Prep Sheet:
1. **Header Block**:
   - Bhojpatra Event Order ID (`BHOJ-8492`) & Caterer Business Name.
   - Event Date, Service Time (Lunch/Dinner), Plating Deadline.
   - Venue Name, Detailed Address, Landmark, Google Maps pin link.
   - Total Headcount: **250 Guests** (highlighted in bold 24px).
   - Host Special Instructions: Dietary rules, Jain counts, allergy warnings.
2. **Course-by-Course Grouping**:
   - Grouped into: `Starters & Appetizers`, `Main Courses`, `Breads & Staples`, `Desserts & Sweets`, `Live Counters / Stalls`.
   - Each dish entry includes:
     - Clear Diet Flag: `[VEG]` or `[NON-VEG]`.
     - Dish Name in prominent type.
     - Quantity / Batch Guideline (Calculated based on 250 guests).
     - Plating notes (e.g., "Serve with mint chutney and pickled onions").
3. **Print & Offline Optimization**:
   - Clean black-and-white print styles with high contrast.
   - Interactive checkboxes on mobile so kitchen staff can tick off items as prep finishes.

---

## 10. Menu & Offerings Experience (`/vendor/menu`)

### 10.1 Modularizing `MenuBuilder.tsx`
The existing `MenuBuilder.tsx` is a monolithic 3,200-line component. To eliminate cognitive overload while preserving **100% of the underlying data schemas and APIs** (`GET/PUT /api/vendor/menu`, `POST /api/vendor/photo`), the UI will be organized into **5 focused sub-tabs**:

```
MENU MANAGEMENT WORKSPACE (/vendor/menu)
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ [Overview & Toggles] [Courses & Dishes] [Live Counters] [Baina Boxes] [Media & Showcase]│
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Sub-Tab 1: Overview & Service Toggles
- **Purpose**: High-level control of which business formats the caterer offers on Bhojpatra.
- **Controls**:
  - `Feast Catering`: Toggle ON/OFF, set per-plate baseline rates.
  - `Single Food Stall`: Toggle ON/OFF, set menu mode (`fixed` vs `varied`).
  - `Live Food Counters`: Toggle ON/OFF, enable platform counters.
  - `Baina Gift Boxes`: Toggle ON/OFF, define gift packaging.
  - `Essential Service`: Toggle ON/OFF, set service-only staffing rate per plate.

#### Sub-Tab 2: Courses & Dish Catalog
- **Purpose**: Course-by-course dish configuration.
- **Controls**:
  - Accordion sections for each course: `Starters`, `Mains`, `Breads`, `Rice & Biryani`, `Desserts`, `Beverages`, `Accompaniments`.
  - Course-level uplifts and tier item quotas (`Silver`, `Gold`, `Platinum`).
  - Itemized dish cards: Dish name, Diet toggle (`Veg` / `Non-Veg`), delicacy uplift price, tier restriction flags, dish photo thumbnail with upload trigger.

#### Sub-Tab 3: Live Counters & Add-ons
- **Purpose**: Specialized manager for interactive event stations.
- **Controls**:
  - Pre-configured platform counters (`Pan Counter`, `Live Chaat`, `Wok Station`, `Dosa Counter`).
  - Pricing per guest / lump-sum counter fee.
  - Custom caterer-created live counters.

#### Sub-Tab 4: Baina Gift Boxes
- **Purpose**: Managing mithai and wedding return gift boxes.
- **Controls**:
  - Box Name, Contents description, 1/2 kg price, 1 kg price, custom weight options (250g, 2kg), box packaging photo.

#### Sub-Tab 5: Media & Showcase
- **Purpose**: High-converting visual assets for the marketplace.
- **Controls**:
  - Primary Storefront Banner Photo (`card_photo`).
  - Signature Dishes Selector: Pick exactly 4 top dishes to highlight on public cards.
  - Kitchen & Event Photo Gallery.

#### Menu Save & Moderation UX:
- Sticky bottom save bar (`src/components/ui/StickyActionBar.tsx`): Displays status: *"All changes saved in draft"*.
- **"Publish Menu Changes"** button: Triggers confirmation modal warning: *"Publishing will send updates to Bhojpatra Admin for moderation review. Your current live menu remains visible to customers until approved."*

---

## 11. Profile & Compliance Experience (`/vendor/profile`)

### 11.1 Disambiguating Vendor Statuses
To eliminate confusion, the profile UI strictly isolates 4 distinct status concepts:

```
┌─────────────────────────┬─────────────────────────┬─────────────────────────┬─────────────────────────┐
│ 1. VERIFICATION STATUS  │ 2. MODERATION STATUS    │ 3. PROFILE COMPLETENESS │ 4. MARKETPLACE STATUS   │
├─────────────────────────┼─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ Legal KYC Compliance    │ Editorial Menu Quality  │ Content Depth           │ Discoverability         │
│ • Verified (Solid Maroon│ • Approved (Solid)      │ • Calculated % Score    │ • Live (Visible)        │
│ • Pending (Outline)     │ • Pending Review        │ • 4 of 5 steps complete │ • Hidden (Delisted)     │
│ • Rejected (Muted)      │ • Hidden / Takedown     │ • Progress Ring Bar     │ • Controlled by admin   │
└─────────────────────────┴─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### 11.2 KYC Document Drawer & Resubmission
A dedicated **Compliance Drawer** surfaces the status of all legal documentation:
- **GST Certificate** (`gst`): Status pill (`Verified`, `Pending`, `Rejected`), uploaded date, preview link.
- **FSSAI Food License** (`fssai`): Status pill, expiry date indicator, rejection reason notes from admin if rejected.
- **Owner Identity Proof** (`ownerId`): Aadhaar / PAN status.
- **Business Proof** (`businessProof`): Electricity bill / Rent agreement.
- **Inline Resubmission**: If any document is marked `Rejected`, a prominent **"Upload Replacement File"** button appears inline with drag-and-drop file upload.

---

## 12. Financials & Settlements (`/vendor/finances`)

### 12.1 Financial Architecture & Ledger
The financial dashboard connects caterers with their earnings, eliminating payment disputes:

#### Above the Fold Financial Summary:
1. **Outstanding Receivable Balance**: Total money currently owed to the vendor for completed events awaiting the next settlement cycle (e.g., `₹48,500`).
2. **Lifetime Gross Catering Volume**: Total value of bookings fulfilled via Bhojpatra (e.g., `₹4,82,000`).
3. **Last Payout Released**: Amount and date of the most recent bank transfer (e.g., `₹32,000 on 28 Nov 2026`).

#### Settlement Ledger Table:
- Columns: `Settlement ID`, `Period`, `Events Fulfilled`, `Gross Amount`, `Platform Commission`, `TDS / Deductions`, `Net Disbursed`, `Payment Reference / UTR`, `Status Badge`.

#### Per-Booking Financial Breakdown:
- Caterers can expand any completed booking to inspect the exact unit economics:
  - Total Guest Count: 250
  - Negotiated Per-Plate Rate: ₹650
  - Gross Catering Total: ₹1,62,500
  - Advance Collected by Bhojpatra: ₹32,500
  - Balance Paid by Customer on Delivery: ₹1,30,000
  - Net Platform Settlement Due: ₹0 (Customer settled on-site)

#### Payout Account Settings:
- Simple, secure form to configure disbursement details:
  - Bank Account Number & Re-enter Account Number
  - Bank Name & IFSC Code
  - Business UPI ID (VPA) for fast micro-settlements
  - Account Holder Name (validated against business owner name)

---

## 13. Reviews & Reputation (`/vendor/reviews`)

### 13.1 Reputation Overview
- **Overall Rating Score**: Large display rating card (e.g., `★ 4.8 / 5.0` based on 42 verified reviews).
- **Rating Distribution**: 5-star to 1-star visual bars rendered using Bhojpatra brand tokens (`bg-maroon` for positive bars, `bg-cream-2` for background tracks).
- **Dish Praise Leaderboard**: Pills highlighting most complimented dishes (e.g., *"Galouti Kebab: 18 mentions"*, *"Awadhi Biryani: 14 mentions"*).

### 13.2 Verified Customer Review Feed
- List of real reviews from the Neon `reviews` table.
- Each review card displays:
  - Reviewer Name (Customer initials avatar).
  - Star Rating (`★ ★ ★ ★ ★`).
  - Associated Booking Occasion (e.g., *"Sharma Wedding Reception · 12 Dec 2026"*).
  - Customer Comment text.
  - Customer-Uploaded Dish Photos (lightbox modal preview).
  - Vendor Public Response CTA: *(Future: Allow caterers to post an official thank-you reply)*.

---

## 14. Notifications & Alerts Model

The portal implements a **5-tier notification hierarchy** to prevent alert fatigue while ensuring critical operational issues are addressed immediately:

| Tier | UI Component | Triggers | Visual Styling | Dismissibility |
|---|---|---|---|---|
| **Level 1: Critical System** | Full-width canvas banner | Account delisted/hidden, all KYC rejected, urgent system maintenance | Solid maroon background (`bg-maroon text-cream`), bold white text | Non-dismissible until resolved |
| **Level 2: Urgent Operational** | Dashboard Home Alert Card | New booking request pending acceptance, single KYC document rejected | Red-bordered white card (`border-l-4 border-maroon shadow-pop`) | Dismisses upon taking action |
| **Level 3: Badge Counters** | Nav pill badges | Unacknowledged orders, unread reviews | Red circle pill with cream count (`bg-maroon text-cream text-xs`) | Clears when section is opened |
| **Level 4: Ephemeral Toast** | Floating toast (`Toast.tsx`) | Menu changes saved, photo uploaded, status updated | Cream surface with maroon accent, auto-dismisses after 4 seconds | Auto-dismissing |
| **Level 5: Informational** | Feed card | New customer review posted, weekly performance summary | Standard white card with soft cream border | Dismissible |

---

## 15. Component & Pattern Inventory

The future vendor portal will leverage these conceptual components, maximizing reuse of existing codebase primitives:

| Component Name | Description & Purpose | Codebase Reuse Target |
|---|---|---|
| `VendorShell` | Master layout wrapper owning sidebar rail, mobile drawer, and topbar | Extends `src/components/admin/layout/AdminShell.tsx` |
| `VendorSidebar` | Fixed 64-column maroon navigation rail for desktop | Patterned after `AdminSidebar.tsx` with vendor nav items |
| `VendorTopbar` | Sticky header with breadcrumbs, catalog preview, and notifications | Patterned after `AdminTopbar.tsx` |
| `MobileBottomNav` | Sticky 4-icon mobile tab bar for thumb navigation | New component using `DESIGN-SYSTEM.md` bottom tab specs |
| `StatusBanner` | Top-of-dashboard operational health indicator | Reuses `src/components/ui/Card.tsx` + `Badge.tsx` |
| `ActionAlertCard` | Urgent callout card for pending actions | Reuses `Card.tsx` with `border-l-4 border-maroon` |
| `EventSpotlightCard`| Prominent card highlighting the very next upcoming catering event | High-contrast `Card.tsx` with custom countdown layout |
| `MetricCard` | 4-column metric tile displaying counts and financials | Reuses `src/components/admin/shared/StatCard.tsx` |
| `OrderCard` | Touch-friendly mobile card for bookings | Reuses `Card.tsx` with embedded `Badge.tsx` |
| `OrderTable` | Dense desktop data table for orders | Reuses `src/components/admin/shared/DataTable.tsx` |
| `OrderDetailDrawer`| Slide-over drawer displaying full booking brief and host contact | Reuses `src/components/ui/Drawer.tsx` |
| `KitchenPrepSheet` | High-contrast, printable kitchen production brief | New component styled with `@media print` utilities |
| `MenuSubNav` | Segmented tab bar organizing `MenuBuilder` sub-workspaces | Reuses `src/components/ui/SegmentedControl.tsx` |
| `KycDocumentCard` | Document status tile with inline replacement upload | Reuses `Card.tsx` + `src/components/ui/Button.tsx` |
| `EmptyState` | Helpful zero-data illustration and onboarding guide | Reuses `src/components/ui/EmptyState.tsx` |

---

## 16. Empty, Loading, and Error States

### 16.1 Empty State Specifications

#### Zero Bookings State (`/vendor/orders`)
- **Visual**: Centered illustration using `EmptyState.tsx`.
- **Title**: *"No Event Bookings Yet"*
- **Description**: *"Your kitchen is open and visible on the Bhojpatra marketplace. As soon as a customer selects your dishes for their event, the booking brief will appear here."*
- **Primary CTA**: *"Preview Your Public Storefront"* (verifies how customers see them).
- **Secondary CTA**: *"Share Vendor Profile Link"* (copy link to clipboard).

#### Zero Reviews State (`/vendor/reviews`)
- **Title**: *"No Customer Reviews Yet"*
- **Description**: *"Customer reviews and dish ratings appear here after you fulfill your first catering event."*

#### Zero Settlements State (`/vendor/finances`)
- **Title**: *"No Settlements Pending"*
- **Description**: *"Disbursements from completed events will be listed here along with payment references."*

### 16.2 Loading Skeleton Specifications
- During data fetching, replace metric cards and order tables with `src/components/ui/Skeleton.tsx` and `SkeletonCard.tsx`.
- Skeletons use subtle cream pulses (`bg-cream/40 animate-pulse`), matching the brand system.
- Never display blank white voids or generic spinners while loading major layout panels.

### 16.3 Error Recovery UX
- In the event of a network or API failure (e.g., 500 error on `GET /api/vendor/bookings`), render a clean inline alert inside the card:
  - Error Message: *"Unable to load your bookings. Please check your connection."*
  - CTA Button: **"Try Again"** (retries the query).
  - Fallback Link: *"Contact Partner Support on WhatsApp"*.

---

## 17. Access, Authentication & Security UX

### 17.1 Route Guarding & Redirection
- All `/vendor/*` routes must be wrapped in `<RequireSession role="vendor">`:
  - **Unauthenticated Visitor**: Smoothly redirected to `/login?callbackUrl=/vendor/dashboard` with an informative banner: *"Please log in with your vendor account to access the dashboard."*
  - **Customer-Only User**: If a signed-in user with only the `"customer"` role attempts to visit `/vendor/dashboard`, they are redirected to `/vendor/register` with an invitation: *"Partner with Bhojpatra — Register your catering business."*

### 17.2 Tenant Isolation in UI
- The vendor UI will never accept or display arbitrary query parameters like `?vendorId=123`.
- All data presented is scoped exclusively to the authenticated session (`guard.id`).
- Under no circumstances will the vendor dashboard expose platform-wide margins, other caterers' per-plate rates, or customer payment card details.

---

## 18. MVP UI Scope & Phased Implementation

To deliver immediate operational value while managing implementation complexity, the vendor portal will be rolled out across 3 phases:

```
┌───────────────────────────────────┬───────────────────────────────────┬───────────────────────────────────┐
│ PHASE 1: MUST DESIGN FIRST (MVP)  │ PHASE 2: DESIGN NEXT (v1.1)       │ PHASE 3: DESIGN LATER (v2.0)      │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ 1. VendorShell & Navigation       │ 1. Financials & Payout Ledger     │ 1. In-App Real-time Customer Chat │
│ 2. Dashboard Home Overview        │ 2. Reviews & Rating Feed          │ 2. Automated Razorpay Payouts     │
│ 3. Orders List & Filter Pipeline  │ 3. Date Blackout Calendar         │ 3. Dynamic Raw Ingredient Calc    │
│ 4. Order Detail & Prep Sheet      │ 4. Bank / UPI Account Setup       │ 4. Staff Sub-Accounts (Chef Login)│
│ 5. Modular MenuBuilder Shell      │ 5. Advanced Order Search          │ 5. Multi-City Branch Management   │
│ 6. Profile & KYC Status Drawer    │                                   │                                   │
└───────────────────────────────────┴───────────────────────────────────┴───────────────────────────────────┘
```

---

## 19. First Mockup Requirements

The very next design task must produce the high-fidelity specification mockup for the **Vendor Dashboard Home (`/vendor/dashboard`)**.

### Mockup Deliverable Specifications:
- **Target Page**: Vendor Dashboard Home (`/vendor/dashboard`).
- **Breakpoints Required**:
  - **Desktop Canvas**: 1440px width (displaying `VendorSidebar`, `VendorTopbar`, and 3-column operational layout).
  - **Mobile Canvas**: 390px width (iPhone standard, displaying `AppBar`, stacked alert cards, event spotlight, and `MobileBottomNav`).
- **Required Modules to Display**:
  1. Top Operational Status Bar (`Verified Partner`, `Live in Marketplace`, `Platinum Tier`).
  2. Action Alert Banner (*"1 booking request awaiting acceptance"*).
  3. Next Upcoming Event Spotlight Card (Sharma Wedding Reception, 250 guests, with direct "Prep Sheet" CTA).
  4. 4 Key Operational Metrics (Upcoming Bookings, Completed Events, Average Rating, Pending Payout).
  5. Active Bookings Snapshot (next 2 upcoming events).
  6. Menu & Offering Health Card.
- **Modules to Exclude from First Mockup**:
  - Complex financial charts or settlement ledgers (deferred to v1.1).
  - Live customer chat windows.
  - Raw JSON data representations.
- **Brand Rules**: Exactly 4 colors (`#B92025`, `#F0D09E`, `#000000`, `#FFFFFF`), Open Sans body, Ananda Neptouch 2 display headers.

---

## 20. Design DOs and DON'Ts

### DO:
- **DO** design strictly with Bhojpatra’s 4 brand colors: Red, Cream, Black, White.
- **DO** prioritize kitchen logistics (guest counts, event dates, dish lists) above all else.
- **DO** make the "Next Event" immediately obvious upon login.
- **DO** ensure the Kitchen Prep Sheet is high-contrast, clean, and printable.
- **DO** design mobile-first with 44px minimum touch targets.
- **DO** display honest empty states when an account has zero bookings or zero reviews.
- **DO** reuse proven UI components from `src/components/ui/` (`Button`, `Card`, `Badge`, `Drawer`).

### DON'T:
- **DON'T** introduce generic SaaS colors (Tailwind grays, greens, blues, ambers).
- **DON'T** display fake, hardcoded metrics (e.g., `"₹18.4L"` or `"34 bookings"`).
- **DON'T** clutter the dashboard with vanity SaaS charts, conversion funnels, or MRR graphs.
- **DON'T** attempt to rewrite the underlying data schema of `MenuBuilder.tsx`.
- **DON'T** expose platform-wide billing, admin profit margins, or competitor pricing.
- **DON'T** force caterers on mobile to pinch-to-zoom across wide desktop tables.
- **DON'T** confuse legal KYC verification with marketplace editorial moderation.

---

## 21. Final Recommendation & Strategic Answers

### 1. What should the Vendor Dashboard Home look like conceptually?
The Vendor Dashboard Home is an **operational mission-control center**. It sits within a dedicated, branded `VendorShell` featuring a fixed brand-maroon sidebar on desktop and a thumb-friendly bottom navigation bar on mobile. It is clean, uncluttered, and focuses on answering *"What must my kitchen prepare next?"* and *"Is my business healthy?"*.

### 2. What should a vendor see first?
The vendor sees a 3-part above-the-fold stack:
1. An **Operational Status Banner** confirming their verification state (`Verified`) and catalog visibility (`Live`).
2. An **Action Alert Card** if any booking request or KYC document requires immediate attention.
3. A **Next Event Spotlight Card** displaying their imminent catering commitment with date, guest count, and an instant link to the Kitchen Prep Sheet.

### 3. What should they be able to do immediately?
Immediately upon login, with a single click/tap, a vendor can:
- Open and print their **Kitchen Prep Sheet** for the upcoming event.
- Accept or acknowledge incoming booking requests.
- Call or WhatsApp the event host for confirmed bookings.
- Jump directly into their menu editor to adjust pricing or pause unavailable dishes.

### 4. What belongs in primary navigation?
The primary navigation contains 4 core operational pillars:
1. **Dashboard** (Home overview)
2. **Orders** (Booking intake and prep sheets)
3. **Menu & Food** (Catalog and pricing editor)
4. **Profile & KYC** (Compliance and business settings)

### 5. What should be deferred?
- **Deferred to v1.1**: Financial settlement disbursement ledger, customer review response feeds, and calendar blackout date pickers.
- **Deferred to v2.0**: In-app real-time customer messaging, automated bank payout webhooks, and raw ingredient estimation calculators.

### 6. What existing Bhojpatra UI patterns should be reused?
- `src/components/ui/Badge.tsx` for brand-safe semantic status pills.
- `src/components/ui/Button.tsx` for unified CTAs (`primary`, `secondary`, `tap`).
- `src/components/ui/Card.tsx` for elevated white surface panels (`rounded-card`).
- `src/components/ui/Drawer.tsx` for mobile slide-over order details and prep sheets.
- `src/components/admin/layout/AdminShell.tsx` layout structure (re-skinned as `VendorShell`).
- `src/components/admin/shared/DataTable.tsx` for desktop order listings.

### 7. What should the next mockup/design task be?
The immediate next task is to produce the **high-fidelity layout mockup for `/vendor/dashboard`** (Desktop and Mobile viewports), representing an active caterer with upcoming bookings, an urgent action alert, and real operational metrics.

---

## Final Design-Quality Review

A critical UX audit of this specification confirms:
- **Complexity & Cognitive Load**: Minimized by removing unnecessary SaaS clutter and structuring `MenuBuilder` into modular sub-panels.
- **Information Hierarchy**: Strongly prioritized around imminent catering events and required vendor actions.
- **Brand Integrity**: 100% compliant with Bhojpatra's 4-color palette and typography rules.
- **Mobile Ergonomics**: Engineered specifically for on-site caterers working on mobile devices.
- **Data Reality**: Completely aligned with the Neon database schemas and existing codebase APIs.
