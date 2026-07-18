# Bhojpatra — Manual Test Roadmap

A step-by-step **manual QA checklist** for the whole web app. Every item is an
**atomic test**: one action → one expected result → tick the box. Walk the
phases top to bottom; each phase builds on the previous one (you sign up in
Phase 2, then use that account through Booking, Vendor, Partner, and Admin).

> **How to use:** run the app yourself, open http://localhost:3000, and check
> off each `- [ ]` as you verify it. `✅` = works, note anything that fails in
> the **Notes** column at the end of a section.

---

## 0. Setup & prerequisites

- [ ] **0.1** — Start the app: `npm run dev`. Server comes up on
      http://localhost:3000 with no fatal errors in the terminal.
- [ ] **0.2** — Confirm env is present (live Neon DB): `.env.local` has
      `DATABASE_URL` + `SESSION_SECRET`. If pages 500 on data, the DB/env is the
      first suspect (there is **no** JSON fallback).
- [ ] **0.3** — Dev admin exists: the app seeds `admin@bhojpatra.local` /
      `admin123` on the first admin login (dev only). Keep these handy.
- [ ] **0.4** — Have a fresh test email ready for signup, e.g.
      `qa+<timestamp>@example.com`, and a valid-looking 10-digit mobile
      (must start 6–9), e.g. `9876500001`.
- [ ] **0.5** — **Pull live test data from Admin first** (do Phase 8.1 login,
      then come back): note one **active coupon code** from `/admin/coupons`,
      the **occasions** from `/admin/settings`, and the **serviceable cities**
      from `/admin/settings` → Locations. Use these real values below instead of
      guessing seed codes.

**Reference — brand & rules to eyeball on every screen**
- Only four colours ever appear: red `#B92025`, cream `#F0D09E`, black, white.
  No greys/greens/ambers, even for status. Flag any stray hue.
- Two fonts only: Ananda Neptouch 2 (logo/display), Open Sans (everything else).
- Money always renders as `₹` + grouped digits (e.g. `₹2,17,250`).

---

## 1. Smoke pass — every page renders (do this first, ~10 min)

Load each route directly in the browser. **Expected:** page renders, no error
overlay, no infinite spinner, header + footer present.

**Public (no login):**
- [ ] **1.1** `/` (home)
- [ ] **1.2** `/vendors`
- [ ] **1.3** `/venues`
- [ ] **1.4** `/compare`
- [ ] **1.5** `/service-packages`
- [ ] **1.6** `/showcase`
- [ ] **1.7** `/finalise`
- [ ] **1.8** `/book`
- [ ] **1.9** `/contact`
- [ ] **1.10** `/about`, `/careers`, `/terms`, `/refund`
- [ ] **1.11** `/partner` (landing)
- [ ] **1.12** `/vendor/register` (public onboarding)

**Auth gate (must redirect to `/login` when signed out):**
- [ ] **1.13** `/bookings` → bounces to `/login?next=/bookings`
- [ ] **1.14** `/dashboard` → bounces to `/login`
- [ ] **1.15** `/account/profile` → bounces to `/login`
- [ ] **1.16** `/vendor/dashboard` → bounces to `/login`
- [ ] **1.17** `/partner/dashboard` → bounces to `/login`
- [ ] **1.18** `/admin/dashboard` → bounces to `/admin/login`
- [ ] **1.19** `/bookings/invoice` stays **public** (does NOT force login)

---

## 2. Authentication

### 2.1 Sign up (`/signup`)
- [ ] **2.1.1** Create a **Customer** account with the fresh email from 0.4 →
      success screen "Account created!", cookie set, lands able to reach
      `/dashboard`.
- [ ] **2.1.2** Password < 8 chars → blocked with "Password must be at least 8
      characters."
- [ ] **2.1.3** Confirm-password mismatch → "Passwords don't match."
- [ ] **2.1.4** Invalid email (`foo@bar`) → "Please enter a valid email address."
- [ ] **2.1.5** Mobile not 10-digit / not starting 6–9 → "Please enter a valid
      10-digit mobile number."
- [ ] **2.1.6** Terms checkbox unticked → cannot submit.
- [ ] **2.1.7** Re-submit the **same email** as a different type → 409, message
      tells you to log in first to add the account type (no duplicate account).
- [ ] **2.1.8** Sign up as **Partner → Individual Referrer** with a new email →
      success screen shows a generated **referral code**.
- [ ] **2.1.9** Sign up as **Partner → Venue Owner** without GST → blocked with
      "Please enter a valid 15-digit GST number."

