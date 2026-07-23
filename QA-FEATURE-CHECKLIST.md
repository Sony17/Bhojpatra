# Bhojpatra — QA Feature Checklist

Bhojpatra is a feast/catering booking marketplace (Next.js) connecting customers with caterers, Baina Box sellers, venues, event planners, and referral partners. It has **four surfaces**: the public customer site, the vendor console, the partner console, and the admin panel — plus a shared payments/invoicing/reviews/i18n layer.

Test every flow across **mobile / tablet / desktop**, in **both languages (English / हिंदी)**, and in **signed-out and signed-in** states.

---

## 1. Customer Site — Home & Discovery

### Homepage
- [ ] Hero: location auto-detects/pre-fills city; occasion dropdown (+ "Other" custom); date picker (min lead days enforced); "Book" and "Find caterers" carry occasion/date/city params
- [ ] Hero background changes with occasion/city; trust badges render
- [ ] Choose Occasion rail — cards marquee-scroll, link to `/book?occasion=…`
- [ ] Top Categories rail — category cards (with Baina Box injected), link to `/vendors?…`; price display toggles per admin config
- [ ] Packages section — Silver/Gold/Platinum tiers, "Popular" highlighted, "Book [tier]" deep-links to `/book?package=…`
- [ ] Baina Boxes section — brand carousel, CTA to `/vendors?q=Baina+Box`
- [ ] Gallery — two independent marquee rows, hover scale
- [ ] Testimonials — merges live reviews (`/api/reviews`) with curated ones, newest first, star ratings, "Verified booking" badge
- [ ] Promo Lead Capture — email/phone → `/api/leads`; validation + success state
- [ ] Campaign popup — fetches active campaign, shows once per visitor (localStorage), image click-through, Esc/X to close

### Vendor Catalog (`/vendors`)
- [ ] Filters: city, state, search, **category lens** (Full Catering / Single Stall / Live Stall / Baina Box / Essential Service), cuisine multi-select, diet (Veg/Non-Veg/All), tier, price band, meal time, time slot
- [ ] Sort: Relevance / Rating / Price ↑ / Price ↓
- [ ] Pull-to-refresh (mobile); empty state when no matches
- [ ] Cards show image, name, city, cuisines, price/plate, rating; **Compare** checkbox (max 8); click → detail
- [ ] Sticky booking bar; hides when compare tray opens

### Compare
- [ ] Compare tray shows selected chips; "Compare" enabled at ≥2 (≤8); remove/clear
- [ ] `/compare` side-by-side table: price, cuisines, diet, tier, rating; sortable columns; per-vendor Book/Remove; Esc closes

### Vendor Detail (`/vendors/[id]`)
- [ ] AppBar (name + location), back button, WhatsApp share
- [ ] Image carousel of gallery photos; summary card (verified badge, rating, price range, cuisines)
- [ ] Menu by course; each dish shows photo, bilingual name, veg/non-veg indicator, price
- [ ] Review list (name, stars, date, comment, photos, "Verified booking", "You" tag on own review)
- [ ] Write-a-review panel appears only for signed-in customer with a completed booking of this vendor
- [ ] Sticky "Book This Caterer" bar → `/book` with vendor pre-selected

### Venues (`/venues`, `/venues/[id]`)
- [ ] Explorer: city filter, search, type filter, capacity, rating, sort
- [ ] Cards: gallery, name, location, capacity, amenities, price, rating
- [ ] Detail: gallery, amenities, capacity, pricing, WhatsApp enquire, add-to-booking

### Static / content pages
- [ ] About, Contact (form → enquiry), Terms, Refund policy, Service Packages, Careers — all render CMS content, bilingual, mobile-friendly

