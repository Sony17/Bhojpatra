# Bhojpatra — QA / Pre-Demo Test Checklist

Systematic test pass over **every feature** before the client sees it. Check each
box; note failures in the **Result** column. Group by area — you can split these
across testers.

**Environment under test:** ☐ Local (`http://localhost:3000`)  ☐ Vercel deploy: `__________________`
**Tester:** `__________`  **Date:** `__________`  **Build/commit:** `__________`

> ⚠️ Local and the deployed app **share one Neon database**. Test data you create
> here is real and will appear in the demo. Prefer clearly-labelled throwaway data
> (e.g. name things `QA-TEST-…`) and clean up in admin afterward.

---

## 0. Smoke test — everything loads

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 0.1 | `npm run dev` starts | Ready on :3000, no console errors | ☐ |
| 0.2 | Home `/` loads | Full page, images render, no layout breaks | ☐ |
| 0.3 | All public routes 200 | `/book` `/vendors` `/venues` `/compare` `/about` `/contact` `/partner` `/login` `/signup` `/finalise` `/showcase` `/terms` `/refund` `/careers` | ☐ |
| 0.4 | Gated routes redirect when logged out | `/dashboard` `/bookings` `/vendor/dashboard` `/partner/dashboard` → `/login` | ☐ |
| 0.5 | DB connectivity | `/api/vendors`, `/api/venues`, `/api/menu`, `/api/admin/occasions` return JSON (not 500) | ☐ |
| 0.6 | Brand compliance | Only the 4 brand colors used; wordmark font correct | ☐ |
| 0.7 | Bilingual toggle | EN ⇄ हिंदी switches all visible copy | ☐ |

---

## 1. Homepage sections

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 1.1 | Hero booking bar | Occasion/date/city/guests selectable | ☐ |
| 1.2 | Hero → wizard deep-link | Submitting lands on `/book` with fields pre-filled | ☐ |
| 1.3 | Choose Occasion cards | Tappable; reflect admin-managed occasion list | ☐ |
| 1.4 | Top Categories | Render course categories | ☐ |
| 1.5 | Package showcase / switcher | Silver ₹799 / Gold ₹1199 (popular) / Platinum ₹1599+ shown; switcher changes layout | ☐ |
| 1.6 | Gallery | Images load | ☐ |
| 1.7 | Testimonials | Render (admin-editable content) | ☐ |
| 1.8 | Promo lead capture | Submitting creates a lead (verify in `/admin/leads`) | ☐ |
| 1.9 | Floating chat | Opens/closes | ☐ |
| 1.10 | Campaign popup | Shows if an active campaign exists | ☐ |

---

## 2. Vendors (catalog + detail + compare)

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 2.1 | `/vendors` loads | Catalog renders (⚠️ may be empty — see note) | ☐ |
| 2.2 | Filters | Cuisine / city / diet / tier / rating filter results | ☐ |
| 2.3 | Search `?q=` | Query narrows list | ☐ |
| 2.4 | Vendor detail `/vendors/[id]` | Menu, pricing, gallery, rating, reviews render | ☐ |
| 2.5 | Review photos | Customer-submitted photos display | ☐ |
| 2.6 | Compare tray | Add ≥2 vendors → `/compare` side-by-side | ☐ |

> **Note:** `/api/vendors` currently returns `{"vendors":[]}`. Items 2.1–2.6 are
> best tested **after seeding** at least one approved vendor (see §11).

---

## 3. Venues

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 3.1 | `/venues` loads | Venue list renders (≥1 test venue exists) | ☐ |
| 3.2 | City/type filter | Narrows venues | ☐ |
| 3.3 | Venue detail `/venues/[id]` | Photos, capacity, pricing, sticky booking bar | ☐ |
| 3.4 | Venue reviews | Render | ☐ |
| 3.5 | Venue advance payment | 10% UPI/QR + transaction ID flow works | ☐ |

