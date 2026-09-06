# Bhojpatra Vendor Registration Experience — Interactive Prototype
## Expanded Multi-Service Menu Builders (Catering, Stall, Baina)

**Version:** 2.0 (Expanded Service Builders Prototype)  
**Location:** `/mockups/vendor-registration/index.html`  
**Related Docs:** [`DESIGN_DECISIONS.md`](file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor-registration/DESIGN_DECISIONS.md), [`VENDOR_REGISTRATION_CURRENT_STATE.md`](file:///c:/Users/Zeeshaan/Bhojpatra/VENDOR_REGISTRATION_CURRENT_STATE.md)  
**Target Viewports:** Desktop (1440px) & Mobile (390px iPhone-style)

---

## 1. How to Open and View the Prototype

The prototype is completely standalone and runs directly in any modern browser without requiring Node.js, Next.js, or backend servers.

### Direct Browser Viewing
1. Open your browser (Google Chrome, Microsoft Edge, Safari, or Firefox).
2. Open the file directly:
   ```
   file:///c:/Users/Zeeshaan/Bhojpatra/mockups/vendor-registration/index.html
   ```
   Or navigate to `c:\Users\Zeeshaan\Bhojpatra\mockups\vendor-registration\` in Windows Explorer and double-click `index.html`.

---

## 2. Prototyping Control Bar Features

At the top of the browser window, a persistent control bar provides inspection and presentation tools:

1. **Canvas View Switcher:**
   - **Desktop (1440px):** Full desktop layout with horizontal stepper navigation.
   - **Mobile (390px):** Authentic iPhone-style mobile viewport with bezel, notch, and thumb-friendly touch ergonomics.
   - **Side-by-Side:** Renders both desktop and mobile canvases simultaneously for responsive comparison.
2. **Jump to View Selector:**
   Allows instant navigation to any specific step or sub-step:
   - **General:** 01. Details, 02. Basic Info, 03. KYC, 04. Offerings
   - **Catering Builder:** 5A. Feast Basics, 5B. Courses, 5C. Dishes, 5D. Tiers, 5E. Live Counters, 5F. Catering Review
   - **Stall Builder:** 6A. Stall Basics, 6B. Menu Format, 6C. Delicacies, 6D. Pricing & Pax, 6E. Stall Review
   - **Baina Builder:** 7A. Gifting Basics, 7B. Box Catalog, 7C. Packaging Styles, 7D. Baina Review
   - **Final:** 08. Review & Submit, 09. Registration Complete
3. **Demo Scenario Presets:**
   - **Full Feast Caterer:** Pre-selects Catering (5A to 5F).
   - **Specialty Food Stall:** Pre-selects Stall (6A to 6E).
   - **Mithai & Baina Artisan:** Pre-selects Baina (7A to 7D).
   - **Multi-Service Partner (All 3):** Demonstrates sequential multi-branch flow through all 3 builders!

---

## 3. Walkthrough of the Expanded Builders

### 3.1 Catering Menu Builder (5A to 5F)
- **5A. Feast Basics:** Configure feast display name (*"Royal Awadhi Dastarkhwan"*), culinary heritage description, and cuisine context (*"Awadhi & Mughlai"*).
- **5B. Courses Hierarchy:** View the 6 platform courses (*Welcome Drinks, Starters, Main Course, Breads & Rice, Desserts, Accompaniments*). Click "View Dishes →" on any course, or "+ Add Custom Course".
- **5C. Dish Builder:** Navigate between courses using the course tabs with live dish counts. Review existing dishes with official FSSAI dietary badges (🟢 Veg / 🔴 Non-Veg), descriptions, and tier badges. Click **"+ Add Dish to this Course"** to launch the interactive dish editor modal, fill details, and click "Save Dish to Menu".
- **5D. Tier Configuration:** Set per-plate pricing for Silver (₹799), Gold (₹1,199), and Platinum (₹1,699). Adjust dish quotas per course using the `+` and `−` stepper controls.
- **5E. Live Counters & Services:** Select live stations (*Pan Counter, Chaat Station, Live Tandoor, Pizza Counter, etc.*) with per-person price uplifts. Review included uniformed staff and hygiene crew.
- **5F. Catering Review:** Summarizes the entire built catering catalog with direct **[Edit]** shortcuts back to any sub-step.

### 3.2 Single Stall Builder (6A to 6E)
- **6A. Stall Basics:** Stall brand name (*"Awadhi Dum Biryani & Galouti Corner"*), category specialty (*Mughlai & Tandoor*), and description.
- **6B. Menu Format:** Toggle between **Fixed Set Spread** (all-inclusive flat rate) and **Varied** (guest selects individual delicacies).
- **6C. Delicacies Catalog:** Review delicacies with individual pricing and Veg/Non-Veg icons. Click **"+ Add Delicacy Item"** to launch the interactive delicacy modal.
- **6D. Pricing & Capacity:** Configure fixed per-plate rate (₹280) and minimum guest guarantee (50 pax).
- **6E. Stall Review:** Concise summary of stall operating parameters.

### 3.3 Baina Box Gifting Builder (7A to 7D)
- **7A. Gifting Basics:** Gifting studio name (*"Ram Asrey Royal Baina Studio"*), brand story, minimum order quantity (25 boxes), and production notice (3 days).
- **7B. Box Catalog:** View signature gifting boxes with contents, ½ kg and 1 kg rates, custom size pills, and photo indicators. Click **"+ Add New Gifting Box"** to add a new custom hamper.
- **7C. Packaging Styles:** Select from 4 luxury presentation options (*Royal Velvet Finish, Golden Metallic Foil, Eco-Friendly Kraft Board, Banarasi Brocade Silk*).
- **7D. Baina Review:** Itemized box list and packaging specifications.

### 3.4 Review & Completion (08 & 09)
- **08. Final Registration Review:** Displays business identity, KYC tax credentials, and itemized summaries of all active service menus configured during the session. Click any section's **[Edit]** button to jump directly back to that screen.
- **09. Registration Complete:** Displays assigned Vendor ID (`VND-782194`), compliance review timeline, and an active link to launch the companion operational vendor dashboard (`mockups/vendor_dashboard.html`).

---

## 4. Key Design & Usability Highlights

- **Zero Monolithic Scrolling:** Every sub-step is its own focused, card-constrained view (`780px` max width), completely eliminating vertical scrolling fatigue.
- **Subnav Breadcrumb Navigation:** Inside each builder, a breadcrumb bar provides instant context and click-to-navigate access.
- **Local State Reactivity:** All additions, edits, and tier quota adjustments in `script.js` dynamically synchronize with subsequent review views.
- **Bhojpatra 4-Color Visual Identity:** Built strictly with `#B92025` Maroon, `#F0D09E` Cream, `#000000` Black, and `#FFFFFF` White, using Ananda Neptouch 2 headings and Open Sans typography.
- **44px Minimum Touch Targets:** Optimized for effortless mobile thumb interactions without horizontal overflow.