### Global UI
- [ ] Header: logo→home, location picker (broadcasts change, Hero re-syncs), language toggle (EN/हिंदी, persists), account menu
- [ ] MobileTabBar: Home / Brands / Venues / Book + account; active-tab highlight; safe-area inset
- [ ] FloatingChat: knowledge-base Q&A + "Request a callback" (phone + topic → lead); draggable on mobile; Esc closes; lifts above trays
- [ ] Footer: brand ribbon, quick/legal links, contact info, app-coming-soon
- [ ] WhatsAppShareButton (wa.me broadcast with preset message)

---

## 2. Booking Wizard (`/book`)

- [ ] **Step 1 – Package**: Silver/Gold/Platinum cards, "Popular" highlighted, custom-package WhatsApp CTA
- [ ] **Step 2 – Menu**: per-course tabs; vendor selector per course; dishes show photo/price/veg flag; multi-select or skip; add-ons
- [ ] **Step 3 – Live Counters**: vendors offering live stations; include/skip
- [ ] **Step 4 – Event Details**: occasion (+Other), date (lead-day validation = max of package & occasion lead), city (+Other), guest count (50–50,000, live price recalc), venue (optional fee), meal time, time slot, food preference, add-ons
- [ ] **Step 5 – Service Package**: Single Stall / Live Counter / Hi-Tea / VIP; price updates
- [ ] **Step 6 – Review & Confirm**: full summary, advance (10%), payment method, **sign-in gate**, confirm → success + confirmation email
- [ ] Draft auto-saves to sessionStorage (survives reload); clears on confirm
- [ ] Referral code (`?ref=CODE`) carried through and stored on booking

---

## 3. My Bookings & Account

### My Bookings (`/bookings`, sign-in required)
- [ ] List newest-first; status badges (Pending/Confirmed/Completed/Cancelled); payment status; empty state
- [ ] Detail: menu, add-ons, service package, venue, payment summary, vendor contacts
- [ ] Per-vendor review submission on completed bookings (stars + comment + up to 4 photos); edit own review inline
- [ ] Download **Invoice** (itemised PDF) and **Receipt** (plain-text PDF)
- [ ] "Get Help" → raises support ticket with auto-triaged category/priority

### Account
- [ ] `/account/profile` — edit display name (email read-only); "Accounts you hold" badges
- [ ] `/account/settings` — language + email-notification preferences
- [ ] `/account/password` — change password (current verified, new≠current, confirm match)
- [ ] `/account/roles` — add partner role (mints referral code, adds dashboard tab)

### Auth
- [ ] Signup with type picker: **Customer** / **Vendor** (`?type=vendor`, GST required) / **Partner** (`?type=partner&role=…`)
- [ ] Login → role-aware dashboard redirect; Forgot password (never reveals if email exists); Reset password (token+email validated, expiry)
- [ ] Session persists via cookie; logout clears

---

## 4. Vendor Console

### Registration wizard (`/vendor/register`, 5 steps)
- [ ] **Step 1 Business**: name, owner, contact, read-only account email, city/state, ≥1 cuisine (presets + custom), optional Google rating/reviews
- [ ] **Step 2 KYC**: 4 doc uploads (GST/FSSAI/Owner ID/Business Proof, PDF/JPG/PNG, drag-drop, progress); GST 15-digit + FSSAI 14-digit validation; Pending banner
- [ ] **Step 3 Menu & Pricing**: ≥1 catering category; menu packages (name + ₹/plate + dishes); min/max guests, max events/day; **Baina Boxes** (name, ½kg/1kg + up to 4 custom sizes, photo, max 12); **Essential Service** (per-guest rate + includes checklist)
- [ ] **Step 4 Photos & Coverage**: ≥1 service city (+custom), counters (+custom), up to 8 gallery photos
- [ ] **Step 5 Review & Submit**: summary → success screen with deterministic Vendor ID, WhatsApp verification timeline, dashboard link
- [ ] Application status lifecycle: Pending → Verified → Rejected (WhatsApp notice at each)