---

## 4. Booking wizard `/book` (core flow) ⭐

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 4.1 | Step 1 package select | Silver/Gold/Platinum/Custom selectable; lead times shown | ☐ |
| 4.2 | Step 2 menu builder | Per-course vendor selection via category tabs | ☐ |
| 4.3 | Tier rule: Platinum | Multi-vendor across courses allowed | ☐ |
| 4.4 | Tier rule: Silver/Gold | Single vendor enforced | ☐ |
| 4.5 | Tier rule: Custom | Single-stall; skip-course option works | ☐ |
| 4.6 | Short-notice detection | Too-close date steers to Custom | ☐ |
| 4.7 | Step 3 date validation | Rejects date inside the tier lead time | ☐ |
| 4.8 | Step 3 guest validation | Enforces per-tier min/max | ☐ |
| 4.9 | Step 3 add-ons | Live counters / add-ons selectable + vendor assignment | ☐ |
| 4.10 | Step 4 login gate | Prompts login/signup before payment | ☐ |
| 4.11 | Coupon apply | Valid code discounts; invalid code rejected | ☐ |
| 4.12 | 10% advance (UPI/QR) | QR generates for merchant VPA | ☐ |
| 4.13 | Transaction ID entry | Manual UTR validated; QR upload accepted | ☐ |
| 4.14 | EMI plan | 3/6-month split offered per lead time | ☐ |
| 4.15 | Booking confirm | `BHJ-xxxxx` ID issued; GST 18% applied | ☐ |
| 4.16 | Invoice PDF | Downloads with correct itemization | ☐ |
| 4.17 | WhatsApp share | Opens with order summary | ☐ |
| 4.18 | Referral `?ref=CODE` | Booking attributed to partner | ☐ |

---

## 5. Auth & accounts

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 5.1 | Signup (customer) | Creates account, sets session, redirects | ☐ |
| 5.2 | Login | Valid creds succeed; wrong creds show generic error | ☐ |
| 5.3 | No account enumeration | "Not found" and "wrong password" give same message | ☐ |
| 5.4 | Logout | Clears session; gated pages redirect again | ☐ |
| 5.5 | Multi-account | Same email adds vendor/partner role (requires password/session) | ☐ |
| 5.6 | Forgot password | Issues reset token (dev returns `devToken`); reset completes | ☐ |
| 5.7 | Change password | Requires current password; enforces ≥8 chars | ☐ |
| 5.8 | Language preference | Persists across reloads/devices | ☐ |
| 5.9 | Session persistence | Cookie survives refresh (30-day TTL) | ☐ |

---

## 6. Customer dashboards

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 6.1 | `/dashboard` hub | Shows all roles the account holds | ☐ |
| 6.2 | `/bookings` list | Bookings with status + payment/balance/EMI | ☐ |
| 6.3 | Invoice download | Works from bookings | ☐ |
| 6.4 | Write review | 1–5 stars + comment saved per vendor | ☐ |
| 6.5 | Review photo upload | ≤4 photos, ≤5 MB each; serve via `/api/reviews/photo/[id]` | ☐ |
| 6.6 | Edit review | Existing review is editable | ☐ |

---

## 7. Vendor onboarding & dashboard

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 7.1 | `/vendor/register` | Business/cuisine/diet/coverage captured | ☐ |
| 7.2 | KYC upload | GST/FSSAI/ID files upload (stored in Blob) | ☐ |
| 7.3 | Menu builder | Add dishes by category + per-category lead time | ☐ |
| 7.4 | Submit application | Lands in `/admin/vendor-approvals` as Pending | ☐ |
| 7.5 | `/vendor/dashboard` | Verification badge, assigned tiers, orders, earnings | ☐ |
| 7.6 | Publish menu | Menu appears (subject to moderation) | ☐ |
| 7.7 | Vendor photo upload | Card/dish/gallery photos upload + serve | ☐ |

