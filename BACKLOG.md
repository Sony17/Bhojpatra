# Vendor Onboarding Backlog

Gaps found while testing vendor registration end to end (2026-10-07, branch
`single-stall-fixes`, based on `main` f20ba9e). Priority: **P0** = security or
data loss, **P1** = feature broken or missing, **P2** = improvement.

## P1 — KYC certificate uploads fail

- **Where:** `POST /api/vendors/kyc`.
- **Problem:** file storage (Vercel Blob) is suspended, so every GST / FSSAI
  certificate upload returns an error. Photo uploads fail for the same reason.
- **Fix:** restore or replace file storage. Not a code fix.

## P2 — Testing writes to the live database

- **Problem:** local dev uses the live Neon database, so every test vendor
  appears in production data and on `/vendors`.
- **Fix:** create a Neon branch for testing and point `.env.local`
  `DATABASE_URL` at it.

## P2 — Make onboarding easy to re-test

- **Idea:** a dev-only `/vendor/register?fresh=1` that skips loading the saved
  profile, so one test account can run a blank wizard repeatedly without
  deleting data. Until then, use test emails like
  `chaat.corner1@example.com` (no verification email is sent).

## Single Stall onboarding — end-to-end run (2026-10-07)

Run as a fresh vendor through signup → wizard → admin approval → `/vendors`
→ storefront → `/book/stall`. Everything below under "Fixed" is verified in the
browser on `single-stall-fixes` (uncommitted); test vendors `VEN-8952E3F7`
("Ravi Kumar") and `VEN-0012BAF1` ("QA Golgappa House") are Verified in the
live DB and can be deleted.

### Fixed on `single-stall-fixes`

- Stall-only vendor no longer saved with Feast / Baina / Essentials: only the
  selected offerings' builder data is sent; the server keeps its derivation.
- No offering is pre-selected on step 3.
- Phone from signup lands in step 1; phone, GSTIN and FSSAI persist with the
  draft and prefill on reopen.
- Wizard resumes at the saved step after a refresh.
- Business name is no longer defaulted to the account holder's name.
- Pure Veg kitchens can only add veg dishes; duplicate dish names are blocked.
- Final Submit posts to `/api/vendor/application` → appears in admin
  Approvals with GSTIN / FSSAI / phone; Approve publishes the listing
  (`verified: true`, moderation Approved). Button says "Submit for Approval".
- Vendors can no longer grant themselves badges (`stripBadgeGrants`); admin
  grants/rejects/revokes in Menu Moderation.
- **Food photos can be links.** Dish / box photo widget accepts a pasted
  https URL (validated to load as an image); server accepts upload URLs or
  https links (`src/lib/photoLinks.ts`); all renderers show linked images.
- Every stall category now publishes to the customer flow (new menu
  categories in `data.ts`: juices, beverages, north-indian, snacks, desserts,
  ice-cream, street-food, breakfast, regional; custom categories → regional).
  Because several stall categories now share one platform slot (custom ones
  → "regional"), dishes are mirrored as a union per slot — a guard added with
  this change, not a pre-existing bug.
- KYC document records now carry `ownerUserId`; the application links them
  by id, so renaming the business can't orphan them.
- Home "Explore stalls" → stall-type tiles now count Single Stall vendors:
  the public listing's `offerings` are derived from stall categories too
  (`stallTypeIdsFor` in vendorMenus.ts: Chaat→Chaat Station, Juices→Mocktail
  & Juice Bar, Desserts/Ice Cream→Dessert Counter, custom→Live Counters…).
  Previously only the Feast builder's Live Counters list counted, so stall-only
  vendors never appeared under any tile.
- **Storefront cover photo is set in step 1** (upload or pasted https link),
  so stall-only vendors no longer get the stock grilled-meat tile. The link
  wins over an uploaded card photo in `PUT /api/vendor/menu`; every cover
  render (catalog card, storefront hero carousel, compare, booking wizards,
  admin, `ui/ListingCard`, `ui/ImageCarousel`) renders linked hosts
  unoptimized so `next/image` can't throw on an unknown host.
- **Launch switch for demo data:** Admin → Menu Moderation → "Hide all seed
  stalls" sets every ownerless seed/placeholder vendor to Hidden in one go
  (`POST /api/vendors/moderation/seeds`); `/api/vendors` then reports
  `samplesHidden` so the client stops merging the hard-coded SAMPLE listings
  and sample storefront URLs 404. Reversible from the same button. Seeds were
  previously invisible to admin (the moderation list only shows account
  vendors), so there was no way to hide them without code.
- **Cover photo actually saves from the wizard** (found 2026-10-07 with
  pani.puri.house1@): the draft payload never sent `image`, so a pasted link
  or upload-then-save changed nothing. Payload now sends `image` (null clears
  a stale link); the stock placeholder is no longer shown as the vendor's own
  photo on step 1. Edits re-queue the vendor as Pending in Menu Moderation.
- Dashboard: "Edit Business Profile" and "Profile & KYC" open the wizard
  (no more "Coming Soon" / dead "Compliance Settings").
- `/vendors?city=<id>` (e.g. `lucknow`) no longer shows 0 results.
- Step 1 heading no longer says "catering"; stale "Already registered? Sign
  in" banner removed; `/api/geo/hint` answers 204 instead of a logged 404.

### Still open

- P2 — With seed stalls hidden, `/baina-box` (BainaBoxOverview) still lists
  the SAMPLE Baina brands: it reads `vendorListings` directly instead of
  `useAllVendors`, so it ignores the `samplesHidden` switch.
- Note — hiding seed stalls also empties the **Feast** course rosters that
  only seeds filled (live, chinese, south-indian, pizza, pasta = 0 caterers;
  welcome/starters/main/breads/sweets = 1). Keep seeds shown until enough real
  feast caterers are approved, or accept thin Gold/Platinum menus.

- **P1 — Vendor cities ≠ customer cities.** Step 1 offers kitchen cities
  (e.g. Noida) that aren't in Admin → Settings → Locations, so customers can
  never browse to that vendor (found with pani.puri.house1@example.com,
  2026-10-07). Drive the wizard's city list from serviceable locations, or
  warn the vendor and show the vendor under "Other" / nearest city.

- **P1 — KYC certificate uploads fail** while Vercel Blob is suspended (dish
  photo uploads *do* work locally; use image links as the fallback).
- P2 — Admin "Requested tiers" shows Silver/Gold for a stall-only vendor
  (derived from `priceFrom`); marketplace tiers don't apply to stalls.
- P2 — Badge names say "Caterer" for stall vendors.
- P2 — Two prices per stall (fixed per-plate + per-dish): the customer pays
  the fixed rate for a set menu; per-dish price only matters for "varied"
  menus. Worth clarifying in the builder copy.
- P2 — Duplicate Continue buttons in the stall builder (in-page + footer).
- P2 — Seed vendors Ram Asrey / Chhappan Bhog are real shop names.

## Branch note

`single-stall-fixes` = origin/main f20ba9e + the uncommitted work from the
`fix/vendor-stall-flow` worktree (`../bhojpatra-flowfix`) + the
`vendor-flow-integration` worktree + the fixes above. 116/116 unit tests,
tsc and eslint clean. Not yet committed.