### Vendor Dashboard & Menu Builder (`/vendor/dashboard`)
- [ ] Header: business name, Verified/Pending badge, assigned tier (Silver/Gold/Platinum)
- [ ] Status band: "Live for customers" / "Not published" / "Pending review" / "Hidden by Bhojpatra"
- [ ] Business basics: card photo, name, base ₹/plate, city (platform list), state, capacity, events/day, Google rating/reviews, cuisines
- [ ] Photo gallery (max 8, add/delete)
- [ ] Catering categories toggles
- [ ] Menu sections by course (enable/disable, per-plate uplift, dish name + veg flag + photo, suggestion chips, max 24/course); separate Live Stall section
- [ ] Baina Box menu (max 12; photo, name, ½kg/1kg + custom sizes, contents)
- [ ] Essential Service (per-guest rate + includes checklist)
- [ ] Live Counters & Services (toggle + override platform default price; per-plate vs flat fee)
- [ ] Save validation; on save an Approved menu re-queues to Pending; Hidden stays Hidden; "✓ Saved" toast
- [ ] Prefill from registration application on first load; dish photos validated same-origin; orphan photos pruned on save

---

## 5. Partner Console

### Landing (`/partner`)
- [ ] Four partner-type cards → signup (Event Planner / Individual Referrer / Venue Owner / Vendor)
- [ ] Stats band, benefits, payout preview, how-it-works, testimonials, FAQ
- [ ] Enquiry form (name, business, type, city, speciality, mobile, email, message) → success + WhatsApp deep-link

### Dashboard (`/partner/dashboard`, partner role required)
- [ ] Header: name, role badge, Verified/Pending badge; **verification gate = 3 completed bookings**
- [ ] Role switcher (one account can hold Planner + Individual + Venue); "Add role"
- [ ] Tabs: Overview / Share & Earn / My Referrals / My Venue (venue role only)
- [ ] Overview: payout card (total earning, active payout from Confirmed, due amount from Completed, due date = latest completed +2 days); KPI cards; recent referrals; referral code with copy
- [ ] Share & Earn: copiable code + full link; estimated reward = rewardPercent × confirmed value; settle-payout WhatsApp (only when verified)
- [ ] My Referrals: table of all referrals with status badges; total referred value
- [ ] Earnings: Planner/Individual earn % of confirmed value; Venue Owner earns full booking value

---

## 6. Admin Panel (`/admin`)

- [ ] **Login** — email/password, show/hide, redirect if already logged in, session persistence
- [ ] **Dashboard** — headline cards (Total Bookings, Pending Approvals, Advance Collected), period picker, MoM trend, recent bookings, pending approvals, analytics (revenue/bookings trend, top cities, top vendors)
- [ ] **Bookings** — stat cards, search, status/city filters, pagination, detail modal with status transitions + payment progress + referral info
- [ ] **Customers** — list + stats, search, filters, detail modal (booking history, internal note), Bookings sub-tab
- [ ] **Vendors** — list (search/tier/status/city filters), detail page (Overview/KYC/Menu/Bookings tabs), **Push to Top 5** (max 5, drops oldest)
- [ ] **Vendor Approvals** — queue, review modal (Overview/Documents), tier override, Approve (→Verified, marks docs verified) / Reject, optimistic + rollback, 401/403 re-login
- [ ] **Venues** + **Venue Approvals** — catalog, quick publish/hide, approval modal (publish gated on verification)
- [ ] **Menu Moderation** — pending vendor menus, review modal, Approve/Hide (controls visibility on catalog/`/book`/detail)
- [ ] **Payments** — transactions from `/api/payments`, search, status/method filters, detail
- [ ] **Settlements** — vendor payouts derived from completed bookings (paid − refunded), Mark Settled, CSV export
- [ ] **Refunds** — lifecycle Requested→Approved→Processed / Declined, detail modal, optimistic + rollback
- [ ] **Referrals** — rates card (customer% / referrer% per type), leaderboard, referrer detail, unregistered-code handling
- [ ] **Coupons** — CRUD (code, label, %, cap, eligibility, dates, status), search/filter
- [ ] **Campaigns** — CRUD (name, desktop + mobile image, link, status), image upload/preview
- [ ] **Leads** — sources (promo, booking intent, home form, callback), search, CSV export
- [ ] **Enquiries** — contact-form submissions, search, detail, CSV export
- [ ] **Support** — tickets Open→In Progress→Resolved, priority, search/filters, status transitions
- [ ] **Content** — Home page, Pages, Contact info, Banners, Testimonials, FAQ (CRUD, optimistic + rollback)
- [ ] **Services** — service packages editor (bilingual name/subtitle, includes/excludes/best-for, price range, per-plate/open-top)
- [ ] **Reports** — Monthly / Vendor performance / Cities, CSV export
- [ ] **Settings** — Password, Occasions (name EN/HI + lead days), Locations (name EN/HI), Payments (UPI VPA validated, QR upload ≤~450KB, merchant name/limit)
- [ ] **Shell** — sidebar nav, topbar, global search, session guard; live API rows prepend seed data, de-dup by ID, optimistic updates with rollback