---

## 8. Partner / referral

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 8.1 | `/partner` landing | Pitch + CTA render | ☐ |
| 8.2 | Partner signup | Creates partner role (planner/individual/venue) | ☐ |
| 8.3 | `/partner/dashboard` | Referral code + share link shown | ☐ |
| 8.4 | Referral attribution | Booking via `?ref=CODE` appears here | ☐ |
| 8.5 | Earnings | Commission reflected | ☐ |

---

## 9. Admin console (all 14 sections)

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 9.1 | `/admin/login` | Admin email + password succeeds; non-admin rejected | ☐ |
| 9.2 | Dashboard | KPIs, trends, recent bookings, pending approvals | ☐ |
| 9.3 | Vendor Approvals | Approve/reject + **assign tiers** + KYC review | ☐ |
| 9.4 | Vendors list/detail | View, filter, tier toggle, suspend/reactivate | ☐ |
| 9.5 | Venue Approvals | Approve/hide owner venues; reflects in `/venues` | ☐ |
| 9.6 | Menu Moderation | Approve/hide menus from public surfaces | ☐ |
| 9.7 | Customers & Bookings | List, filter, change status (complete/cancel/refund) | ☐ |
| 9.8 | Payments | Reconcile advance/UTR, mark settled, refund | ☐ |
| 9.9 | Leads | Lead from §1.8 appears; mark contacted | ☐ |
| 9.10 | Enquiries | Contact-form submission appears; mark resolved | ☐ |
| 9.11 | Referrals | Partner activity + commissions | ☐ |
| 9.12 | Coupons | Create/edit/disable/delete; usable in `/book` | ☐ |
| 9.13 | Campaigns | Create campaign → homepage popup shows | ☐ |
| 9.14 | Content Control | Edit hero/testimonials/FAQ/pages → reflects on site | ☐ |
| 9.15 | Settings: occasions | Add/remove occasion → homepage picker updates | ☐ |
| 9.16 | Settings: locations | Add/remove city → filters update | ☐ |
| 9.17 | Settings: payments | Toggle UPI/QR/COD/EMI + advance rate | ☐ |

---

## 10. Cross-cutting / non-functional

| # | Check | Expected | Result |
| --- | --- | --- | --- |
| 10.1 | Mobile responsive | Home, `/book`, admin usable at 390px width | ☐ |
| 10.2 | No console errors | Clean console across key pages | ☐ |
| 10.3 | Auth guards on APIs | Admin APIs return 401/403 when logged out | ☐ |
| 10.4 | Blob-served images | KYC / review / vendor photos load via private serve routes | ☐ |
| 10.5 | Neon cold-start | First query after idle succeeds (retry/backoff handles suspend) | ☐ |
| 10.6 | Email alerts (optional) | If `RESEND_API_KEY` set, booking/payment alerts send | ☐ |

---

## 11. Seeding demo data (optional — to fill the empty catalog)

The `/vendors` catalog is empty. To make it look populated for the client, create
approved vendors through the real flow (keeps data consistent):

1. **Sign up** a vendor account → complete **`/vendor/register`** with a menu.
2. **Admin → Vendor Approvals** → approve it and **assign a tier**.
3. Repeat for 3–5 vendors across different cuisines/cities.
4. Optionally place a booking + leave a review so detail pages show ratings.

> Want this automated? Ask and I can script a small seeder that inserts a handful
> of realistic approved vendors, a venue or two, a sample booking and a couple of
> reviews — **but confirm first**, since it writes to the shared production
> database.

---

## Sign-off

- [ ] All **Act/§ smoke items** pass (§0)
- [ ] **Core booking flow** (§4) passes end-to-end
- [ ] **Admin console** (§9) fully exercised
- [ ] Known gaps documented below
- [ ] Demo data seeded (if desired)

**Known issues / notes:**
`________________________________________________________________`
`________________________________________________________________`