### 2.2 Log in / out (`/login`)
- [ ] **2.2.1** Log in with the Customer account → redirects to `/dashboard`.
- [ ] **2.2.2** Wrong password → "Invalid email or password." (same message for
      unknown email — no account-existence leak).
- [ ] **2.2.3** Email is case-insensitive (`QA+...@Example.com` logs in the same
      account).
- [ ] **2.2.4** Show/Hide password eye toggle flips the input type.
- [ ] **2.2.5** Log out (Account menu → Log Out) → returns to `/`, and
      `/dashboard` now bounces to `/login`.

### 2.3 Forgot / reset password
- [ ] **2.3.1** `/forgot-password` with a real email → "Check your email"; in dev
      a **clickable reset link** is shown on screen ("email not sent").
- [ ] **2.3.2** Unknown email → still shows the same success screen (no leak).
- [ ] **2.3.3** Follow the dev reset link → set a new 8+ char password →
      "Password updated".
- [ ] **2.3.4** Log in with the **new** password → success. Old password →
      "Invalid email or password."
- [ ] **2.3.5** Reuse the same reset link again → "This reset link is invalid or
      has expired." (single use / 1-hour TTL).

---

## 3. Account area (logged in as Customer)

- [ ] **3.1** `/account/profile` — change display name, Save → "Saved"; name
      updates in header immediately. Empty name is allowed (falls back to
      account-type label).
- [ ] **3.2** Save button is **disabled** until the name actually changes.
- [ ] **3.3** `/account/settings` — switch Language to हिंदी → UI re-renders in
      Hindi instantly (no Save button); reload keeps the choice.
- [ ] **3.4** `/account/password` — wrong current password → "Your current
      password is incorrect."
- [ ] **3.5** New password identical to current → "New password must be
      different from your current one."
- [ ] **3.6** Valid change → "Password updated", fields clear; next login needs
      the new password.
- [ ] **3.7** `/account/roles` — only reachable for accounts holding a vendor
      role; a plain customer is redirected to `/account/profile`. Cards show
      Customer (Active), Vendor, Referral Partner with Open/Add buttons.

---

## 4. Public browsing

### 4.1 Home (`/`)
- [ ] **4.1.1** Hero booking bar: Occasion dropdown lists all occasions;
      selecting "Other" reveals a free-text field.
- [ ] **4.1.2** City dropdown is populated; "Other Location" reveals a text field.
- [ ] **4.1.3** Pick occasion + city + date, click the primary CTA → lands on
      `/book` (or `/vendors`) with those values pre-filled in the URL/UI.
- [ ] **4.1.4** Occasion cards → click one → `/book?occasion=...`.
- [ ] **4.1.5** Top Categories card → `/vendors?cuisine=...` with filter applied.
- [ ] **4.1.6** Finalised Packages "Select" → `/book?package=...&step=menu`.
- [ ] **4.1.7** Promo lead capture: submit email + phone → success acknowledgement
      (POST `/api/leads`). Later verify it appears in `/admin/leads`.
- [ ] **4.1.8** Testimonials and stats render; campaign popup (if shown) closes.

### 4.2 Vendors (`/vendors`)
- [ ] **4.2.1** Search a vendor name → list filters live.
- [ ] **4.2.2** Each filter works and persists in the URL: City, State, Cuisine,
      Diet, Tier, Price range, Meal type, Serving time.
- [ ] **4.2.3** Sort dropdown reorders (Rating, Reviews, Price low→high).
- [ ] **4.2.4** Results count matches the visible cards.
- [ ] **4.2.5** Card shows name, tier badge, rating, reviews, "price from ₹X",
      FSSAI-verified badge where applicable.
- [ ] **4.2.6** Open a vendor profile → menu by category + reviews + booking CTA.
- [ ] **4.2.7** "Book" on a card → `/book?vendor=...`.

### 4.3 Venues (`/venues`)
- [ ] **4.3.1** Search + City + Locality filters narrow the list; city chips work.
- [ ] **4.3.2** Only cities that actually have venues appear.
- [ ] **4.3.3** Card shows type, capacity, location, rating, "from ₹X".
- [ ] **4.3.4** Open venue detail → info + booking fee; "Book with this venue" →
      `/book?venue=...` and the booking fee later shows in the price breakdown.

### 4.4 Other public pages
- [ ] **4.4.1** `/compare` — side-by-side vendor table; "Book with [vendor]" →
      `/book?vendor=...`.
