# Bhojpatra Vendor Dashboard Requirements

---

## 1. Purpose

### 1.1 Target Audience
The **Bhojpatra Vendor Dashboard (Vendor Portal)** is designed for **verified catering partners, cloud kitchens, specialized food stall operators, and halwais/mithai artisans** who sell feasts, individual food counters, and Baina gift boxes on the Bhojpatra marketplace.

### 1.2 Core Problem to Solve
Currently, caterers on Bhojpatra have no operational visibility or control once their profile is published. While customers can discover them in the catalog and add their dishes to bookings, the vendor:
- Cannot see incoming booking requests or event orders.
- Cannot confirm or decline availability for specific dates.
- Cannot see how much money they have earned or what Bhojpatra owes them in settlements.
- Cannot view customer ratings, dish feedback, or operational metrics.
- Is forced to treat the current `/vendor/dashboard` merely as a static menu editor.

The Vendor Dashboard must transform Bhojpatra from a **one-way menu submission directory** into a **two-way operational operating system** for event caterers.

### 1.3 What Vendors Must Be Able to Accomplish
From the future Vendor Portal, a catering partner should be able to:
1. **Monitor Event Pipeline**: View upcoming booked events, event dates, guest counts, serving locations, and itemized course menus.
2. **Acknowledge / Accept Orders**: Review booking briefs, custom notes, and confirm kitchen capacity.
3. **Manage Live Offerings & Pricing**: Update dish rosters, per-plate rates, package tier allocations, and live counter add-ons without breaking existing orders.
4. **Track Financials & Settlements**: Monitor gross event value, platform commissions, net payouts due, and past disbursement dates.
5. **Maintain Brand & Trust Profile**: Track KYC document verification status, admin moderation states, photo galleries, and customer reviews.
6. **Control Kitchen Availability**: Define blackout dates, maximum guests per event, and daily booking limits to prevent overbooking.

### 1.4 Contrast with Existing `/vendor/dashboard`
| Attribute | Existing `/vendor/dashboard` | Future Vendor Dashboard / Portal |
|---|---|---|
| **Primary Focus** | Menu configuration only (`MenuBuilder.tsx`) | Complete business management & operations |
| **Orders & Bookings** | Completely absent | Full order lifecycle: incoming requests, active orders, historical archive |
| **Financials** | Non-existent | Real-time earnings summary, pending settlements, disbursement records |
| **Calendar & Dates** | Static lead days field only | Interactive calendar, blackout dates, capacity management |
| **Reviews & Feedback** | None (ratings only visible on public catalog) | Itemized customer reviews, per-vendor star ratings, dish feedback |
| **KYC & Account Status** | Static badge (`Verified` / `Pending`) | Interactive onboarding progress, document resubmission, tier status |
| **Information Hierarchy** | Single 3,200-line form view | Multi-tab modular workspace (Home, Orders, Calendar, Menu, Payouts, Profile) |

---

## 2. Current Vendor Experience

### 2.1 The Current Vendor Journey
Based on the codebase audit, the current vendor experience consists of disconnected touchpoints:

```
Public Site (Navbar)
   │
   ├─► "Partner With Us" ──► "As a Vendor" (/vendor/register)
   │     ⚠️ Blocker: Page guarded by <RequireSession role="vendor">
   │        Anonymous visitors are kicked to /login with no explanation.
   │
   ▼
Registration / Account Creation (/signup?type=vendor)
   │
   ├─► Auth record created in Neon `users` table:
   │   role: "vendor", accounts: ["customer", "vendor"]
   │
   ▼
Post-Login Redirection (/dashboard)
   │
   ├─► ⚠️ Redirection lands on Customer Merged Hub (/dashboard), NOT /vendor/dashboard.
   ├─► Displays a "Vendor" card with HARDCODED mock stats ("₹18.4L", "34 bookings").
   ├─► Vendor must click "Complete business profile & KYC" ──► /vendor/register
   │   or "Open vendor dashboard" ──► /vendor/dashboard
   │
   ▼
Application Submission (/vendor/register)
   │
   ├─► 7-step wizard (VendorRegister.tsx) collects business details, KYC docs, initial packages.
   ├─► Writes to `vendor_applications` and `kyc_documents` in Neon.
   ├─► Status set to "Pending".
   │
   ▼
Admin Approval (Offline / Admin Console)
   │
   ├─► Admin reviews at /admin/vendor-approvals.
   ├─► Flips application to "Verified" and assigns tiers (Silver, Gold, Platinum).
   │
   ▼
Menu Construction (/vendor/dashboard)
   │
   ├─► Caterer opens /vendor/dashboard (unguarded route).
   ├─► Component calls GET /api/vendor/menu to prefill application data.
   ├─► Caterer fills out monolithic MenuBuilder form (courses, dishes, uplifts, photos).
   ├─► Clicks "Publish Menu" (PUT /api/vendor/menu) ──► moderation set to "Pending".
   │
   ▼
Marketplace Live & Blind Execution
   │
   ├─► Admin approves menu in /admin/menus.
   ├─► Caterer appears in customer catalog (/vendors) and booking wizard (/book).
   └─► ⚠️ DEAD END: Customers book the caterer, but the caterer receives ZERO notifications,
       has NO orders tab, and cannot see event details or earnings anywhere on the site.
```