---

## 7. Cross-Cutting Systems

### Payments & UPI/QR
- [ ] Three methods: UPI ID, Scan QR, Bhojpatra Connects (COD); UPI/QR settle 10% advance online, Connect collects later
- [ ] UPI deep-link `upi://pay?pa=…&pn=…&am=…&cu=INR&tr=…&tn=…`; VPA validation; admin merchant override (default `bhojpatra@upi`)
- [ ] QR generated from VPA or admin-uploaded static image (PNG/JPEG/WebP/GIF, ≤~450KB)
- [ ] Manual UPI txn-ID capture (UTR/RRN, 6–24 alphanumeric, normalized); payment status Advance Received → Settled / Refunded / Pending; amount ≤ booking total

### Invoices & receipts
- [ ] Branded "TAX INVOICE" PDF (masthead, event details, bill-to, itemised charges, totals, payment status, menu, watermark)
- [ ] Line items: package, add-ons, discount lines, GST 18% on (subtotal + add-ons − discount), grand total
- [ ] Amount Paid reflects live order (not snapshot); "PAID IN FULL" seal at zero balance; per-plate = total ÷ guests
- [ ] Shareable invoice link (data encoded in URL token, works offline); plain-text receipt (₹→"Rs ")

### Coupons & discounts
- [ ] Coupon: case/space-insensitive lookup, must be Active + in date range + occasion-eligible; discount = %×pre-tax capped at cap
- [ ] Auto-discounts stack on top: volume tiers (1000+ =8%/₹40k, 500+=5%/₹20k, 250+=3%/₹10k), early-bird (60d=5%/₹15k, 30d=2%/₹6k), occasion (wedding/reception/engagement 4%/₹20k); each shown as its own line
- [ ] Total discount capped so taxable base ≥ 0; zero lines hidden

### Referrals & attribution
- [ ] Code format `REF-<seed><random>`; self-referral blocked (account-level + phone match); customer discount = %×pre-tax (no cap); referrer reward = %×confirmed value ×(1−refund%)
- [ ] Manual payout via WhatsApp; admin sets customer% / referrer% per type (clamped 0–50%)

### Reviews & ratings
- [ ] One review per vendor per booking (upsert); 1–5 stars + comment (≤600) + up to 4 photos; published immediately; admin can hide/unhide
- [ ] Vendor rating = avg of published reviews; mirrored to booking for prefill; summary shown on My Bookings card

### Refunds & settlements
- [ ] Refund request from support (amount ≤ paid); lifecycle Requested→Approved→Processed/Declined; method from original payment
- [ ] Settlement derived per vendor per event-month = paid − processed refunds; only online-paid Completed bookings; Mark Settled snapshots payout

