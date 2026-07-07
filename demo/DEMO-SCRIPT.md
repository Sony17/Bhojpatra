# Bhojpatra — Client Showcase Demo Script

A start-to-finish walkthrough of **every feature** built so far, ordered as a
live presentation. Follow the "acts" top to bottom; each step says **where to
go**, **what to click**, and **what to say**. Roughly **25–35 min** for the full
tour, or cherry-pick acts.

> **Bhojpatra** is an end-to-end catering + venue booking platform: customers
> build a multi-vendor feast, pay a 10% advance, and manage everything from a
> dashboard; vendors and referral partners self-onboard; and a full admin
> console runs approvals, moderation, payments and content.

---

## 0. Before you present (2 min setup)

| Item | Value |
| --- | --- |
| **App URL (local)** | http://localhost:3000 (run `npm run dev`) |
| **App URL (demo)** | https://bhojpatra-gray.vercel.app (Ankit's Vercel, auto-deploys on push) |
| **Admin login** | `/admin/login` → `Ankit23690@gmail.com` + *(owner's password)* |
| **Stack** | Next.js 16.2.9 (Turbopack), React 19.2, Neon Postgres, Vercel Blob |
| **Languages** | English / हिंदी toggle in the header (show this early — it's a differentiator) |

**Brand story to open with:** four-color identity (deep red `#B92025`, cream
`#F0D09E`, black, white), custom *Ananda Neptouch* wordmark, Open Sans body.
Consistent across every surface — point this out on the homepage.

> ⚠️ **Two things to know before the demo — see "Presenter warnings" at the
> bottom.** In short: (1) the public **caterer catalog is currently empty**, so
> steer live browsing through **/book** and **admin**, and (2) local + deployed
> share **one database**, so any test booking you create is visible to the client.

---

## Act 1 — Landing page & brand (3–4 min)

**Go to:** `/` (homepage)

Walk down the page top to bottom:

1. **Hero + booking bar** — the hero has an inline *occasion / date / city /
   guests* picker. Fill it in and note it deep-links straight into the booking
   wizard (`/book?occasion=…&date=…&city=…`). *Say: "the funnel starts in the
   first screenful."*
2. **Choose Occasion** — tappable cards (Wedding, Engagement, Tilak, Haldi,
   Mehndi, Birthday, Corporate…). These are **admin-managed** (show that later).
3. **Top Categories** — the catering course categories (Welcome Drinks, Starters,
   Main Course, Desserts…).
4. **Baina Boxes / Package showcase** — the three tiers side by side:
   - **Silver** ₹799/plate · **Gold** ₹1199/plate *(most popular)* · **Platinum** ₹1599+/plate
   - Use the **section switcher** to show the different showcase treatments.
5. **Gallery** — curated food photography.
6. **Testimonials** — social proof (admin-editable).
7. **Promo lead capture** — drop an email/phone here; *say: "this becomes a lead
   in the admin console"* (you'll show it landing in Act 5).
8. **Floating chat** + **campaign popup** — always-on support entry point and a
   marketing popup that admins schedule.
9. **Language toggle** — flip to **हिंदी** and scroll again; the whole UI is
   bilingual.

---

## Act 2 — Discovery: vendors & venues (4 min)

### Caterers
**Go to:** `/vendors`

- Show the **search + filters**: cuisine, city, diet (veg/non-veg), price tier,
  rating.
- Open a caterer → **`/vendors/[id]`**: menu, pricing, photo gallery, star
  rating, customer reviews (with **photos**), and the **"Rate this caterer"**
  panel.
- **Compare:** add two caterers to the **Compare tray** → **`/compare`** for a
  side-by-side of price, rating, cuisines, tier and diet.

> If the live catalog looks thin, say: *"the catalog is populated from approved
> vendor applications — I'll show the vendor onboarding + admin approval that
> fills it in Act 4 and Act 5."* Then demo the richer flow in **/book**.

### Venues
**Go to:** `/venues`

- Browse/filter venues by city and type (Banquet Hall, Lawn, Resort).
- Open a venue → **`/venues/[id]`**: photos, capacity, pricing, a **sticky
  booking bar**, venue reviews, and an inline **10% advance payment** (UPI/QR +
  transaction ID). *Say: "venues can be booked directly, same advance model as
  catering."*

---

## Act 3 — The core: booking wizard (8–10 min) ⭐

**Go to:** `/book` (this is the centerpiece — take your time)

A **4-step wizard**. If you came from the hero bar, fields are pre-filled.

### Step 1 — Package
- Choose **Silver / Gold / Platinum / Custom**. Point out **lead times**, guest
  ranges and per-plate pricing per tier.

### Step 2 — Build your menu
- **Per-course vendor selection** via category tabs (Welcome Drinks → Starters →
  Main → Desserts…).
- **Tier rules to call out:**
  - **Platinum** = mix-and-match **multiple vendors** across courses.
  - **Silver / Gold** = single vendor for the meal.
  - **Custom** = single-stall with a **skip-a-course** option.
- Vendor **ratings** show on each card.
- *Say: "if the event date is too close, the wizard detects short-notice and
  steers to Custom automatically."*

### Step 3 — Event details
- Occasion (or free-text "Other"), **date** (validated against the tier's lead
  time), city, **venue** (free-text or a catalog venue), and **guest count**
  (validated against tier min/max).
- Add **live counters / add-ons** and assign add-on vendors.

### Step 4 — Confirm & pay ⭐ (the money shot)
- A **login gate** appears here — *say: "checkout requires an account; everything
  before this is open."* Log in / sign up inline.
- **Coupon code** entry with live validation.
- **10% advance** payment:
  - **UPI / QR** generated for the merchant, or
  - **manual transaction ID** entry with validation, plus **QR upload**.
- Alternatives: **COD / "Connect"** and an **EMI plan** for the balance
  (3- or 6-month splits based on lead time).
- On confirm: deterministic **booking ID `BHJ-xxxxx`**, **GST 18%** applied,
  **PDF invoice** download, and **WhatsApp share** of the order.

**Deep-link tricks worth showing:** `/book` accepts `?occasion=`, `?date=`,
`?city=`, `?venue=`, `?guests=`, `?package=`, and **`?ref=CODE`** (referral —
ties into Act 4's partner program).

---

## Act 4 — Accounts, dashboards & self-onboarding (6 min)

**One email, multiple roles** (customer + vendor + partner). Show the unified
hub, then each role.

### Customer
- **`/dashboard`** — unified hub across all roles the account holds.
- **`/bookings`** — booking list with status (Pending / Confirmed / Completed),
  vendor list per booking, **payment status + balance / EMI schedule**, invoice
  download, and a **review action per vendor**: 1–5 stars + comment + **photo
  upload** (photos served privately via `/api/reviews/photo/[id]`). Edit a review
  to show it's not one-shot.

### Vendor (self-onboarding)
- **`/vendor/register`** — business info, cuisines, diet, coverage area, **KYC
  upload** (GST/FSSAI/ID), and a **menu builder** with per-category lead times.
  *Say: "submitting lands them in the admin approval queue — we'll approve it in
  Act 5."*
- **`/vendor/dashboard`** — verification badge, **assigned marketplace tiers**,
  menu builder (publish dishes), orders, earnings, photo gallery.

### Referral partner
- **`/partner`** — the recruitment landing (commission pitch, zero upfront cost).
- **`/partner/dashboard`** — referral **code + share link** (`/book?ref=CODE`),
  referred bookings, and earnings. *Tie back: "a booking made with that link in
  Act 3 shows up here attributed to the partner."*

---

## Act 5 — Admin console (8–10 min) ⭐

**Go to:** `/admin/login` → sign in as `Ankit23690@gmail.com`.

This is the operations backbone — **14 sections**. Hit these in order:

1. **Dashboard** (`/admin/dashboard`) — KPI grid (vendors, bookings, revenue),
   trends, recent bookings, pending-approvals summary, quick actions.
2. **Vendor Approvals** (`/admin/vendor-approvals`) — the queue from Act 4.
   Review **KYC docs**, **approve/reject**, and **assign tiers (Silver/Gold/
   Platinum)**. *This is the tier-assignment feature — a vendor can hold
   multiple tiers.* Approving publishes them into `/vendors`.
3. **Vendors** (`/admin/vendors` → `/[id]`) — full vendor records: overview, KYC
   review, published menu, bookings, tier toggles, suspend/reactivate.
4. **Venue Approvals** (`/admin/venue-approvals`) — approve/hide owner-registered
   venues; approval makes them visible in `/venues` and the booking flow.
5. **Menu Moderation** (`/admin/menus`) — takedown model: vendors publish anytime,
   admins approve or hide menus from public surfaces.
6. **Customers & Bookings** (`/admin/customers`) — all bookings, filter by status,
   view details, change status (complete / cancel / refund).
7. **Payments** (`/admin/payments`) — advance-payment ledger, transaction-ID /
   UTR reconciliation, mark settled, process refunds, EMI monitoring.
8. **Leads** (`/admin/leads`) — captured leads by source (home promo, booking
   intent, callback). **Find the lead you dropped in Act 1 here.**
9. **Enquiries** (`/admin/enquiries`) — contact-form submissions; mark resolved.
10. **Referrals** (`/admin/referrals`) — partner activity, commissions, payouts.
11. **Coupons** (`/admin/coupons`) — create a code (%, cap, occasion eligibility,
    validity) → *then go use it in `/book` Step 4 to close the loop.*
12. **Campaigns** (`/admin/campaigns`) — the homepage popup/banner scheduler.
13. **Content Control** (`/admin/content`) — CMS for hero, sections,
    testimonials, FAQ, banners, contact info, and site pages (About/Terms/etc.).
14. **Settings** (`/admin/settings`) — change password, **manage occasions**,
    **manage cities/locations**, and **payment settings** (enable/disable
    UPI/QR/COD/EMI, advance rate). *Say: "the occasion cards and city lists on
    the homepage are all driven from here — nothing is hard-coded."*

---

## The "wow" closing loop (do this if you have 5 spare minutes)

A single thread that proves the whole system is wired together:

1. **Admin →** create a coupon `SHOWCASE10` (`/admin/coupons`).
2. **Admin →** add a new occasion in **Settings**; refresh the homepage to show
   it appear in the picker.
3. **Customer →** run a booking in `/book`, apply `SHOWCASE10` at Step 4, pay the
   10% advance, download the invoice.
4. **Customer →** open `/bookings`, leave a **photo review**.
5. **Admin →** watch it land in **Payments**, **Customers & Bookings**, and the
   **Leads/dashboard KPIs** update.

That single loop touches content management, the booking funnel, payments,
reviews and admin ops — the entire product in ~5 minutes.

---

## Presenter warnings (read before you demo)

1. **The caterer catalog (`/vendors`) is currently empty** — there are no
   approved vendor applications in the database yet, so `/vendors` and the admin
   vendor list will look bare. The **booking wizard (`/book`) is fully
   populated** from curated data, so browse there live. If you want a full-looking
   catalog for the client, ask me to **seed a few demo vendors** first (see the
   QA checklist for how).
2. **Note the catalog vs. wizard split** — `/vendors` (catalog) is powered by
   approved vendor applications; `/book` (wizard) uses a curated specialist set.
   They're linked for **reviews** by name. Don't promise "register a vendor and
   it instantly appears inside the booking wizard" — approval publishes to the
   **catalog**, not the wizard's curated stalls.
3. **Local and the Vercel deployment share ONE Neon database.** Any test booking,
   review, vendor or coupon you create during rehearsal is real and will be
   visible in the client demo (and vice versa). Do your rehearsal with throwaway
   data you're happy for the client to see, or clean it up in admin afterward.
4. **Admin password** is the owner's (`ADMIN_PASSWORD_HASH` is set in the
   environment). The `admin@bhojpatra.local / admin123` dev default does **not**
   apply here because a real admin email is configured.
5. **Session-gated pages** (`/dashboard`, `/bookings`, `/vendor/dashboard`,
   `/partner/dashboard`) redirect to login if you're signed out — log in first
   so you don't hit a redirect mid-demo.
