# Bhojpatra V2 Onboarding Implementation Tracker

Internal engineering record tracking all 24 planned V2 changes across 6 phases.

> **CRITICAL TRACKING RULE**:
> Every time you work on this project in a subsequent run, FIRST inspect this internal tracker before making changes.
> - Do NOT mark something "Completed" unless the implementation has actually been verified.
> - If something is partially implemented, use "In Progress" rather than "Completed".
> - Keep previously completed work marked as completed and do not redo it unnecessarily.
> - Always update the tracker in the same run in which the implementation is completed.
> - This tracker is an internal engineering record, not a user-facing feature. Do not add it to the website UI.

---

| ID | Phase | Change | Status | Implementation Notes | Files / Components Changed | Verification / Test Result | Last Updated |
|---|---|---|---|---|---|---|---|
| 1 | PHASE 1 — Independent, isolated fixes | Add Sign In to Cutleries | Completed | Added `.btn-vendor-signin` to desktop and mobile headers, plus `.existing-vendor-signin-banner` in registration details card. Added `#modal-vendor-signin` allowing registered caterers to sign in directly. Wired `openVendorSignInModal`, `closeVendorSignInModal`, and `handleVendorSignIn(e)` directly into Kitchen Dashboard (`view-dashboard`). | `mockups/vendor-registration-v2/index.html`, `mockups/vendor-registration-v2/script.js`, `mockups/vendor-registration-v2/styles.css` | Verified in test suite and DOM inspection: direct sign in buttons, modal submission, and navigation to `view-dashboard` are fully functional. | 2026-09-09 |
| 2 | PHASE 1 — Independent, isolated fixes | Remove Host Number from Dashboard | Completed | Removed `host-contact-link` ("📞 Host Phone: +91 94511 23456") from the dashboard spotlight event card footer in `index.html`. Preserved all non-contact order information, special notes, and kitchen production sheet. | `mockups/vendor-registration-v2/index.html` | Verified in test suite: 0 occurrences of host phone link or telephone metadata remain in dashboard spotlight. | 2026-09-09 |
| 3 | PHASE 1 — Independent, isolated fixes | Remove Preview Storefront | Completed | Removed `.btn-preview-store` ("Preview Storefront 👁️") from the dashboard topbar in `index.html` and from the zero-bookings empty state in `script.js`. Preserved optional preview button in onboarding review and dev test harness. | `mockups/vendor-registration-v2/index.html`, `mockups/vendor-registration-v2/script.js` | Verified in test suite: neither desktop nor mobile dashboard shells nor empty state contain Preview Storefront button. | 2026-09-09 |
| 4 | PHASE 1 — Independent, isolated fixes | Make Stall Identity Display Name Optional | Completed | Removed mandatory asterisk `*` from Stall Display Brand Name, added `.field-optional` ("(Optional)") tag, and updated placeholder on desktop and mobile. Added graceful fallbacks in `renderMasterReview` and `renderServicesHub` (`state.stall.stallName || state.details.businessName || 'Specialty Food Stall'`). | `mockups/vendor-registration-v2/index.html`, `mockups/vendor-registration-v2/script.js`, `mockups/vendor-registration-v2/styles.css` | Verified in test suite: Stall Name is optional in UI, form validation allows continuation without a stall name. | 2026-09-09 |
| 5 | PHASE 1 — Independent, isolated fixes | Remove Varied Delicacies from Stall Identity | Completed | Removed "Varied Delicacies (À la Carte)" offering card from `view-stall-format` in desktop and mobile views in `index.html`. Enforced `state.stall.menuType = 'fixed'` in `setStallMenuType` and updated `renderServicesHub` to always present Fixed Set Spread format. | `mockups/vendor-registration-v2/index.html`, `mockups/vendor-registration-v2/script.js` | Verified in test suite: `data-format="varied"` card is absent, `setStallMenuType` enforces `'fixed'`, Fixed Set Spread format renders cleanly. | 2026-09-09 |
| 6 | PHASE 1 — Independent, isolated fixes | Remove Onboarding Step Numbers | Completed | Removed explicit step numbers ("Step 1", "Step 2", "01.", "5A.", "6A.", "7A.", etc.) from Jump Select dropdown options, subnav tabs, and section eyebrows across desktop and mobile frames. Updated `updateStepperProgress` in `script.js` to use clean phase labels and bullet/check indicators (`•` / `✓`). | `mockups/vendor-registration-v2/index.html`, `mockups/vendor-registration-v2/script.js` | Verified in test suite: 0 occurrences of numbered step eyebrows or jump option numbers remain; linear navigation and section indication work smoothly without step numbers. | 2026-09-09 |
| 7 | PHASE 2 — Structural/foundational onboarding changes | Reuse Existing Vendor Signup Details | Not Started | — | — | — | 2026-09-09 |
| 8 | PHASE 2 — Structural/foundational onboarding changes | Make Vendor Offerings Customizable | Not Started | — | — | — | 2026-09-09 |
| 9 | PHASE 3 — Specific field/section additions | Add Custom Cuisine | Not Started | — | — | — | 2026-09-09 |
| 10 | PHASE 3 — Specific field/section additions | Add Serviceable Cities | Not Started | — | — | — | 2026-09-09 |
| 11 | PHASE 3 — Specific field/section additions | Add Minimum Preparation Notice | Not Started | — | — | — | 2026-09-09 |
| 12 | PHASE 3 — Specific field/section additions | Add New Category to Stall Identity | Not Started | — | — | — | 2026-09-09 |
| 13 | PHASE 3 — Specific field/section additions | Add Live Counters to Feast | Not Started | — | — | — | 2026-09-09 |
| 14 | PHASE 3 — Specific field/section additions | Add Extras to Feast | Not Started | — | — | — | 2026-09-09 |
| 15 | PHASE 3 — Specific field/section additions | Add Essentials to Feast | Not Started | — | — | — | 2026-09-09 |
| 16 | PHASE 3 — Specific field/section additions | Add Add-ons to Feast | Not Started | — | — | — | 2026-09-09 |
| 17 | PHASE 4 — Badge system | Add Badge Application Section After Offerings | Not Started | — | — | — | 2026-09-09 |
| 18 | PHASE 4 — Badge system | Add Verified Caterer Badge to Vendor Signup | Not Started | — | — | — | 2026-09-09 |
| 19 | PHASE 4 — Badge system | Add City Icon Caterer Badge to Vendor Signup | Not Started | — | — | — | 2026-09-09 |
| 20 | PHASE 4 — Badge system | Add Heritage Caterer Badge to Vendor Signup | Not Started | — | — | — | 2026-09-09 |
| 21 | PHASE 5 — Onboarding-wide UI/UX behavior | Add Onboarding Progress Animation | Not Started | — | — | — | 2026-09-09 |
| 22 | PHASE 5 — Onboarding-wide UI/UX behavior | Limit Box Selection to 5 | Not Started | — | — | — | 2026-09-09 |
| 23 | PHASE 5 — Onboarding-wide UI/UX behavior | Remove Excess Details from Onboarding Pages | Not Started | — | — | — | 2026-09-09 |
| 24 | PHASE 6 — Global visual pass | Beautify the Whole Website | Not Started | — | — | — | 2026-09-09 |