### Campaigns / leads / enquiries / support / email
- [ ] Newest active campaign → homepage popup (frequency-capped via localStorage)
- [ ] Leads (incl. callback sentinel `cb:<phone>`), contact enquiries, support tickets each persist + trigger admin email alert
- [ ] Email alerts (Resend, best-effort, per-event on/off): order confirmed, payment, lead/callback, enquiry, support ticket, password reset, vendor application, partner signup, venue listing

### Localization (i18n)
- [ ] English + Hindi via `t(en, hi)`; preference = signed-in pref > cookie (`bhojpatra-lang`) > default en; persists across reload/tabs
- [ ] All labels, occasions, locations, service packages, discount reasons bilingual; Ananda Neptouch 2 for brand/HI headings

### Geo / location
- [ ] Detection: IP hint → browser GPS → reverse geocode (OSM Nominatim / optional Google); city normalization + alias matching (Bangalore↔Bengaluru, Delhi NCR↔Delhi); "Other" free-text fallback
- [ ] Manual selection flag blocks auto-overwrite; 24h freshness; `bhojpatra:location-changed` event re-syncs components

### PWA / offline
- [ ] Service worker registration + caching; graceful offline; pull-to-refresh re-fetches; mobile tab bar persistent
- [ ] (Known: SW is network-first for navigation after the v3 fix — verify no stale shell on repeat visits)

### Occasions & services taxonomy
- [ ] Admin-managed occasions (lead days) and service packages; booking date gated by max(package lead, occasion lead)

---

## 8. Role-Based Access Matrix

| Feature | Customer | Vendor | Partner | Admin |
|---|:--:|:--:|:--:|:--:|
| Browse vendors/venues, book | ✓ | ✓ | ✓ | ✓ |
| My Bookings, reviews | ✓ | ✓ | ✓ | — |
| Vendor register + dashboard + menu builder | — | ✓ | — | — |
| Partner dashboard | — | — | ✓ | — |
| Add roles (multi-role account) | ✓ | ✓ | ✓ | — |
| Admin panel (all sections) | — | — | — | ✓ |

---

## 9. Priority End-to-End Journeys

1. **Discover → Compare → Book → Pay → Confirm** — home city detect → filter caterers → compare 2–3 → wizard 6 steps → UPI advance → confirmation email + invoice
2. **Vendor onboarding** — customer signup → 5-step registration → admin approves (tier + docs) → menu builder publish → appears on catalog/`/book`
3. **Partner referral loop** — partner signup → share code → customer books with `?ref=` → shows in My Referrals → 3 completed unlocks payout
4. **Review loop** — completed booking → per-vendor review with photos → appears on vendor page + testimonials → admin hide/unhide
5. **Refund + settlement** — refund request → admin process → settlement recomputes (paid − refund) → Mark Settled
6. **Language switch** — toggle EN↔हिंदी everywhere, persists across pages/reload/devices
7. **Cross-device booking draft** — start on mobile, reload/resume, complete on desktop

---

## 10. Cross-Cutting Test Concerns (apply to everything)

- [ ] Responsive: mobile / tablet / desktop layouts; touch targets ≥44px; horizontal marquees vs grids
- [ ] Accessibility: labels, ARIA, focus rings, `prefers-reduced-motion`, color-not-sole-indicator (**brand palette only: red/cream/black/white**)
- [ ] Loading & empty states everywhere; optimistic UI rolls back on server error
- [ ] Network failure → friendly errors + retry; session expiry → login redirect
- [ ] Backward compatibility: legacy bookings without email/vendor-array/invoice/review-mirror
- [ ] Validation bounds: guests, amount ≥ 0, discount % 1–100, phone (10-digit), email, GST/FSSAI, VPA
- [ ] Date/time: lead-day gating, year boundaries, past-event auto-complete, far-future dates
- [ ] Numbers/currency: Indian lakh formatting, ₹ symbol (→"Rs " in PDF)

> **QA data note:** the live Neon DB already contains QA test accounts/bookings/vendor applications from prior E2E passes. Reuse existing creds/IDs where possible and clean up new test data after runs.
