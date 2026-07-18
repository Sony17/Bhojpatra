# Bhojpatra — Client Showcase Plan

Two parts, in order:

- **Part A — Rehearsal (day before / morning of):** test everything yourself in
  the order below so nothing surprises you live.
- **Part B — Demo script (with the client):** a story-ordered walkthrough where
  every step produces data the next step reveals. Follow the order exactly and
  by the end the whole product has been shown.

Companion doc: [MANUAL-TEST-PLAN.md](MANUAL-TEST-PLAN.md) is the atomic QA
checklist — use it during Part A, not in front of the client.

---

## Part A — Rehearsal & prep (test order)

Do these in order; later steps depend on earlier ones.

### A1. Environment sanity (15 min)
- [ ] `npm run dev` → http://localhost:3000 up, no fatal errors.
- [ ] `.env.local` has `DATABASE_URL` + `SESSION_SECRET` (live Neon DB — no
      JSON fallback; if pages 500, env/DB first).
- [ ] Run **MANUAL-TEST-PLAN Phase 1 (smoke pass)** — every route renders.
- [ ] Decide demo machine + browser now; do all rehearsal on that exact setup.

### A2. Clean the live DB of obvious QA junk (30 min) — **important, client will see admin**
The 2026-07-18 QA pass left visible test data. In `/admin`:
- [ ] `/admin/bookings` — bookings by **"QA Tester"** (BHJ-46006, BHJ-28319,
      BHJ-18460 + possibly one unnamed): either delete/hide, or accept them as
      "existing bookings" — but the name "QA Tester" reads badly. Prefer clean.
- [ ] `/admin/vendor-approvals` — **"QA Test Caterers"** applications
      (VND-F2E2BB verified, VND-D4225E pending): reject/remove the pending
      duplicate at minimum.
- [ ] `/admin/leads` + `/admin/enquiries` — remove rows from
      `qalead+…@example.com`, `qacontact+…@example.com`, `qapartnerlead+…@`.
- [ ] If the DB looks empty after cleanup, seed 3–5 **realistic** bookings /
      leads with plausible Indian names so admin doesn't look dead. Do them via
      the real UI (they double as extra testing).

### A3. Stage the props the demo needs (30 min)
Everything the live demo consumes must exist beforehand:
- [ ] **Coupon:** in `/admin/coupons` create an active code you'll use live,
      e.g. `WELCOME10` (10%, sensible cap, valid dates). Test it once in the
      wizard, then note it on your crib sheet.
- [ ] **Referral code:** partner `qa+103345p@example.com` / `QaPass!2026` has
      code `REF-QA6GC6` — or mint a fresh partner with a realistic name via
      `/signup` → Partner → Individual Referrer. Note the code.
- [ ] **Campaign/content polish:** `/admin/content` + `/admin/campaigns` —
      hero text, banners, testimonials all read well (no lorem/test strings).
- [ ] **Settings:** `/admin/settings` — occasions list, serviceable cities,
      and the UPI VPA + QR (this QR appears at payment step — make sure it's
      the one you want the client to see).
- [ ] **Fresh identities for the live demo** (don't create them yet — just
      write them down): a customer email like `demo.sharma@example.com`, a
      10-digit mobile starting 6–9, and a vendor business name, e.g.
      "Sharma Caterers, Jaipur".

### A4. Full-dress rehearsal (60–90 min)
- [ ] Run **Part B below, start to finish, exactly as scripted**, with
      throwaway identities. This is simultaneously your deep test — it exercises
      MANUAL-TEST-PLAN Phases 2, 4, 5, 6, 7, 8 in demo order.
- [ ] While rehearsing, run the pricing check once by hand
      (MANUAL-TEST-PLAN 5.5.2): `(base + uplift) × guests + add-ons + service +
      venue fee`, then GST 18%. You want to be able to say "and the math is
      right" with confidence if the client asks.
- [ ] Check the browser console stays clean during the whole run (9.6).
- [ ] Afterwards, **clean up the rehearsal data in admin** (A2 again, quick).

### A5. Final checks (15 min)
- [ ] Mobile pass: DevTools ~375px on home, vendors, wizard, admin (sidebar
      collapses, bottom tab bar appears). You'll show this live in Act 5.
- [ ] Hindi toggle on 3–4 pages; toggle back to EN before the demo.
- [ ] Log out of everything; clear the wizard draft (sessionStorage) so the
      demo starts truly fresh.
- [ ] Prepare a **second browser window/profile** already at `/admin/login`
      (credentials typed but not submitted) — saves fumbling in Act 4.
- [ ] Crib sheet on paper/notes app: coupon code, referral code, demo
      identities, admin creds `admin@bhojpatra.local` / `admin123`.

---

## Part B — Demo script (show order, ~40–50 min)

The narrative: **customer books → vendor joins → partner earns → admin runs it
all**. Each act plants data the later acts harvest — do not reorder.

### Act 0 — Opening frame (2 min)
Start logged out at `/`. One line of setup: *"Bhojpatra is a catering & events
marketplace — customers build a full event menu from verified vendors, and the
business runs on the admin panel I'll show at the end."*
- Scroll home: hero booking bar, occasion cards, top categories, finalised
  packages, testimonials.
- **Plant #1:** fill the promo lead-capture (demo email + phone) → success.
  Say nothing; you'll reveal it in admin later.

### Act 1 — Discovery (5 min)
1. `/vendors` — search live, apply 2–3 filters (city, cuisine, diet), sort by
   rating. Open one vendor profile: menu by category, reviews, FSSAI badge.