- [ ] **4.4.2** `/service-packages` — 4 tiers (Essential/Standard/Premium/Ultra)
      with inclusions + price ranges.
- [ ] **4.4.3** `/contact` — submit the enquiry form (name/email/phone/subject/
      message) → success; later appears in `/admin/enquiries`. WhatsApp button
      opens a pre-filled `wa.me` link.
- [ ] **4.4.4** Header: logo → home, Brands → `/vendors`, Venues → `/venues`,
      Partner dropdown links resolve. Language toggle flips EN/हिं app-wide.

---

## 5. Booking flow (the core — test carefully)

Start at `/book`. The wizard persists to `sessionStorage`, so reloads should
resume where you left off.

### 5.1 Step 1 — Package
- [ ] **5.1.1** Four packages show: Silver, Gold, Platinum, Single Stall, each
      with price, guest range, lead-time badge (7 / 21 / 45 days).
- [ ] **5.1.2** Set a date **too soon** for a tier → that card greys out with a
      "Need N days' notice" note and cannot be selected.
- [ ] **5.1.3** With a date sooner than all fixed tiers → only Custom/Single
      Stall is selectable (short-notice mode).
- [ ] **5.1.4** Select a package → auto-advances to Step 2 (Menu).

### 5.2 Step 2 — Build menu
- [ ] **5.2.1** Category tabs match the package (e.g. Silver: Welcome Drinks,
      Starters, Main Course, Sweets).
- [ ] **5.2.2** Pick a vendor in a course → its items appear; select items up to
      the course quota (e.g. Silver = 1 per course); quota is enforced.
- [ ] **5.2.3** Course completion counter updates (e.g. "1/1 Picked").
- [ ] **5.2.4** Continue is **blocked** until required courses are complete.
- [ ] **5.2.5** Single Stall (Custom): a tier picker (Silver/Gold/Platinum)
      filters the vendor list; "Skip" marks a course skipped.
- [ ] **5.2.6** Platinum: vendor roster spans all cities (not just the event
      city); other tiers show only event-city vendors.

### 5.3 Step 3 — Live stalls (Gold/Platinum only)
- [ ] **5.3.1** Live-counter courses (Live Counters/Chaat/Chinese/South Indian)
      require a vendor **or** an explicit skip before Continue.
- [ ] **5.3.2** Silver has no live-stall step (skips straight to details).

### 5.4 Step 4 — Event details & extras
- [ ] **5.4.1** Event bar edits: Occasion, Guests, Date, City, Venue, Meal time,
      Clock time — all editable and reflected in the summary.
- [ ] **5.4.2** Guest count outside the package min/max → blocked.
- [ ] **5.4.3** Add-ons (dessert, live paan, staff, decor…): per-plate add-ons
      multiply by guests; flat add-ons (e.g. staff ₹8,000) do **not**.
- [ ] **5.4.4** Service package tier is **required** — Continue blocked until one
      is chosen.

### 5.5 Step 5 — Review, pricing, coupon, referral, payment
- [ ] **5.5.1** Summary lists each course's vendor + items; Edit jumps back to
      that course; Remove clears a plated vendor.
- [ ] **5.5.2** **Pricing math** — verify by hand for a known selection:
      `(base + vendor uplift) × guests + add-ons + service + venue fee`, then
      **GST 18%** on the taxable total. Grand total matches.
- [ ] **5.5.3** Apply the **active coupon** (from 0.5) → discount + cap applied;
      "Remove" clears it. A bad code → clear error.
- [ ] **5.5.4** Enter a **referral code** → shows "Referred by …" and applies the
      referral discount.
- [ ] **5.5.5** **Self-referral block:** enter your own referral code (or a phone
      matching the referrer) → warning, discount **not** applied.
- [ ] **5.5.6** Payment method options render: Pay Now (UPI/QR), advance/EMI,
      Pay Later, Custom Quote. UPI shows a QR + UPI link + UTR input (validates
      12-char reference).
- [ ] **5.5.7** If not logged in at confirm → login gate appears; after login the
      wizard resumes at the same step with picks intact.

### 5.6 Step 6 — Confirmation & artefacts
- [ ] **5.6.1** Confirm → success screen with a **booking ID** + event summary.
- [ ] **5.6.2** "Share on WhatsApp" opens a pre-filled message.
- [ ] **5.6.3** "Download / View Invoice" → `/bookings/invoice?...` renders the
      full breakdown (menu, add-ons, GST, totals, customer contact) and the PDF/
      print view works.