### 2.2 Limitations and Confusing Friction Points
1. **The Onboarding Paradox**:
   - [`src/app/vendor/register/page.tsx:15-17`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/vendor/register/page.tsx#L15-L17) requires `<RequireSession role="vendor">`. An unauthenticated visitor clicking "Partner With Us" -> "As a Vendor" in the navbar cannot access the registration form.
2. **Missing Guard on Menu Builder**:
   - In contrast to the registration page, [`src/app/vendor/dashboard/page.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/vendor/dashboard/page.tsx) has **no `<RequireSession>` guard**. Unauthenticated users load the page, see a blank form, and receive silent 401 API failures.
3. **Misleading Mock Metrics**:
   - In [`src/components/dashboard/AccountsDashboard.tsx:232-234`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/dashboard/AccountsDashboard.tsx#L232-L234), the vendor section displays hardcoded mock strings (`"₹18.4L" Total Earnings`, `"34" Confirmed Bookings`, `"2" New Requests`, `"4.9" Rating`) imported from [`src/lib/data.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/data.ts). Vendors see fake figures unrelated to their real account.
4. **Complete Order Blindness**:
   - Bookings stored in the `bookings` table record which caterer was selected (`vendors?: BookedVendor[]`), but the only user permitted to query bookings is the ordering customer or the platform admin. Vendors have zero access to their order stream.
5. **No Financial Link**:
   - The platform calculates vendor settlements internally (`src/lib/settlements.ts`) by aggregating completed bookings, but there is no screen or API for vendors to view their balances, and no mechanism to store payout bank accounts or UPI IDs.

---

## 3. Vendor Goals and Primary Jobs-to-be-Done

### Prioritized Jobs-to-be-Done (JTBD)

| Priority | Job-to-be-Done | Core User Need | Why It Matters on Bhojpatra |
|:---:|---|---|---|
| **P0** | **Review & Acknowledge New Bookings** | "I need to know immediately when a customer books my catering so I can procure ingredients and schedule kitchen staff." | Solves the critical operational blind spot. Without this, booked events cannot be fulfilled reliably. |
| **P0** | **View Upcoming Event Logistics** | "I need an itemized breakdown of each event: date, venue city, guest count, and the exact dishes/quantities ordered." | Caterers need precise operational details (e.g. 250 guests, 4 starters, Galouti Kebab, Biryani) to prepare. |
| **P0** | **Manage Menu, Pricing & Offerings** | "I need to add new dishes, update per-plate prices, manage Baina boxes, and pause unavailable items." | Preserves and enhances the existing `MenuBuilder` core capability in a dedicated tab. |
| **P0** | **Monitor Verification & Moderation State** | "I need to know whether my profile is live for customers, pending review, or hidden by admin." | Directly affects caterer business revenue and clarifies why they are or aren't receiving orders. |
| **P1** | **Track Earnings & Settlement Status** | "I need to see what I earned from completed events, what advance was collected, and when Bhojpatra will pay me." | Prevents payment disputes and builds trust with vendor partners. |
| **P1** | **Manage Kitchen Availability & Dates** | "I need to block dates when my kitchen is fully booked so I don't receive impossible orders." | Currently, vendors can only set static lead days; calendar blocking is essential for high wedding seasons. |
| **P1** | **Track Ratings & Customer Reviews** | "I need to see what customers said about my food and service to maintain quality." | Real reviews exist in the database (`reviews` table); vendors currently cannot view their own feedback. |
| **P2** | **Update Business Profile & Media** | "I need to refresh my kitchen story, showcase new event photos, and update capacity limits." | Enhances catalog appeal and conversion on `/vendors/[id]`. |
| **P2** | **Manage Payout Details** | "I need to store and update my bank account / UPI ID to receive automatic settlements." | Currently missing from the data model entirely. |

---

## 4. Vendor Dashboard Information Architecture

The proposed Vendor Portal should be structured into **7 clear, cohesive sections**:

```
VENDOR PORTAL (/vendor/*)
├── 1. Overview (Dashboard Home)
│   ├── Quick Status Banner (Verification / Moderation / Alerts)
│   ├── Operational Snapshot (Upcoming events, today's status, pending actions)
│   ├── Performance Summary (Live rating, monthly volume, pending payout)
│   └── Quick Links (Edit Menu, View Calendar, Support)
│
├── 2. Bookings & Orders (/vendor/orders)
│   ├── Active / Upcoming Orders
│   ├── Action Required (Pending confirmation/acknowledgment)
│   ├── Order Detail View (Customer contact, guest count, menu spread, notes)
│   └── Past / Completed Archive
│
├── 3. Event Calendar & Availability (/vendor/calendar)
│   ├── Monthly / Weekly View of Booked Events
│   ├── Date Blocking / Blackout Management (Mark date fully booked)
│   └── Daily Event Capacity Tracker (vs maxEventsPerDay)
│
├── 4. Menu & Services (/vendor/menu)
│   ├── Course & Dish Catalog (Starters, Mains, Desserts, Uplifts)
│   ├── Offering Toggles (Feast, Single Stall, Live Counters, Baina Boxes)
│   ├── Baina Box Packaging & Pricing Editor
│   └── Pricing & Package Tier Alignment (Silver / Gold / Platinum)
│
├── 5. Financials & Settlements (/vendor/finances)
│   ├── Outstanding Balance Due
│   ├── Completed Payout History (Disbursements by Bhojpatra)
│   ├── Per-Order Financial Breakdown (Gross, Net, Deductions)
│   └── Payout Account Settings (Bank / UPI details)
│
├── 6. Reviews & Performance (/vendor/reviews)
│   ├── Aggregate Star Rating & Review Count
│   ├── Customer Review Feed (Filtered to this vendor)
│   └── Per-Dish Rating Highlights
│
└── 7. Profile & Compliance (/vendor/profile)
    ├── Business Basics (Name, City, Cuisines, Capacity)
    ├── KYC Compliance & Document Status (GST, FSSAI, ID Proof)
    ├── Photo Gallery Management (Card photo, gallery uploads)
    └── Support & Helpdesk Link
```

### Detailed Section Breakdown

| Section Name | Purpose | Information Displayed | Actions Available | Backend Status |
|---|---|---|---|---|
| **Overview (Home)** | Immediate operational pulse check | Verification badge, next event countdown, action-required alerts, quick stats | Jump to order, toggle emergency date block, view menu status | Requires new aggregation endpoint |
| **Bookings & Orders** | Order intake and logistics management | Order ID, customer name, phone, event date, city, guest count, menu items, notes | Acknowledge order, download order sheet PDF, mark prepared | Requires new vendor bookings query & patch API |
| **Calendar & Availability** | Prevent overbooking and schedule capacity | Calendar grid with booked dates, guest totals per day, blocked dates | Block/unblock date, adjust max daily capacity | Requires new vendor calendar/blackout data store |
| **Menu & Services** | Manage public marketplace catalog | Courses, dishes, prices, photos, quotas, live counters, Baina boxes | Add/edit dish, upload photo, pause dish, publish changes | **Exists** (`/api/vendor/menu`, `/api/vendor/photo`) |
| **Financials & Settlements** | Financial transparency and payout tracking | Total gross, platform deductions, net receivable, settled disbursements | View order settlement statement, update payout UPI/Bank | Partially exists in Admin; requires vendor financial API |
| **Reviews & Performance** | Quality control and reputation monitoring | Verified star rating, review comments, event occasion, dish mentions | Read reviews, filter by star rating | Exists in DB (`reviews` table); requires vendor query API |
| **Profile & Compliance** | Maintain legal trust and brand presence | Business bio, service cities, KYC doc statuses (Verified/Rejected), gallery | Update bio, resubmit rejected KYC documents, manage photos | Partially exists (`vendorApplications`, `kyc_documents`) |

---

## 5. Vendor Dashboard Home

### 5.1 Primary Information (Above the Fold)
Upon loading the dashboard, the caterer must immediately absorb:
1. **Operational Status Bar**:
   - **Verification State**: `Verified` (green) or `Pending Verification` (amber).
   - **Marketplace Visibility**: `Live on Marketplace`, `Pending Admin Review`, or `Hidden by Admin`.
   - **Assigned Tiers**: Badges indicating platform tier participation (`Silver`, `Gold`, `Platinum`).
2. **Action-Required Callouts (Alert Cards)**:
   - *Example 1*: "You have 2 upcoming bookings for this weekend requiring confirmation."
   - *Example 2*: "Your FSSAI Certificate was rejected by admin. Please resubmit."
   - *Example 3*: "Your published menu has unsaved draft changes."
3. **Next Upcoming Event Highlight**:
   - Prominent spotlight card showing the very next event: Date, Time, Occasion, City, Guest Count, and a direct "View Menu Sheet" button.

### 5.2 Key Metrics Matrix

| Metric | Source Status in Current Codebase | Proposed Backend Resolution |
|---|---|---|
| **Upcoming Bookings (Count)** | **Missing**: Bookings are not queryable by vendor | Query `bookings` table where `vendors` array contains vendor ID and `eventDate >= today` |
| **Total Completed Events** | **Missing**: Only exists as hardcoded mock `34` in `data.ts` | Count `bookings` where vendor is present and `status === 'Completed'` |
| **Average Rating** | **Derivable**: Calculated in `GET /api/reviews/summary` | Aggregate rows in `reviews` where `vendorId === vendor.id` |
| **Pending Payout (₹)** | **Derivable**: Computed in `deriveSettlements()` in `settlements.ts` | Sum `order.paid` minus refunds for un-settled completed orders for this vendor |
| **Profile Completeness (%)** | **Derivable**: Checks fields on `LiveVendorRecord` | Compute percentage: Bio + Card Photo + Min 4 Dishes + KYC Verified + Gallery |

### 5.3 Priority Actions
Surfaced in order of operational urgency:
1. **Urgent**: Unacknowledged booking requests with event dates within 7 days.
2. **Compliance**: Rejected KYC documents needing resubmission.
3. **Catalog**: Unpublished draft menu edits (moderation = `Pending`).
4. **Availability**: Approaching daily event limit (`maxEventsPerDay`).

---

## 6. Booking Requirements

### 6.1 Current Capability vs Future Requirement

#### Current Capability (What Exists in Codebase Today):
- Bookings are stored in Neon `bookings` table via `createStore<StoredOrder>` ([`src/app/api/bookings/route.ts:102`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/bookings/route.ts#L102)).
- Stored booking contains:
  ```typescript
  interface StoredOrder {
    id: string; // e.g. "BHOJ-8492"
    userId: string; // ID of the customer who booked
    customer: string; // Customer name
    phone: string; // Customer phone
    date: string; // "12 Dec 2026"
    eventDateISO?: string; // "2026-12-12"
    city: string; // "Lucknow"
    guests: number; // 250
    amount: number; // Total price
    paid: number; // Advance paid
    status: BookingStatus; // "Pending" | "Confirmed" | "Completed" | "Cancelled"
    vendor: string; // Joined display name: "Awadhi Dastarkhwan, Royal Caterers"
    vendors?: BookedVendor[]; // [{ id: "awadhi-dastarkhwan", name: "Awadhi Dastarkhwan" }]
    receipt: string; // Plain-text receipt
    invoice?: InvoiceData; // Structured items breakdown
  }
  ```
- **Access Control Today**:
  - `GET /api/bookings/mine` strictly filters `o.userId === user.id` (returns only bookings created by the signed-in customer).
  - `PATCH /api/bookings/[id]` strictly checks `!isAdmin && order.userId !== guard.id` -> returns 403.
  - **Result**: Vendors are completely locked out of reading or modifying bookings.

#### Future Requirements for Vendor Portal:

1. **Vendor-Specific Booking Query**:
   - New endpoint: `GET /api/vendor/bookings`
   - Security: Must require `role === "vendor"`.
   - Resolution Logic: Look up the authenticated vendor's ID (`findVendorByOwner(guard.id)`), then filter `bookings` where `o.vendors.some(v => v.id === vendor.id)` or `o.vendor.includes(vendor.business)`.
   - Support query filters: `?status=upcoming|completed|all&page=1&pageSize=10`.

2. **Required Order Information for Caterers**:
   Each booking view for a vendor must display:
   - **Booking Reference**: `id` (e.g. `BHOJ-9281`) and booking timestamp.
   - **Event Logistics**: Event date, meal timing (Lunch/Dinner), venue city, venue address/notes.
   - **Guest Scope**: Total guest count.
   - **Catering Breakdown**:
     - For Feast Bookings: Specific courses assigned to this vendor and selected dish names.
     - For Single Stall: Stall type, selected menu type (`fixed` vs `varied`), item list.
     - For Live Counter: Specific counter booked (e.g. "Pan Counter", "Live Pasta").
     - For Baina Box: Box name, quantity ordered, custom box sizes.
   - **Customer Context**: Customer name and phone number (for verified event coordination).
   - **Special Instructions**: Customer `note` field (dietary restrictions, setup timing).

3. **Vendor Order Lifecycle & Status Transitions**:
   Vendors should not be able to cancel or mark bookings as completed financially (that remains customer/admin controlled), but should have **operational acknowledgment states**:
   - `Acknowledged / Accepted`: Vendor confirms kitchen capacity for the event date.
   - `In Preparation`: Operational marker indicating ingredient procurement underway.
   - `Delivered / Fulfilled`: Operational marker indicating catering service executed.

---

## 7. Menu / Services Requirements

### 7.1 Existing Capabilities in `MenuBuilder.tsx`
The vendor menu system is currently the most sophisticated vendor module in the repository ([`src/components/vendor/MenuBuilder.tsx`](file:///c:/Users/Zeeshaan/Bhojpatra/src/components/vendor/MenuBuilder.tsx), [`src/lib/vendorMenus.ts`](file:///c:/Users/Zeeshaan/Bhojpatra/src/lib/vendorMenus.ts)).

The Vendor Portal must preserve all existing data capabilities:
- **Course Configuration**:
  - Enable/disable platform courses (`Starters`, `Mains`, `Breads`, `Rice & Biryani`, `Desserts`, `Beverages`, `Accompaniments`, `Live Counters`).
  - Set baseline per-plate rate uplift (`perPlate`).
  - Tier-specific dish quotas (`tierItems`: Silver = 2, Gold = 4, Platinum = 6).
  - Tier-specific per-plate pricing (`tierPerPlate`).
- **Dish Management**:
  - Dish name, diet flag (`Veg`, `Non-Veg`), delicacy price (for Single Stall).
  - Dish photos uploaded to Vercel Blob via `/api/vendor/photo` with automatic orphan cleanup.
  - Feast band restrictions (`tiers`: restrict premium dishes to Platinum only).
- **Specialized Offering Types**:
  - **Single Stall**: Configure menu style as `fixed` (whole published spread) or `varied` (guest selects delicacies).
  - **Live Counters & Add-ons**: Declare support for platform add-ons (`Pan`, `Chaat`, `Live Wok`), custom pricing, and vendor-added extras.
  - **Baina Boxes**: Box name, contents, 1/2 kg price, 1 kg price, custom sizes (250g, 2kg), and box photos.
  - **Essential Service**: Service-only tier rate per guest and custom inclusion checklists.
  - **Signature Dishes**: Select up to 4 dishes to feature on marketplace catalog cards.

### 7.2 Conceptual Refactoring for the Future Dashboard
Currently, `MenuBuilder.tsx` is an overwhelming 3,200-line monolithic component. In the future portal:
- It should be modularized into sub-tabs under `/vendor/menu`:
  1. `Menu Overview & Offerings`: Toggle categories (Feast, Stalls, Baina, Essential).
  2. `Courses & Dishes`: Dedicated course-by-course editor.
  3. `Live Counters & Add-ons`: Specialized counter manager.
  4. `Baina Gift Boxes`: Dedicated box catalog and pricing.
- **Save/Publish Safety**:
  - Maintain the moderation trigger: Editing an active menu marks `moderation = 'Pending'` for admin re-review, while existing published dishes remain live to prevent catalog drops.

---

## 8. Vendor Profile and Verification

### 8.1 Verification & Moderation State Machine

```
[Application Submitted] ──► Status: "Pending"
                                │
                 ┌──────────────┴──────────────┐
                 ▼                             ▼
         [Admin Approves]              [Admin Rejects]
                 │                             │
                 ▼                             ▼
       Status: "Verified"              Status: "Rejected"
       Assigned: Tiers (Silver/Gold/Plat)     (Vendor can resubmit KYC)
                 │
                 ▼
       [Vendor Publishes Menu]
                 │
                 ▼
       Moderation: "Approved" (Live in catalog & wizard)
                 │
                 ├─────────────────────────────┐
                 ▼                             ▼
       [Subsequent Menu Edit]         [Admin Takedown]
                 │                             │
                 ▼                             ▼
       Moderation: "Pending"          Moderation: "Hidden"
       (Live until re-review)         (Completely delisted from site)
```

### 8.2 What the Vendor Needs to See in Profile & Compliance
1. **Verification Timeline**:
   - Current status (`Pending`, `Verified`, `Rejected`).
   - Admin review timestamp.
   - Assigned marketplace tiers.
2. **KYC Document Status Drawer**:
   - Table of uploaded documents:
     - GST Certificate (`gst`)
     - FSSAI License (`fssai`)
     - Owner ID Proof (`ownerId`)
     - Business Proof (`businessProof`)
   - Document verification pill for each (`Verified`, `Pending`, `Rejected`).
   - Direct "Upload New Document" button if an individual document is rejected.
3. **Business Profile Fields**:
   - Business Name, Contact Phone, City, State, Service Cities.
   - Cuisine Specializations (Awadhi, Mughlai, North Indian, etc.).
   - Capacity Constraints: Max Guests Per Event, Max Events Per Day.
   - Google Reputation: Imported Google rating and review count.

---

## 9. Earnings / Settlements

### 9.1 Existing Financial Architecture (Current State)
- Customer payments are recorded in Neon `payments` table via `/api/payments/razorpay/verify` or manual UPI logging.
- When an order completes, Bhojpatra's admin settlement service (`src/lib/settlements.ts`) derives payouts:
  - Aggregates all bookings where `status === 'Completed'`.
  - Groups by `order.vendor` string per month (`YYYY-MM`).
  - Computes: $\text{Gross Collected} - \text{Refunds} = \text{Net Owed}$.
  - ID Format: `STL-<YYYYMM>-<vendor-slug>`.
  - When an admin marks a payout paid, it writes to the `settlements` table (`status: "Settled"`).
- **The Gap**: This data is 100% Admin-facing (`/admin/settlements`). **Vendors have zero access to this settlement table or logic.**

### 9.2 Future Vendor Financial Requirements
1. **Vendor Financial Endpoint**:
   - New endpoint: `GET /api/vendor/finances`
   - Security: Must require `role === "vendor"`.
   - Returns:
     - **Lifetime Gross Bookings Value (₹)**
     - **Current Unsettled Balance (₹)** (completed events awaiting platform payout).
     - **Settlement Disbursement Ledger**: Past payouts released by Bhojpatra (Date, Settlement ID, Amount, Payment Reference).
     - **Per-Event Breakdown**: Event Date, Booking ID, Total Guest Count, Per-Plate Rate, Paid Advance, Due from Customer on Delivery.
2. **Payout Account Configuration**:
   - Add fields to `LiveVendorRecord` or new `vendor_payout_settings` store:
     - Bank Account Number, Bank Name, IFSC Code.
     - Business UPI ID (VPA).
     - Account Holder Name (validated against owner name).

---

## 10. Reviews and Vendor Performance

### 10.1 Existing Review Data Architecture
- Reviews are stored in Neon `reviews` table ([`src/app/api/reviews/route.ts:7-33`](file:///c:/Users/Zeeshaan/Bhojpatra/src/app/api/reviews/route.ts#L7-L33)).
- Key Schema Attributes:
  - `id`: `${bookingId}:${vendorKey}`
  - `bookingId`: Associated booking
  - `vendorId`: Associated vendor ID (e.g. `awadhi-dastarkhwan`)
  - `vendor`: Display name of the vendor
  - `rating`: 1 to 5 stars
  - `comment`: Customer text feedback
  - `images`: Array of customer-uploaded dish photos
  - `createdAt`: ISO timestamp
  - `hidden`: Boolean (admin moderation flag)
- **Aggregation Already Implemented**: `GET /api/reviews/summary` calculates average rating and total review count per vendor (`byId` and `byName`).

### 10.2 Future Vendor Review Portal Requirements
1. **Vendor Review Feed Endpoint**:
   - New endpoint: `GET /api/vendor/reviews`
   - Returns all unhidden review rows matching the vendor's ID or business name slug.
2. **Review Management Interface**:
   - Overall rating card (e.g. `★ 4.8 / 5.0` based on 42 verified customer reviews).
   - Customer review cards: Reviewer name, occasion (e.g. "Wedding Reception"), star rating, comment, event date, customer-uploaded event photos.
   - Future consideration: Vendor response/acknowledgment comment.

---

## 11. Notifications and Important States

Events that must trigger visual alerts in the Vendor Portal:

| Event Type | Trigger in System | Visual Representation in Dashboard | Urgency |
|---|---|---|:---:|
| **New Booking Assigned** | Customer completes booking containing this vendor (`POST /api/bookings`) | High-priority toast + Badge on "Orders" tab | High |
| **Booking Rescheduled / Cancelled** | Customer/Admin updates booking date or cancels (`PATCH /api/bookings/[id]`) | Warning banner on booking card + Activity log entry | High |
| **KYC Document Rejected** | Admin rejects document in `/admin/vendor-approvals` | Alert banner on Home & Profile: "FSSAI document rejected" | High |
| **Application Verified** | Admin verifies vendor application | Success modal / celebratory banner: "Your catering business is verified!" | Medium |
| **Menu Takedown (Hidden)** | Admin sets moderation = `Hidden` in `/admin/menus` | Critical persistent banner: "Your menu is hidden from customers. Contact support." | Critical |
| **Disbursement Settled** | Admin marks settlement `Settled` in `/admin/settlements` | Financial receipt card: "Payout of ₹48,500 released on 12 Jan" | Medium |
| **New Customer Review** | Customer submits review in `/api/reviews` | Feedback card in Overview feed | Low |

---

## 12. Roles, Permissions and Access Control

### 12.1 Intended Access Model
- **Vendor Authentication Requirement**: Only authenticated users holding `"vendor"` in their `accounts` array (`accountsFor(user).includes("vendor")`) may access `/vendor/*` routes.
- **Tenant Isolation**: Every vendor query MUST derive the vendor identity from `guard.id` (session cookie) on the server. Clients must never be allowed to pass an arbitrary `?vendorId=` to read another vendor's bookings, earnings, or draft menus.
- **Admin Isolation**: Admin users (`role === "admin"`) should have read/write access to vendor data via `/admin/*`, but should not directly use the vendor portal without an explicit impersonation mechanism.

### 12.2 Required Security Remediations Before Production
Before launching the new Vendor Portal, the following architectural vulnerabilities identified in the audit must be closed:
1. **Protect Leaking APIs**:
   - Add `requireRole("admin")` to `GET /api/vendors/applications`.
   - Add `requireRole("admin")` to `GET /api/vendors/kyc`.
   - Add `requireRole("admin")` to `GET /api/vendors/kyc/[id]`.
   - Add `requireRole("admin")` to `GET /api/bookings`.
2. **Correct Route Guards**:
   - Add `<RequireSession role="vendor">` to `src/app/vendor/dashboard/page.tsx`.
   - Remove `<RequireSession role="vendor">` from `src/app/vendor/register/page.tsx` (allow anonymous lead intake).
3. **Relational Integrity**:
   - Replace email string matching with `userId` foreign keys linking `users.id` -> `vendor_applications.userId`.

---

## 13. Data and API Requirements

| Capability | Existing Data Table | Existing API Endpoint | Server Protected? | Vendor Access Exists Today? | New Backend Work Required |
|---|---|---|:---:|:---:|---|
| **View Own Menu** | `vendors` | `GET /api/vendor/menu` | Yes (`vendor`) | Yes | None |
| **Update Own Menu** | `vendors` | `PUT /api/vendor/menu` | Yes (`vendor`) | Yes | None |
| **Upload Dish Photo** | `vendor_photos` | `POST /api/vendor/photo` | Yes (`vendor`) | Yes | None |
| **Delete Photo** | `vendor_photos` | `DELETE /api/vendor/photo/[id]` | Yes (`vendor`) | Yes | None |
| **List Own Orders** | `bookings` | `GET /api/bookings/mine` | Yes (`customer`) | **No** (Customer-only) | **Build `GET /api/vendor/bookings`** |
| **Acknowledge Order** | `bookings` | `PATCH /api/bookings/[id]` | Yes (Customer/Admin) | **No** (Vendor blocked) | **Add vendor order status update API** |
| **Calendar Dates** | *None* | *None* | N/A | **No** | **Create `vendor_availability` table & API** |
| **View Finances** | `settlements`, `bookings` | `GET /api/settlements` | Yes (`admin`) | **No** (Admin-only) | **Build `GET /api/vendor/finances`** |
| **View Reviews** | `reviews` | `GET /api/reviews/summary` | Public | Partial (Stats only) | **Build `GET /api/vendor/reviews`** |
| **KYC Resubmission** | `kyc_documents` | `POST /api/vendors/kyc` | Public | Yes (Intake only) | **Build `PUT /api/vendor/kyc/[id]`** |

---

## 14. Dashboard State Requirements

The Vendor Dashboard must adapt gracefully to 9 distinct vendor lifecycle states:

```
┌───────────────────────────┬─────────────────────────────────────────────────────────┬────────────────────────────────────────────────────────┐
│ Lifecycle State           │ Information Displayed                                   │ Available Actions                                      │
├───────────────────────────┼─────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┤
│ 1. Newly Registered       │ Welcome banner, KYC processing notice, Menu setup prompt│ "Start Building Your Menu", "Review Submitted KYC"     │
│ 2. Pending Verification   │ Banner: "KYC Under Review by Bhojpatra Admin"           │ Edit draft menu, upload gallery photos                 │
│ 3. Approved & Active      │ Full metrics, next event card, active order feed        │ Acknowledge orders, edit menu, manage calendar         │
│ 4. KYC Rejected           │ Red Alert: "Action Required: FSSAI document rejected"   │ "Upload Replacement Document", "Contact Support"       │
│ 5. Menu Hidden (Takedown) │ Warning Banner: "Your listing is hidden from customers" │ View reason, edit menu draft, contact support          │
│ 6. Zero Bookings          │ Empty State: "Your menu is live. Awaiting first booking"│ "Preview Public Catalog Card", "Share Vendor Profile"  │
│ 7. Pending Requests       │ Highlighted Alert: "2 events awaiting acknowledgment"   │ "Accept Order", "View Event Menu Sheet"                │
│ 8. Upcoming Bookings      │ Detailed chronological timeline of confirmed events     │ "Download Chef Prep Sheet", "Contact Customer"         │
│ 9. Incomplete Profile     │ Progress bar: "Profile 60% complete (Add 4 dishes)"     │ "Complete Profile", "Add Signature Dishes"             │
└───────────────────────────┴─────────────────────────────────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 15. Priority Matrix

| Capability | Priority | Exists Today? | Backend Dependency | Strategic Reason |
|---|:---:|:---:|---|---|
| **Vendor Order Pipeline View** | **P0** | No | `GET /api/vendor/bookings` | **Fundamental flaw**: Caterers cannot fulfill bookings they cannot see. |
| **Event Menu & Prep Sheet** | **P0** | No | Format `invoice`/`receipt` for kitchen | Kitchens need exact dish and guest counts to cook. |
| **Modular Menu Builder** | **P0** | Yes | Refactor existing `MenuBuilder.tsx` | Core selling mechanism; must be preserved and de-cluttered. |
| **Compliance & Verification Status**| **P0** | Partial | Expose existing `kyc_documents` status | Vendors must know if they are legally cleared to cater. |
| **Route Guard Alignment** | **P0** | Broken | Add `<RequireSession>` to dashboard | Basic application security and proper redirect flows. |
| **Financial Earnings & Payout Ledger**| **P1** | Partial | Build `GET /api/vendor/finances` | Caterers need transparency on payouts and advances. |
| **Date Blackout / Calendar Blocking** | **P1** | No | New availability store | Prevents booking caterers on dates they are already catering. |
| **Customer Review & Rating Feed** | **P1** | Partial | Build `GET /api/vendor/reviews` | Caterers need feedback loops to maintain food standards. |
| **Bank / UPI Payout Settings** | **P1** | No | New payout settings schema | Required to disburse settlements electronically. |
| **Order Acceptance Workflow** | **P2** | No | New acknowledgment status transition | Formalizes capacity commitment between caterer and customer. |
| **Direct Customer Chat** | **P2** | No | WebSocket/Messaging infra | Secondary; phone/WhatsApp coordination currently works. |
| **Advanced Sales Analytics** | **P2** | No | Analytics aggregation pipeline | High effort, low immediate operational necessity for MVP. |

---

## 16. MVP Vendor Portal Scope

### 16.1 MVP Must Include (Release 1.0)
1. **Correct Route Guarding & Navigation**:
   - Secure `/vendor/dashboard` with `<RequireSession role="vendor">`.
   - Add direct "Vendor Dashboard" link to user profile menu when user holds vendor role.
2. **Dashboard Overview (Home)**:
   - Live status card: Verification state (`Verified` / `Pending`) and marketplace state (`Live` / `Hidden`).
   - Summary statistics: Next upcoming event date, total assigned bookings count, live star rating.
3. **Bookings & Orders Tab**:
   - List of bookings where this vendor is assigned.
   - Event summary card: Customer Name, Phone, Event Date, Location, Guest Count, Booked Course Dishes.
   - Print/Download "Chef Event Sheet" (itemized dishes and guest counts).
4. **Refactored Menu & Offerings Tab**:
   - Clean embedding of existing `MenuBuilder` capabilities (courses, dishes, per-plate uplifts, photos, Baina boxes, live counters).
5. **Profile & Verification Tab**:
   - Display business profile details, assigned tiers, and KYC document verification states.

### 16.2 MVP Should Include (Release 1.1)
1. **Financial Overview Tab**:
   - Summary of completed event earnings and balance awaiting payout.
2. **Review Feed Tab**:
   - List of verified customer reviews and comments for this caterer.
3. **Simple Date Blackout**:
   - Ability to mark specific calendar dates as "Unavailable / Fully Booked".

### 16.3 MVP Can Wait (Future Releases)
1. In-app customer-vendor real-time chat.
2. Automated Razorpay Payouts API integration (instant bank transfers).
3. Complex staff sub-accounts (e.g. Head Chef vs Billing Manager logins).
4. Multi-city branch management.

---

## 17. Future Expansion (Post-MVP Considerations)

1. **Kitchen Staff Role-Based Access (Staff RBAC)**:
   - Allowing caterers to create secondary logins for head cooks (read-only menu sheets) vs accountants (read-only invoices).
2. **Dynamic Inventory / Ingredient Estimation**:
   - Translating guest counts and dish selections directly into raw ingredient estimates (e.g. "250 guests × Mutton Biryani = 45 kg mutton").
3. **Automated Razorpay Payouts (X / Disburse)**:
   - Transitioning from admin-marked manual settlements to automated webhook-triggered bank transfers upon event completion.
4. **Caterer Bidding & Custom Enquiries**:
   - Allowing caterers to submit custom per-plate proposals for custom high-budget corporate or wedding inquiries.

---

## 18. Design Constraints for the Next Phase (UI/UX)

When the UI design phase begins, the following technical and architectural constraints **must be strictly respected**:

1. **Brand System Compliance**:
   - The Bhojpatra brand uses **exactly four colors**: Red (`#B92025`), Cream (`#F0D09E`), Black (`#000000`), and White (`#FFFFFF`) with permitted alpha opacity variations. No arbitrary blue, green, amber, or gray utility palettes may be introduced ([`CLAUDE.md:3-31`](file:///c:/Users/Zeeshaan/Bhojpatra/CLAUDE.md#L3-L31)).
2. **Preserve Existing Data Schemas**:
   - Do not invent incompatible menu structures. Dishes must map to `VendorMenuItem`, courses to `VendorMenuSection`, and tier quotas to `tierItems`.
3. **Respect Marketplace Boundaries**:
   - Do not display other caterers' pricing, customer platform-wide billing, or admin profit margins.
4. **No Fake Metrics**:
   - Do not display mock metrics in the UI. If an endpoint does not yet provide live data, display a clean empty state or "Setup required" banner.
5. **Mobile-First Responsiveness**:
   - Caterers frequently operate on-site from mobile devices. The order sheet and booking timeline must be fully accessible and touch-friendly on mobile screens.

---

## 19. Open Questions / Decisions Needed

| Area | What Is Unknown / Ambiguous | Why It Matters | Decision Required |
|---|---|---|---|
| **Multi-Vendor Bookings** | In Feast bookings, multiple caterers can be hired for one event (e.g. Starter from Caterer A, Main from Caterer B). Does Caterer A see only their starters, or the whole feast menu? | Impacts kitchen coordination and confidentiality. | Recommend: Caterers see the full event brief (date, location, guests) but **only their itemized courses** on the prep sheet. |
| **Customer Contact Exposure** | Should the vendor receive the customer's direct phone number immediately upon booking, or only after an advance is confirmed? | Privacy vs operational necessity. | Recommend: Reveal phone number only for `Confirmed` bookings where advance payment has been validated. |
| **Booking Acceptance Window** | Does a caterer have the right to decline a booking, and what is the timeout before auto-reassignment? | If a vendor declines, who re-assigns the dishes? | Platform decision: Currently Bhojpatra acts as the concierge; need business rule on vendor declines vs admin reassignment. |
| **Payout Mechanism** | Will Bhojpatra collect vendor bank details directly in the dashboard, or continue manual offline RTGS/NEFT transfers? | Determines whether bank form fields and encryption are required in MVP. | Business decision: Manual offline settlements with transparent dashboard logs vs direct bank integrations. |

---

## 20. Final Recommendation

### 1. Recommended Structure
The future Bhojpatra Vendor Portal should be structured as a **clean, tabbed operational hub** located at `/vendor/dashboard` (with sub-routes `/vendor/orders`, `/vendor/menu`, `/vendor/finances`, `/vendor/reviews`, `/vendor/profile`).

### 2. Recommended MVP Scope
Focus Release 1.0 strictly on the **critical operational gap**:
- **Orders & Kitchen Logistics**: Allow caterers to see which events they are catering, guest counts, and itemized dish prep sheets.
- **Menu Management**: Reorganize the existing `MenuBuilder` into intuitive, focused sub-panels.
- **Compliance Tracking**: Show transparent KYC approval and marketplace moderation states.

### 3. Immediate Backend Prerequisites (Before UI Build)
Before UI components are implemented, the engineering team must create:
1. `GET /api/vendor/bookings`: Vendor-scoped order retrieval endpoint.
2. Route guard fix: Add `<RequireSession role="vendor">` to `/vendor/dashboard`.
3. Security patch: Gate `GET /api/vendors/applications` and `/api/vendors/kyc` behind `requireRole("admin")`.