2. `/venues` — filter by city, open a venue, point at capacity + booking fee.
   Click **"Book with this venue"** → lands in the wizard with the venue
   attached (segue to Act 2).
3. (Optional, if time) `/compare` and `/service-packages` — 30 seconds each.

### Act 2 — The core: booking wizard (12 min) ⭐ centerpiece
Work through `/book` deliberately — this is the product:
1. **Package:** show all four tiers with lead-time badges; pick a near date
   once to show tiers greying out ("the system enforces realistic notice
   periods"), then set a proper date and pick **Gold**.
2. **Menu:** pick vendors per course, show the quota being enforced and the
   "Picked" counters; Continue blocked until courses complete.
3. **Live stalls** (Gold has them): pick one, skip one — both paths shown.
4. **Details:** tweak guests/date/city in the event bar; add one per-plate
   add-on and one flat add-on (point out one multiplies by guests, one
   doesn't); choose a service tier.
5. **Review & pricing:** walk the summary; then the money moment —
   - Apply coupon **`WELCOME10`** (from A3) → discount visible.
   - Apply referral code **`REF-…`** → "Referred by …" + referral discount.
   - Point at GST 18% line and grand total.
6. **Payment:** show Pay Now with the UPI QR, then choose Pay Later /
   advance for the demo. Confirm.
7. **Login gate** fires at confirm → sign up live with the demo customer
   identity ("account creation is embedded in checkout — no drop-off") →
   wizard resumes with everything intact → **Confirmation with booking ID**.
8. Open the **invoice** (`Download / View Invoice`) — full breakdown, GST,
   customer contact, print/PDF. Then `/bookings` — the booking is listed.
   - **Plant #2:** this booking + the referral will appear in admin & partner.

### Act 3 — Supply side: vendor onboarding (6 min)
1. `/vendor/register` — walk the 5 steps briskly with "Sharma Caterers":
   business details, KYC uploads (have 2–3 small PDFs/JPGs ready), menu +
   pricing, coverage cities, submit → **Vendor ID + "pending verification"**.
   - **Plant #3:** this application appears in admin approvals next act.
2. `/vendor/dashboard` (use the existing vendor-role account if the new one
   isn't verified yet) — menu builder, per-plate uplift, dish diet tags,
   photo gallery. One line: *"vendor edits go back to admin re-review — you
   stay in control of what's live."*

### Act 4 — The control room: admin (12 min)
Switch to the prepared admin window, log in on screen.
1. **Dashboard** — bookings/approvals/advance KPIs. Point out today's numbers
   just moved because of what you did in Acts 0–3.
2. **Harvest the plants:**
   - `/admin/bookings` → find the Act 2 booking → open detail modal (contact,
     paid/total, **referral tag**) → change status live.
   - `/admin/leads` → the Act 0 lead-capture row. `/admin/enquiries` if you
     submitted contact too.
   - `/admin/vendor-approvals` → open "Sharma Caterers" → review docs →
     **Verify live** → then show it verified in `/admin/vendors`.
3. **Venue moderation:** `/admin/venues` — approve/hide a venue, then flip to
   public `/venues` to show it appear/disappear. Strong cause-and-effect beat.
4. **CRUD power, one example each (pick two, don't do all):**
   - `/admin/coupons` — create/edit a coupon live.
   - `/admin/content` — edit the home hero text → refresh public home → it
     changed. (Crowd-pleaser.)
   - `/admin/settings` — occasions/cities/UPI config.
5. **Say-nothing zones:** `/admin/analytics`, `/admin/reports`,
   `/admin/roles`, `/admin/settlements`, `/admin/support`,
   `/admin/notifications` run on **mock data**. If the client clicks-asks,
   frame as *"reporting suite — final data wiring in progress."* Don't
   demo them unprompted, and don't demo raw API URLs.

### Act 5 — Partner + closing flourishes (6 min)
1. `/partner` landing → `/partner/dashboard` (partner account): KPIs, the
   **referral from Act 2 in "My Referrals"** with its status, copyable code,
   3-booking verification gate for payouts.
2. **Hindi toggle** on home + wizard — instant full-app re-render. Big beat
   for an Indian events client.
3. **Mobile:** DevTools ~375px on home + wizard + admin — bottom tab bar,
   stacked hero, collapsing sidebar.
4. Close on the **invoice PDF** or the confirmation's **WhatsApp share**
   (opens a pre-filled message) — ends on something tangible they can imagine
   forwarding to their own customers.

### Q&A parking lot
Known soft spots — deflect, don't explore live:
- Mock-data admin sections (list above).
- Some admin APIs aren't auth-locked yet (internal note — being fixed; never
  open raw `/api/...` URLs in front of the client).
- Reviews require a completed booking — if asked for a live review demo, use
  the pre-existing completed booking BHJ-46006 story instead.

---

## Timing summary

| Slot | What | Time |
| --- | --- | --- |
| A1–A3 | Env, DB cleanup, staging props | ~75 min |
| A4–A5 | Full-dress rehearsal + final checks | ~90 min |
| Act 0–1 | Opening + discovery | 7 min |
| Act 2 | Booking wizard (centerpiece) | 12 min |
| Act 3 | Vendor onboarding | 6 min |
| Act 4 | Admin control room | 12 min |
| Act 5 | Partner + Hindi + mobile + close | 6 min |
| — | Buffer / Q&A | 5–10 min |