- [ ] **5.6.4** `/bookings` (My Bookings) now lists this booking with correct
      status and amount.

### 5.7 Reviews
- [ ] **5.7.1** Leaving a review **requires a booking** — submitting a rating with
      no booking → "A booking is required to leave a review."
- [ ] **5.7.2** Rating outside 1–5 → "Please choose a rating between 1 and 5
      stars." A valid rating (optionally with photos) saves.

---

## 6. Vendor onboarding & dashboard

### 6.1 Register (`/vendor/register`, needs a vendor-role account)
- [ ] **6.1.1** Step 1 Business details: required Business/Owner/Contact/City/
      State + ≥1 cuisine; account email is read-only. Missing required → inline
      error, cannot advance.
- [ ] **6.1.2** Step 2 KYC: upload GST / FSSAI / Owner ID / Business proof
      (PDF/JPG/PNG, ≤5 MB each) → each shows uploading → done (✓). Oversized/
      wrong-type file → error.
- [ ] **6.1.3** GST number must match the 15-char format; FSSAI required.
      Cannot advance while any upload is still pending.
- [ ] **6.1.4** Step 3 Menu & pricing: ≥1 package with name + price; min/max
      guests + max events/day required.
- [ ] **6.1.5** Step 4 Photos & coverage: ≥1 serviceable city required; custom
      city/counter adders work.
- [ ] **6.1.6** Step 5 Review → Submit → success screen with a **Vendor ID** and
      "pending verification" message.
- [ ] **6.1.7** New application then appears in `/admin/vendor-approvals`.

### 6.2 Vendor dashboard (`/vendor/dashboard`)
- [ ] **6.2.1** Header shows business name + verification badge (Pending until an
      admin verifies) and any assigned tiers.
- [ ] **6.2.2** Menu builder: toggle categories, set per-plate uplift, add/remove
      dishes with diet (Veg/Non-Veg/Egg).
- [ ] **6.2.3** Upload a **card** photo (≤5 MB) → preview shows; oversized →
      "File is too large (max 5 MB)".
- [ ] **6.2.4** Gallery caps at 8 photos → 9th → "Gallery is full…".
- [ ] **6.2.5** Save Menu → success; a **verified** vendor's first save goes
      live (Approved), later edits go back to **Pending** re-review.

---

## 7. Partner

### 7.1 Partner landing (`/partner`, public)
- [ ] **7.1.1** Selecting a partner-type card pre-fills the enquiry form's role.
- [ ] **7.1.2** Submit enquiry (name/role/city/mobile/email required) → "Thank
      you!" screen. "Enquire on WhatsApp" opens a pre-filled `wa.me` link.

### 7.2 Partner dashboard (`/partner/dashboard`, partner account)
- [ ] **7.2.1** Overview KPIs: Referrals, Confirmed, Referred Value.
- [ ] **7.2.2** Verification gate: shows progress `x/3 bookings`; "Settle payout"
      is disabled until 3 completed bookings, then unlocks.
- [ ] **7.2.3** Referral code card: "Copy" copies the code and shows "Copied!".
- [ ] **7.2.4** Share & Earn tab: share link copies; settlement section links to
      WhatsApp (disabled until verified).
- [ ] **7.2.5** My Referrals tab: table of referred bookings with status badges;
      empty state when none.
- [ ] **7.2.6** Role switcher: add a second partner role → new referral code
      minted, dashboard reflects both roles.

---

## 8. Admin panel

### 8.1 Login & shell
- [ ] **8.1.1** `/admin/login` with `admin@bhojpatra.local` / `admin123` →
      `/admin/dashboard`.
- [ ] **8.1.2** Wrong credentials → error banner; a non-admin account is rejected.
- [ ] **8.1.3** Sidebar lists all sections; the current one is highlighted; on
      mobile it collapses to a hamburger.
- [ ] **8.1.4** Topbar Logout → back to `/admin/login`.

### 8.2 Dashboard & read-only reporting
- [ ] **8.2.1** Dashboard cards: Total Bookings, Pending Vendor Approvals,
      Advance Collected — all reflect real data.
- [ ] **8.2.2** Period picker (All time / This month / Last month / Last 3
      months) re-filters the recent-bookings table.
- [ ] **8.2.3** `/admin/analytics` and `/admin/reports` render charts/tables
      (note: **mock data**). Every "Export CSV" downloads a file with headers.
- [ ] **8.2.4** `/admin/roles` shows the permission matrix (read-only, mock).

### 8.3 Bookings, customers, payments
- [ ] **8.3.1** `/admin/bookings` — search + status + city filters work; row
      opens a detail modal (contact, paid/total bar, referral tag). Status
      change updates the row optimistically.
- [ ] **8.3.2** `/admin/customers` — search/filter; row modal shows the
      customer's bookings mini-table + lifetime spend.
- [ ] **8.3.3** `/admin/payments` — transactions filter by status/method; amounts
      in ₹.

### 8.4 Approvals & moderation (real, persisted)
- [ ] **8.4.1** `/admin/vendor-approvals` — open the application from 6.1.7; set
      **Verified** → tiers lock, docs mark verified, toast "Application
      approved"; set **Rejected** works too.
- [ ] **8.4.2** After verifying, that vendor shows as verified in
      `/admin/vendors`.
- [ ] **8.4.3** `/admin/venues` — Approve a pending venue → toast "Venue
      published"; confirm it now appears live on public `/venues`. Hide → gone
      from `/venues`.
- [ ] **8.4.4** `/admin/menus` (menu moderation) — Approve/Hide a vendor menu →
      toast + status change; a failed save rolls back.

### 8.5 CRUD sections (real, persisted)
- [ ] **8.5.1** `/admin/coupons` — create a coupon (code, %, cap, dates, active)
      → appears in list; edit persists; delete asks to confirm then removes.
      Then confirm it works as a real code in Booking Step 5 (5.5.3).
- [ ] **8.5.2** `/admin/campaigns` — create with an image → shows; edit/delete
      persist. If active, it can surface as the home campaign popup.
- [ ] **8.5.3** `/admin/services` — edit a service package (name EN/HI, price
      range, includes/excludes) → Save → reflected on `/service-packages` and in
      the booking wizard's service step.
- [ ] **8.5.4** `/admin/content` — edit Home hero / Contact info / Banners /
      Testimonials / FAQ → changes persist and show on the public site.
- [ ] **8.5.5** `/admin/settings` — Occasions, Locations, Payments(UPI VPA + QR)
      add/edit/delete persist; the admin Change-Password tab works.
- [ ] **8.5.6** `/admin/refunds` — move a refund Requested → Approved →
      Processed; `processedAt` stamps. (Live rows persist; seed rows local-only.)

### 8.6 Read/export sections
- [ ] **8.6.1** `/admin/leads` — the leads captured in 4.1.7 / booking-intent
      appear; Export CSV downloads.
- [ ] **8.6.2** `/admin/enquiries` — the contact submission from 4.4.3 appears.
- [ ] **8.6.3** `/admin/referrals` — partners + referred bookings; type filter +
      search + Export CSV work.
- [ ] **8.6.4** `/admin/settlements`, `/admin/support`, `/admin/notifications` —
      render and their local actions (Mark Settled / status / mark-read) update
      the row (note: **mock data**, not persisted).

---

## 9. Cross-cutting checks

- [ ] **9.1** **i18n:** toggle हिंदी on several pages — labels, buttons, and
      validation messages translate; the choice persists across reloads.
- [ ] **9.2** **Location sync:** change city in the header → hero bar + `/book`
      pick it up (shared location event).
- [ ] **9.3** **Mobile (DevTools ~375px):** hero bar stacks, carousels scroll,
      the bottom tab bar appears, tables/modals are usable, admin sidebar
      collapses.
- [ ] **9.4** **Draft resume:** part-fill the booking wizard, reload → resumes at
      the same step with picks intact.
- [ ] **9.5** **Deep links:** `/book?occasion=wedding&city=<city>&package=gold&step=menu`
      pre-selects and jumps to the right step.
- [ ] **9.6** **Console/network:** no uncaught errors in the console; no
      unexpected 4xx/5xx in the Network tab during the flows above.
- [ ] **9.7** **Brand audit:** spot-check screens for any non-brand colour or
      wrong font (see Reference in Setup).

---

### Sign-off

| Phase | Pass | Notes |
| --- | --- | --- |
| 0 Setup | ☐ | |
| 1 Smoke | ☐ | |
| 2 Auth | ☐ | |
| 3 Account | ☐ | |
| 4 Public browsing | ☐ | |
| 5 Booking flow | ☐ | |
| 6 Vendor | ☐ | |
| 7 Partner | ☐ | |
| 8 Admin | ☐ | |
| 9 Cross-cutting | ☐ | |

_Tester: ______________  Build/commit: ______________  Date: _____________
